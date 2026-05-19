#!/usr/bin/env node
/**
 * mux-runner.ts — Production detached long-running orchestrator wrapper (Grok native)
 *
 * This is THE entrypoint for real overnight / background / "fire and forget 50+ tickets" work.
 * It sets the headless flag, wires unbreakable signal handling, heartbeats, and delegates
 * to the hardened runOrchestrator (which uses WorkerSpawner + ManagerRitual on every phase + resource-guard + campaign-status.json).
 *
 * SIGTERM/SIGINT now mean: "finish the current phase if possible, persist phasesCompleted + currentTicketId,
 * then exit cleanly so the next `npx tsx .../mux-runner <dir>` or resume picks up exactly where it died."
 *
 * No more "oops the whole campaign died because I ctrl-c'd the wrong pane".
 *
 * Hardened further: pid guard + stale lock cleanup + persistent campaign-status.json (the single source of truth for monitors)
 * so machine reboot + resume is reliable and external tools (gt, linear bots, tmux scripts) can see exactly where we are without parsing logs.
 */
import { SessionManager } from '../session.js';
import { runOrchestrator, RunOrchestratorOptions } from '../bin/orchestrator.js';

export interface DetachedOptions {
  monitor?: boolean;
  /** Override heartbeat (pass 0 to disable) */
  heartbeatIntervalMs?: number;
  /** If true, automatically reset all 'failed' tickets back to 'pending' before starting.
   *  This is the normal recovery flow after fixing an engine bug, a crash, or a bad max_turns event.
   */
  recoverFailed?: boolean;
}

export async function runDetached(sessionDir: string, options: DetachedOptions = {}) {
  console.log(`[mux-runner] Starting PRODUCTION detached run for ${sessionDir}`);

  if (!sessionDir) {
    throw new Error('[mux-runner] sessionDir is required');
  }

  // Force headless worker path for background/detached (no live spawn_subagent) — non-negotiable for overnight
  process.env.PICKLE_FORCE_HEADLESS = process.env.PICKLE_FORCE_HEADLESS || '1';

  const sm = new SessionManager();
  sm.cleanupStaleLock(sessionDir);

  const claim = await sm.claimOrchestratorRun(sessionDir);
  if (!claim.ok) {
    console.error(`[mux-runner] ${claim.reason}. Existing pid=${claim.existingPid}. Use kill or wait, or rm .orchestrator.pid if you are SURE after a reboot.`);
    throw new Error('concurrent orchestrator detected for this sessionDir');
  }

  let state: any;
  try {
    state = sm.loadState(sessionDir);
  } catch (e) {
    console.error('[mux-runner] Failed to load state:', e);
    sm.releaseOrchestratorRun(sessionDir);
    throw e;
  }

  console.log(`[mux-runner] Session ${state.sessionId}, backend=${state.backend}, tickets=${(state.tickets || []).length}`);

  // === RECOVERY (first-class core feature) ===
  // After an engine bug fix (or crash), many tickets can be left in 'failed' state even though
  // they are perfectly healthy to re-execute with the corrected worker spawner / prompt handling.
  // --recover-failed (or calling the standalone recover.ts tool) puts them back to 'pending'
  // with a clean phasesCompleted list so the 8-phase ritual starts fresh.
  if (options.recoverFailed) {
    const recovered = await sm.resetAllFailedTickets(sessionDir);
    if (recovered.length > 0) {
      console.log(`[mux-runner] --recover-failed: reset ${recovered.length} tickets → pending: ${recovered.join(', ')}`);
      // Reload state so the orchestrator sees the fresh pending list
      state = sm.loadState(sessionDir);
    } else {
      console.log('[mux-runner] --recover-failed: no failed tickets found');
    }
  }

  // Touch / init the campaign status so monitors see the run starting immediately
  const initialSnap = sm.countRemainingTickets(sessionDir);
  sm.updateCampaignStatusSync(sessionDir, {
    sessionId: state.sessionId,
    progress: initialSnap,
    note: options.recoverFailed ? 'mux-runner detached start (recovered)' : 'mux-runner detached start',
  });

  if (options.monitor) {
    console.log('[mux-runner] Monitor mode — tail activity + logs in separate pane (future TUI will be glorious). campaign-status.json is your friend for quick glances.');
  }

  // === GRACEFUL SHUTDOWN STATE (the whole point of this productionization) ===
  let shuttingDown = false;
  const shutdownRequested = () => shuttingDown;

  const gracefulHandler = (signal: string) => {
    if (shuttingDown) {
      console.error(`[mux-runner] ${signal} received again — forcing immediate exit (state already persisted up to last completed phase).`);
      sm.releaseOrchestratorRun(sessionDir);
      process.exit(130);
    }
    shuttingDown = true;
    console.log(`\n[mux-runner] ${signal} received — GRACEFUL SHUTDOWN INITIATED.`);
    console.log('  • Current worker phase will be allowed to finish (or timeout).');
    console.log('  • phasesCompleted + currentTicketId will be persisted via locked SessionManager + ritual.');
    console.log('  • Resume with the exact same sessionDir later — it will skip done phases/tickets.');
    console.log('  • Heartbeat + activity logs + campaign-status.json contain the exact handoff point.');
    console.log('  • You have 2 minutes of courtesy before we consider you impatient.\n');

    // Courtesy hard kill only if the *current phase* is a true runaway (worker already has its own staged SIGTERM)
    setTimeout(() => {
      if (shuttingDown) {
        console.error('[mux-runner] Courtesy grace period expired. Forcing exit. Resume will continue from last successful ritual checkpoint.');
        sm.releaseOrchestratorRun(sessionDir);
        process.exit(143); // conventional SIGTERM exit code
      }
    }, 120000);
  };

  process.once('SIGTERM', () => gracefulHandler('SIGTERM'));
  process.once('SIGINT', () => gracefulHandler('SIGINT'));

  // Uncaught top-level safety net (still try to persist what we can)
  process.once('uncaughtException', (err) => {
    console.error('[mux-runner] UNCAUGHT EXCEPTION (campaign will attempt resume on next run):', err);
    shuttingDown = true; // best effort
    sm.releaseOrchestratorRun(sessionDir);
    // state mutations that were in flight used locks/atomic writes — should be consistent
    process.exit(1);
  });

  const orchOptions: RunOrchestratorOptions = {
    shutdownRequested,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? 300000,
    onProgress: (info) => {
      // Status file + activity now authoritative (orchestrator keeps it fresh)
      if (info.message.includes('HEARTBEAT') || info.message.includes('COMPLETE')) {
        // already handled richly inside orchestrator + resource-guard
      }
    },
  };

  // Drive the REAL production orchestrator + ritual (no more stub)
  try {
    await runOrchestrator(sessionDir, orchOptions);
    if (shuttingDown) {
      console.log('[mux-runner] Graceful shutdown completed. Session is resumable. Go forth and conquer, Rick.');
    } else {
      console.log('[mux-runner] Detached orchestrator run completed successfully. All tickets processed. <promise>CAMPAIGN_VICTORY</promise>');
    }
  } catch (err: any) {
    console.error('[mux-runner] Orchestrator run failed hard (check activity logs + last phases + campaign-status.json for forensics):', err?.message || err);
    // State should still be consistent thanks to atomic + ritual checkpoints
    throw err;
  } finally {
    sm.releaseOrchestratorRun(sessionDir);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionDir = process.argv[2];
  const monitor = process.argv.includes('--monitor');
  const recoverFailed = process.argv.includes('--recover-failed') || process.argv.includes('--reset-failed');
  const hbIdx = process.argv.indexOf('--heartbeat-ms');
  const hb = hbIdx !== -1 ? parseInt(process.argv[hbIdx + 1] || '300000', 10) : undefined;

  const hbOpts: any = { monitor, recoverFailed };
  if (hb !== undefined) hbOpts.heartbeatIntervalMs = hb;

  runDetached(sessionDir, hbOpts).catch((e) => {
    console.error('[mux-runner] Unhandled top-level (resume recommended):', e);
    process.exitCode = 1;
  });
}
