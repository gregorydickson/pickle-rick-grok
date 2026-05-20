#!/usr/bin/env node
/**
 * self-improvement.ts — Headless cron / background entry for the full self-dogfood loop.
 *
 * Ready-to-run (the command that lets the system eat its own dogfood at 50+ scale, headless or cron):
 *   npm run self-improve -- --iterations 3 --target .
 *   npx tsx engine/src/bin/self-improvement.ts --iterations 1 --target .
 *
 * With the auto-decompose now live:
 *   The full loop creates session → generator writes 50 real tickets/<R-META-xxx>/ticket.md (with ACs, contracts, scope)
 *   → pipeline --no-refine --self-improvement runs the 8-phase ritual on them autonomously.
 *   NO /pickle-refine-prd step required for true meta self-runs.
 *
 * Cron example (crontab):
 *   0 * * * * cd /path/to/pickle-rick-grok && npm run self-improve -- --iterations=1 --target . --background >> /var/log/pickle-self.log 2>&1
 *
 * Modes:
 *   default: full autonomous loop (gen+auto-tickets+build+citadel+anatomy+szechuan+closer+delta)
 *   --gen-only : emit PRD only (still useful; add --session <dir> to also auto-write tickets/ into it)
 *   --post     : just ingest after a campaign
 *   --background : fire and log
 *
 * The command that lets the pickle eat the pickle at scale. No babysit. Belch.
 */

import * as path from 'path';
import * as fs from 'fs';
import { runFullSelfLoop } from '../self-improvement-loop-closer.js';
import { generateSelfPrd, performPostCampaignIngest } from '../self-prd-generator.js';

const args = process.argv.slice(2);
const iters = Number((args.find(a => a.includes('--iterations')) || '').split(/[ =]/)[1] || args[args.indexOf('--iterations') + 1] || '1') || 1;
const target = args.find(a => !a.startsWith('--')) || process.cwd();
const bg = args.includes('--background') || args.includes('--detached') || args.includes('--cron');
const dry = args.includes('--dry');
const genOnly = args.includes('--gen-only') || args.includes('--prd-only');
const postOnly = args.includes('--post') || args.includes('--ingest');

function discoverRoot(c: string): string {
  let p = path.resolve(c);
  while (p !== '/' ) {
    if (fs.existsSync(path.join(p, 'engine/src/bin/pipeline.ts'))) return p;
    p = path.dirname(p);
  }
  return c;
}
const root = discoverRoot(target);

console.log(`[self-improvement] SELF-DOGFOOD — target=${root} iters=${iters} bg=${bg}`);

if (postOnly) {
  performPostCampaignIngest(root).then((res: any) => {
    if (!dry) {
      fs.mkdirSync(path.dirname(res.reliabilityBacklogPath), { recursive: true });
      fs.writeFileSync(res.reliabilityBacklogPath, res.backlogMarkdown, 'utf8');
    }
    console.log(`[self-improvement] post-ingest done. closed=${res.closedCount} theaterHeal=${res.hardeningTicketsEmitted || 0}`);
    process.exit(0);
  }).catch((e: any) => { console.error('[self-improvement] post failed:', e?.message || e); process.exit(1); });
}

if (genOnly) {
  // support --session <dir> for auto-decompose even in gen-only (handy for manual pipeline --no-refine later)
  const sessIdx = args.indexOf('--session');
  const sess = sessIdx !== -1 ? args[sessIdx + 1] : undefined;
  const genOpts: any = { full: true };
  if (sess) genOpts.sessionDirToPopulate = sess;
  const out = generateSelfPrd(root, genOpts);
  const p = path.join(root, 'prds', `self-meta-${new Date().toISOString().slice(0,10)}.md`);
  if (!dry) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, out.prdMarkdown, 'utf8');
  }
  console.log(`[self-improvement] PRD: ${p} (${out.gapCount} remaining gaps, ${out.estimatedTickets} seeds)`);
  if (out.ticketsPopulated) {
    console.log(`[self-improvement] Also auto-wrote ${out.ticketsPopulated} tickets into ${sess}`);
  } else {
    console.log('Next (optional): npx tsx engine/src/bin/pipeline.ts <your-session> --self-improvement --target ' + root + ' --no-refine');
  }
  process.exit(0);
}

if (bg) {
  console.log('[self-improvement] background mode — tail activity + reliability-backlog.md');
}
runFullSelfLoop({ iterations: iters, targetRoot: root, dry, background: bg })
  .then(() => console.log('[self-improvement] loop(s) complete. Metrics now show the improvement.'))
  .catch(e => { console.error('[self-improvement] FATAL:', e); process.exit(1); });
