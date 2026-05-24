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
 *  Extended by the post-synthesis readiness-gate.ts (machinability + path/forward-ref) which calls this + adds Claude R-RTRC hygiene.
 *  See prds/claude-to-grok-ports-...-2026-05-24.md + ticket-emitter integration.
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

/** Scan a completed campaign session's tickets + artifacts for theatrical Verify patterns (P1 self-healing trigger).
 *  Detects high % theatrical AC Verifies (via backticks + detect), low runnable density, or early deaths (researcher/planner) with "AC Verify"/theatrical mentions in phase artifacts.
 *  Used by post-campaign ingest to auto-emit H-VERIFY hardening tickets via emitter.
 */
export function analyzeSessionForVerifyTheater(sessionDir: string): {
  totalTickets: number;
  theatricalCount: number;
  percent: number;
  earlyDeathTheaterCount: number;
  lowDensityCount: number;
  shouldEmitHardening: boolean;
  sampleTheatricalIds: string[];
  details: string[];
} {
  const result = {
    totalTickets: 0,
    theatricalCount: 0,
    percent: 0,
    earlyDeathTheaterCount: 0,
    lowDensityCount: 0,
    shouldEmitHardening: false,
    sampleTheatricalIds: [] as string[],
    details: [] as string[],
  };
  const statePath = path.join(sessionDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    result.details.push('no state.json');
    return result;
  }
  let state: any;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    result.details.push('state.json unparsable');
    return result;
  }
  const tickets: any[] = state.tickets || [];
  result.totalTickets = tickets.length;
  if (result.totalTickets === 0) return result;

  const theatricalIds: string[] = [];
  let totalStrong = 0;
  let totalRunnableAttempts = 0;

  for (const t of tickets) {
    const id = t.id || 'unknown';
    const ticketMdPath = path.join(sessionDir, 'tickets', id, 'ticket.md');
    let hasTheater = false;
    let strongForTicket = 0;
    let runnablesForTicket = 0;

    if (fs.existsSync(ticketMdPath)) {
      const content = safeReadLocal(ticketMdPath); // local helper below
      // Collect backticks (Verifies live in `...`)
      const btRe = /`([^`]+)`/g;
      let m: RegExpExecArray | null;
      const cmds: string[] = [];
      while ((m = btRe.exec(content)) !== null) {
        if (m[1]) cmds.push(m[1].trim());
      }

      // Hygiene filter: ignore injected contract/doc boilerplate and test-data examples
      // (the very strings we put in the 8-phase notes, VERIFY_THEATER_RE illustrations, and
      // detectVerifyTheater("bad sample") payloads inside H-VERIFY tickets). Only real AC
      // Verify shell commands should contribute to theatrical/low-density counts.
      const realCmds = cmds.filter(c => {
        if (!c || c.length < 4) return false;
        // Skip anything that looks like a regex metachar pattern or our own doc examples
        if (/\\[bsw*+?^${}()|[\]\\]/.test(c) || /after\s*(good|fix|patch)|feed good|\/\* after/i.test(c)) return false;
        if (VERIFY_THEATER_RE.some(re => re.source.includes(c.slice(0, 12)) || c.includes(re.source.slice(0, 12)))) return false;
        return true;
      });

      for (const cmd of realCmds) {
        if (RUNNABLE_VERIFY_RE.test(cmd)) {
          runnablesForTicket++;
          if (!detectVerifyTheater(cmd).isTheatrical) {
            strongForTicket++;
          } else {
            hasTheater = true;
          }
        }
      }
      // Also crude check for Verify table rows with bad patterns
      if (VERIFY_THEATER_RE.some(re => re.test(content))) {
        hasTheater = true;
      }
    }

    totalStrong += strongForTicket;
    totalRunnableAttempts += runnablesForTicket;

    if (hasTheater || (runnablesForTicket > 0 && strongForTicket / runnablesForTicket < 0.6)) {
      if (hasTheater) {
        theatricalIds.push(id);
        result.theatricalCount++;
      } else {
        result.lowDensityCount++;
      }
    }

    // Early death at planner/researcher + theater keywords in artifacts?
    const phases: string[] = t.phasesCompleted || [];
    const last = phases[phases.length - 1] || '';
    const diedEarly = t.status === 'failed' && /research|plan|research_review/i.test(last);
    if (diedEarly) {
      const tdir = path.join(sessionDir, 'tickets', id);
      let foundTheaterKeyword = false;
      try {
        const files = fs.readdirSync(tdir).filter(f => f.endsWith('.md'));
        for (const f of files) {
          const ac = safeReadLocal(path.join(tdir, f));
          if (/theatrical|AC Verify|verify theater|theater.*(fail|reject|block)|"after .*fix"/i.test(ac)) {
            foundTheaterKeyword = true;
            break;
          }
        }
      } catch {}
      if (foundTheaterKeyword) {
        result.earlyDeathTheaterCount++;
        if (!theatricalIds.includes(id)) theatricalIds.push(id);
      }
    }
  }

  result.sampleTheatricalIds = theatricalIds.slice(0, 5);
  result.percent = result.totalTickets > 0 ? Math.round((result.theatricalCount / result.totalTickets) * 100) : 0;

  const avgDensity = totalRunnableAttempts > 0 ? totalStrong / totalRunnableAttempts : 1;
  if (avgDensity < 0.7) {
    result.details.push(`low overall runnable density ${avgDensity.toFixed(2)}`);
  }

  // Thresholds for P1 trigger (tunable; conservative to avoid spam)
  const TH_PCT = 25;
  const TH_DEATHS = 1;
  const TH_LOW_D = Math.max(1, Math.floor(result.totalTickets * 0.3));
  if (result.percent >= TH_PCT || result.earlyDeathTheaterCount >= TH_DEATHS || result.lowDensityCount >= TH_LOW_D) {
    result.shouldEmitHardening = true;
    result.details.push(`trigger: pct=${result.percent} deaths=${result.earlyDeathTheaterCount} lowD=${result.lowDensityCount}`);
  }

  return result;
}

/** local safe read to avoid import cycle (phase-utils.safeRead is fine but duplicate tiny fn) */
function safeReadLocal(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

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
  const canonExtra = extra ? path.resolve(extra) : '';
  const canon = [...ticketIds].sort().join('|') + '|' + canonExtra;
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
  const hasVerifyCol = lines.some(l => /\|\s*(Verify|Verification)\b/i.test(l));
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

  // Same hygiene filter as analyzeSessionForVerifyTheater — ignore doc boilerplate
  // so that meta PRDs containing their own contract examples don't get false "theatrical"
  const realPrdCmds = backtickCmds.filter(c => {
    if (!c || c.length < 4) return false;
    if (/\\[bsw*+?^${}()|[\]\\]/.test(c) || /after\s*(good|fix|patch)|feed good|\/\* after/i.test(c)) return false;
    if (VERIFY_THEATER_RE.some(re => re.source.includes(c.slice(0, 12)) || c.includes(re.source.slice(0, 12)))) return false;
    return true;
  });

  const runnableMatches = realPrdCmds.filter(c => RUNNABLE_VERIFY_RE.test(c));
  const strongMatches = runnableMatches.filter(c => !detectVerifyTheater(c).isTheatrical);
  if (strongMatches.length === 0) {
    reasons.push('No runnable, theater-free verification commands found in Verify cells (no "after fix", "|| true", "manually observe", etc.)');
    return { sufficient: false, score, reasons };
  }
  if (runnableMatches.length > strongMatches.length) {
    reasons.push(`Filtered ${runnableMatches.length - strongMatches.length} theatrical Verify commands (theater patterns detected)`);
  }
  score += Math.min(50, strongMatches.length * 8);

  // Bonus for volume of ACs
  const acLike = (prdContent.match(/\bAC[-_ ]?[0-9A-Z-]+\b/gi) || []).length;
  if (acLike >= 4) {
    score += 15;
  } else if (acLike >= 2) {
    score += 8;
  } else {
    reasons.push(`Sparse ACs (${acLike}); refine for richer machine-checkable Verifies`);
  }

  const sufficient = score >= 65 && strongMatches.length >= 2;
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
  if (fs.existsSync(statePath)) {
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    ticketIds = (raw.tickets || []).map((t: any) => t.id).filter(Boolean);
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

/**
 * Core preflight entrypoint. Returns rich report + side-effect logs Activity.
 * Decision tree (per architect RCA):
 * 1. Can we load state? else zombie.
 * 2. Ticket materialization vs state (P0 guard).
 * 3. Source PRD provenance match (from state via SessionManager; legacy sidecar tolerant).
 * 4. If PRD present, run isPrdSufficientlyRefined heuristic.
 * 5. Synthesize flags + actionable diagnostics.
 * (Provenance details now in session.ts:getManifestSeal — trimmed here.)
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

  // Provenance simplified: state is owner (via stampPrdProvenance). Legacy sidecar only for extreme pre-collapse; state.sourcePrd wins.
  // effectivePrd from caller or state is now guaranteed the real stamped PRD.

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
      `This is the exact failure that caused old-session reuse. Call stampPrdProvenance or createSessionForPrd.`
    );
  }

  // === Post-incident P0 policy fields (zero-ticket PRD bypass + manifest seal) ===
  // Use state + effective (now canonical thanks to session owner). No getManifestPrdPath / sidecar needed.
  const prdExtraForHash = sessionSourcePrd || effectivePrd || '';
  const currentManifestHash = computeTicketManifestHash(mat.ticketIdsInState, prdExtraForHash ? path.resolve(prdExtraForHash) : '');
  const ticketManifestHash = state.ticketManifestHash || '';
  const ticketManifestHashMatch = !!ticketManifestHash && ticketManifestHash === currentManifestHash;
  if (ticketManifestHash && !ticketManifestHashMatch) {
    diagnostics.push(`P0-SEAL-MISMATCH: stored=${ticketManifestHash} current=${currentManifestHash} extra=${prdExtraForHash || ''} (exact RCA for ILLEGAL --no-refine path; re-emit via emitRefineCouncilTickets to refresh full-set seal)`);
  }
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

    // Rich RCA payload — now sourced from state (via session owner)
    currentManifestHash,
    storedManifestHash: ticketManifestHash,
    manifestExtra: prdExtraForHash ? path.resolve(prdExtraForHash) : '',
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

  // NEW: direct Verify string theater detection (the birth defect that killed R-META-DEEPEN-001)
  const theater = detectVerifyTheater(verifyContent || '');
  if (theater.isTheatrical) {
    totalHits += theater.hits;
    signals.push({ file: '<verify-text>', pattern: 'VERIFY_THEATER', hits: theater.hits, example: theater.reasons.slice(0, 2).join(' | ') });
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
  if (theater.isTheatrical) {
    suggested.push('Verifies contain theatrical/always-pass constructs (|| true, "after fix", "manually observe", generic "exit 0 on current"); rewrite with explicit BASELINE (runnable today) vs SUCCESS forms');
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

// === P0 Shift-left emission quality ports from Claude sibling (see prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md) ===
// These enable post-synthesis enforcement in refine manager (SKILL.md) + prompt sections for analysts.
// AC-shape smell detection, path/symbol verification hygiene (with exact forward-ref annotation), activity schema discipline.

/** evaluateAcShapeEnforcement: rejects endpoint-enumeration / repeated-predicate smells lacking parametrized collapse (e.g. describe.each) OR explicit justification + acceptance test. */
export function evaluateAcShapeEnforcement(smells: Array<{type?: string; location?: string; requires_justification?: boolean; justification?: string; collapsed?: boolean; description?: string; [k: string]: any}> = []): { passed: boolean; violations: string[]; details: string } {
  const violations: string[] = [];
  for (const s of smells) {
    const t = String(s.type || s.description || '').toLowerCase();
    const isEnumSmell = /endpoint.*enumeration|enumeration|repeated-predicate|no-universal|ac_shape.*smell/i.test(t) || (s.requires_justification === true);
    if (isEnumSmell && !s.collapsed && !(s.justification && String(s.justification).trim().length > 5)) {
      violations.push(`AC shape smell ${s.type || 'endpoint_enumeration'} @ ${s.location || 'unknown'}: must collapse to parametrized (describe.each etc) or include explicit // JUSTIFICATION: + acceptance test`);
    }
  }
  return { passed: violations.length === 0, violations, details: violations.length ? violations.join(' | ') : 'AC shapes clean (no un-justified enumeration smells)' };
}

const FORWARD_REF_ANNOTATION_RE = /\s\(forward-created\)|\s\(created by ticket [A-Za-z0-9-]{3,20}\)|\s\(introduced by ticket [^\)]{3,30}\)/;

/** Exact forward-ref annotation contract (Claude R-RTRC-7 / R-SAOV-7 style, one ASCII space outside backticks). */
const VALID_FORWARD_ANNO = ['forward-created', 'created by ticket ', 'introduced by ticket '];
const ANNOTATED_PATH_RE = /`([^`]+?)`\s{1}(\((?:forward-created|created by ticket [A-Za-z0-9_.-]{3,25}|introduced by ticket [A-Za-z0-9_.-]{3,25})\))/gi;
const BARE_PATH_RE = /`([a-zA-Z0-9_\/.-]+\.(?:ts|js|tsx|jsx|mjs|cjs|md|json|sh|yml|yaml))`/g;

/** Verify a candidate path exists on disk or via git (at HEAD). Non-fatal on git fail. */
function pathExistsUnderGit(rel: string, root: string): boolean {
  const cleaned = rel.replace(/^\.\/|^\/+/, '');
  if (!cleaned || cleaned.includes('node_modules')) return false;
  const abs = path.isAbsolute(cleaned) ? cleaned : path.join(root, cleaned);
  try {
    execSync(`git ls-files --error-unmatch -- "${cleaned}"`, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    });
    return true;
  } catch {
    return fs.existsSync(abs);
  }
}

/** scanAnalystOutputsForUnverifiedPaths + forward-ref annotation format check (lightweight; full git verification is prompt-enforced on analysts via PATH_VERIFICATION_PROMPT_SECTION).
 * Enhanced with git ls-files enforcement + exact annotation regex (P0 Claude hygiene, folded into the single preflight home per review).
 */
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

  // Full git-enforced forward-ref scan (exact Claude R-RTRC-7 style)
  const seen = new Set<string>();
  let m2: RegExpExecArray | null;
  while ((m2 = ANNOTATED_PATH_RE.exec(combined)) !== null) {
    const p = (m2[1] ?? '').trim();
    const anno = m2[2] ?? '';
    const key = `${p}:${anno}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const valid = VALID_FORWARD_ANNO.some(v => anno.includes(v));
    if (!valid) {
      errors.push(`Malformed forward-ref annotation on \`${p}\`: "${anno}". Must be exactly one space then (forward-created) or (created by ticket <hash>) or (introduced by ticket ...).`);
    } else if (!pathExistsUnderGit(p, grokRoot)) {
      // allowed for forward-created
    }
  }
  BARE_PATH_RE.lastIndex = 0;
  while ((m2 = BARE_PATH_RE.exec(combined)) !== null) {
    const p = (m2[1] ?? '').trim();
    if (seen.has(p)) continue;
    seen.add(p);
    const idx = m2.index ?? 0;
    const context = combined.slice(Math.max(0, idx - 30), idx + m2[0].length + 20);
    const hasValidAnnoNearby = ANNOTATED_PATH_RE.test(context);
    if (!hasValidAnnoNearby && !pathExistsUnderGit(p, grokRoot)) {
      errors.push(`Backticked path \`${p}\` does not exist on disk / git HEAD and carries no valid forward-ref annotation. Every backticked path/symbol in ACs/Verifies/Scope must be verified with git ls-files/git grep before emission.`);
    }
  }

  if (/##\s*ac_shape_smells/i.test(combined) && !/"smells"\s*:\s*\[/i.test(combined)) {
    warnings.push('ac_shape_smells section present but missing expected machine-readable JSON { "smells": [...] } shape');
  }
  const passed = errors.length === 0;
  return { errors, warnings, passed, checkedTokens: checked };
}

/** Machinability check layered on detectVerifyTheater (MACHINE_HINT_RE vs PURE_PROSE_RE). */
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

export type { ReadinessAssessment };
export { scanAnalystOutputsForUnverifiedPaths, checkVerifyMachinability, evaluateAcShapeEnforcement };
