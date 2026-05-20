/**
 * post-campaign.ts — Centralized orchestrator for post-build remediation phases.
 *
 * Single source: runPostCampaignPhases(sessionDir, target, opts)
 * Eliminates duplicated best-effort try/catch blocks across run-pipeline, mux-runner, pipeline.ts.
 *
 * P1: explicit best-effort vs mandatory classification (via POST_PHASE_CLASSIFICATION + isBestEffortPostPhase).
 * - Polish phases (citadel, anatomy-park, szechuan-sauce) marked bestEffort:true → failures NEVER poison
 *   overall campaign result, shouldReleaseCloser gate, or watchdog no-progress alarms (we still recordProgress on them).
 * - Closer release only cares about !bestEffort failures (empty non-best ledger → release). First-class + documented.
 * - Future phases: add to types.ts union + map; auto-wired (no caller changes).
 * - Per-phase bestEffort flag carried in PhaseResult, surfaced to campaign-status.json + Activity.
 *
 * Contract:
 * - Mandatory postPhaseCleanup before *each* phase (stale artifact hygiene).
 * - All current phases best-effort (never fatal to caller; non-best future ones will gate).
 * - Explicit ledger of recoverable failures (all, for forensics) + non-blocking best-effort ones.
 * - Single closer release decision (shouldReleaseCloser) derived ONLY from non-best-effort failures.
 *
 * Drivers untouched — pure orchestration + cleanup + classification + progress signal enrichment.
 */

import * as fs from 'fs';
import * as path from 'path';

import { runCitadel } from '../citadel.js';
import { AnatomyParkDriver } from '../anatomy.js';
import { SzechuanDriver } from '../szechuan.js';
import { SessionManager } from '../session.js';
import { Activity } from '../activity-logger.js';
import type { PostCampaignPhase, PhaseResult, PostCampaignResult } from '../types.js';
import { isBestEffortPostPhase, POST_PHASE_CLASSIFICATION } from '../types.js';

// Re-export for callers (central types live in types.ts for cross-module visibility)
export type { PostCampaignPhase, PhaseResult, PostCampaignResult };
export { isBestEffortPostPhase, POST_PHASE_CLASSIFICATION };

export interface PostCampaignOpts {
  target?: string | undefined;
  anatomySubs?: string[] | undefined;
  prdOverride?: string | undefined;
  log?: ((msg: string) => void) | undefined;
}

function defaultLog(msg: string): void {
  console.log(msg);
}

/** Mandatory pre-phase hygiene. Removes stale cross-phase artifacts that poison downstream drivers. */
function postPhaseCleanup(phase: PostCampaignPhase, sessionDir: string): void {
  const stale = ['TASK_NOTES.md', 'gap_analysis.md', 'handoff.txt'];
  for (const name of stale) {
    const p = path.join(sessionDir, name);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* best-effort */ }
    }
  }
}

export async function runPostCampaignPhases(
  sessionDir: string,
  target: string = process.cwd(),
  opts: PostCampaignOpts = {},
): Promise<PostCampaignResult> {
  const log = opts.log ?? defaultLog;
  const prdOverride = opts.prdOverride;
  const anatomySubs = opts.anatomySubs ?? ['engine/src', 'skills', 'references', 'prds'];

  const failures: PostCampaignPhase[] = [];
  const phases: Record<PostCampaignPhase, PhaseResult> = {} as any;

  // === Citadel (5-auditor v1.1 + trap/self-meta) ===
  postPhaseCleanup('citadel', sessionDir);
  try {
    log('[post-campaign] Citadel...');
    const report: any = runCitadel(sessionDir, prdOverride);
    log(`[post-campaign] Citadel: ${report?.findings?.length ?? 0} findings (overall=${report?.overall || 'PASS'})`);
    phases.citadel = {
      phase: 'citadel',
      success: true,
      details: { findings: report?.findings?.length ?? 0, overall: report?.overall || 'PASS' },
      bestEffort: isBestEffortPostPhase('citadel'),
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Citadel error (best-effort/non-fatal): ${err}`);
    phases.citadel = { phase: 'citadel', success: false, error: err, bestEffort: isBestEffortPostPhase('citadel') };
    failures.push('citadel');
  }

  // === Anatomy Park (3-phase Review→Fix→Verify round-robin) ===
  postPhaseCleanup('anatomy-park', sessionDir);
  try {
    log('[post-campaign] Anatomy Park...');
    const anatomy = new AnatomyParkDriver(sessionDir);
    let apState: any;
    try { apState = anatomy.load(); } catch { apState = anatomy.init(anatomySubs); }
    let issues = 0;
    for (const sub of anatomySubs) {
      const r: any = anatomy.executeThreePhaseCycle(apState, sub);
      if (!r?.ok) issues++;
      log(`  [anatomy] ${sub}: ${r?.ok ? 'ok' : 'issues'} trap=${!!r?.trapDoorAdded}`);
    }
    phases['anatomy-park'] = {
      phase: 'anatomy-park',
      success: true,
      details: { subsystems: anatomySubs.length, issues },
      bestEffort: isBestEffortPostPhase('anatomy-park'),
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Anatomy Park error (best-effort/non-fatal): ${err}`);
    phases['anatomy-park'] = { phase: 'anatomy-park', success: false, error: err, bestEffort: isBestEffortPostPhase('anatomy-park') };
    failures.push('anatomy-park');
  }

  // === Szechuan (full principles, confidence-filtered, financial elevation) ===
  postPhaseCleanup('szechuan-sauce', sessionDir);
  try {
    log('[post-campaign] Szechuan (FULL EXPANDED)...');
    const szech = new SzechuanDriver(sessionDir);
    let szState: any;
    try { szState = szech.load(); } catch { szState = szech.init([target]); }
    const szr: any = szech.runConvergence(szState);
    log(`[post-campaign] Szechuan: ${szr?.converged ? 'CONVERGED' : 'STALLED'} iters=${szr?.iterations || 0} finalViolations=${szr?.finalViolations || 0}`);
    phases['szechuan-sauce'] = {
      phase: 'szechuan-sauce',
      success: true,
      details: szr || {},
      bestEffort: isBestEffortPostPhase('szechuan-sauce'),
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Szechuan error (best-effort/non-fatal): ${err}`);
    phases['szechuan-sauce'] = { phase: 'szechuan-sauce', success: false, error: err, bestEffort: isBestEffortPostPhase('szechuan-sauce') };
    failures.push('szechuan-sauce');
  }

  // === P1 classification + release gate + enriched progress signals ===
  // best-effort failures (polish) are recorded in ledger for visibility but DO NOT block closer or poison progress ts.
  (Object.keys(phases) as PostCampaignPhase[]).forEach((p) => {
    if (phases[p]) {
      (phases[p] as any).bestEffort = isBestEffortPostPhase(p);
    }
  });

  const bestEffortFailures = failures.filter(isBestEffortPostPhase);
  const nonBestEffortFailures = failures.filter((p) => !isBestEffortPostPhase(p));
  const overallSuccess = failures.length === 0;
  // Closer ONLY cares about non-best-effort (mandatory) failures. Empty nonBe ledger → release. First-class.
  const shouldReleaseCloser = nonBestEffortFailures.length === 0;

  // Enrich watchdog signals: always recordProgress on post-campaign completion (success or best-effort fail).
  // Prevents "no meaningful progress" false alarms when polish phases error (they are expected non-fatal).
  const sm = new SessionManager();
  try {
    sm.recordProgress(
      sessionDir,
      `post-campaign complete (releaseCloser=${shouldReleaseCloser}, beFails=${bestEffortFailures.length}, nonBeFails=${nonBestEffortFailures.length})`
    );
  } catch {}

  // Surface explicit bestEffort flags + classification to campaign-status.json (monitors, tmux, standup, recovery, self-PRD see it live)
  try {
    sm.updateCampaignStatusSync(sessionDir, {
      postCampaign: {
        overallSuccess,
        recoverableFailures: failures,
        bestEffortFailures,
        nonBestEffortFailures,
        shouldReleaseCloser,
        classification: POST_PHASE_CLASSIFICATION,
        phases,
      },
      note: `post-campaign: overall=${overallSuccess} releaseCloser=${shouldReleaseCloser} (best-effort failures ignored for gate/closer/watchdog; see postCampaign.phases.*.bestEffort)`,
    } as any);
  } catch (e: any) {
    log(`[post-campaign] status update non-fatal: ${e?.message || e}`);
  }

  // Activity: richer signal with per-phase bestEffort for the meta self-loop / auditors
  try {
    const sessId = path.basename(sessionDir);
    Activity.metaPhaseStarted('post-campaign', sessId, {
      overallSuccess,
      shouldReleaseCloser,
      recoverableFailures: failures,
      bestEffortFailures,
      nonBestEffortFailures,
      phases: Object.fromEntries(
        (Object.keys(phases) as PostCampaignPhase[]).map((p) => [
          p,
          { success: phases[p].success, bestEffort: isBestEffortPostPhase(p), error: phases[p].error || null },
        ])
      ),
      classificationNote: 'P1: best-effort failures never block closer/release or trigger no-progress alarms',
    });
  } catch {
    /* best-effort activity logging */
  }

  return {
    phases,
    overallSuccess,
    recoverableFailures: failures,
    shouldReleaseCloser,
  };
}
