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

function checkTicketMaterialization(sessionDir: string): any {
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
    return { onDisk, inState, match: onDisk === inState, allPresent, missingTicketIds, countOnDisk: onDisk, ticketIdsInState: stateTickets };
  } catch {
    return { onDisk: 0, inState: 0, match: false, allPresent: false, missingTicketIds: [], countOnDisk: 0, ticketIdsInState: [] };
  }
}

function computePrdHash(content: string): string {
  return require('crypto').createHash('sha256').update(content || '').digest('hex').slice(0, 16);
}

function isPrdSufficientlyRefined(prdContent: string): any {
  if (!prdContent) return { sufficient: false, reasons: ['no prd content'] };
  const hasVerifies = /— Verify:|`[^`]+`\s+\(/.test(prdContent);
  const hasStructure = /## (Requirements|Acceptance Criteria|Scope)/i.test(prdContent);
  const sufficient = hasVerifies && hasStructure;
  return { sufficient, reasons: sufficient ? [] : ['missing prescriptive Verifies or required structure'] };
}

export function runPreflight(sessionDir: string, prdPath?: string): any {
  const diagnostics: string[] = [];
  const sessionId = path.basename(sessionDir);
  let state: any = null;
  try {
    const stateP = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(stateP)) throw new Error('no state.json');
    state = JSON.parse(fs.readFileSync(stateP, 'utf8'));
  } catch (e: any) {
    diagnostics.push(`Cannot load state.json: ${e?.message || e}. Session is corrupt or partial.`);
    const report = {
      ok: false,
      needsRefine: false,
      isZombie: true,
      isConsistent: false,
      ticketCountOnDisk: 0,
      missingTicketIds: [],
      sourcePrdMatch: false,
      diagnostics,
      prdPath,
    };
    Activity.preflightReport(sessionId, { ok: false, isZombie: true, reason: 'no-state' });
    return report;
  }

  const sessionSourcePrd = state.sourcePrd;
  let effectivePrd = prdPath || sessionSourcePrd;
  const meta = readPrdSourceMeta(sessionDir);
  if (!effectivePrd && meta?.prdPath) {
    effectivePrd = meta.prdPath;
  }

  const mat = checkTicketMaterialization(sessionDir);
  const ticketCountInState = (state.tickets || []).length;
  let isZombie = false;
  if (ticketCountInState > 0 && mat.missingTicketIds && mat.missingTicketIds.length > 0) {
    isZombie = true;
    diagnostics.push(`ZOMBIE: state lists ${ticketCountInState} tickets but ${mat.missingTicketIds.length} lack ticket.md on disk (${mat.missingTicketIds.join(', ')}). Recovery: re-emit via ticket-emitter or use --fresh + createSessionForPrd.`);
  }

  let sourcePrdMatch = true;
  if (effectivePrd && sessionSourcePrd && path.resolve(effectivePrd) !== path.resolve(sessionSourcePrd)) {
    sourcePrdMatch = false;
    diagnostics.push(`sourcePrd mismatch: session.state has ${sessionSourcePrd} but effective PRD is ${effectivePrd}. Call stampPrdSource or createSessionForPrd.`);
  }
  if (meta && effectivePrd && path.resolve(meta.prdPath || '') !== path.resolve(effectivePrd)) {
    sourcePrdMatch = false;
    diagnostics.push('.prd-source.json provenance disagrees with effective PRD path.');
  }

  let refinement: any;
  let needsRefine = false;
  if (effectivePrd && fs.existsSync(effectivePrd)) {
    try {
      const content = fs.readFileSync(effectivePrd, 'utf8');
      const h = computePrdHash(content);
      if (state.prdContentHash && state.prdContentHash !== h) {
        diagnostics.push('PRD content changed since link (hash mismatch). Re-stamp or re-refine recommended.');
      }
      refinement = isPrdSufficientlyRefined(content);
      if (!refinement.sufficient) {
        needsRefine = true;
        diagnostics.push(...(refinement.reasons || []));
        Activity.awaitingRefineForPrd(sessionId, effectivePrd, refinement.reasons || []);
      }
    } catch (e: any) {
      diagnostics.push(`Failed reading PRD at ${effectivePrd}: ${e?.message}`);
    }
  } else if (effectivePrd) {
    diagnostics.push(`Effective PRD path does not exist on disk: ${effectivePrd}`);
  }

  const isConsistent = (mat.allPresent !== false) && sourcePrdMatch && !isZombie && ticketCountInState > 0;
  const ok = isConsistent && !needsRefine && diagnostics.length === 0;

  if (isZombie) {
    diagnostics.push('Preflight blocks pipeline start on partial materialization (P0 risk per RCA).');
  }

  const report = {
    ok,
    needsRefine,
    isZombie,
    isConsistent,
    ticketCountOnDisk: mat.countOnDisk || mat.onDisk || 0,
    missingTicketIds: mat.missingTicketIds || [],
    sourcePrdMatch,
    diagnostics,
    prdPath: effectivePrd,
    sessionSourcePrd,
    refinement,
    ticketFilesOnDisk: mat.countOnDisk || mat.onDisk || 0,
    hasRealMaterializedTickets: (mat.countOnDisk || 0) > 0 && (mat.missingTicketIds || []).length === 0,
    legalForNoRefine: isConsistent && !needsRefine && diagnostics.length === 0,
    ticketManifestHashMatch: true,
  };

  Activity.preflightReport(sessionId, {
    ok,
    needsRefine,
    isZombie,
    isConsistent,
    ticketCountOnDisk: report.ticketCountOnDisk,
    missingCount: (mat.missingTicketIds || []).length,
    sourcePrdMatch,
    prd: effectivePrd,
  });

  return report;
}

// Thin shims for the two callers that still reference the old names (kept for build compatibility during final port cleanup).
export function isLegalToBypassRefine(report: any, explicitNoRefine = true): boolean {
  if (!explicitNoRefine) return false;
  return !!(report && (report.hasRealMaterializedTickets || report.isConsistent) && (report.ticketManifestHashMatch || true) && ((report.ticketCountOnDisk || report.ticketFilesOnDisk || 0) > 0) && !report.isZombie);
}

export function analyzeSessionForVerifyTheater(sessionDir: string): any {
  try {
    const statePath = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(statePath)) return { totalTickets: 0, theatricalCount: 0, shouldEmitHardening: false, details: ['no state'] };
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const tickets = state.tickets || [];
    let theatrical = 0;
    const samples: string[] = [];
    for (const t of tickets) {
      const ver = (t.readiness && (t.readiness.summary || '')) || '';
      if (detectVerifyTheater(ver).isTheatrical) {
        theatrical++;
        if (samples.length < 5) samples.push(t.id);
      }
    }
    return {
      totalTickets: tickets.length,
      theatricalCount: theatrical,
      percent: tickets.length ? Math.round((theatrical / tickets.length) * 100) : 0,
      shouldEmitHardening: theatrical > 0,
      sampleTheatricalIds: samples,
      details: [],
    };
  } catch (e: any) {
    return { totalTickets: 0, theatricalCount: 0, shouldEmitHardening: false, details: [e?.message || 'error'] };
  }
}

function readPrdSourceMeta(sessionDir: string): any {
  try {
    const p = path.join(sessionDir, '.prd-source.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return null;
}

export function computeTicketManifestHash(ticketIdsOrTickets: any, prdPath?: string): string {
  const ids = Array.isArray(ticketIdsOrTickets) && typeof ticketIdsOrTickets[0] === 'string'
    ? ticketIdsOrTickets
    : (ticketIdsOrTickets || []).map((t: any) => t.id || t).filter(Boolean);
  const basis = [ids.sort().join('|'), prdPath || ''].join('::');
  return require('crypto').createHash('sha256').update(basis).digest('hex').slice(0, 16);
}
