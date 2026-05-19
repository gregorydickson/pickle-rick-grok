#!/usr/bin/env node
/**
 * orchestrator.ts — the main autonomous ticket execution engine (Grok native, production-grade)
 *
 * Drives the full 8-phase Morty lifecycle per ticket for REAL overnight 50+ ticket campaigns.
 *
 * HARDENED (final gaps closed):
 * - Every phase goes through canonical ManagerRitual (promise + contract + locked appendPhase + gate + circuit + optional rollback)
 * - Resumes from ANY point via phasesCompleted + currentTicketId (mid-ticket too)
 * - One toxic ticket isolated; the other 49 continue (try/catch per ticket)
 * - SIGTERM/SIGINT graceful: bail between phases, persist via locks, resumable
 * - Rich 5min heartbeats + Activity events + progress; campaign-status.json updated live for tmux/forensics
 * - Resource guard hygiene (gc, prune worker logs/prompts, gentle git gc, mem/disk) wired between tickets
 * - campaign-status.json kept fresh for tmux/externals (via mark + updates every heartbeat + ticket)
 * - Uses shared phase-utils (DRY, no dupe lists/mappings)
 * - workingDir for workers ALWAYS from session state or explicit targetRoot (correct tree for self-dogfood detached runs)
 *
 * This + mux-runner + ritual + session is the surface you trust for 50-tix self-dogfood.
 * R-META self-PRD tickets now get first-class meta treatment automatically via id prefix (no extra flags needed).
 */


// === SELF-IMPROVEMENT META LOOP (first-class) ===
// self-prd-generator + runSelfImprovementLoopCloser wired as meta-phases. Orchestrator handles self-meta tickets (R-META) via ritual + persistence.
// R-META id prefix (from self-PRD) is the reliable marker + triggers special logging/ritual path. metaMode still supported for explicit.
import type * as _SelfPrd from "../self-prd-generator.js";
import type * as _LoopC from "../self-improvement-loop-closer.js";

import * as fs from "fs";
import * as path from 'path';
import { SessionManager } from '../session.js';
import { WorkerSpawner } from '../workers.js';
import { CircuitBreaker } from '../circuit.js';
import { ConvergenceGate } from '../gate.js';
import { Activity } from '../activity-logger.js';
import { ManagerRitual } from '../ritual.js';
import { getGitHead } from '../git_safety.js';
import {
  TICKET_PHASES,
  getPhaseFileName,
  getExpectedArtifactName,
} from '../lib/phase-utils.js';
import {
  hintGC,
  pruneDirOlderThan,
  gentleGitGc,
  getMemSnapshot,
} from '../lib/resource-guard.js';

export interface RunOrchestratorOptions {
  shutdownRequested?: () => boolean;
  heartbeatIntervalMs?: number;
  onProgress?: (info: any) => void;
  /** first-class meta self-improvement support */
  metaMode?: boolean;
  targetRoot?: string;
}

export async function runOrchestrator(
  sessionDir: string,
  options: RunOrchestratorOptions = {}
): Promise<void> {
  if (!sessionDir) {
    throw new Error('runOrchestrator: sessionDir required');
  }

  const sm = new SessionManager();
  let state = sm.loadState(sessionDir);
  const spawner = new WorkerSpawner(state.backend);
  if (options.metaMode) {
    console.log("[orchestrator] SELF-META MODE active — self-prd-generator / runSelfImprovementLoopCloser targets running through full ritual+persistence");
  }

  const shutdown = options.shutdownRequested || (() => false);
  const hbMs = options.heartbeatIntervalMs ?? 300000;
  const onProg = options.onProgress;

  let hbTimer: NodeJS.Timeout | null = null;
  let currentTicketId: string | null = null;
  let currentPhase: string | null = null;
  const runStart = Date.now();

  function getProgressSnapshot() {
    try {
      return sm.countRemainingTickets(sessionDir);
    } catch {
      const total = (state.tickets || []).length;
      return { total, remaining: total, done: 0, failed: 0 };
    }
  }

  function emitProgress(message: string, ticketId?: string, phase?: string) {
    const snap = getProgressSnapshot();
    const elapsed = Date.now() - runStart;
    const info = {
      ticketId: ticketId || currentTicketId || undefined,
      phase: phase || currentPhase || undefined,
      message,
      done: snap.done,
      total: snap.total,
      elapsedMs: elapsed,
    };
    console.log(
      `[orchestrator] ${message} | ${info.done}/${info.total} tickets | ${Math.floor(elapsed / 60000)}m elapsed`
    );
    if (onProg) onProg(info);
  }

  function startHeartbeat() {
    if (!hbMs || hbMs <= 0) return;
    hbTimer = setInterval(() => {
      if (shutdown()) return;
      const snap = getProgressSnapshot();
      const elapsed = Date.now() - runStart;
      const mem = getMemSnapshot();
      const msg = `HEARTBEAT — ticket ${currentTicketId || 'between'} @ ${currentPhase || 'idle'} | ${snap.done}/${snap.total} done (${snap.remaining} remain, ${snap.failed} failed) | mem=${mem.rssHuman} | ${Math.floor(elapsed / 60000)}m`;
      console.log(`[orchestrator] ❤️ ${msg}`);
      Activity.heartbeat(state.sessionId || 'unknown', currentTicketId || undefined, currentPhase || undefined, {
        elapsedMs: elapsed,
        ...snap,
        currentPhase,
        memRss: mem.rss,
      });
      emitProgress(msg, currentTicketId || undefined, currentPhase || undefined);
      // POLISH: keep campaign-status.json live for detached monitors/tmux/forensics even mid-ticket (5min cadence)
      try {
        sm.updateCampaignStatusSync(sessionDir, {
          progress: snap,
          note: `HEARTBEAT ${currentTicketId || 'idle'}@${currentPhase || 'idle'}`,
          resource: { memRss: mem.rss, rssHuman: mem.rssHuman },
        } as any);
      } catch {}
    }, hbMs);
  }

  async function runTicket(ticket: any) {
    const ticketStart = Date.now();
    console.log(`\n=== Starting ticket ${ticket.id}: ${ticket.title} ===`);
    Activity.ticketStarted(state.sessionId || 'unknown', ticket.id, ticket.title);

    const circuit = new CircuitBreaker(sessionDir);
    const gate = new ConvergenceGate(sessionDir);

    const isMeta = !!(ticket.isSelfMeta || ticket.meta || String(ticket.id || "").startsWith("R-META")); // R-META prefix from self-PRD is sufficient + reliable for meta dogfood path (options.metaMode still honored if passed)
    if (isMeta) {
      Activity.heartbeat(state.sessionId || "unknown", ticket.id, "meta-ticket-start", { meta: true, title: ticket.title });
      try { (Activity as any).selfMetaTicket?.(state.sessionId || "unknown", ticket.id, ticket.title || ""); } catch {}
      console.log(`[orchestrator] META TICKET ${ticket.id} — eating our own dogfood via self-prd-generator + runSelfImprovementLoopCloser (ritual, persistence, citadel-depth)`);
    }

    const completed = ticket.phasesCompleted || [];
    const remainingPhases = TICKET_PHASES.filter((p) => !completed.includes(p));

    for (const phase of remainingPhases) {
      if (shutdown()) {
        console.log(`  [orchestrator] Shutdown requested — bailing before phase ${phase} for ticket ${ticket.id}`);
        return;
      }

      currentPhase = phase;
      console.log(`  → Phase: ${phase}`);
      emitProgress(`phase ${phase} starting`, ticket.id, phase);

      const prompt = buildPhasePrompt(ticket, phase, sessionDir, state);
      const preSha = getGitHead();

      const result = await spawner.spawn(phase, {
        sessionDir,
        ticketId: ticket.id,
        phase,
        prompt,
        maxTurns: 60,
        workingDir: options.targetRoot || sm.getWorkingDirSafe(sessionDir), // CRITICAL: always target the session's grok tree (not process cwd) for real 50-tix self-dogfood detached runs
      });

      if (!result.success) {
        const reason = result.failureReason || result.error || 'worker_spawn_failed';
        console.error(`Phase ${phase} failed for ticket ${ticket.id}: ${reason}`);
        Activity.phaseFailed(state.sessionId || 'unknown', ticket.id, phase, reason);
        await sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
        circuit.recordIteration(false, `phase_failed_${phase}:${reason}`);
        Activity.ticketFailed(state.sessionId || 'unknown', ticket.id, `phase ${phase} failed: ${reason}`);
        return;
      }

      // THE RITUAL — single source, every phase, no dupe logic
      const expected = getExpectedArtifactName(phase, ticket.id);
      const ritual = new ManagerRitual(sessionDir);
      const outcome = await ritual.performPostReturn({
        sessionDir,
        ticketId: ticket.id,
        phase,
        workerResult: result,
        expectedArtifact: expected,
        preSha,
        autoRollbackOnGateFail: false,
        autoRollbackOnCircuitTrip: false,
      });

      if (!outcome.valid) {
        const reason = outcome.reason || 'post_return_ritual_failed';
        console.error(`  Post-return ritual failed for ${phase}: ${reason}`);
        Activity.phaseFailed(state.sessionId || 'unknown', ticket.id, phase, reason);
        await sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
        Activity.ticketFailed(state.sessionId || 'unknown', ticket.id, `ritual ${phase}: ${reason}`);
        return;
      }

      if (outcome.circuitTripped) {
        const reason = 'circuit_breaker_tripped';
        console.error('Circuit breaker tripped. Stopping ticket.');
        Activity.phaseFailed(state.sessionId || 'unknown', ticket.id, phase, reason);
        await sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
        Activity.ticketFailed(state.sessionId || 'unknown', ticket.id, reason);
        return;
      }

      if (outcome.gateResult && !outcome.gateResult.passed) {
        console.warn(`Gate had failures after ${phase}: ${outcome.gateResult.newFailures.length}`);
      }

      Activity.phaseCompleted(state.sessionId || 'unknown', ticket.id, phase);
      console.log(
        `  ✓ ${phase} complete (ritual: gitProgress=${outcome.gitProgress}, rolledBack=${outcome.rolledBack})`
      );
      emitProgress(`phase ${phase} COMPLETE`, ticket.id, phase);

      if (shutdown()) {
        console.log(`  [orchestrator] Shutdown requested after ${phase} — stopping ticket ${ticket.id} here`);
        return;
      }
    }

    currentPhase = null;
    Activity.ticketCompleted(state.sessionId || 'unknown', ticket.id, ticket.phasesCompleted?.length || 0);
    await sm.updateTicketStatus(sessionDir, ticket.id, 'done');
    const ticketDur = Math.floor((Date.now() - ticketStart) / 1000);
    console.log(`=== Ticket ${ticket.id} COMPLETE in ${ticketDur}s ===\n`);
    emitProgress(`ticket ${ticket.id} COMPLETE`, ticket.id);

    // Resource hygiene settle — final gaps sweeper integration (long-run safe)
    try {
      pruneDirOlderThan(path.join(sessionDir, '.worker-logs'), 48 * 3600 * 1000);
      pruneDirOlderThan(path.join(sessionDir, '.worker-prompts'), 7 * 24 * 3600 * 1000);
      hintGC();
      gentleGitGc(sessionDir);
      const mem = getMemSnapshot();
      sm.updateCampaignStatusSync(sessionDir, {
        note: `ticket ${ticket.id} done + hygiene (mem=${mem.rssHuman})`,
      } as any);
    } catch (hErr) {
      // best effort, never kill a campaign
    }
  }

  Activity.sessionStart(state.sessionId || 'unknown', 'orchestrator production run');
  startHeartbeat();

  const initialSnap = getProgressSnapshot();
  console.log(
    `[orchestrator] Session ${state.sessionId} — ${initialSnap.total} tickets loaded. ${initialSnap.remaining} remaining. Backend=${state.backend}. Beginning production run...`
  );
  emitProgress('orchestrator started');

  try {
    const ticketsToProcess = [...(state.tickets || [])];
    for (const ticket of ticketsToProcess) {
      if (shutdown()) {
        console.log('[orchestrator] Shutdown flag detected between tickets — clean exit. Resumable.');
        break;
      }

      const currentStatus =
        (sm.loadState(sessionDir).tickets.find((t: any) => t.id === ticket.id) || ticket).status;
      if (currentStatus === 'pending' || currentStatus === 'in_progress') {
        currentTicketId = ticket.id;

        try {
          await sm.markTicketInProgress(sessionDir, ticket.id);
        } catch (lockErr) {
          console.warn('[orchestrator] markTicketInProgress lock hiccup (non-fatal):', lockErr);
        }

        try {
          await runTicket(ticket);
        } catch (outerErr: any) {
          const msg = outerErr?.message || String(outerErr);
          console.error(`[orchestrator] OUTER CRASH on ticket ${ticket.id} (isolated — continuing): ${msg}`);
          Activity.ticketFailed(state.sessionId || 'unknown', ticket.id, `outer crash: ${msg}`);
          try {
            await sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
          } catch {}
          emitProgress(`ticket ${ticket.id} OUTER-FAILED (isolated)`, ticket.id);
        } finally {
          currentPhase = null;
        }
      }
    }
  } finally {
    if (hbTimer) {
      clearInterval(hbTimer);
      hbTimer = null;
    }
    currentPhase = null;
    try {
      await sm.clearCurrentTicket(sessionDir);
    } catch {}

    const finalSnap = getProgressSnapshot();
    const totalDur = Date.now() - runStart;
    Activity.sessionEnd(state.sessionId || 'unknown', totalDur);
    console.log(
      `[orchestrator] All tickets processed (or stopped). ${finalSnap.done} done, ${finalSnap.failed} failed, ${finalSnap.remaining} remain. Total: ${Math.floor(totalDur / 60000)}m.`
    );
    emitProgress('orchestrator finished or stopped for resume');
  }
}

function buildPhasePrompt(ticket: any, phase: string, sessionDir: string, state: any): string {
  const phaseName = getPhaseFileName(phase);
  const phaseFile = `${phaseName}.md`;
  const phasePath = path.join(__dirname, '../../../references/phases', phaseFile);

  let base = '';
  if (fs.existsSync(phasePath)) {
    base = fs.readFileSync(phasePath, 'utf8');
  } else {
    base = `## ${phaseName} phase\nFollow the standard Morty contract for this phase.`;
  }

  const sendToMorty = fs
    .readFileSync(path.join(__dirname, '../../../references/send-to-morty.md'), 'utf8')
    .replace(/```/g, '');
  const ticketContent = fs.readFileSync(
    path.join(sessionDir, 'tickets', ticket.id, 'ticket.md'),
    'utf8'
  );

  return [
    base,
    '## Immutable Worker Contract',
    sendToMorty,
    `## Current Ticket (${ticket.id})`,
    ticketContent,
    '## Git Boundary Rules (strictly enforce)',
    'You must never run prohibited git commands. Only scoped changes inside this ticket.',
    'When finished write the required artifact and output exactly: <promise>I AM DONE</promise>',
  ].join('\n\n');
}

// CLI entrypoint (back-compat). For detached use mux-runner (signals + claim + options).
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('orchestrator.ts') ||
  process.argv[1]?.endsWith('orchestrator.js')
) {
  const sessionDir = process.argv[2];
  if (!sessionDir) {
    console.error('Usage: orchestrator.ts <sessionDir> [--heartbeat-ms 300000] [--target-root /path/to/grok-tree] [--meta]');
    process.exit(1);
  }
  const hbIdx = process.argv.indexOf('--heartbeat-ms');
  const hbRaw = hbIdx !== -1 ? parseInt(process.argv[hbIdx + 1] || '300000', 10) : undefined;
  const hbOpts: RunOrchestratorOptions = {};
  if (hbRaw !== undefined && !Number.isNaN(hbRaw)) {
    hbOpts.heartbeatIntervalMs = hbRaw;
  }
  const trIdx = process.argv.indexOf('--target-root');
  if (trIdx !== -1) {
    hbOpts.targetRoot = process.argv[trIdx + 1];
  }
  if (process.argv.includes('--meta') || process.argv.includes('--self-meta')) {
    hbOpts.metaMode = true;
  }
  runOrchestrator(sessionDir, hbOpts).catch((err) => {
    console.error('[orchestrator] Fatal error in CLI (top level):', err);
    process.exitCode = 1;
  });
}
