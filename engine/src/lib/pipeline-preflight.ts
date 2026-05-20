/**
 * pipeline-preflight.ts — machine-owned guards for "run pipeline on PRD"
 *
 * Produces detailed PreflightReport so callers (future run-pipeline bin, pipeline.ts, mux)
 * can decide: fresh create, link existing, force-refine, or abort on zombie/partial state.
 *
 * Follows the council RCA decision tree:
 * - provenance (sourcePrd stamp + .prd-source.json)
 * - artifact materialization (state vs on-disk tickets/<id>/ticket.md)
 * - PRD refinement heuristic (strict Verify runnable check)
 * - zombie/consistent diagnostics with operator recovery instructions
 *
 * Uses existing atomic + lock patterns (via re-exported writeJsonAtomic).
 * No SKILLs, no self-prd mutation here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Activity } from '../activity-logger.js';
import type { PreflightReport, ReadinessAssessment } from '../types.js';

/** Local copy of atomic write pattern (avoids cycle with session.ts importing this lib). */
function writeJsonAtomicLocal(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export type { PreflightReport };

const RUNNABLE_VERIFY_RE = /\b(npx |node -e |node --|grep |test -f |ls |find |diff |tsc --noEmit|npm test|npm run |sh -c |python -c |cat |head |tail )\b/i;

function computePrdHash(content: string): string {
  // simple stable hash for change detection (no crypto dep)
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = (h * 31 + content.charCodeAt(i)) | 0;
  }
  return 'h' + (h >>> 0).toString(16);
}

/** Stable hash for the set of tickets emitted for a PRD (P0 post-incident provenance seal against manual/old-flawed reuse). */
export function computeTicketManifestHash(ticketIds: string[], extra = ''): string {
  const canon = [...ticketIds].sort().join('|') + '|' + extra;
  let h = 0;
  for (let i = 0; i < canon.length; i++) {
    h = (h * 31 + canon.charCodeAt(i)) | 0;
  }
  return 'tmh' + ((h >>> 0).toString(16));
}

/** Strict heuristic: requires Verify column + >=2 runnable shell commands in backticks. */
export function isPrdSufficientlyRefined(prdContent: string): { sufficient: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const lines = prdContent.split(/\r?\n/);
  const hasVerifyCol = lines.some(l => /\|\s*Verify\s*\|/i.test(l) || /Verify\s*\|\s*Criterion/i.test(l));
  if (!hasVerifyCol) {
    reasons.push('Missing "Verify" column in Acceptance Criteria table (required for machine guards)');
    return { sufficient: false, score: 0, reasons };
  }
  score += 25;

  // Collect all backticked content in the doc (focus on table rows)
  const backtickCmds: string[] = [];
  const btRe = /`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = btRe.exec(prdContent)) !== null) {
    backtickCmds.push((m[1] || '').trim()); // noUncheckedIndexedAccess on RegExpExecArray
  }

  const runnableMatches = backtickCmds.filter(c => RUNNABLE_VERIFY_RE.test(c));
  if (runnableMatches.length === 0) {
    reasons.push('No runnable verification commands found in Verify cells (need npx/node -e/grep/test -f etc.)');
    return { sufficient: false, score, reasons };
  }
  score += Math.min(50, runnableMatches.length * 8);

  // Bonus for volume of ACs
  const acLike = (prdContent.match(/\bAC[-_ ]?[0-9A-Z-]+\b/gi) || []).length;
  if (acLike >= 4) {
    score += 15;
  } else if (acLike >= 2) {
    score += 8;
  } else {
    reasons.push(`Sparse ACs (${acLike}); refine for richer machine-checkable Verifies`);
  }

  const sufficient = score >= 65 && runnableMatches.length >= 2;
  if (sufficient) {
    reasons.push(`PRD sufficiently refined: ${runnableMatches.length} runnable verifies detected`);
  } else if (reasons.length === 0) {
    reasons.push('PRD Verify commands present but insufficient volume/quality for autonomous run');
  }

  return { sufficient, score: Math.min(100, score), reasons };
}

export function checkTicketMaterialization(sessionDir: string): { countOnDisk: number; missingTicketIds: string[]; allPresent: boolean; ticketIdsInState: string[] } {
  const statePath = path.join(sessionDir, 'state.json');
  let ticketIds: string[] = [];
  try {
    if (fs.existsSync(statePath)) {
      const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      ticketIds = (raw.tickets || []).map((t: any) => t.id).filter(Boolean);
    }
  } catch {
    /* corrupt handled upstream */
  }

  let countOnDisk = 0;
  const missing: string[] = [];
  for (const id of ticketIds) {
    const ticketMd = path.join(sessionDir, 'tickets', id, 'ticket.md');
    if (fs.existsSync(ticketMd)) {
      countOnDisk++;
    } else {
      missing.push(id);
    }
  }
  return {
    countOnDisk,
    missingTicketIds: missing,
    allPresent: missing.length === 0 && ticketIds.length > 0,
    ticketIdsInState: ticketIds,
  };
}

export function readPrdSourceMeta(sessionDir: string): { prdPath?: string; linkedAt?: string; contentHash?: string; ticketManifestHash?: string } | null {
  const p = path.join(sessionDir, '.prd-source.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function writePrdSourceMeta(sessionDir: string, prdPath: string, contentHash = '', ticketManifestHash = ''): void {
  const resolved = path.resolve(prdPath);
  const meta: any = {
    prdPath: resolved,
    linkedAt: new Date().toISOString(),
    contentHash: contentHash || '',
  };
  if (ticketManifestHash) meta.ticketManifestHash = ticketManifestHash;
  const p = path.join(sessionDir, '.prd-source.json');
  writeJsonAtomicLocal(p, meta);
}

/**
 * Core preflight entrypoint. Returns rich report + side-effect logs Activity.
 * Decision tree (per architect RCA):
 * 1. Can we load state? else zombie.
 * 2. Ticket materialization vs state (P0 guard).
 * 3. Source PRD provenance match (stamped vs .prd-source vs caller prdPath).
 * 4. If PRD present, run isPrdSufficientlyRefined heuristic.
 * 5. Synthesize flags + actionable diagnostics.
 */
export function runPreflight(sessionDir: string, prdPath?: string): PreflightReport {
  const diagnostics: string[] = [];
  const sessionId = path.basename(sessionDir);

  let state: any = null;
  try {
    const stateP = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(stateP)) throw new Error('no state.json');
    state = JSON.parse(fs.readFileSync(stateP, 'utf8'));
  } catch (e: any) {
    diagnostics.push(`Cannot load state.json: ${e?.message || e}. Session is corrupt or partial.`);
    const report: PreflightReport = {
      ok: false,
      needsRefine: false,
      isZombie: true,
      isConsistent: false,
      ticketCountOnDisk: 0,
      missingTicketIds: [],
      sourcePrdMatch: false,
      diagnostics,
      ...(prdPath !== undefined ? { prdPath } : {}),
    };
    Activity.preflightReport(sessionId, { ok: false, isZombie: true, reason: 'no-state' });
    return report;
  }

  const sessionSourcePrd: string | undefined = state.sourcePrd;
  let effectivePrd = prdPath || sessionSourcePrd;

  const meta = readPrdSourceMeta(sessionDir);
  if (!effectivePrd && meta?.prdPath) {
    effectivePrd = meta.prdPath;
  }

  const mat = checkTicketMaterialization(sessionDir);
  const ticketCountInState = mat.ticketIdsInState.length;

  let isZombie = false;
  if (ticketCountInState > 0 && mat.missingTicketIds.length > 0) {
    isZombie = true;
    diagnostics.push(
      `ZOMBIE: state lists ${ticketCountInState} tickets but ${mat.missingTicketIds.length} lack ticket.md on disk (${mat.missingTicketIds.join(', ')}). ` +
      `Recovery: re-emit via ticket-emitter (emitRefineCouncilTickets) or use --fresh + createSessionForPrd.`
    );
  }

  let sourcePrdMatch = true;
  if (effectivePrd && sessionSourcePrd && path.resolve(effectivePrd) !== path.resolve(sessionSourcePrd)) {
    sourcePrdMatch = false;
    diagnostics.push(
      `sourcePrd mismatch: session.state has ${sessionSourcePrd} but effective PRD is ${effectivePrd}. ` +
      `This is the exact failure that caused old-session reuse. Call stampPrdSource or createSessionForPrd.`
    );
  }
  if (meta && effectivePrd && path.resolve(meta.prdPath || '') !== path.resolve(effectivePrd)) {
    sourcePrdMatch = false;
    diagnostics.push('.prd-source.json provenance disagrees with effective PRD path.');
  }

  // === Post-incident P0 policy fields (zero-ticket PRD bypass + manifest seal) ===
  const currentManifestHash = computeTicketManifestHash(mat.ticketIdsInState, effectivePrd || '');
  const ticketManifestHash = meta?.ticketManifestHash || '';
  const ticketManifestHashMatch = !!ticketManifestHash && ticketManifestHash === currentManifestHash;
  const hasRealMaterializedTickets = mat.allPresent && mat.countOnDisk > 0 && !isZombie;
  const legalForNoRefine = hasRealMaterializedTickets && ticketManifestHashMatch && !isZombie && sourcePrdMatch;

  let refinement: PreflightReport['refinement'] | undefined;
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
        diagnostics.push(...refinement.reasons);
        Activity.awaitingRefineForPrd(sessionId, effectivePrd, refinement.reasons);
      }
    } catch (e: any) {
      diagnostics.push(`Failed reading PRD at ${effectivePrd}: ${e?.message}`);
    }
  } else if (effectivePrd) {
    diagnostics.push(`Effective PRD path does not exist on disk: ${effectivePrd}`);
  }

  const isConsistent = mat.allPresent && sourcePrdMatch && !isZombie && ticketCountInState > 0;
  const ok = isConsistent && !needsRefine && diagnostics.length === 0;

  if (isZombie) {
    diagnostics.push('Preflight blocks pipeline start on partial materialization (P0 risk per RCA).');
  }

  const report: PreflightReport = {
    ok,
    needsRefine,
    isZombie,
    isConsistent,
    ticketCountOnDisk: mat.countOnDisk,
    missingTicketIds: mat.missingTicketIds,
    sourcePrdMatch,
    diagnostics,
    ...(effectivePrd !== undefined ? { prdPath: effectivePrd } : {}),
    ...(sessionSourcePrd !== undefined ? { sessionSourcePrd } : {}),
    ...(refinement !== undefined ? { refinement } : {}),
    ticketFilesOnDisk: mat.countOnDisk,

    // Post-incident policy + seal fields (attached for run-pipeline gate)
    hasRealMaterializedTickets,
    ticketManifestHash,
    ticketManifestHashMatch,
    legalForNoRefine,
  };

  Activity.preflightReport(sessionId, {
    ok,
    needsRefine,
    isZombie,
    isConsistent,
    ticketCountOnDisk: mat.countOnDisk,
    missingCount: mat.missingTicketIds.length,
    sourcePrdMatch,
    prd: effectivePrd,
  });

  return report;
}

// === META READINESS PROBE (cheap regex skeletal scan for emission-time + preflight on meta PRDs) ===

const SKELETAL_RE: RegExp[] = [
  /\bTODO\b(?![\s:]*[A-Z0-9-])/i,
  /\bFIXME\b/i,
  /\bstub(?:bed|bing)?\b/i,
  /\bskeleton\b/i,
  /\bnot implemented\b/i,
  /\bplaceholder\b/i,
  /throw new (?:Error|Error\(['"](?:Not|not|TODO|todo|implement|stub|NYI))/i,
  /\/\*\s*(?:todo|stub|skeleton|implement later|placeholder)\b/i,
  /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/i, // empty body fn
  /=>\s*\{\s*\}/i, // empty arrow
];

function extractMentionedFiles(text: string): string[] {
  const set = new Set<string>();
  // paths with dirs + ext
  const re1 = /([a-zA-Z0-9_\/.-]*\/[a-zA-Z0-9_\/.-]+\.(?:ts|js|tsx|jsx|mjs|cjs|md|json))/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(text)) !== null) {
    if (m[1]) set.add(m[1].replace(/^\.\//, ''));
  }
  // backticked bare or simple files
  const re2 = /`([a-zA-Z0-9_\/.-]+\.(?:ts|js|md))`/g;
  while ((m = re2.exec(text)) !== null) {
    if (m[1]) set.add(m[1]);
  }
  // filter to plausible project files (avoid noise)
  return Array.from(set).filter(f =>
    (f.includes('/') || f.startsWith('engine')) &&
    !f.includes('node_modules') &&
    f.length > 4
  );
}

export function assessMetaReadiness(
  scope: string,
  verifyContent: string,
  opts: { grokRoot?: string } = {}
): ReadinessAssessment {
  const grokRoot = opts.grokRoot || process.cwd();
  const combined = `${scope || ''}\n${verifyContent || ''}`;
  const candidates = extractMentionedFiles(combined).slice(0, 12); // cheap bound
  const signals: ReadinessAssessment['signals'] = [];
  const scanned: string[] = [];
  let totalHits = 0;

  for (const rel of candidates) {
    // resolve safely under root
    const cleaned = rel.replace(/^[\/]+/, '');
    const full = path.isAbsolute(rel) ? rel : path.join(grokRoot, cleaned);
    if (!fs.existsSync(full)) continue;
    // only scan likely source (cheap + safe)
    if (!full.includes('/engine/') && !full.includes('/skills/') && !full.includes('/prds/') && !full.includes('/references/')) {
      // still allow if explicitly in scope but skip heavy
      continue;
    }
    try {
      const content = fs.readFileSync(full, 'utf8');
      scanned.push(rel);
      for (const pat of SKELETAL_RE) {
        const matches = content.match(pat) || [];
        if (matches.length > 0) {
          totalHits += matches.length;
          const exLine = content.split(/\r?\n/).find(l => pat.test(l));
          const ex = exLine ? exLine.trim().slice(0, 110) : undefined;
          const sig: any = {
            file: rel,
            pattern: pat.source || pat.toString(),
            hits: matches.length,
          };
          if (ex !== undefined) sig.example = ex;
          signals.push(sig);
        }
      }
    } catch {
      /* ignore unreadable, keep cheap */
    }
    if (scanned.length >= 8) break; // hard cheap cap
  }

  let status: ReadinessAssessment['status'] = 'green';
  let score = 100;
  if (totalHits >= 6 || signals.length >= 3) {
    status = 'red';
    score = 15;
  } else if (totalHits > 0 || scanned.length === 0 /* no targets = suspicious for meta */) {
    status = 'amber';
    score = 55;
  }

  const suggested: string[] = [];
  if (status !== 'green') {
    suggested.push('Address skeletal/stub code in listed target files before meta tickets');
    suggested.push('Run foundation P0 tickets (PERSIST/MUTATE/APPLY order) first');
  }

  const summary = `Readiness ${status.toUpperCase()} (score ${score}, ${totalHits} hits on ${scanned.length} files)`;

  return {
    status,
    score,
    signals,
    filesScanned: scanned,
    suggestedPrereqs: suggested,
    scannedAt: new Date().toISOString(),
    summary,
  };
}

export function summarizeReadiness(tickets: any[]): string | null {
  const rs = (tickets || []).map((t: any) => t.readiness).filter(Boolean) as ReadinessAssessment[];
  if (rs.length === 0) return null;
  const g = rs.filter(r => r.status === 'green').length;
  const a = rs.filter(r => r.status === 'amber').length;
  const r = rs.filter(r => r.status === 'red').length;
  return `meta-readiness green=${g} amber=${a} red=${r} (of ${rs.length} tickets)`;
}

/** Post-incident policy predicate: is it legal for a --prd --no-refine invocation to bypass the refine gate? */
export function isLegalToBypassRefine(report: PreflightReport, explicitNoRefine = true): boolean {
  if (!explicitNoRefine) return false;
  return !!(report.hasRealMaterializedTickets && report.ticketManifestHashMatch && (report.ticketCountOnDisk || 0) > 0 && !report.isZombie);
}

export type { ReadinessAssessment };
