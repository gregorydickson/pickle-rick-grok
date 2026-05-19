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
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DetachedOptions {
  monitor?: boolean;
  /** Override heartbeat (pass 0 to disable) */
  heartbeatIntervalMs?: number;
  /** If true, automatically reset all 'failed' tickets back to 'pending' before starting.
   *  This is the normal recovery flow after fixing an engine bug, a crash, or a bad max_turns event.
   *  (blocked/deferred statuses from readiness assessment are left as-is — they signal prereqs.)
   */
  recoverFailed?: boolean;
  /** Force post phases (citadel+anatomy+szechuan+closer) after orchestrator success. */
  chainPost?: boolean;
  /** Marks as self-improvement run for auto post-chaining detection. */
  selfImprovement?: boolean;
}

/** Cheap early env probe for worker spawns (captures PATH/grok visibility for "works in shell, fails in mux" RCA). */
function runWorkerEnvProbe(sessionDir: string): any {
  const p = (process.env.PATH || '').split(path.delimiter).slice(0, 6);
  const probe: any = {
    ts: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    pathHead: p,
    cwd: process.cwd(),
    PICKLE_FORCE_HEADLESS: process.env.PICKLE_FORCE_HEADLESS || null,
  };
  try {
    const w = execSync('which grok 2>/dev/null || which grok-cli 2>/dev/null || echo "GROK_NOT_IN_PATH"', { encoding: 'utf8', timeout: 4000 }).trim();
    probe.whichGrok = w;
    probe.grokInPath = !w.includes('NOT_IN_PATH');
  } catch (e: any) {
    probe.whichErr = e?.message || String(e);
  }
  try {
    probe.grokHelp = execSync('grok --help 2>&1 | head -3', { encoding: 'utf8', timeout: 6000 }).trim().slice(0, 180);
  } catch (e: any) {
    probe.helpErr = (e?.status ? `exit=${e.status}` : (e?.message || String(e)));
  }
  try {
    const probeFile = path.join(sessionDir, 'worker-env-probe.json');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(probeFile, JSON.stringify(probe, null, 2));
  } catch (e: any) {
    console.warn('[mux-runner] env-probe write skipped:', e?.message);
  }
  return probe;
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

  // Early cheap env probe (before heavy load) — forensics for grok CLI visibility in spawned workers
  const probe = runWorkerEnvProbe(sessionDir);
  if (probe.grokInPath === false) {
    console.warn('[mux-runner] WARNING: grok not found in PATH for this worker env — interactive may work, detached spawns will fail. See worker-env-probe.json');
  }

  // P0 guard: validate full ticket.md artifacts exist vs state (catches partial refine / zombie tickets)
  // BEFORE loading heavy state or entering orchestrator. Hard fail with recovery.
  try {
    const val = sm.validateTicketArtifacts(sessionDir);
    if (!val.valid) {
      console.error(val.error || '[mux-runner] validateTicketArtifacts P0 GUARD FAILED');
      console.error('Recovery: rm -rf ' + sessionDir + ' ; re-invoke via run-pipeline --prd ... --fresh then /pickle-refine-prd ; or npx tsx engine/src/bin/recover.ts ' + sessionDir + ' --reset-failed --force');
      sm.releaseOrchestratorRun(sessionDir);
      throw new Error('[mux-runner] P0 ticket artifacts validation failed (partial-refine zombie)');
    }
  } catch (vErr: any) {
    if (String(vErr?.message || vErr).includes('P0 ticket') || String(vErr?.message || vErr).includes('validateTicketArtifacts')) {
      throw vErr;
    }
    // non-fatal on unexpected (e.g. no state yet)
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

  // Surface new readiness statuses (blocked/deferred) for meta PRDs
  const blocked = (state.tickets || []).filter((t: any) => t.status === 'blocked');
  const deferred = (state.tickets || []).filter((t: any) => t.status === 'deferred');
  if (blocked.length || deferred.length) {
    console.log(`[mux-runner] Readiness statuses present — blocked: ${blocked.map((t: any)=>t.id).join(', ') || 'none'}, deferred: ${deferred.map((t: any)=>t.id).join(', ') || 'none'}`);
  }

  // === RECOVERY (first-class core feature) ===
  // After an engine bug fix (or crash), many tickets can be left in 'failed' state even though
  // they are perfectly healthy to re-execute with the corrected worker spawner / prompt handling.
  // --recover-failed (or calling the standalone recover.ts tool) puts them back to 'pending'
  // with a clean phasesCompleted list so the 8-phase ritual starts fresh.
  // Note: blocked/deferred are *not* auto-reset; they require explicit research readiness fixes first.
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

  // Decide post-chaining: explicit flag, or self-improvement flag, or auto-detect R-META/self-meta tickets in state
  const hasMetaTickets = (state.tickets || []).some((t: any) =>
    String(t.id || '').startsWith('R-META') || t.isSelfMeta || t.meta
  );
  const shouldChainPost = !!(options.chainPost || options.selfImprovement || hasMetaTickets || (state as any).selfImprovement);

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
    if (!shuttingDown && shouldChainPost) {
      const postTarget = sm.getWorkingDirSafe(sessionDir);
      console.log(`[mux-runner] SUCCESS + chain-post/self-meta: running best-effort post block (citadel+anatomy+szechuan+closer) to ${postTarget} before lock release`);
      try {
        // Citadel
        try {
          const citMod: any = await import('../citadel.js');
          const c = citMod.runCitadel(sessionDir);
          console.log(`[mux-runner] Post Citadel: ${c?.findings?.length ?? 0} findings (overall=${c?.overall || 'PASS'})`);
        } catch (ce: any) { console.error('[mux-runner] post-citadel non-fatal:', ce?.message || ce); }

        // Anatomy Park
        try {
          const anaMod: any = await import('../anatomy.js');
          const anatomy = new anaMod.AnatomyParkDriver(sessionDir);
          const apSubs = ['engine/src', 'skills', 'references', 'prds'];
          let apState: any; try { apState = anatomy.load(); } catch { apState = anatomy.init(apSubs); }
          for (const sub of apSubs) {
            const r = anatomy.executeThreePhaseCycle(apState, sub);
            console.log(`  [anatomy] ${sub}: ${r?.ok ? 'ok' : 'issues'} trap=${!!r?.trapDoorAdded}`);
          }
        } catch (ae: any) { console.error('[mux-runner] post-anatomy non-fatal:', ae?.message || ae); }

        // Szechuan
        try {
          const szMod: any = await import('../szechuan.js');
          const szech = new szMod.SzechuanDriver(sessionDir);
          let szState: any; try { szState = szech.load(); } catch { szState = szech.init([postTarget]); }
          const szr = szech.runConvergence(szState);
          console.log(`[mux-runner] Post Szechuan: converged=${!!szr?.converged} iters=${szr?.iterations || 0}`);
        } catch (se: any) { console.error('[mux-runner] post-szechuan non-fatal:', se?.message || se); }

        // Closer + post-campaign ingest (for self-improvement)
        try {
          const clMod: any = await import('../self-improvement-loop-closer.js');
          const prdMod: any = await import('../self-prd-generator.js');
          const clRes = clMod.runSelfImprovementLoopCloser(sessionDir, postTarget);
          console.log(`[mux-runner] Post Closer: ${clRes?.summary || 'done'}`);
          prdMod.performPostCampaignIngest(postTarget, sessionDir);
        } catch (ce: any) { console.error('[mux-runner] post-closer/ingest non-fatal:', ce?.message || ce); }
      } catch (pErr: any) {
        console.error('[mux-runner] Post block error (non-fatal):', pErr?.message || pErr);
      }
    }
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
  const chainPost = process.argv.includes('--chain-post');
  const selfImp = process.argv.includes('--self-improvement');
  const hbIdx = process.argv.indexOf('--heartbeat-ms');
  const hb = hbIdx !== -1 ? parseInt(process.argv[hbIdx + 1] || '300000', 10) : undefined;

  const hbOpts: any = { monitor, recoverFailed, chainPost, selfImprovement: selfImp };
  if (hb !== undefined) hbOpts.heartbeatIntervalMs = hb;

  runDetached(sessionDir, hbOpts).catch((e) => {
    console.error('[mux-runner] Unhandled top-level (resume recommended):', e);
    process.exitCode = 1;
  });
}
