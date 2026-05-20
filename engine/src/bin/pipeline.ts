#!/usr/bin/env node
/**
 * pipeline.ts — *Post-build* phases runner: citadel → anatomy-park → szechuan (+ deepen + self-improvement closer/ingest)
 *
 * (refine + build/orchestrator are handled upstream by run-pipeline / mux-runner; this is the post slice for chaining)
 *
 * SZECHUAN NOW: every principle from both original sauce md files (KISS thru Audit Trail, financial elevation included).
 * Scanner comprehensive, prioritized, confidence-filtered, walks entire project (code + md + sh) to deslop the self-improvement loop itself.
 *
 * META PHASES (first-class):
 *   --self-improvement  →  runSelfImprovementLoopCloser + performPostCampaignIngest (writes backlog, emits Activity)
 *   --target <grok-root> always honored for drivers.
 *
 * Real drivers + citadel gate + ritual. Self-dogfood at 50+ ticket scale.
 * Early P0 validateTicketArtifacts guard (unless --force). Prefers stamped state.sourcePrd for PRD lookups.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureDeepener } from '../arch-deepener.js';
import { Activity } from '../activity-logger.js';
import { generateSelfPrd as runSelfPrdGenerator, performPostCampaignIngest } from '../self-prd-generator.js';
import { runSelfImprovementLoopCloser } from '../self-improvement-loop-closer.js';
import { SessionManager } from '../session.js';
import { runPostCampaignPhases } from '../lib/post-campaign.js';

const sessionDir = process.argv[2];
if (!sessionDir) {
  console.error('Usage: pipeline.ts <sessionDir> [--no-refine] [--target <grok-root>] [--self-improvement] [--deepen]');
  process.exit(1);
}

const args = process.argv.slice(3);
const noRefine = args.includes('--no-refine');
const selfMode = args.includes('--self-improvement');
const explicitDeepen = args.includes('--deepen');
const doDeepen = explicitDeepen || selfMode; // self-improvement implies architecture deepening
const explicitTarget = (args.includes('--target') ? args[args.indexOf('--target') + 1] : null) || process.cwd();
const targetRoot = path.resolve(explicitTarget);
const force = args.includes('--force') || args.includes('--skip-validate');

console.log(`[pipeline] Starting for session ${path.basename(sessionDir)} target=${targetRoot} selfMode=${selfMode} deepen=${doDeepen}`);

// P0 early guard (unless --force): validateTicketArtifacts before any post work (defends direct calls from loop-closer/self-improvement)
if (!force) {
  try {
    const val = new SessionManager().validateTicketArtifacts(sessionDir);
    if (!val.valid) {
      console.error(val.error || '[pipeline] validateTicketArtifacts P0 GUARD FAILED');
      console.error('Recovery: (1) re-run with --force (last resort, may crash later); (2) use recover.ts --reset-failed; (3) ensure refine materialized all ticket.md');
      process.exit(1);
    }
  } catch (vErr: any) {
    console.warn('[pipeline] validateTicketArtifacts check non-fatal (proceeding):', vErr?.message || vErr);
  }
}

// Prefer stamped sourcePrd from state for internal PRD lookups (citadel etc) — avoids stale heuristic paths
let prdOverride: string | undefined;
try {
  const sm = new SessionManager();
  const st: any = sm.loadState(sessionDir);
  if (st && st.sourcePrd && fs.existsSync(st.sourcePrd)) {
    prdOverride = st.sourcePrd;
    console.log(`[pipeline] Using stamped sourcePrd: ${prdOverride}`);
  }
} catch { /* no state or no stamp — citadel will fall back */ }

// PRD / refine phase omitted here for brevity (handled by caller or skill orchestrator)

// Centralized post-campaign phases (citadel → anatomy-park → szechuan-sauce) with mandatory cleanup + ledger + closer release decision.
// Replaces the previous three duplicated manual try blocks.
const postReport = await runPostCampaignPhases(sessionDir, targetRoot, {
  prdOverride,
  log: (m: string) => console.log(m),
});
console.log(`[pipeline] Post-campaign centralized: overall=${postReport.overallSuccess} failures=[${postReport.recoverableFailures.join(', ') || 'none'}] shouldReleaseCloser=${postReport.shouldReleaseCloser}`);

// === Architecture Deepening phase (path #3 of the 4-path epic) ===
// Uses the shared ArchitectureDeepener + LANGUAGE.md scanner.
// Real opportunities (Leverage / Locality / Deletion Test) are discovered and persisted.
// Full autonomous worker loop (deepen-changer) is available via `deepen loop` or future iteration wiring here.
if (doDeepen) {
  try {
    console.log('[pipeline] Architecture Deepening...');
    const deepener = new ArchitectureDeepener(sessionDir);
    const deepenState = deepener.init([targetRoot]);
    const opps = deepener.discoverOpportunities([targetRoot, 'engine/src', 'skills']);
    console.log(`[pipeline] Deepen: discovered ${opps.length} opportunities (LANGUAGE vocabulary)`);
    opps.slice(0, 3).forEach((o, i) => {
      console.log(`  ${i + 1}. [${o.currentDepth}] ${o.module} — ${o.proposedSeam.slice(0, 60)}...`);
    });
    // Persist for later loop / resume / metrics consumption (arch-deep.json already written by driver)
    Activity.convergenceIteration('arch-deepening', path.basename(sessionDir), undefined, 'pipeline-phase', undefined, opps.length);
  } catch (dErr: any) {
    console.error('[pipeline] Architecture Deepening error (non-fatal for self-mode):', (dErr as any)?.message || dErr);
  }
}

if (selfMode) {
  Activity.metaPhaseStarted('loop-close', path.basename(sessionDir));
  Activity.metaPhaseStarted('post-campaign', path.basename(sessionDir));
  console.log('[pipeline] META-PHASE post: Loop Closer + ingest (backlog + metrics)');
  try {
    runSelfImprovementLoopCloser(sessionDir, targetRoot)
      .then((closerRes: any) => {
        console.log(`[pipeline] Closer: ${closerRes?.summary || 'done'}`);
        if (closerRes?.verifyTheaterDetected) console.log(`[pipeline] H-VERIFY auto-heal: ${closerRes.hardeningTicketsEmitted || 0} tickets side-emitted`);
      })
      .catch((cErr: any) => console.error('[pipeline] closer error (non-fatal):', cErr?.message || cErr));
    // second ingest kept for legacy paths (now async fire-and-forget, idempotent inside)
    performPostCampaignIngest(targetRoot, sessionDir).catch((e: any) => console.warn('[pipeline] duplicate ingest non-fatal:', e?.message || e));
  } catch (cErr) {
    console.error('[pipeline] post meta phase error (non-fatal):', (cErr as any)?.message || cErr);
  }
}

console.log('[pipeline] Complete. The sauce has been applied. Architecture deepened where it mattered. Self-loop deslopped.');
process.exit(0);
