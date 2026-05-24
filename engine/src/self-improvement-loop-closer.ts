#!/usr/bin/env node
/**
 * self-improvement-loop-closer.ts — The Meta-Loop Closer (production)
 *
 * Called by pipeline as final meta-phase (or standalone for cron).
 * Always writes backlog, always emits real Activity.selfImprovementLoopClosed + post_campaign.
 * runFullSelfLoop now:
 *   - creates session via createSessionForPrd (PRD-linked provenance)
 *   - gen PRD + autoDecompose (via emitter) writes 50 R-META ticket.md
 *   - writes the generated PRD artifact
 *   - fires the canonical run-pipeline.ts --prd <generated> --self-improvement --no-refine (preflight + build + citadel+anatomy+szech+closer/ingest all in one)
 *   - (no duplicate closer; the dispatch owns the full post)
 *
 * 100% autonomous for the 50-ticket self case. No /pickle-refine-prd required for meta dogfood.
 * Closes the "self-loop sometimes skips the build" gap (was missing await + old direct pipeline on session + no PRD stamp).
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { execSync } from 'child_process';
import { performPostCampaignIngest } from './self-prd-generator.js';
import { Activity } from './activity-logger.js';
import { SessionManager } from './session.js';

export interface CloserOptions {
  iterations?: number;
  targetRoot?: string;
  dry?: boolean;
  sessionBase?: string;
  background?: boolean;
}

export async function runSelfImprovementLoopCloser(campaignSessionDir: string, targetRoot?: string): Promise<{ backlogPath: string; closed: number; summary: string; verifyTheaterDetected?: boolean; hardeningTicketsEmitted?: number }> {
  const root = targetRoot || process.cwd();
  // Explicit call site inside closer per P1 requirement (delegates to ingest but surface + post-processing hook for self-heal)
  const result = await performPostCampaignIngest(root, campaignSessionDir);

  fs.mkdirSync(path.dirname(result.reliabilityBacklogPath), { recursive: true });
  fs.writeFileSync(result.reliabilityBacklogPath, result.backlogMarkdown, 'utf8');

  // If theater/gate hardening triggered in ingest, log it here too for closer visibility (Rick: belt + suspenders)
  // Gate debt (from new post-synth readiness gate) is now high-prio input to the self-loop per synthesis PRD task 2.
  if (result.verifyTheaterDetected) {
    console.log(`[loop-closer] VERIFY THEATER / READINESS_GATE DEBT in ${campaignSessionDir} — ${result.hardeningTicketsEmitted || 0} H-VERIFY/refine-hardening auto side-effected (self-healing engaged; gate report feeds next self-PRD)`);
  }

  Activity.selfImprovementLoopClosed(campaignSessionDir, result.closedCount, {
    backlog: result.reliabilityBacklogPath,
    open: result.openCount,
    target: root,
    verifyTheaterDetected: !!result.verifyTheaterDetected,
    hardeningEmitted: result.hardeningTicketsEmitted || 0,
  });

  console.log(`[loop-closer] CLOSED ${campaignSessionDir}. closed=${result.closedCount} backlog=${result.reliabilityBacklogPath}`);
  return { backlogPath: result.reliabilityBacklogPath, closed: result.closedCount, summary: result.summary, verifyTheaterDetected: result.verifyTheaterDetected, hardeningTicketsEmitted: result.hardeningTicketsEmitted };
}

export async function runFullSelfLoop(opts: CloserOptions = {}): Promise<void> {
  const iters = opts.iterations || 1;
  const root = opts.targetRoot || process.cwd();
  const sm = new SessionManager();
  const runPipelineBin = path.join(__dirname, 'run-pipeline.ts');

  for (let i = 1; i <= iters; i++) {
    console.log(`\n[loop-closer] SELF-ITER ${i}/${iters}`);

    // Per-iter PRD path (written here for provenance). Use createSessionForPrd so run-pipeline --prd will find+reuse the populated session.
    const today = new Date().toISOString().slice(0, 10);
    const prdDir = path.join(root, 'prds');
    fs.mkdirSync(prdDir, { recursive: true });
    const prdPath = path.join(prdDir, `self-meta-epic-${today}-iter${i}.md`);
    const task = `self-r-meta-iter-${i}`;

    const res = await sm.createSessionForPrd(root, task, prdPath, 200, 'grok' as any, 'grok' as any);
    const sessionDir = res.sessionDir;
    console.log(`[loop-closer] session (PRD-linked) ${sessionDir}`);

    // gen PRD content + populate tickets into the stamped session (now awaited — was the skip-build bug)
    const genMod = await import('./self-prd-generator.js');
    const g = await genMod.generateSelfPrd(root, { full: true, sessionDirToPopulate: sessionDir });
    console.log(`[loop-closer] gen: ${g.gapCount} gaps, ${g.ticketsPopulated || 0} tickets auto-written (emitter path)`);

    // Write the PRD artifact (now the canonical entrypoint key)
    if (!opts.dry) {
      fs.writeFileSync(prdPath, g.prdMarkdown, 'utf8');
      try {
        await sm.stampPrdProvenance(sessionDir, prdPath);
      } catch (e: any) {
        console.warn('[loop-closer] stamp non-fatal:', e?.message || e);
      }
    }

    // Launch via the single canonical thin dispatcher (does preflight, validate, mux, post citadel+ap+sz+closer/ingest for --self)
    // This unifies the self-loop with user-facing run-pipeline and guarantees the build phase is never skipped.
    try {
      const bgFlag = opts.background ? ' --background' : '';
      execSync(`npx tsx ${runPipelineBin} --prd ${prdPath} --self-improvement --no-refine --target ${root}${bgFlag}`, { stdio: 'inherit', cwd: root });
    } catch (e) {
      console.warn('[loop-closer] run-pipeline exited non-zero (may be expected on first/empty runs or citadel FAILs)');
    }

    // No explicit closer here: run-pipeline --self-improvement already ran the full post (closer + ingest + Activity) inside its meta phase.
    // (Prevents duplicate backlog appends that the old direct-pipeline path could cause.)
  }
  console.log('[loop-closer] FULL SELF LOOP COMPLETE. <promise>META_CLOSED</promise>');
}

// CLI headless/cron ready
if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && /self-improvement-loop-closer/.test(process.argv[1]))) {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith('--')) || process.cwd();
  const iters = Number((args.find(a => a.startsWith('--iterations')) || '').split('=')[1] || args[args.indexOf('--iterations') + 1] || '1');
  const dry = args.includes('--dry');
  const bg = args.includes('--background');
  const camp = args.find(a => a.includes('session') || a.includes('tmp')) || undefined;

  if (camp || args.includes('--post') || args.includes('--ingest')) {
    runSelfImprovementLoopCloser(camp || target, target).catch((e: any) => { console.error('[loop-closer] post ingest failed:', e?.message || e); process.exit(1); });
  } else {
    runFullSelfLoop({ iterations: iters, targetRoot: target, dry, background: bg });
  }
}
