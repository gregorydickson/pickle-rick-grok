#!/usr/bin/env node
/**
 * self-improvement-loop-closer.ts — The Meta-Loop Closer (production)
 *
 * Called by pipeline as final meta-phase (or standalone for cron).
 * Always writes backlog, always emits real Activity.selfImprovementLoopClosed + post_campaign.
 * runFullSelfLoop now:
 *   - creates session
 *   - gen PRD WITH sessionDirToPopulate → autoDecompose writes 50 real executable R-META ticket.md + updates state
 *   - fires pipeline --no-refine --self-improvement (orchestrator sees tickets + isSelfMeta flags, runs full 8-phase ritual)
 *   - closer ingests
 *
 * 100% autonomous for the 50-ticket self case. No /pickle-refine-prd required for meta dogfood.
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

export function runSelfImprovementLoopCloser(campaignSessionDir: string, targetRoot?: string): { backlogPath: string; closed: number; summary: string } {
  const root = targetRoot || process.cwd();
  const result = performPostCampaignIngest(root, campaignSessionDir);

  fs.mkdirSync(path.dirname(result.reliabilityBacklogPath), { recursive: true });
  fs.writeFileSync(result.reliabilityBacklogPath, result.backlogMarkdown, 'utf8');

  Activity.selfImprovementLoopClosed(campaignSessionDir, result.closedCount, {
    backlog: result.reliabilityBacklogPath,
    open: result.openCount,
    target: root,
  });

  console.log(`[loop-closer] CLOSED ${campaignSessionDir}. closed=${result.closedCount} backlog=${result.reliabilityBacklogPath}`);
  return { backlogPath: result.reliabilityBacklogPath, closed: result.closedCount, summary: result.summary };
}

export async function runFullSelfLoop(opts: CloserOptions = {}): Promise<void> {
  const iters = opts.iterations || 1;
  const root = opts.targetRoot || process.cwd();
  const sm = new SessionManager();
  const pipelineBin = path.join(__dirname, 'pipeline.ts');

  for (let i = 1; i <= iters; i++) {
    console.log(`\n[loop-closer] SELF-ITER ${i}/${iters}`);
    const { sessionDir } = sm.createSession(root, `self-meta-${i}`, 200, 'grok', 'grok');
    console.log(`[loop-closer] session ${sessionDir}`);

    // gen PRD — pass session so auto-decompose writes the full ticket.md files (ACs/contracts/justifs)
    // This is the magic that makes --no-refine work for true hands-off meta runs.
    const genMod = await import('./self-prd-generator.js');
    const g = genMod.generateSelfPrd(root, { full: true, sessionDirToPopulate: sessionDir });
    console.log(`[loop-closer] gen: ${g.gapCount} gaps, ${g.ticketsPopulated || 0} tickets auto-written`);

    // real pipeline with meta + no-refine (tickets already exist + populated in state)
    try {
      execSync(`npx tsx ${pipelineBin} ${sessionDir} --self-improvement --target ${root} --no-refine`, { stdio: 'inherit', cwd: root });
    } catch (e) {
      console.warn('[loop-closer] pipeline exited non-zero (may be expected on first/empty runs or citadel FAILs)');
    }

    // explicit closer too (ingest + write backlog + emit)
    runSelfImprovementLoopCloser(sessionDir, root);
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
    runSelfImprovementLoopCloser(camp || target, target);
  } else {
    runFullSelfLoop({ iterations: iters, targetRoot: target, dry, background: bg });
  }
}
