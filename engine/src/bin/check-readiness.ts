#!/usr/bin/env node
/**
 * check-readiness.ts — thin CLI wrapper around the post-synthesis readiness gate.
 *
 * Matches the Claude sibling naming (`check-readiness.js --machinability-only --contract-only`).
 * Usable manually, from refine skill handoff, in scripts, or by closer/standup.
 *
 * Examples:
 *   npx tsx engine/src/bin/check-readiness.ts --session /tmp/sess-abc123
 *   npx tsx engine/src/bin/check-readiness.ts --session $SESSION_ROOT --strict
 *
 * Exits 0 on clean, 2 on blocking findings (prevents bad seal in scripts).
 * Always prints path to the detailed readiness-gate-report.md artifact.
 *
 * Wires the gate expectations from the 2026-05-24 emission-quality synthesis PRD.
 */

import { runReadinessGateOnSession, type ReadinessGateReport } from '../lib/readiness-gate.js';
import * as path from 'path';

const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');
const sessIdx = args.indexOf('--session');
const sessionDir = sessIdx >= 0 ? args[sessIdx + 1] : args.find(a => !a.startsWith('-') && a.includes('session') || a.includes('tmp') || a.includes('sess'));
const strict = args.includes('--strict') || args.includes('--block-on-warn');

if (help || !sessionDir) {
  console.error(`check-readiness.ts — post-synthesis / pre-headless gate (Claude port)

Usage:
  npx tsx engine/src/bin/check-readiness.ts --session <SESSION_DIR> [--strict]

  --session <dir>   Session owning the emitted tickets (required). Scans ticket.md files + runs full machinability + path/forward-ref hygiene.
  --strict          Treat warnings as blocking (exit 2 even on warn-only).

The gate runs detectVerifyTheater + machinability (MACHINE_HINT_RE vs PURE_PROSE) + R-RTRC-style path/symbol verification + exact forward-ref annotation parsing.
Writes readiness-gate-report.md into the session dir (detailed findings + remediation).

References:
- prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md
- engine/src/lib/readiness-gate.ts (the real impl)
- engine/src/lib/ticket-emitter.ts + skills/pickle-refine-prd/SKILL.md (call sites)

Rick: "Call this at the end of every refine synthesis or the autonomous run will make you pay in 12-hour stalls. No excuses."
`);
  process.exit(2);
}

const resolved = path.resolve(sessionDir);
console.log(`[check-readiness] Running gate on session: ${resolved}`);

let report: ReadinessGateReport;
try {
  report = runReadinessGateOnSession(resolved);
} catch (e: any) {
  console.error('[check-readiness] Gate threw (fatal for CLI):', e?.message || e);
  process.exit(3);
}

console.log(`[check-readiness] Verdict: ok=${report.ok} blocks=${report.blockingCount} warns=${report.warningCount}`);
if (report.reportPath) {
  console.log(`[check-readiness] Full report artifact: ${report.reportPath}`);
}
if (report.summary) console.log(`[check-readiness] ${report.summary}`);
if (report.suggestedHardening && report.suggestedHardening.length) {
  console.log('[check-readiness] Suggested: ' + report.suggestedHardening.join(' | '));
}

const shouldBlock = !report.ok || (strict && report.warningCount > 0);
if (shouldBlock) {
  console.error('[check-readiness] BLOCKING — do not proceed to headless seal. Fix findings (or emit healer sibling) then re-invoke gate.');
  process.exit(2);
}

console.log('[check-readiness] CLEAN — safe for headless handoff.');
process.exit(0);
