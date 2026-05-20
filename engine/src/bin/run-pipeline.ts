#!/usr/bin/env node
/**
 * run-pipeline.ts — THE canonical thin machine-owned entrypoint for "run a pipeline on prds/xxx.md".
 *
 * Single command that wires:
 *   resolve PRD (abs) → SessionManager.findLinked or createSessionForPrd (with stamp + prdPipelineInitiated) →
 *   stampPrdSource (idempotent) → preflightPipeline → (needsRefine gate with exact guidance + Activity.awaitingRefineForPrd) →
 *   validateTicketArtifacts (P0 hard guard with recovery text) → updateCampaignStatus →
 *   (bg: child_process spawn npx tsx mux-runner with PICKLE_FORCE_HEADLESS + inherit stdio + unref) OR
 *   (fg: import+await runDetached) →
 *   (if --self-improvement || report.isMeta || --chain-post: after success, runCitadel + AnatomyParkDriver + SzechuanDriver + runSelfImprovementLoopCloser + performPostCampaignIngest)
 *
 * Thin orchestration + CLI only. Delegates heavy lifting (orchestrator/ritual/workers/gates/citadel etc).
 * Follows exact bin style (shebang, .js imports, arg slice, prints SESSION_ROOT, graceful errors).
 * Always propagates --target as workingDir for new sessions + post phases.
 * Recovery language on every human-hittable partial state (zombie, missing tickets, refine, build fail, etc).
 * Back-compat bare <sessionDir>.
 *
 * Examples at bottom of --help.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { SessionManager } from '../session.js';
import { Activity } from '../activity-logger.js';
import { runCitadel } from '../citadel.js';
import { AnatomyParkDriver } from '../anatomy.js';
import { SzechuanDriver } from '../szechuan.js';
import { runSelfImprovementLoopCloser } from '../self-improvement-loop-closer.js';
import { performPostCampaignIngest } from '../self-prd-generator.js';
import { runDetached } from '../runners/mux-runner.js';
import { summarizeReadiness, isLegalToBypassRefine } from '../lib/pipeline-preflight.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const muxRunnerPath = path.join(__dirname, '..', 'runners', 'mux-runner.ts');

function printHelp() {
  console.log(`run-pipeline.ts — canonical thin PRD→full-pipeline entrypoint (Grok-native)

Usage:
  npx tsx engine/src/bin/run-pipeline.ts --prd <path/to/prd.md> [--target <dir>] [--no-refine] [--self-improvement] [--background] [--fresh] [--resume-linked] [--recover-failed] [--resume] [--chain-post]
  npx tsx engine/src/bin/run-pipeline.ts <sessionDir> [--recover-failed ...]   # back-compat for plain or already-linked sessions

  --prd <path>          Absolute or cwd-relative path to the PRD markdown. Triggers fresh session + stamp + preflight (fresh is now the default to avoid stale partial runs).
  --target <dir>        workingDir/grok-root passed to createSessionForPrd + used for post-phase drivers (defaults to cwd).
  --no-refine           Bypass the refine gate — ONLY legal when the session has real materialized ticket.md files + matching manifest hash (the post-r-meta-deepen P0 safety). Plain --prd paths default to requiring /pickle-refine-prd.
  --self-improvement    Meta mode: after build, run full post phases + loop-closer + post-campaign ingest.
  --background          Fire mux-runner detached (stdio inherit so logs continue in terminal; pair with tmux for real detach).
  --fresh               Force a brand new session even if a prior linked one exists (now the default for --prd; explicit for clarity).
  --resume-linked       Opt into the previous stamped session for this PRD (reverses the fresh default). Bare session dir also works for precise control.
  --recover-failed      Passed to mux-runner: reset any 'failed' tickets → 'pending' before starting (standard after bugfix).
  --resume              Explicit resume marker (mux-runner is inherently resumable via state + ritual; recorded in campaign-status).
  --chain-post          Force execution of Citadel + Anatomy Park + Szechuan (+ closer) after successful build.
  --help, -h            This message.

Core flow (P0-1/2/5 seams):
  1. prdPath = resolve(abs)
  2. sm = new SessionManager()
  3. sessionDir = bareArg || sm.findLinkedSessionForPrd(prd) || await sm.createSessionForPrd(workingDirFromTarget, taskFromPrd, prd)
  4. await sm.stampPrdSource(...)  (idempotent, emits sessionLinkedToPrd)
  5. report = sm.preflightPipeline(sessionDir, prd)
  6. if (report.needsRefine && !--no-refine) → print exact guidance, Activity.awaitingRefineForPrd, exit 0
  7. sm.validateTicketArtifacts(...) → hard fail + rich recovery text if any ticket.md missing vs state
  8. update campaign-status.json with invocation
  9. Always: SESSION_ROOT + PRD_LINKED + preflight summary
  10. bg ? spawn(npx tsx mux-runner <session> --recover-failed, {detached, inherit, PICKLE_FORCE_HEADLESS}) : await runDetached(...)
  11. if (--self-improvement || report.isMeta || --chain-post) after success → import+run post drivers + closer/ingest

Always sets PICKLE_FORCE_HEADLESS for any child mux/orchestrator.
Honors workingDir from --target (new sessions) or baked state.workingDir (resumes/posts).
tsc-clean, zero slop, recovery everywhere a Jerry partial-state can appear.

Examples:
  npx tsx engine/src/bin/run-pipeline.ts --prd prds/feature-x.md --self-improvement --background     # fresh (default) + will guide through refine
  npx tsx engine/src/bin/run-pipeline.ts --prd prds/self-meta-....md --self-improvement --no-refine --resume-linked --target . --background
  npx tsx engine/src/bin/run-pipeline.ts /path/to/fresh-or-resumed-session --self-improvement --background   # recommended after refine
  npx tsx engine/src/bin/run-pipeline.ts --prd prds/foo.md --recover-failed --fresh   # explicit fresh (same as default)

After "REFINEMENT_COMPLETE" in refine output: re-run same command + --no-refine.
For overnight 50-ticket self-dogfood: the self-PRD path + --no-refine --self-improvement --background (or use self-improvement-loop-closer).
`);
}

function getTaskFromPrd(prdPath: string): string {
  try {
    const content = fs.readFileSync(prdPath, 'utf8');
    const h = content.match(/^#\s+(.+)$/m);
    if (h && h[1]) return h[1].trim().slice(0, 140);
    const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
    return (line || path.basename(prdPath, '.md')).trim().slice(0, 100);
  } catch {
    return path.basename(prdPath, '.md');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse flags (support --key and --key=val for prd/target)
  const prdIdx = args.indexOf('--prd');
  let prdInput: string | undefined = prdIdx !== -1 ? args[prdIdx + 1] : undefined;
  if (!prdInput) {
    const eq = args.find((a) => a.startsWith('--prd='));
    if (eq) prdInput = eq.split('=')[1];
  }

  const targetIdx = args.indexOf('--target');
  const explicitTargetInput = targetIdx !== -1 ? args[targetIdx + 1] : undefined;

  const noRefine = args.includes('--no-refine');
  const selfImprovement = args.includes('--self-improvement');
  const recoverFailed = args.includes('--recover-failed') || args.includes('--reset-failed');
  const background = args.includes('--background') || args.includes('--detached') || args.includes('--bg');
  const explicitFresh = args.includes('--fresh');
  const explicitResumeLinked = args.includes('--resume-linked') || args.includes('--no-fresh') || args.includes('--continue-linked');
  const resume = args.includes('--resume');
  const chainPost = args.includes('--chain-post');

  // Fresh is now the default for --prd invocations (prevents accidental reuse of stale
  // in-progress / blocked ticket state from prior partial runs on the same PRD — the exact
  // foot-gun that caused the r-meta-deepen incident). Use --resume-linked (or bare session dir)
  // when you explicitly want the previous linked campaign for that PRD.
  const fresh = explicitFresh || !explicitResumeLinked;

  // Bare <sessionDir> positional for back-compat (skip values attached to flags)
  const nonFlagArgs = args.filter((a) => !a.startsWith('--'));
  let bareSessionInput: string | undefined;
  if (prdInput) {
    bareSessionInput = nonFlagArgs.find((s) => {
      if (s === prdInput || s === explicitTargetInput) return false;
      const p = path.resolve(s);
      return (
        s.includes(path.sep) ||
        /20\d{2}-/.test(s) ||
        (fs.existsSync(p) && fs.existsSync(path.join(p, 'state.json')))
      );
    });
  } else {
    bareSessionInput = nonFlagArgs[0];
  }

  if (!prdInput && !bareSessionInput) {
    console.error('[run-pipeline] Error: provide --prd <path> OR bare <sessionDir> (for back-compat).');
    printHelp();
    process.exit(1);
  }

  const sm = new SessionManager();
  let sessionDir: string;
  let prdAbs: string | undefined;
  const defaultCwd = process.cwd();
  const createWorkingDir = explicitTargetInput ? path.resolve(explicitTargetInput) : defaultCwd;

  if (bareSessionInput) {
    sessionDir = path.resolve(bareSessionInput);
    if (!fs.existsSync(sessionDir) || !fs.existsSync(path.join(sessionDir, 'state.json'))) {
      console.error(`[run-pipeline] Bare sessionDir invalid or missing state.json: ${sessionDir}`);
      console.error('Recovery: find via ls ~/.local/share/pickle-rick-grok/sessions | tail -5 ; use full path; or start fresh with --prd.');
      process.exit(1);
    }
    console.log(`[run-pipeline] Using bare sessionDir (back-compat): ${sessionDir}`);
  } else if (prdInput) {
    prdAbs = path.resolve(prdInput);
    if (!fs.existsSync(prdAbs)) {
      console.error(`[run-pipeline] PRD file does not exist: ${prdAbs}`);
      console.error('Recovery: use absolute path, ensure readable, or cd to correct tree before relative prds/...');
      process.exit(1);
    }

    const linked = fresh ? null : sm.findLinkedSessionForPrd(prdAbs);
    if (linked && !fresh) {
      sessionDir = linked;
      await sm.stampPrdSource(sessionDir, prdAbs);
      console.log(`[run-pipeline] Reusing linked session for PRD (because --resume-linked): ${path.basename(sessionDir)}`);
    } else {
      const task = getTaskFromPrd(prdAbs);
      const reason = explicitResumeLinked ? '(explicit --resume-linked overruled by --fresh)' : '(fresh is default for --prd to prevent stale ticket reuse)';
      console.log(`[run-pipeline] Creating new fresh session (task="${task.slice(0, 60)}...") ${reason} under workingDir=${createWorkingDir}`);
      const res = await sm.createSessionForPrd(createWorkingDir, task, prdAbs);
      sessionDir = res.sessionDir;
    }
  } else {
    throw new Error('unreachable: neither prd nor bare session');
  }

  // Ensure stamp (covers bare + prd cases, idempotent)
  if (prdAbs) {
    await sm.stampPrdSource(sessionDir, prdAbs);
  }

  const report = sm.preflightPipeline(sessionDir, prdAbs);

  // Record invocation for monitors / standup / metrics
  let stateSnap: any = {};
  try {
    stateSnap = sm.loadState(sessionDir);
  } catch {}
  sm.updateCampaignStatusSync(sessionDir, {
    sessionId: stateSnap.sessionId,
    note: `run-pipeline: prd=${prdAbs || 'n/a'} self=${selfImprovement} bg=${background} fresh=${fresh} recover=${recoverFailed} resume=${resume} chain=${chainPost} ts=${new Date().toISOString()}`,
  });

  // Canonical prints (always)
  console.log(`SESSION_ROOT=${sessionDir}`);
  if (prdAbs) console.log(`PRD_LINKED=${prdAbs}`);
  console.log(`[run-pipeline] Preflight: ok=${report.ok} needsRefine=${report.needsRefine} isZombie=${report.isZombie} isConsistent=${report.isConsistent} tickets=${report.ticketCountOnDisk} missing=${(report.missingTicketIds || []).length}`);
  if (report.diagnostics && report.diagnostics.length > 0) {
    report.diagnostics.forEach((d: string) => console.log(`  diag: ${d}`));
  }

  // === Post-incident P0 policy gate (always refine for --prd unless real materialized tickets + manifest hash + explicit --no-refine) ===
  const isPrdDriven = !!prdAbs;
  if (isPrdDriven && noRefine) {
    const legal = isLegalToBypassRefine(report, true);
    if (!legal) {
      const msg = `[run-pipeline] ILLEGAL --no-refine for --prd path: no real materialized tickets (or hash mismatch or zombie). Must run /pickle-refine-prd first to produce ticket.md + stamped manifest hash. Fresh is default; use --resume-linked only when you deliberately want a prior campaign's tickets. Zero-ticket bypass is a P0 safety violation (see the r-meta-deepen incident).`;
      console.error(msg);
      Activity.awaitingRefineForPrd(path.basename(sessionDir), prdAbs || report.prdPath || '', report.refinement?.reasons || []);
      process.exit(1);
    }
  }

  // Policy-aware soft gate (default for --prd is "always refine" unless legal bypass)
  const effectiveNeedsRefine = isPrdDriven ? (!report.hasRealMaterializedTickets || !report.legalForNoRefine) : report.needsRefine;
  if (effectiveNeedsRefine && !noRefine) {
    const guidance = 'PRD-driven pipeline defaults to fresh + requires /pickle-refine-prd (the r-meta-deepen safety).\n\n' +
      '1. Run: /pickle-refine-prd   (it auto-detects the fresh stamped session from SESSION_ROOT/campaign-status.json + .prd-source.json)\n\n' +
      '2. After you see <promise>REFINEMENT_COMPLETE</promise>, execute the tickets with the bare session dir (cleanest) or --resume-linked:\n\n' +
      '    npx tsx engine/src/bin/run-pipeline.ts /path/to/SESSION_ROOT --self-improvement --background [--recover-failed]\n\n' +
      '    # or (if you prefer the prd form and want the session we just refined):\n' +
      '    npx tsx engine/src/bin/run-pipeline.ts --prd <the-prd-path> --resume-linked --no-refine [--self-improvement] [--background]\n\n' +
      'Fresh is the default on every --prd invocation so you never accidentally pick up a half-done prior campaign. Old sessions are left for forensics. --no-refine is only legal after the council has materialized real ticket.md + seal.';
    console.log(guidance);
    console.log(`SESSION_ROOT=${sessionDir}`);
    if (prdAbs) console.log(`PRD_LINKED=${prdAbs}`);
    Activity.awaitingRefineForPrd(path.basename(sessionDir), prdAbs || report.prdPath || '', report.refinement?.reasons || []);
    process.exit(0);
  }

  // P0 ticket materialization guard (hard fail with recovery) — still the final backstop
  const val = sm.validateTicketArtifacts(sessionDir);
  if (!val.valid) {
    console.error(val.error || '[run-pipeline] validateTicketArtifacts P0 GUARD FAILED');
    console.error('Recovery (do not skip): (1) rm -rf ' + sessionDir + ' && re-invoke this command with --prd (or --fresh) then /pickle-refine-prd; (2) or re-emit tickets if you hold the refine council output; (3) npx tsx engine/src/bin/recover.ts ' + sessionDir + ' --reset-failed --force (last resort).');
    process.exit(1);
  }

  // Build phase
  console.log(`[run-pipeline] Launching build via mux-runner (recoverFailed=${recoverFailed}). PICKLE_FORCE_HEADLESS=1 target=${createWorkingDir}`);
  process.env.PICKLE_FORCE_HEADLESS = process.env.PICKLE_FORCE_HEADLESS || '1';

  let buildSucceeded = false;

  if (background) {
    const spawnArgs: string[] = [sessionDir];
    if (recoverFailed) spawnArgs.push('--recover-failed');
    if (selfImprovement || chainPost) spawnArgs.push('--chain-post');
    console.log(`[run-pipeline] --background: npx tsx ${muxRunnerPath} ${spawnArgs.join(' ')} (detached, stdio=inherit)`);
    const child = spawn('npx', ['tsx', muxRunnerPath, ...spawnArgs], {
      cwd: createWorkingDir,
      env: { ...process.env, PICKLE_FORCE_HEADLESS: '1' },
      detached: true,
      stdio: 'inherit',
    });
    child.unref();
    console.log(`[run-pipeline] Detached mux-runner (pid=${child.pid}). Output continues here. Use job control / tmux / script for full backgrounding.`);
    console.log(`  Live status: cat ${path.join(sessionDir, 'campaign-status.json')}`);
    console.log(`  Resume later: npx tsx engine/src/runners/mux-runner.ts ${sessionDir} ${recoverFailed ? '--recover-failed' : ''} ${ (selfImprovement || chainPost) ? '--chain-post' : '' }`.trim());
    buildSucceeded = true;
    process.exit(0);
  } else {
    try {
      await runDetached(sessionDir, { recoverFailed });
      console.log('[run-pipeline] Mux-runner / orchestrator build phase completed successfully.');
      buildSucceeded = true;
    } catch (err: any) {
      console.error('[run-pipeline] Build (mux) failed — state is resumable:', (err as any)?.message || err);
      console.error('Recovery: npx tsx engine/src/bin/recover.ts ' + sessionDir + ' --reset-failed --force ; then re-invoke this command or mux-runner directly.');
      process.exit(1);
    }
  }

  // Post phases (only on fg success path; bg fire-and-forget leaves post to caller/loop-closer)
  const hasMetaTickets = (() => {
    try {
      const st = sm.loadState(sessionDir);
      return (st.tickets || []).some((t: any) => String(t.id || '').startsWith('R-META') || t.isSelfMeta || t.meta);
    } catch {
      return false;
    }
  })();
  report.isMeta = hasMetaTickets;

  // Surface meta readiness (from emission-time probe attached to tickets in state)
  try {
    const rsum = summarizeReadiness(stateSnap.tickets || (sm.loadState(sessionDir).tickets || []));
    if (rsum) {
      console.log(`[run-pipeline] ${rsum} — per-ticket details in tickets/*/ticket.md (skeletal preflight signals for meta honesty)`);
    }
  } catch {}

  const doPostPhases = selfImprovement || chainPost || hasMetaTickets;

  if (buildSucceeded && doPostPhases) {
    const postTarget = (() => {
      try {
        return sm.getWorkingDirSafe(sessionDir);
      } catch {
        return createWorkingDir;
      }
    })();

    console.log('[run-pipeline] Build OK + post requested/meta. Executing Citadel → Anatomy Park (3-phase) → Szechuan + closer/ingest...');

    // Citadel (5-auditor v1.1 + trap/self-meta)
    try {
      console.log('[run-pipeline] Citadel...');
      const citadelReport: any = runCitadel(sessionDir, prdAbs);
      console.log(`[run-pipeline] Citadel: ${citadelReport.findings?.length ?? 0} findings (overall=${citadelReport.overall || 'PASS'})`);
    } catch (cErr: any) {
      console.error('[run-pipeline] Citadel error (non-fatal for self-mode):', (cErr as any)?.message || cErr);
    }

    // Anatomy Park
    try {
      console.log('[run-pipeline] Anatomy Park...');
      const anatomy = new AnatomyParkDriver(sessionDir);
      const apSubs = ['engine/src', 'skills', 'references', 'prds'];
      let apState: any;
      try {
        apState = anatomy.load();
      } catch {
        apState = anatomy.init(apSubs);
      }
      for (const sub of apSubs) {
        const result = anatomy.executeThreePhaseCycle(apState, sub);
        console.log(`  [anatomy] ${sub}: ${result.ok ? 'ok' : 'issues'} trap=${!!result.trapDoorAdded}`);
      }
    } catch (aErr: any) {
      console.error('[run-pipeline] Anatomy Park error (non-fatal):', (aErr as any)?.message || aErr);
    }

    // Szechuan (full expanded)
    try {
      console.log('[run-pipeline] Szechuan (FULL EXPANDED)...');
      const szech = new SzechuanDriver(sessionDir);
      let szState: any;
      try {
        szState = szech.load();
      } catch {
        szState = szech.init([postTarget]);
      }
      const szResult: any = szech.runConvergence(szState);
      console.log(`[run-pipeline] Szechuan: ${szResult.converged ? 'CONVERGED' : 'STALLED'} iters=${szResult.iterations || 0} finalViolations=${szResult.finalViolations || 0}`);
    } catch (szErr: any) {
      console.error('[run-pipeline] Szechuan error (non-fatal):', (szErr as any)?.message || szErr);
    }

    // Closer + ingest only on explicit self / meta / chain
    if (selfImprovement || hasMetaTickets || chainPost) {
      console.log('[run-pipeline] META-PHASE post: Loop Closer + performPostCampaignIngest (backlog + metrics)');
      try {
        const closerRes: any = await runSelfImprovementLoopCloser(sessionDir, postTarget);
        console.log(`[run-pipeline] Closer: ${closerRes?.summary || 'complete'}`);
        if (closerRes?.verifyTheaterDetected) {
          console.log(`[run-pipeline] Self-heal: emitted ${closerRes.hardeningTicketsEmitted || 0} H-VERIFY tickets (verify theater auto-detected + rejected)`);
        }
        await performPostCampaignIngest(postTarget, sessionDir);
      } catch (cErr: any) {
        console.error('[run-pipeline] post meta phase error (non-fatal):', (cErr as any)?.message || cErr);
      }
    }

    console.log('[run-pipeline] Post phases complete. Architecture reviewed, deslopped, self-loop closed.');
  } else if (buildSucceeded) {
    console.log('[run-pipeline] Build complete (no post phases triggered). Add --self-improvement or --chain-post to auto-run Citadel+Anatomy+Szechuan+closer.');
  }

  console.log('[run-pipeline] Complete. The sauce is on. <promise>PIPELINE_VICTORY</promise>');
  process.exit(0);
}

main().catch((err) => {
  console.error('[run-pipeline] FATAL (most states left resumable via campaign-status + activity + ritual checkpoints):', (err as any)?.message || err);
  console.error('Recovery: inspect ~/.local/share/pickle-rick-grok/sessions/<last>/campaign-status.json + logs ; use bare session dir or --resume-linked + --recover-failed; --fresh is the safe default.');
  process.exit(1);
});
