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
 * PHASE-AWARE TURN BUDGETS (added 2026-05-19):
 * - Hardcoded maxTurns:60 removed. Now resolves via resolvePhaseTurnBudget() + DEFAULT_PHASE_TURN_BUDGETS
 *   (single source in lib/phase-utils.ts) with safe high defaults for researcher (180) / planner (150).
 * - Heavy P0/R-META researcher prompts (~6KB with full ticket + send-to-morty + exhaustive research) no longer
 *   exhaust after faithful --prompt-file delivery. "Fire 50-ticket overnight self-run and walk away" now works
 *   for complex meta tickets without manual per-campaign intervention.
 * - Override via RunOrchestratorOptions.maxTurns (global) or phaseMaxTurns (per WorkerRole). Logged in every
 *   worker_outcome for self-PRD targeting and activity forensics (promptFile + promptLen + maxTurns).
 * - Contract preserved: context-cleared headless `grok --prompt-file ... --max-turns N + ritual` on every phase.
 */

 // === SELF-IMPROVEMENT META LOOP (first-class) ===
 // self-prd-generator + runSelfImprovementLoopCloser wired as meta-phases. Orchestrator handles self-meta tickets (R-META) via ritual + persistence.
 // R-META id prefix (from self-PRD) is the reliable marker + triggers special logging/ritual path. metaMode still supported for explicit.
import type * as _SelfPrd from "../self-prd-generator.js";
import type * as _LoopC from "../self-improvement-loop-closer.js";

import * as fs from "fs";
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { SessionManager } from '../session.js';
import { WorkerSpawner, type WorkerRole } from '../workers.js';
import { CircuitBreaker } from '../circuit.js';
import { ConvergenceGate } from '../gate.js';
import { Activity } from '../activity-logger.js';
import { ManagerRitual } from '../ritual.js';
import { getGitHead } from '../git_safety.js';
import {
  TICKET_PHASES,
  getPhaseFileName,
  getExpectedArtifactName,
  resolvePhaseTurnBudget,
  topologicalSort,
  detectCycles,
  getReadyTickets,
  getExecutableTicketsForSelfMeta,
  type TicketRef,
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
  /**
   * Global --max-turns override for *all* Morty phases in this campaign.
   * Use for one-off experiments or emergency. Takes precedence over everything.
   * For normal 50-tix self-dogfood on R-META, leave unset — the phase table has you covered.
   */
  maxTurns?: number;
  /**
   * Per-role turn budget map (keys are WorkerRole e.g. 'morty-phase-researcher').
   * Allows fine-grained overrides without touching source for a specific run.
   * Example: { 'morty-phase-researcher': 250, 'morty-phase-implementer': 90 }
   */
  phaseMaxTurns?: Partial<Record<WorkerRole, number>>;
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
        // Campaign no-progress watchdog (thin, heartbeat-driven, progress-timestamp based, long window). Reuses getProgressSnapshot cadence.
        const wd = sm.checkCampaignWatchdog(sessionDir);
        if (wd.alarmed) {
          emitProgress(`WATCHDOG ALARM no-progress ${wd.ageHours}h (>${wd.thresholdHours}h)`, currentTicketId || undefined, currentPhase || undefined);
        }
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

      // Phase-aware turn budget — the whole point of this extension.
      // Heavy phases (researcher/planner on P0 R-META) now get 150-180 turns by default.
      // Decision lives in phase-utils (table + resolver) so future self-PRDs have a stable target.
      const maxTurns = resolvePhaseTurnBudget(phase, options);

      const result = await spawner.spawn(phase, {
        sessionDir,
        ticketId: ticket.id,
        phase,
        prompt,
        maxTurns,
        workingDir: options.targetRoot || sm.getWorkingDirSafe(sessionDir), // CRITICAL: always target the session's grok tree (not process cwd) for real 50-tix self-dogfood detached runs
      });

      // Always invoke ritual (now the single post-return choke for success *and* stall cases).
      // Stalls wire WorkerResult.timedOut/stallReason into per-ticket repeat counter inside ritual.
      // Early !success no longer short-circuits stalls (allows N-repeat tolerance + transient pending).
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

      // Keep stallNote visibility right after spawn for logs (richer RCA now also in campaign-status + ticket fields)
      if (!result.success) {
        const stallNote = result.timedOut ? ` (stall:${result.stallReason ?? 'unknown'} killed=${!!result.killed})` : '';
        const reason = (result.failureReason || result.error || 'worker_spawn_failed') + stallNote;
        console.error(`Phase ${phase} failed for ticket ${ticket.id}: ${reason}`);
        // Activity + status decisions for stalls live in ritual (transient sets 'pending' for retry; halt sets 'failed')
      }

      if (outcome.stallHalted) {
        // Per-ticket isolation complete: N repeats hit, marked failed inside ritual + Activity + campaign-status.
        // Other tickets and campaign unaffected.
        return;
      }

      if (!outcome.valid) {
        const reason = outcome.reason || 'post_return_ritual_failed';
        console.error(`  Post-return ritual failed for ${phase}: ${reason}`);
        // Only terminal-fail + circuit + ticketFailed for non-transient cases.
        // Transient stalls (count < limit) already set to 'pending' inside ritual; do not nuke or circuit-punish.
        if (!outcome.isTransientStall) {
          Activity.phaseFailed(state.sessionId || 'unknown', ticket.id, phase, reason);
          await sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
          circuit.recordIteration(false, `phase_failed_${phase}:${reason}`);
          Activity.ticketFailed(state.sessionId || 'unknown', ticket.id, `ritual ${phase}: ${reason}`);
        }
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
      sm.recordProgress(sessionDir, `phase advance ${phase} for ${ticket.id}`);

      // META-READINESS (final gate integration): research RA may have flipped to blocked/deferred inside ritual.
      // Halt further phases for *this* ticket (research artifact + phasesCompleted up to research preserved; ticket not failed/done).
      // Top-level status filter + dep check already protect other tickets. This closes the "honest research punished" RCA.
      const liveAfter = sm.loadState(sessionDir);
      const liveT = liveAfter.tickets.find((t: any) => t.id === ticket.id);
      const liveStatus = liveT?.status;
      if (liveStatus === 'blocked' || liveStatus === 'deferred') {
        console.log(`  [orchestrator] ${ticket.id} RA signaled ${liveStatus} after ${phase} — halting remaining phases (signal for closer/self-PRD intact)`);
        try { (Activity as any).ticketReadinessBlocked?.(state.sessionId || 'unknown', ticket.id, liveStatus); } catch {}
        return; // from runTicket; outer loop proceeds to next ticket
      }

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
    sm.recordProgress(sessionDir, `ticket ${ticket.id} complete`);

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
    // META-READINESS: use topological order (prereqs before dependents) + cycle validation
    // instead of raw declaration order from the PRD/ticket emitter. Ready tickets are those
    // whose deps are satisfied (done or external). Blocked/deferred are naturally skipped.
    const allTickets = (state.tickets || []) as TicketRef[];
    const cycles = detectCycles(allTickets);
    if (cycles.length > 0) {
      console.warn(`[orchestrator] WARNING: ticket dependency cycle(s) detected — ${JSON.stringify(cycles)}. Falling back to declaration order.`);
    }

    let ticketsToProcess: any[];
    try {
      // topoSort only reorders; all tickets kept so status checks still apply to done/blocked etc.
      ticketsToProcess = topologicalSort(allTickets);
    } catch (topoErr: any) {
      console.warn(`[orchestrator] topoSort error (using declaration order): ${topoErr?.message || topoErr}`);
      ticketsToProcess = [...allTickets];
    }

    // Optional: surface initial ready set for visibility (future preflight / closer will use getReadyTickets)
    try {
      const readyNow = getReadyTickets(allTickets);
      if (readyNow.length > 0 && readyNow.length < allTickets.length) {
        console.log(`[orchestrator] Ready queue (deps satisfied): ${readyNow.map(r => r.id).join(', ')}`);
      }
    } catch {}

    // DYNAMIC META/SELF RE-SCAN (the fix for "drop the ball" on pipeline-meta PRDs):
    // After any researcher returns blocked (ritual writes the RA + suggestedPrereqs naming the H-* rescuers),
    // we re-compute executable set (normalReady UNION promoted hardening). This lets the sibling H-ANATOMY / H-SZECHUAN
    // tickets become runnable even when their static .dependencies reference the now-blocked R-META P0s.
    // Normal non-meta batches see the same termination behavior (executable shrinks to [] after last ticket).
    // When executable is empty but blocked remain, we write the rich paused state so `cat campaign-status.json`
    // is a useful live monitor instead of a t+1s stale launch snapshot.
    let iterationGuard = 0;
    const MAX_ITER = 500;

    while (true) {
      if (shutdown()) {
        console.log('[orchestrator] Shutdown flag detected — clean exit. Resumable.');
        break;
      }
      if (++iterationGuard > MAX_ITER) {
        console.warn('[orchestrator] iteration guard tripped — breaking');
        break;
      }

      const meta = sm.computeMetaPauseOrExecutable(sessionDir);
      if (meta.executable.length === 0) {
        if (meta.blocked.length > 0 && meta.pauseReason) {
          sm.updatePausedCampaignStatus(sessionDir, meta as any);
          console.log(`[orchestrator] META PAUSED — ${meta.blocked.length} blocked on RA; next hardening: ${meta.nextHardening.join(', ')}`);
        }
        break;
      }

      // Prefer a promoted (RA-suggested) hardening ticket when present for deterministic self-heal order.
      const nextTicket = (meta.promoted && meta.promoted.length > 0) ? meta.promoted[0] : meta.executable[0];

      const currentStatus =
        (sm.loadState(sessionDir).tickets.find((t: any) => t.id === nextTicket.id) || nextTicket).status;
      if (currentStatus !== 'pending' && currentStatus !== 'in_progress') {
        continue;
      }

      // META-READINESS: respect declared dependencies, but relax for promoted hardening tickets
      // (their static deps may point at the blocked P0s whose theater they exist to fix).
      const deps: string[] = (nextTicket.dependencies || []);
      if (deps.length > 0) {
        const liveState = sm.loadState(sessionDir);
        const unsatisfied = deps.filter((d: string) => {
          const dt = liveState.tickets.find((tt: any) => tt.id === d);
          return dt && dt.status !== 'done';
        });
        const isPromoted = (meta.promoted || []).some((p: any) => p.id === nextTicket.id) || (meta.nextHardening || []).includes(nextTicket.id);
        if (unsatisfied.length > 0 && !isPromoted) {
          console.log(`[orchestrator] ${nextTicket.id} skipped — unsatisfied prereqs: ${unsatisfied.join(', ')} (not 'done')`);
          continue;
        }
      }

      currentTicketId = nextTicket.id;

      try {
        await sm.markTicketInProgress(sessionDir, nextTicket.id);
      } catch (lockErr) {
        console.warn('[orchestrator] markTicketInProgress lock hiccup (non-fatal):', lockErr);
      }

      try {
        await runTicket(nextTicket);
      } catch (outerErr: any) {
        const msg = outerErr?.message || String(outerErr);
        console.error(`[orchestrator] OUTER CRASH on ticket ${nextTicket.id} (isolated — continuing): ${msg}`);
        Activity.ticketFailed(state.sessionId || 'unknown', nextTicket.id, `outer crash: ${msg}`);
        try {
          await sm.updateTicketStatus(sessionDir, nextTicket.id, 'failed');
        } catch {}
        emitProgress(`ticket ${nextTicket.id} OUTER-FAILED (isolated)`, nextTicket.id);
      } finally {
        currentPhase = null;
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

  // Grok-native: use the clean persona definition for the exact role instead of the
  // Claude send-to-morty manager script (which tells the worker to exec non-existent
  // spawn-morty.js / extension bins and causes grok CLI non-zero exits on complex researcher prompts).
  // This is the root cause of the "phase_failed_morty-phase-researcher:exec_failed" in detached runs.
  // The incoming `phase` is the full WorkerRole (e.g. 'morty-phase-researcher') — matches the persona filename exactly.
  const personaFile = `${phase}.md`;
  const personaPath = path.join(__dirname, '../../../references/personas', personaFile);
  let roleHeader = '';
  if (fs.existsSync(personaPath)) {
    roleHeader = fs.readFileSync(personaPath, 'utf8');
  } else {
    const short = phase.replace('morty-phase-', '').replace(/-/g, ' ');
    roleHeader = `You are Morty the ${short.charAt(0).toUpperCase() + short.slice(1)}.\nYour job is to perform this phase honestly for the ticket.`;
  }

  // Short Grok-headless contract (no Claude extension assumptions, direct artifact + promise contract)
  const grokContract = `## Grok Headless Worker Contract (single-turn, clean-context)
You are running as a dedicated phase specialist via the Grok CLI headless path.
Read the ticket and any prior phase artifacts from the TICKET_DIR.
Perform your phase work (theater audit first for research).
Write **exactly** the expected artifact file for this phase to the absolute path below (use file tools).
When finished, output exactly: <promise>I AM DONE</promise>
Enforce the short Git Boundary Rules below. No manager loops, no external node scripts.`;

  const sm = new SessionManager();
  const ticketPath = path.join(sm.getTicketDir(sessionDir, ticket.id), 'ticket.md');
  if (!fs.existsSync(ticketPath)) {
    throw new Error(`[orchestrator] Missing ticket.md at canonical location: ${ticketPath}. Refine or generator must use SessionManager.ensureTicketDir + write under the session.`);
  }
  const ticketContent = fs.readFileSync(ticketPath, 'utf8');

  const ticketDir = sm.getTicketDir(sessionDir, ticket.id);
  const expectedArtifact = getExpectedArtifactName(phase, ticket.id);
  const artifactPath = path.join(ticketDir, expectedArtifact);

  return [
    roleHeader,
    base,
    grokContract,
    `## Current Ticket (${ticket.id})`,
    ticketContent,
    '## Worker State & Artifact Locations (explicit — required by clean-context contract)',
    `TICKET_DIR (read prior artifacts here with your tools): ${ticketDir}`,
    `WRITE THIS PHASE'S ARTIFACT EXACTLY TO THIS ABSOLUTE PATH (use your file-write / search_replace / cat tool): ${artifactPath}`,
    'Do not rely on relative paths for pipeline artifacts; the ritual scanner will only look under the TICKET_DIR above.',
    '## Git Boundary Rules (strictly enforce)',
    'You must never run prohibited git commands. Only scoped changes inside this ticket.',
    'When finished write the required artifact at the exact path above and output exactly: <promise>I AM DONE</promise>',
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
    console.error('Usage: orchestrator.ts <sessionDir> [--heartbeat-ms 300000] [--target-root /path/to/grok-tree] [--meta] [--max-turns 180]');
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
  // Simple global override for the entire run (per-phase requires the TS API or mux options).
  // Sufficient for ad-hoc "this meta ticket is a beast" or CI experiments. Normal self-runs use the table.
  const mtIdx = process.argv.indexOf('--max-turns');
  if (mtIdx !== -1) {
    const mtRaw = parseInt(process.argv[mtIdx + 1] || '0', 10);
    if (!Number.isNaN(mtRaw) && mtRaw > 0) {
      hbOpts.maxTurns = mtRaw;
    }
  }
  runOrchestrator(sessionDir, hbOpts).catch((err) => {
    console.error('[orchestrator] Fatal error in CLI (top level):', err);
    process.exitCode = 1;
  });
}
