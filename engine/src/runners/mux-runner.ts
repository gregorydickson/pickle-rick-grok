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
import * as os from 'os';
import { execSync } from 'child_process';
import { runPostCampaignPhases } from '../lib/post-campaign.js';

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

/** 
 * Early grok CLI discovery probe.
 * Now the bouncer that makes "grok not in PATH or bad binary" FATAL for detached runs.
 * Supports PICKLE_GROK_BIN override + optional PICKLE_AUTO_INJECT_GROK=1 scan+PATH-mutate.
 * Always writes worker-env-probe.json + returns rich object with grokOk.
 * Surface result at every launch path so no more silent exec_failed Jerry parades.
 */
export function runWorkerEnvProbe(sessionDir: string): any {
  const p = (process.env.PATH || '').split(path.delimiter).slice(0, 6);
  const probe: any = {
    ts: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    pathHead: p,
    cwd: process.cwd(),
    PICKLE_FORCE_HEADLESS: process.env.PICKLE_FORCE_HEADLESS || null,
    PICKLE_WORKER_OUTPUT_STALL_MS: process.env.PICKLE_WORKER_OUTPUT_STALL_MS || null,
    PICKLE_WORKER_WALL_HANG_MS: process.env.PICKLE_WORKER_WALL_HANG_MS || null,
    PICKLE_GROK_BIN: process.env.PICKLE_GROK_BIN || null,
    PICKLE_AUTO_INJECT_GROK: process.env.PICKLE_AUTO_INJECT_GROK || null,
  };

  // Rick's discovery: explicit env > current which > common bins (macOS/homebrew/userland hell)
  function discoverGrokBin(): { bin: string | null; source: string } {
    const envSet = process.env.PICKLE_GROK_BIN;
    if (envSet && fs.existsSync(envSet)) {
      return { bin: envSet, source: 'PICKLE_GROK_BIN' };
    }
    try {
      const w = execSync('which grok 2>/dev/null || which grok-cli 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 4000 }).trim();
      if (w && fs.existsSync(w)) {
        return { bin: w, source: 'which' };
      }
    } catch {}
    const home = (os && os.homedir ? os.homedir() : (process.env.HOME || process.env.USERPROFILE || ''));
    const candidates = [
      path.join(home, '.local', 'bin', 'grok'),
      path.join(home, 'bin', 'grok'),
      path.join(home, '.local', 'bin', 'grok-cli'),
      '/usr/local/bin/grok',
      '/opt/homebrew/bin/grok',
      '/usr/bin/grok',
      '/usr/local/bin/grok-cli',
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) {
        return { bin: c, source: 'common-location' };
      }
    }
    return { bin: null, source: 'none' };
  }

  const autoInject = !!process.env.PICKLE_AUTO_INJECT_GROK;
  let resolvedGrok = 'grok';
  let grokSource = 'PATH';
  let autoInjected: string | null = null;
  const disc = discoverGrokBin();
  if (disc.bin) {
    resolvedGrok = disc.bin;
    grokSource = disc.source;
    const shouldAutoFix = (disc.source === 'common-location' && autoInject) || disc.source === 'PICKLE_GROK_BIN';
    if (shouldAutoFix) {
      if (!process.env.PICKLE_GROK_BIN) {
        process.env.PICKLE_GROK_BIN = disc.bin;
        probe.PICKLE_GROK_BIN = disc.bin;
      }
      const dir = path.dirname(disc.bin);
      const curP = process.env.PATH || '';
      if (dir && !curP.split(path.delimiter).some((d: string) => d === dir)) {
        process.env.PATH = dir + path.delimiter + curP;
        autoInjected = disc.bin;
        probe.pathHead = (process.env.PATH || '').split(path.delimiter).slice(0, 6);
      }
    }
  }
  probe.resolvedGrok = resolvedGrok;
  probe.grokSource = grokSource;

  // Post-mutate which test: this is what bare "grok" in worker sh -c will actually see
  try {
    const w = execSync('which grok 2>/dev/null || which grok-cli 2>/dev/null || echo "GROK_NOT_IN_PATH"', { encoding: 'utf8', timeout: 4000 }).trim();
    probe.whichGrok = w;
    probe.grokInPath = !w.includes('NOT_IN_PATH');
  } catch (e: any) {
    probe.whichErr = e?.message || String(e);
    probe.grokInPath = false;
  }

  // Help probe via best-resolved (full path succeeds even before PATH tweak; proves the binary is real)
  try {
    const helpCmd = (resolvedGrok.includes(path.sep) || resolvedGrok.includes('\\'))
      ? `"${resolvedGrok}" --help 2>&1 | head -5`
      : `${resolvedGrok} --help 2>&1 | head -5`;
    probe.grokHelp = execSync(helpCmd, { encoding: 'utf8', timeout: 6000 }).trim().slice(0, 200);
  } catch (e: any) {
    probe.helpErr = (e?.status ? `exit=${e.status}` : (e?.message || String(e)));
  }

  // Verdict: will workers using bare `grok` in their env actually succeed?
  const h = (probe.grokHelp || '') + (probe.helpErr || '');
  const badHelp = /command not found|not found|No such file|exec format|permission denied/i.test(h);
  probe.grokOk = !!(probe.grokInPath && probe.grokHelp && probe.grokHelp.length > 5 && !badHelp && !probe.helpErr);
  if (autoInjected) probe.autoInjected = autoInjected;

  // Persist for forensics (always, even on fatal path)
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

  // Grok CLI discovery probe — FATAL EARLY on failure for ALL detached runs (the exec_failed exterminator).
  // Always surface the result. Optional auto-inject + PICKLE_GROK_BIN honored here so downstream workers see fixed PATH.
  const probe = runWorkerEnvProbe(sessionDir);
  console.log(`[mux-runner] grok CLI probe surfaced: ok=${probe.grokOk} via=${probe.grokSource} resolved=${probe.resolvedGrok} which=${probe.whichGrok} autoInjected=${probe.autoInjected || 'none'} PICKLE_GROK_BIN=${probe.PICKLE_GROK_BIN || 'unset'}`);
  if (!probe.grokOk) {
    const rca = `[mux-runner] FATAL: grok CLI not discoverable (grokOk=false). This is THE root cause of the silent mass "exec_failed" worker failures that used to nuke entire overnight detached/self-improvement campaigns with zero early signal.

Probe snapshot: ${JSON.stringify({ which: probe.whichGrok, resolved: probe.resolvedGrok, source: probe.grokSource, helpPreview: (probe.grokHelp || '').slice(0, 80), helpErr: probe.helpErr, pathHead: probe.pathHead, PICKLE_GROK_BIN: probe.PICKLE_GROK_BIN }, null, 2)}

Recovery (one of these before you launch the mux or run-pipeline --background):
  1. Put grok in a dir that non-interactive shells actually inherit: export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH" (and source your zshenv not just zshrc).
  2. Explicit override: PICKLE_GROK_BIN=/absolute/path/to/grok-binary   (we prepend its dir to PATH so bare "grok" in workers works).
  3. Lazy auto: PICKLE_AUTO_INJECT_GROK=1   — we hunt the usual suspects (~/.local/bin/grok, homebrew, /usr/local) and inject if present.

Full details in ${path.join(sessionDir, 'worker-env-probe.json')} and the fatal entry we are writing to campaign-status.json RIGHT NOW.
This aborts BEFORE any orchestrator/ritual/worker spawn. No more 200-ticket ghost parade of exec_failed.

`;
    console.error(rca);
    try {
      sm.updateCampaignStatusSync(sessionDir, {
        fatalGrokDiscovery: true,
        grokProbe: probe,
        note: 'FATAL: grok CLI discovery failed early — prevents exec_failed mass failure class in detached runs',
        error: 'grok-not-discoverable-for-detached',
        lastGrokProbeTs: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('[mux-runner] campaign-status fatal grok probe update non-fatal:', e?.message);
    }
    sm.releaseOrchestratorRun(sessionDir);
    throw new Error('grok CLI discovery failed fatally early for detached run (see RCA + recovery in logs above + campaign-status.json)');
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

  // Surface provenance/seal from single owner (post-hydra collapse)
  const seal = sm.getManifestSeal(sessionDir);
  if (seal?.prdPath) {
    console.log(`[mux-runner] Provenance: prd=${seal.prdPath} seal=${seal.ticketManifestHash ? 'present' : 'none'}`);
  }

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
  sm.recordProgress(sessionDir, 'mux-runner detached start');

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
        const postReport = await runPostCampaignPhases(sessionDir, postTarget, {
          log: (m: string) => console.log(m),
        });
        console.log(`[mux-runner] Post-campaign centralized: overall=${postReport.overallSuccess} failures=[${postReport.recoverableFailures.join(', ') || 'none'}] shouldReleaseCloser=${postReport.shouldReleaseCloser}`);

        // Closer + ingest (for self-improvement / chain-post meta). Ledger decision is advisory.
        try {
          const clMod: any = await import('../self-improvement-loop-closer.js');
          const prdMod: any = await import('../self-prd-generator.js');
          const clRes = await clMod.runSelfImprovementLoopCloser(sessionDir, postTarget);
          console.log(`[mux-runner] Post Closer: ${clRes?.summary || 'done'}`);
          if (clRes?.verifyTheaterDetected) console.log(`[mux-runner] H-VERIFY self-heal engaged: ${clRes.hardeningTicketsEmitted || 0}`);
          await prdMod.performPostCampaignIngest(postTarget, sessionDir);
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
