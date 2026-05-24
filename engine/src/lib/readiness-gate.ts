/**
 * readiness-gate.ts — Post-synthesis / pre-headless-run readiness gate.
 *
 * Lightweight `check-readiness` style helper (machinability + contract + path/forward-ref hygiene).
 * Invoked at the end of rich refine synthesis (in /pickle-refine-prd manager flow) and inside the
 * emission step (ticket-emitter) before the session is sealed and handed to headless mux-runner.
 *
 * Catches theatrical Verifies, low-machinability prose, phantom paths/symbols, and malformed
 * forward-ref annotations *before* the long autonomous run starts. Writes a detailed blocking
 * report artifact (readiness-gate-report.md) under the session for audit/closer/self-loop.
 *
 * This is the shift-left static gate ported from Claude sibling (per the 2026-05-24 synthesis):
 *   - Claude's check-readiness.js --machinability-only --contract-only (MACHINE_HINT_RE vs PURE_PROSE_RE,
 *     isMachineCheckable on exit codes/numbers/regex/JSON/describe.each/node--test/tsc/tables/emits/writes)
 *   - R-RTRC-7 / PATH_VERIFICATION_PROMPT_SECTION + symbol audit (R-SAOV-7): every backticked
 *     path/symbol in Files/Locations/ACs/Verifies *must* be verified via git ls-files/git grep at HEAD.
 *     Stdlib/external never backticked. Forward-created artifacts carry *exact* annotation *outside*
 *     the backticks with exactly one ASCII space separator:
 *       `foo/bar.ts` (forward-created)
 *       `new-thing.ts` (created by ticket R-abc123de)
 *       `helper.ts` (introduced by ticket 2026-05-24-foo)
 *     Malformed anno → `annotation_format` finding (blocks).
 *   - AC-shape smell detection (endpoint enumeration without universal quantifier → parametrized or // JUSTIFICATION:).
 *   - Writes readiness_*.md / escalation on blocking; limited recycle + escalation in Claude.
 *
 * Grok integration: reuses + extends our existing detectVerifyTheater + RUNNABLE_VERIFY_RE +
 * assessMetaReadiness (pipeline-preflight). Adds the missing path/forward-ref + machinability
 * enforcement as first-class blocking gate. No bad council output reaches the autonomous engine.
 *
 * "Rick: The analysts just spent 40k tokens arguing about your stupid backticks. This gate makes
 * sure their output isn't Jerry slop that starves the Morties for 12 hours. Use it or the pickle
 * starves on its own vomit."
 *
 * References:
 * - prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md (the synthesis PRD)
 * - skills/pickle-refine-prd/SKILL.md (Step 3 synthesis + Step 4 emit)
 * - engine/src/lib/ticket-emitter.ts (emitRefineCouncilTickets seam)
 * - engine/src/lib/pipeline-preflight.ts (detectVerifyTheater, assess, analyzeSessionForVerifyTheater)
 * - references/refine/refine-contract.md + ticket-template.md + phases/research.md (theater contract)
 * - Claude sibling: spawn-refinement-team.ts, check-readiness.js, R-RTRC (path) / R-SAOV (symbol) rules (see synthesis PRD)
 *
 * Wubba lubba dub dub. Ship clean gates, not excuses.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { detectVerifyTheater } from './pipeline-preflight.js';
import type { TicketSpec } from './ticket-emitter.js';

// Re-export for callers who want the raw detector
export { detectVerifyTheater } from './pipeline-preflight.js';

// === Claude-inspired machinability / contract regex (ported + tuned for Grok) ===
const MACHINE_HINT_RE = /\b(exit (0|1|code|codes)|assert|expect|===|==|!=|length|includes|count|rows?|entries?|table|JSON\.parse|parseInt|grep -[cq]|test -[ef]|tsc --noEmit|node --test|describe\.each|writes? (to|file|artifact)|emits? (event|signal)|--check|status.*0|\d+ (files?|lines?|matches?))\b/i;
const PURE_PROSE_RE = /\b(must (feel|be|look|seem|appear)|should (be|feel|look)|robust|fast(er)?|good|clean|intuitive|reliable|performant|scalable|user-friendly)\b/i;
const RUNNABLE_VERIFY_RE = /\b(npx |node -e |node --|grep |test -f |ls |find |diff |tsc --noEmit|npm test|npm run |sh -c |python -c |cat |head |tail |echo .* \| |wc -l)\b/i;

// === Exact forward-ref annotation contract (Claude R-RTRC-7 / R-SAOV-7, one ASCII space outside backticks) ===
const VALID_FORWARD_ANNO = [
  'forward-created',
  'created by ticket ',
  'introduced by ticket '
];
const ANNOTATED_PATH_RE = /`([^`]+?)`\s{1}(\((?:forward-created|created by ticket [A-Za-z0-9_.-]{3,25}|introduced by ticket [A-Za-z0-9_.-]{3,25})\))/gi;
const BARE_PATH_RE = /`([a-zA-Z0-9_\/.-]+\.(?:ts|js|tsx|jsx|mjs|cjs|md|json|sh|yml|yaml))`/g;

export interface ReadinessGateFinding {
  type: 'verify_theater' | 'machinability_low' | 'path_not_found' | 'forward_ref_malformed' | 'annotation_format' | 'contract_violation' | 'ac_shape_smell' | 'symbol_phantom';
  ticketId?: string | undefined;
  acId?: string | undefined;
  detail: string;
  severity: 'block' | 'warn';
  evidence?: string | undefined;
  file?: string | undefined;
}

export interface ReadinessGateReport {
  ok: boolean;
  blockingCount: number;
  warningCount: number;
  findings: ReadinessGateFinding[];
  reportPath?: string;
  summary: string;
  generatedAt: string;
  // Machine-actionable for closer/self-prd/ritual
  hasEmissionDebt: boolean;
  suggestedHardening: string[];
}

/** Verify a candidate path exists on disk or via git (at HEAD). Non-fatal on git fail. */
function pathExistsUnderGit(rel: string, root: string): boolean {
  const cleaned = rel.replace(/^\.\/|^\/+/, '');
  if (!cleaned || cleaned.includes('node_modules')) return false;
  const abs = path.isAbsolute(cleaned) ? cleaned : path.join(root, cleaned);
  try {
    // Prefer git for "at HEAD" hygiene (exactly what Claude R-RTRC-7 demands)
    execSync(`git ls-files --error-unmatch -- "${cleaned}"`, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    return true;
  } catch {
    // Fallback: fs (for untracked forward-created that the gate itself may be creating)
    return fs.existsSync(abs);
  }
}

/** Parse text for annotated vs bare paths + classify hygiene. */
function scanPathsAndForwardRefs(text: string, ticketId?: string, grokRoot = process.cwd()): ReadinessGateFinding[] {
  const findings: ReadinessGateFinding[] = [];
  const seen = new Set<string>();

  // 1. Annotated (exact format required)
  let m: RegExpExecArray | null;
  while ((m = ANNOTATED_PATH_RE.exec(text)) !== null) {
    const p = (m[1] ?? '').trim();
    const anno = m[2] ?? '';
    const key = `${p}:${anno}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const valid = VALID_FORWARD_ANNO.some(v => anno.includes(v));
    if (!valid) {
      findings.push({
        type: 'annotation_format',
        ticketId: ticketId ?? undefined,
        detail: `Malformed forward-ref annotation on \`${p}\`: "${anno}". Must be exactly one space then (forward-created) or (created by ticket <hash>) or (introduced by ticket ...).`,
        severity: 'block',
        evidence: m[0],
      } as any);
    } else if (!pathExistsUnderGit(p, grokRoot)) {
      // Annotated forward-ref is *allowed* to not exist yet (that's the point)
      // We only flag if the anno itself is bad. Good.
    }
  }

  // 2. Bare backticked paths (no anno nearby in the match) — these MUST exist
  // Reset lastIndex for safety
  BARE_PATH_RE.lastIndex = 0;
  while ((m = BARE_PATH_RE.exec(text)) !== null) {
    const p = (m[1] ?? '').trim();
    if (seen.has(p)) continue;
    seen.add(p);

    // Check if this bare one was part of a recent annotated match (crude but effective for inline)
    const idx = m.index ?? 0;
    const contextStart = Math.max(0, idx - 30);
    const context = text.slice(contextStart, idx + m[0].length + 20);
    const hasValidAnnoNearby = ANNOTATED_PATH_RE.test(context); // quick check

    if (!hasValidAnnoNearby && !pathExistsUnderGit(p, grokRoot)) {
      findings.push({
        type: 'path_not_found',
        ticketId: ticketId ?? undefined,
        detail: `Backticked path \`${p}\` does not exist on disk / git HEAD and carries no valid forward-ref annotation. Every backticked path/symbol in ACs/Verifies/Scope must be verified with git ls-files/git grep before emission (Claude R-RTRC-7).`,
        severity: 'block',
        evidence: m[0],
        file: p,
      } as any);
    }
  }

  return findings;
}

/** Basic AC shape smell (endpoint enumeration without universal quantifier or parametrized form). */
function detectAcShapeSmells(acCriterion: string, acVerify: string, ticketId?: string): ReadinessGateFinding[] {
  const findings: ReadinessGateFinding[] = [];
  const combined = `${acCriterion} ${acVerify}`;
  // Simple heuristic: 3+ repeated "the foo does X", "the bar does X" without "for each" or describe.each or table
  const bulletLike = (combined.match(/\b(the |all |every |each )\w+ (does|must|will|shall|can|should) /gi) || []).length;
  if (bulletLike >= 3 && !/describe\.each|forEach|for each|parametrized|table|matrix/i.test(combined)) {
    findings.push({
      type: 'ac_shape_smell',
      ticketId,
      detail: `AC smells like endpoint enumeration (no universal quantifier + repeated predicates, no describe.each / parametrized / table). Collapse or add explicit // JUSTIFICATION: + acceptance test (Claude AC_SHAPE_PROMPT_SECTION).`,
      severity: 'warn',
      evidence: combined.slice(0, 120),
    });
  }
  return findings;
}

/** Machinability + theater + contract checks on a single Verify string. */
function checkVerifyMachinability(verify: string, acId?: string, ticketId?: string): ReadinessGateFinding[] {
  const findings: ReadinessGateFinding[] = [];
  const th = detectVerifyTheater(verify);
  if (th.isTheatrical) {
    findings.push({
      type: 'verify_theater',
      ticketId,
      acId,
      detail: `Theatrical Verify (matches VERIFY_THEATER_RE): ${th.reasons.join(' | ')}. Rewrite as explicit BASELINE (runnable today, asserts gap) vs SUCCESS. See pipeline-preflight + research.md WAIVER rules.`,
      severity: 'block',
      evidence: verify.slice(0, 140),
    });
  }
  const isRunnable = RUNNABLE_VERIFY_RE.test(verify);
  const hasMachineHint = MACHINE_HINT_RE.test(verify);
  const isPureProse = PURE_PROSE_RE.test(verify);
  if (!isRunnable || (isPureProse && !hasMachineHint)) {
    findings.push({
      type: 'machinability_low',
      ticketId,
      acId,
      detail: `Low machinability: ${!isRunnable ? 'not obviously runnable shell' : ''} ${isPureProse ? 'pure prose without machine hints (exit codes, counts, JSON, describe.each, writes/emits, tables, length checks, etc.)' : ''}. Claude-style isMachineCheckable would reject. Add concrete assertion.`,
      severity: isRunnable ? 'warn' : 'block',
      evidence: verify.slice(0, 140),
    });
  }
  return findings;
}

/** Scan a list of TicketSpec (pre-emit, from synthesis) or a sessionDir (post-emit on disk tickets). */
function collectSpecs(input: TicketSpec[] | string, grokRoot: string): Array<{ id: string; acs: Array<{ id: string; criterion: string; verify: string }>; scope: string; justification?: string }> {
  if (Array.isArray(input)) {
    return input.map(s => ({
      id: s.id,
      acs: (s.acceptanceCriteria || []).map((a: any) => ({ id: a.id || 'AC', criterion: a.criterion || '', verify: a.verify || a.criterion || '' })),
      scope: s.scope || '',
      justification: s.justification
    }));
  }
  // Post-emit scan of session tickets/*.md (robust to partial writes)
  const sessionDir = input;
  const specs: any[] = [];
  const ticketsDir = path.join(sessionDir, 'tickets');
  if (!fs.existsSync(ticketsDir)) return specs;
  let ids: string[] = [];
  try {
    const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
    ids = (state.tickets || []).map((t: any) => t.id).filter(Boolean);
  } catch {
    try {
      ids = fs.readdirSync(ticketsDir).filter(d => fs.statSync(path.join(ticketsDir, d)).isDirectory());
    } catch {}
  }
  for (const id of ids) {
    const mdPath = path.join(ticketsDir, id, 'ticket.md');
    if (!fs.existsSync(mdPath)) continue;
    const content = fs.readFileSync(mdPath, 'utf8');
    // Parse crude AC table rows + Verifies in backticks (same hygiene as preflight)
    const acs: any[] = [];
    const rowRe = /\|\s*(AC[-_ ]?\S*)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+?)`\s*\|/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(content)) !== null) {
      acs.push({ id: rm[1] ?? '', criterion: (rm[2] ?? '').trim(), verify: (rm[3] ?? '').trim() });
    }
    if (acs.length === 0) {
      // Fallback: any backticks after "Verify" section
      const bt = /`([^`]+?)`/g;
      let btM;
      let i = 0;
      while ((btM = bt.exec(content)) && i < 8) {
        const v = btM[1] ?? '';
        if (v.length > 5) acs.push({ id: `AC${i++}`, criterion: '', verify: v });
      }
    }
    const scopeMatch = content.match(/## Scope[\s\S]*?(?=\n##|$)/i);
    specs.push({ id, acs, scope: scopeMatch ? scopeMatch[0] : '', justification: '' });
  }
  return specs;
}

export function runReadinessGate(
  input: TicketSpec[] | string,
  opts: { grokRoot?: string; writeReport?: boolean; sessionDirForReport?: string } = {}
): ReadinessGateReport {
  const grokRoot = opts.grokRoot || process.cwd();
  const isSessionScan = typeof input === 'string';
  const sessionForReport = opts.sessionDirForReport || (isSessionScan ? (input as string) : undefined);

  const specs = collectSpecs(input, grokRoot);
  const allFindings: ReadinessGateFinding[] = [];

  for (const spec of specs) {
    const tId = spec.id;
    const textBlob = `${spec.scope}\n${spec.justification || ''}\n${spec.acs.map(a => `${a.criterion} ${a.verify}`).join('\n')}`;

    // Path + forward-ref hygiene (the big new one)
    allFindings.push(...scanPathsAndForwardRefs(textBlob, tId, grokRoot));

    // Per-AC machinability + shape
    for (const ac of spec.acs) {
      allFindings.push(...checkVerifyMachinability(ac.verify, ac.id, tId));
      allFindings.push(...detectAcShapeSmells(ac.criterion, ac.verify, tId));
    }

    // Minimal contract
    if (spec.acs.length < 2) {
      allFindings.push({
        type: 'contract_violation',
        ticketId: tId,
        detail: 'Ticket has <2 machine-checkable AC rows. Refine requires 4-8 runnable Verifies per ticket-template.',
        severity: 'warn',
      });
    }
  }

  const blocking = allFindings.filter(f => f.severity === 'block');
  const warns = allFindings.filter(f => f.severity === 'warn');

  const hasDebt = blocking.length > 0 || warns.some(w => /theater|path_not_found|forward_ref|annotation/.test(w.type));
  const suggested: string[] = [];
  if (hasDebt) {
    suggested.push('H-VERIFY-EMIT-* or H-REFINE-GATE-* (harden post-synthesis readiness gate + forward-ref scanner)');
    suggested.push('Re-run refine synthesis with injected PATH_VERIFICATION + AC_SHAPE prompt sections');
  }

  const summary = `ReadinessGate: ${blocking.length} blocking, ${warns.length} warnings on ${specs.length} tickets. ${hasDebt ? 'EMISSION_DEBT present — do not seal for headless without healer.' : 'Clean. Safe for headless.'}`;

  const report: ReadinessGateReport = {
    ok: blocking.length === 0,
    blockingCount: blocking.length,
    warningCount: warns.length,
    findings: allFindings,
    summary,
    generatedAt: new Date().toISOString(),
    hasEmissionDebt: hasDebt,
    suggestedHardening: suggested,
  };

  // Always write artifact when we have a session context (post-synth or post-emit). Matches Claude "writes readiness_*.md"
  if (opts.writeReport !== false && sessionForReport) {
    try {
      const reportDir = sessionForReport;
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, 'readiness-gate-report.md');
      const md = buildReportMarkdown(report, specs.length, grokRoot);
      fs.writeFileSync(reportPath, md, 'utf8');
      report.reportPath = reportPath;
      console.log(`[readiness-gate] Wrote detailed report: ${reportPath}`);
    } catch (e: any) {
      console.warn('[readiness-gate] Failed to write report artifact (non-fatal):', e?.message || e);
    }
  }

  return report;
}

function buildReportMarkdown(r: ReadinessGateReport, ticketCount: number, root: string): string {
  const blocks = r.findings.filter(f => f.severity === 'block');
  const warnings = r.findings.filter(f => f.severity === 'warn');
  let md = `# Readiness Gate Report\n\n**Generated**: ${r.generatedAt}\n**Grok Root**: ${root}\n**Tickets Scanned**: ${ticketCount}\n**Verdict**: ${r.ok ? 'PASS — safe to seal for headless' : 'BLOCK — emission debt / hygiene violations detected'}\n\n`;
  md += `**Summary**: ${r.summary}\n\n`;
  if (r.hasEmissionDebt) {
    md += `**EMISSION_DEBT**: true — clusters of findings will trigger high-priority refine-hardening / H-VERIFY in closer + self-PRD (see self-prd-generator + self-improvement-loop-closer).\n\n`;
  }

  if (blocks.length) {
    md += `## Blocking Findings (${blocks.length})\n\n`;
    md += '| Type | Ticket | AC | Detail | Evidence |\n|----|--------|----|--------|----------|\n';
    for (const f of blocks) {
      md += `| ${f.type} | ${f.ticketId || ''} | ${f.acId || ''} | ${f.detail.replace(/\|/g, ' ')} | ${(f.evidence || '').replace(/\|/g, ' ').slice(0, 80)} |\n`;
    }
    md += '\n';
  }
  if (warnings.length) {
    md += `## Warnings (${warnings.length})\n\n`;
    for (const f of warnings.slice(0, 20)) {
      md += `- **${f.type}** ${f.ticketId ? `(${f.ticketId})` : ''}: ${f.detail}\n`;
    }
    md += '\n';
  }

  md += `## Actions (Claude R-RTRC + Grok port)\n`;
  md += `- Re-execute analysts with full PATH_VERIFICATION_PROMPT_SECTION + AC_SHAPE_PROMPT_SECTION + ACTIVITY_EVENT_SCHEMA injected (see synthesis PRD).\n`;
  md += `- Every backticked path: run \`git ls-files --error-unmatch <path>\` *before* writing the backtick.\n`;
  md += `- Forward-created: exactly \` \` (one space) + (forward-created) or (created by ticket <8-12char>) outside the backticks.\n`;
  md += `- Run: \`npx tsx engine/src/bin/check-readiness.ts --session <SESSION_DIR>\` (or post-emit in refine manager).\n`;
  md += `- If blocking on council path: the emitter will auto-emit sibling H-REFINE-GATE healer (amber debt ticket proceeds; never stop).\n`;
  md += `- Closer/self-loop will treat gate findings as high-prio emission debt and prioritize refine-hardening in next reliability backlog + self-PRD.\n\n`;
  md += `**References**: prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md (P0 gate item), engine/src/lib/readiness-gate.ts, ticket-emitter.ts, SKILL.md\n`;
  md += `Wubba lubba dub dub. Fix the slop at synthesis time or the autonomous run will eat you.\n`;
  return md;
}

/** Convenience: run gate against a session dir post-emit (used by closer, manual checks, skill handoff). */
export function runReadinessGateOnSession(sessionDir: string, grokRoot?: string): ReadinessGateReport {
  return runReadinessGate(sessionDir, { grokRoot: grokRoot as any, writeReport: true, sessionDirForReport: sessionDir as any } as any);
}

// === Thin self-test / CLI (so `npx tsx engine/src/lib/readiness-gate.ts --help` works; real CLI is bin/check-readiness.ts) ===
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    console.log('readiness-gate.ts — post-synth static gate\nUsage: npx tsx .../readiness-gate.ts --session <dir> | --test');
    process.exit(0);
  }
  if (args.includes('--test')) {
    const fake: any[] = [{ id: 'T01', acceptanceCriteria: [{ id: 'AC1', criterion: 'foo', verify: 'test -f package.json && echo OK' }], scope: 'package.json' }];
    const res = runReadinessGate(fake as any, { writeReport: false });
    console.log('SELF-TEST:', res.summary, 'ok=', res.ok);
    process.exit(res.ok ? 0 : 1);
  }
  const sess = args[args.indexOf('--session') + 1];
  if (sess) {
    const res = runReadinessGateOnSession(sess);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.ok ? 0 : 2);
  }
}
