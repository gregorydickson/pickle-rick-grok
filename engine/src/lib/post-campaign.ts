/**
 * post-campaign.ts — Centralized orchestrator for post-build remediation phases.
 *
 * Single source: runPostCampaignPhases(sessionDir, target, opts)
 * Eliminates duplicated best-effort try/catch blocks across run-pipeline, mux-runner, pipeline.ts.
 *
 * Contract:
 * - Mandatory postPhaseCleanup before *each* phase (stale artifact hygiene).
 * - All three phases best-effort (never fatal to caller).
 * - Explicit ledger of recoverable failures.
 * - Single closer release decision (shouldReleaseCloser) derived from ledger (empty → release).
 *   Mirrors Claude pipeline-runner.ts (postPhaseCleanup + recordRecoverable... + buildCloserReleasePlan + PhaseCounters spirit + explicit success tracking).
 *
 * Drivers (Citadel, AnatomyParkDriver, SzechuanDriver) untouched — pure orchestration + cleanup.
 * No test/ephemeral paths. Sync-friendly but async for uniformity with callers.
 */

import * as fs from 'fs';
import * as path from 'path';

import { runCitadel } from '../citadel.js';
import { AnatomyParkDriver } from '../anatomy.js';
import { SzechuanDriver } from '../szechuan.js';

export type PostCampaignPhase = 'citadel' | 'anatomy-park' | 'szechuan-sauce';

export interface PhaseResult {
  phase: PostCampaignPhase;
  success: boolean;
  error?: string;
  details?: any;
}

export interface PostCampaignResult {
  phases: Record<PostCampaignPhase, PhaseResult>;
  overallSuccess: boolean;
  recoverableFailures: PostCampaignPhase[];
  shouldReleaseCloser: boolean;
}

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
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Citadel error (best-effort/non-fatal): ${err}`);
    phases.citadel = { phase: 'citadel', success: false, error: err };
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
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Anatomy Park error (best-effort/non-fatal): ${err}`);
    phases['anatomy-park'] = { phase: 'anatomy-park', success: false, error: err };
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
    };
  } catch (e: any) {
    const err = (e?.message || String(e));
    log(`[post-campaign] Szechuan error (best-effort/non-fatal): ${err}`);
    phases['szechuan-sauce'] = { phase: 'szechuan-sauce', success: false, error: err };
    failures.push('szechuan-sauce');
  }

  const overallSuccess = failures.length === 0;
  // Single ledger-derived decision (empty recoverable ledger → release closer).
  // Matches Claude: buildCloserReleasePlan + hasPriorNonZeroRecoverableFailure in activity.
  const shouldReleaseCloser = failures.length === 0;

  return {
    phases,
    overallSuccess,
    recoverableFailures: failures,
    shouldReleaseCloser,
  };
}
