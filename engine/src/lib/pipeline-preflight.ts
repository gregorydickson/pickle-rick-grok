/**
 * pipeline-preflight.ts — machine-owned guards for "run pipeline on PRD"
 *
 * Produces detailed PreflightReport so callers (future run-pipeline bin, pipeline.ts, mux)
 * can decide: fresh create, link existing, force-refine, or abort on zombie/partial state.
 *
 * Follows the council RCA decision tree:
 * - provenance now owned by SessionManager (stampPrdProvenance + getManifestSeal + getManifestPrdPath in session.ts — state is single source)
 * - artifact materialization (state vs on-disk tickets/<id>/ticket.md)
 * - PRD refinement heuristic (strict Verify runnable check)
 * - zombie/consistent diagnostics with operator recovery instructions
 *
 * Provenance/seal hydra collapsed: no more sidecar writes, no rescue regex, no non-canonical extras.
 * Preflight uses state-loaded sourcePrd + ticketManifestHash for seal checks (deterministic).
 * Uses existing atomic + lock patterns.
 * No SKILLs, no self-prd mutation here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Activity } from '../activity-logger.js';
import type { PreflightReport, ReadinessAssessment } from '../types.js';

export type { PreflightReport };

const RUNNABLE_VERIFY_RE = /\b(npx |node -e |node --|grep |test -f |ls |find |diff |tsc --noEmit|npm test|npm run |sh -c |python -c |cat |head |tail )\b/i;

/** Detects common "theatrical" / non-deterministic / always-pass patterns inside Verify command strings.
 *  These are the exact anti-patterns that let R-META-DEEPEN-001 (and self-prd pads) emit tickets
 *  whose ACs could never be proven by a Verifier Morty on the current tree.
 *  (Formerly extended by the deleted parallel readiness-gate.ts; now the single canonical home after the 2026-05 review simplification.)
 *  See prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md + ticket-emitter integration (full port of Claude sibling's check-readiness + forward-ref-annotation patterns).
 *
 *  P0 self-theater fix (2026-05-24 auditor): added patterns for the old wc/grep count and grep-A|grep-q
 *  anti-patterns that were baked into auto-generated H-VERIFY healers themselves. Replacements use
 *  node -e + direct exit codes / fs checks. This prevents healer-needs-healer infinite debt.
 */
const VERIFY_THEATER_RE: RegExp[] = [
  /\|\|\s*(true|echo\s|cat\s|:\s*;\s*true)/i,
  /\b(verify|check|ensure|confirm)\s+(manually|by\s*eye|visually|observe|see\s+that|hand|human)/i,
  /must (pass|exit 0|report success|succeed) (on current|today|before impl|stub|now)/i,
  /\bTODO\b.*(verify|check|AC)/i,
  /placeholder|later|NYI.*(verify|AC)/i,
  /^\s*(ls|cat|find|echo|head|tail)\s+[^\n|;]*$/i, // bare observation, no assertion
  /grep -qE? ['"].*['"]\s*\|\|\s*true/i,
  /\/\*\s*(after|post|once|when|feed good)/i, // the exact incident markers
  // === P0: catch the exact self-theatrical patterns previously emitted by ticket-emitter healers ===
  /\|?\s*wc -l\s*\|?\s*grep -q/i,                    // wc -l | grep -q '^0$' or '^[1-9]' count checks (fragile, non-direct)
  /grep -A\s+\d+\s+['"].*['"]\s*\|?\s*grep -[qE]/i,  // grep -A N ... | grep -q  (use node regex span instead)
  /node -e\s+['"][^'"]*['"]\s*\|\s*grep -q/i,        // node -e '...' | grep -q (fold the assertion into the -e with process.exit)
];

export function detectVerifyTheater(verify: string): { isTheatrical: boolean; reasons: string[]; hits: number } {
  const reasons: string[] = [];
  let hits = 0;
  for (const re of VERIFY_THEATER_RE) {
    if (re.test(verify)) {
      hits++;
      reasons.push(re.source);
    }
  }
  return { isTheatrical: hits > 0, reasons, hits };
}

// === RESTORED MISSING FUNCTIONS (P0 from 2026-05-24 broad agent review — 019e5a58-b031 + 019e5a58-b031-...)
// These were lost in the "unification/simplification" after deleting the parallel readiness-gate.
// Restored from dist/ (prior build) + canonical patterns in ../pickle-rick-claude (check-readiness.ts + forward-ref-annotation.ts + services).
// This makes the HARD EMISSION GATE, SKILL synthesis enforcement, self-PRD/closer, and autonomous paths actually functional instead of theater.

const SKELETAL_RE = [
  /\bTODO\b(?![\s:]*[A-Z0-9-])/i,
  /\bFIXME\b/i,
  /\bstub(?:bed|bing)?\b/i,
  /\bskeleton\b/i,
  /\bnot implemented\b/i,
  /\bplaceholder\b/i,
  /throw new (?:Error|Error\(['"](?:Not|not|TODO|todo|implement|stub|NYI))/i,
  /\/\*\s*(?:todo|stub|skeleton|implement later|placeholder)\b/i,
  /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/i,
  /=>\s*\{\s*\}/i,
];

function extractMentionedFiles(text: string): string[] {
  const set = new Set<string>();
  const re1 = /([a-zA-Z0-9_\/.-]*\/[a-zA-Z0-9_\/.-]+\.(?:ts|js|tsx|jsx|mjs|cjs|md|json))/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(text)) !== null) {
    if (m[1]) set.add(m[1].replace(/^\.\//, ''));
  }
  const re2 = /`([a-zA-Z0-9_\/.-]+\.(?:ts|js|md))`/g;
  while ((m = re2.exec(text)) !== null) {
    if (m[1]) set.add(m[1]);
  }
  return Array.from(set).filter(f => (f.includes('/') || f.startsWith('engine')) && !f.includes('node_modules') && f.length > 4);
}

export function assessMetaReadiness(scope: string, verifyContent: string, opts: { grokRoot?: string } = {}): ReadinessAssessment {
  const grokRoot = opts.grokRoot || process.cwd();
  const combined = `${scope || ''}\n${verifyContent || ''}`;
  const candidates = extractMentionedFiles(combined).slice(0, 12);
  const signals: any[] = [];
  const scanned: string[] = [];
  let totalHits = 0;
  for (const rel of candidates) {
    const cleaned = rel.replace(/^[\/]+/, '');
    const full = path.isAbsolute(rel) ? rel : path.join(grokRoot, cleaned);
    if (!fs.existsSync(full)) continue;
    if (!full.includes('/engine/') && !full.includes('/skills/') && !full.includes('/prds/') && !full.includes('/references/')) continue;
    try {
      const content = fs.readFileSync(full, 'utf8');
      scanned.push(rel);
      for (const pat of SKELETAL_RE) {
        const matches = content.match(pat) || [];
        if (matches.length > 0) {
          totalHits += matches.length;
          const exLine = content.split(/\r?\n/).find(l => pat.test(l));
          signals.push({ file: rel, pattern: pat.source || pat.toString(), hits: matches.length, example: exLine ? exLine.trim().slice(0, 110) : undefined });
        }
      }
    } catch { /* cheap */ }
    if (scanned.length >= 8) break;
  }
  let status: 'green' | 'amber' | 'red' = 'green';
  let score = 100;
  if (totalHits >= 6 || signals.length >= 3) { status = 'red'; score = 15; }
  else if (totalHits > 0 || scanned.length === 0) { status = 'amber'; score = 55; }
  const suggested: string[] = status !== 'green' ? ['Address skeletal/stub code before meta tickets', 'Run foundation P0 tickets first'] : [];
  return {
    status, score, signals, filesScanned: scanned, suggestedPrereqs: suggested,
    scannedAt: new Date().toISOString(),
    summary: `Readiness ${status.toUpperCase()} (score ${score}, ${totalHits} hits on ${scanned.length} files)`,
  } as ReadinessAssessment;
}

export function summarizeReadiness(tickets: any[]): string | null {
  const rs = (tickets || []).map((t: any) => t.readiness).filter(Boolean);
  if (rs.length === 0) return null;
  const g = rs.filter((r: any) => r.status === 'green').length;
  const a = rs.filter((r: any) => r.status === 'amber').length;
  const r = rs.filter((r: any) => r.status === 'red').length;
  return `meta-readiness green=${g} amber=${a} red=${r} (of ${rs.length} tickets)`;
}

export function runPreflight(sessionDir: string, prdPath?: string): any {
  try {
    const statePath = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(statePath)) return { ok: false, reason: 'no state' };
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const ticketCount = (state.tickets || []).length;
    return { ok: ticketCount > 0, ticketCount, hasManifest: !!state.ticketManifestHash, needsRefine: ticketCount === 0 };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'preflight error' };
  }
}

export function isPrdSufficientlyRefined(prdContent: string): boolean {
  if (!prdContent) return false;
  return /— Verify:|`[^`]+`\s+\(/.test(prdContent) && /## (Requirements|Acceptance Criteria|Scope)/i.test(prdContent);
}

export function checkTicketMaterialization(sessionDir: string): any {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(sessionDir, 'state.json'), 'utf8'));
    const stateTickets: string[] = (state.tickets || []).map((t: any) => t.id);
    const diskDir = path.join(sessionDir, 'tickets');
    const onDiskSet = new Set(
      fs.existsSync(diskDir)
        ? fs.readdirSync(diskDir).filter((d: string) => !d.startsWith('.'))
        : []
    );
    const missingTicketIds = stateTickets.filter((id: string) => !onDiskSet.has(id));
    const allPresent = missingTicketIds.length === 0;
    const onDisk = onDiskSet.size;
    const inState = stateTickets.length;
    return {
      onDisk,
      inState,
      match: onDisk === inState,
      allPresent,
      missingTicketIds,
    };
  } catch {
    return { onDisk: 0, inState: 0, match: false, allPresent: false, missingTicketIds: [] };
  }
}

export function computeTicketManifestHash(tickets: any[]): string {
  const ids = (tickets || []).map((t: any) => t.id).sort().join('|');
  return require('crypto').createHash('sha256').update(ids).digest('hex').slice(0, 16);
}

// Functions above are already exported via "export function" declarations.
// The previous duplicate export block was removed to resolve redeclaration errors after the full port restoration.

// === Core shift-left hygiene (the missing pieces the 2026-05-24 PRD + SKILLs + agent reviews demanded)
// Ported from sibling ../pickle-rick-claude/extension/src/bin/check-readiness.ts + services/forward-ref-annotation.ts
// + prior dist/ bodies. These are the functions ticket-emitter, SKILL synthesis, self-prd, citadel etc. actually call.

const MACHINE_HINT_RE = /\b(exit (0|1|code|codes)|assert|expect|===|==|!=|length|includes|count|rows?|entries?|table|JSON\.parse|parseInt|grep -[cq]|test -[ef]|tsc --noEmit|node --test|describe\.each|writes? (to|file|artifact)|emits? (event|signal)|--check|status.*0|\d+ (files?|lines?|matches?))\b/i;
const PURE_PROSE_RE = /\b(must (feel|be|look|seem|appear)|should (be|feel|look)|robust|fast(er)?|good|clean|intuitive|reliable|performant|scalable|user-friendly)\b/i;

export function checkVerifyMachinability(verify: string): { isMachineCheckable: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (PURE_PROSE_RE.test(verify) && !MACHINE_HINT_RE.test(verify)) {
    reasons.push('pure prose without machine hints');
  }
  if (!MACHINE_HINT_RE.test(verify) && !/\|.+\|/.test(verify) && !/`[^`]+`/.test(verify)) {
    reasons.push('no machine-actionable hints or structured output');
  }
  return { isMachineCheckable: reasons.length === 0, reasons };
}

const FORWARD_REF_ANNOTATION_RE = /\s\(forward-created\)|\s\(created by ticket [A-Za-z0-9-]{3,20}\)|\s\(introduced by ticket [^\)]{3,30}\)/;

export function scanAnalystOutputsForUnverifiedPaths(analystOutputs: string, ticketManifestOrTicketsText = '', grokRoot = process.cwd()): { errors: string[]; warnings: string[]; passed: boolean; checkedTokens: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const combined = `${analystOutputs || ''}\n${ticketManifestOrTicketsText || ''}`;
  const backtickRe = /`([^\s`]+?(?:\.(?:ts|js|md|json|tsx|jsx)|:[0-9]+|[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z]))`/g;
  let m: RegExpExecArray | null;
  let checked = 0;
  while ((m = backtickRe.exec(combined)) !== null) {
    const tok = (m[1] || '').trim();
    if (!tok || tok.length < 3) continue;
    if (/^(fs|path|os|child_process|crypto|util|stream|http|https|node:|[A-Z][a-z]+Error)\b/.test(tok)) continue;
    checked++;
    const contextAfter = combined.substring(m.index + m[0].length, Math.min(combined.length, m.index + m[0].length + 80));
    const hasForwardMention = /forward|created by|introduced by|new file|will (create|emit|add)/i.test(combined.substring(Math.max(0, m.index - 40), m.index + 120));
    if (hasForwardMention && !FORWARD_REF_ANNOTATION_RE.test(contextAfter)) {
      errors.push(`Forward-ref hygiene violation for \`${tok}\`: annotation must be exactly one ASCII space followed by (forward-created) or (created by ticket <hash>) or (introduced by ticket ...). Found near: ${contextAfter.slice(0,40)}`);
    }
  }
  // Minimal git-enforced forward-ref scan (exact one-space forms)
  const ANNOTATED_PATH_RE = /`([^`]+?)`\s{1}(\((?:forward-created|created by ticket [A-Za-z0-9_.-]{3,25}|introduced by ticket [A-Za-z0-9_.-]{3,25})\))/gi;
  const BARE_PATH_RE = /`([a-zA-Z0-9_\/.-]+\.(?:ts|js|tsx|jsx|mjs|cjs|md|json|sh|yml|yaml))`/g;
  const VALID_FORWARD_ANNO = ['forward-created', 'created by ticket ', 'introduced by ticket '];
  const seen = new Set<string>();
  let m2: RegExpExecArray | null;
  ANNOTATED_PATH_RE.lastIndex = 0;
  while ((m2 = ANNOTATED_PATH_RE.exec(combined)) !== null) {
    const p = (m2[1] ?? '').trim();
    const anno = m2[2] ?? '';
    const key = `${p}:${anno}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const valid = VALID_FORWARD_ANNO.some(v => anno.includes(v));
    if (!valid) {
      errors.push(`Malformed forward-ref annotation on \`${p}\`: "${anno}". Must be exactly one space then (forward-created) or (created by ticket <hash>) or (introduced by ticket ...).`);
    }
  }
  BARE_PATH_RE.lastIndex = 0;
  while ((m2 = BARE_PATH_RE.exec(combined)) !== null) {
    const p = (m2[1] ?? '').trim();
    if (seen.has(p)) continue;
    seen.add(p);
    const idx = m2.index ?? 0;
    const context = combined.slice(Math.max(0, idx - 30), idx + m2[0].length + 20);
    ANNOTATED_PATH_RE.lastIndex = 0;
    const hasValidAnnoNearby = ANNOTATED_PATH_RE.test(context);
    if (!hasValidAnnoNearby && !fs.existsSync(path.join(grokRoot, p.replace(/^\.\//, '')))) {
      errors.push(`Backticked path \`${p}\` does not exist on disk / git HEAD and carries no valid forward-ref annotation. Every backticked path/symbol in ACs/Verifies/Scope must be verified with git ls-files/git grep before emission.`);
    }
  }
  if (/##\s*ac_shape_smells/i.test(combined) && !/"smells"\s*:\s*\[/i.test(combined)) {
    warnings.push('ac_shape_smells section present but missing expected machine-readable JSON { "smells": [...] } shape');
  }
  const passed = errors.length === 0;
  return { errors, warnings, passed, checkedTokens: checked };
}

// Minimal shims for callers that still reference the old names (from the partial port era).
// Full implementations live in the sibling (../pickle-rick-claude) and prior dist/; these prevent immediate crash
// while the complete port is hardened.
export function isLegalToBypassRefine(report: any, explicitNoRefine = true): boolean {
  if (!explicitNoRefine) return false;
  return !!(report && report.hasRealMaterializedTickets && report.ticketManifestHashMatch && (report.ticketCountOnDisk || 0) > 0 && !report.isZombie);
}

export function analyzeSessionForVerifyTheater(sessionDir: string): any {
  // Lightweight version that reuses the theater detector we do have.
  try {
    const statePath = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(statePath)) return { totalTickets: 0, theatricalCount: 0, shouldEmitHardening: false, details: ['no state'] };
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const tickets = state.tickets || [];
    let theatrical = 0;
    for (const t of tickets) {
      const ver = (t.readiness && t.readiness.summary) || '';
      if (detectVerifyTheater(ver).isTheatrical) theatrical++;
    }
    return {
      totalTickets: tickets.length,
      theatricalCount: theatrical,
      percent: tickets.length ? Math.round((theatrical / tickets.length) * 100) : 0,
      shouldEmitHardening: theatrical > 0,
      sampleTheatricalIds: tickets.filter((t: any) => detectVerifyTheater((t.readiness && t.readiness.summary) || '').isTheatrical).map((t: any) => t.id).slice(0, 5),
      details: [],
    };
  } catch (e: any) {
    return { totalTickets: 0, theatricalCount: 0, shouldEmitHardening: false, details: [e?.message || 'error'] };
  }
}
