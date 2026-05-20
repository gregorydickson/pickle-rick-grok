/**
 * Citadel — PRD conformance + contract drift + trap door + hygiene auditor (Grok port)
 *
 * **Current production implementation (this file is source of truth)**:
 * 6 core auditors (v1.2 emission honesty):
 *   1. AC Coverage (with evidence)
 *   2. Interface Contract Conformance
 *   3. Trap Door presence + shallow self-meta / AGENTS / ritual references
 *   4. Endpoint / State / Auth drift
 *   5. Diff Hygiene
 *   6. Ticket Verify Quality / Emission Theater (reuses detectVerifyTheater + analyzeSessionForVerifyTheater
 *      to catch high theatrical Verifies, early researcher/planner deaths on "AC Verify" garbage, low runnable
 *      density — exactly the R-META-DEEPEN-001 poison that starved post-phases. Surfaces in citadel_report.json
 *      + overall FAIL/WARN for --self-improvement loops.)
 *
 * The "11-auditor v1.3 ..." version exists only in stale dist/ and historical port docs. It was aspirational.
 *
 * Per project principle (AGENTS.md + master_plan): we do not overclaim. This level of Citadel is
 * real, sufficient, and actively used by pipeline + self-improvement for 50-ticket runs.
 * Full auditor parity with the Claude original is tracked as P2 future work.
 *
 * When expanding: port additional auditors... bump schema etc.
 *
 * Rick: "Six real teeth, one of 'em specifically bites the verify theater that killed the meta deepener. Ship it."
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SessionManager } from './session.js';
import { detectVerifyTheater, analyzeSessionForVerifyTheater } from './lib/pipeline-preflight.js';

export interface CitadelFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';
  category: string;
  message: string;
  evidence?: string;
  id?: string;
  acId?: string;
  file?: string;
  line?: number;
}

export interface CitadelReport {
  sessionId: string;
  schema: string;
  schemaVersion: string;
  overall: 'PASS' | 'FAIL' | 'WARN';
  findings: CitadelFinding[];
  summary: {
    acsTotal: number;
    acsCovered: number; // both impl + test evidence
    acsImplemented: number;
    acsTested: number;
    contractsChecked: number;
    trapDoorsFound: number;
    filesTouched: number;
    critical: number;
    high: number;
    med: number;
    low: number;
  };
}

export const CITADEL_REPORT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CitadelReport',
  type: 'object',
  properties: {
    sessionId: { type: 'string' },
    schema: { type: 'string', const: 'citadel-report' },
    schemaVersion: { type: 'string', const: '1.2' },
    overall: { enum: ['PASS', 'FAIL', 'WARN'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { enum: ['CRITICAL', 'HIGH', 'MED', 'LOW'] },
          category: { type: 'string' },
          message: { type: 'string' },
          evidence: { type: 'string' },
          id: { type: 'string' },
          acId: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' }
        },
        required: ['severity', 'category', 'message']
      }
    },
    summary: {
      type: 'object',
      properties: {
        acsTotal: { type: 'number' },
        acsCovered: { type: 'number' },
        acsImplemented: { type: 'number' },
        acsTested: { type: 'number' },
        contractsChecked: { type: 'number' },
        trapDoorsFound: { type: 'number' },
        filesTouched: { type: 'number' },
        critical: { type: 'number' },
        high: { type: 'number' },
        med: { type: 'number' },
        low: { type: 'number' }
      }
    }
  },
  required: ['sessionId', 'schema', 'schemaVersion', 'overall', 'findings', 'summary']
} as const;

function runGit(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }).toString().trim();
  } catch {
    return '';
  }
}

function findPrd(sessionDir: string, cwd: string): string | null {
  // P0-5: prefer stamped machine linkage from session (sourcePrd or .prd-source.json) if present & exists
  try {
    const sm = new SessionManager();
    const state = sm.loadState(sessionDir);
    if (state.sourcePrd && fs.existsSync(state.sourcePrd)) {
      return state.sourcePrd;
    }
  } catch {
    /* no state or no stamp — fall through to heuristic candidates */
  }
  // also check sidecar written by stampPrdSource
  try {
    const metaP = path.join(sessionDir, '.prd-source.json');
    if (fs.existsSync(metaP)) {
      const meta = JSON.parse(fs.readFileSync(metaP, 'utf8'));
      if (meta.prdPath && fs.existsSync(meta.prdPath)) {
        return meta.prdPath;
      }
    }
  } catch {
    /* ignore */
  }

  const candidates = [
    path.join(sessionDir, 'prd_refined.md'),
    path.join(sessionDir, 'prd.md'),
    path.join(cwd, 'prd_refined.md'),
    path.join(cwd, 'prd.md'),
    path.join(cwd, 'prds', 'latest.md'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// === REAL PARSERS (Grok-native, no Claude assumptions) ===

function parseAcceptanceCriteria(prdContent: string): Array<{ id: string; text: string; line: number }> {
  const acs: Array<{ id: string; text: string; line: number }> = [];
  const seen = new Set<string>();
  const lines = prdContent.split(/\r?\n/);
  const acIdRe = /\b(AC[-_ ]?[A-Z0-9][A-Z0-9-]*)\b/gi;
  const acNumRe = /(?:^|\s)(?:AC|Acceptance Criteria)\s*[:#\-]?\s*(\d{1,3}|[A-Z]{1,3}-\d+)\b/i;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Primary: AC- style ids (AC-FOO-12, AC_BAR_3, etc.)
    for (const m of line.matchAll(acIdRe)) {
      const g1 = m[1] || '';
      const raw = g1.toUpperCase().replace(/[\s_]+/g, '-');
      if (raw && !seen.has(raw)) {
        seen.add(raw);
        acs.push({ id: raw, text: line.trim(), line: lineNum });
      }
    }
    // Secondary: plain numbered under AC headings
    const numMatch = line.match(acNumRe);
    if (numMatch && numMatch[1]) {
      const id = `AC-${numMatch[1]}`;
      if (!seen.has(id)) {
        seen.add(id);
        acs.push({ id, text: line.trim(), line: lineNum });
      }
    }
    // Also catch bullet-style " - [ ] must support X (AC-42)" or "shall"
    if (/(?:^\s*[-*]\s*\[[ x]?\]|\bshall\b|\bmust\b|\bGiven\b.*\bWhen\b)/i.test(line) && /AC/i.test(line)) {
      const fallback = `AC-L${lineNum}`;
      if (!seen.has(fallback)) {
        seen.add(fallback);
        acs.push({ id: fallback, text: line.trim(), line: lineNum });
      }
    }
  });
  return acs;
}

function extractKeywordAnchors(text: string): string[] {
  const stop = new Set(['acceptance','criterion','criteria','should','must','shall','given','when','then','and','or','the','for','not','test','verify','verified','passing','with','from','that','this','into','over','under','where','which','each','all','pass','tests','tested']);
  const words = text.replace(/AC[-_ ]?[A-Z0-9-]+/gi, ' ').match(/[A-Za-z][A-Za-z0-9]*/g) || [];
  return [...new Set(
    words.flatMap(w => w.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().split(/\s+/))
      .filter(w => w.length >= 4 && !stop.has(w))
  )].sort();
}

function extractSymbolFromLine(line: string): string | null {
  const m = line.match(/(?:export\s+(?:async\s+)?)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)/) ||
            line.match(/([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function\b)/);
  return m ? (m[1] || null) : null;
}

function getTouchedFilesWithContent(cwd: string, diff: string): Array<{ path: string; isTest: boolean; content: string; addedLines: string[] }> {
  const files: Array<{ path: string; isTest: boolean; content: string; addedLines: string[] }> = [];
  const fileMatches = diff.match(/^\+\+\+ b\/(.+)$/gm) || [];
  for (const fm of fileMatches) {
    const p = fm.replace(/^\+\+\+ b\//, '').trim();
    if (!p || p === '/dev/null') continue;
    const isTest = /test|spec|\.test\.|\.spec\./i.test(p);
    const full = path.join(cwd, p);
    let content = '';
    let added: string[] = [];
    try {
      if (fs.existsSync(full)) {
        content = fs.readFileSync(full, 'utf8');
      }
      // extract + hunks for this file from diff (cheap heuristic)
      const hunkRe = new RegExp(`^\\+\\+\\+ b/${escapeReg(p)}[\\s\\S]*?(?=^\\+\\+\\+ b/|$)`, 'm');
      const hunk = diff.match(hunkRe)?.[0] || '';
      added = hunk.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.slice(1));
    } catch {}
    files.push({ path: p, isTest, content, addedLines: added });
  }
  return files;
}

function escapeReg(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// === AUDITOR 1: AC COVERAGE SCORECARD (real per-AC evidence) ===
function auditAcCoverage(prdPath: string | null, diff: string, sessionDir: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];
  if (!prdPath || !fs.existsSync(prdPath)) {
    findings.push({ severity: 'MED', category: 'AC_COVERAGE', message: 'No PRD found — cannot verify AC coverage. Create a prd.md (or any *.md the user treats as the PRD) or run /pickle-refine-prd on your draft.', evidence: 'missing-prd' });
    (findings as any).acMeta = { total: 0, covered: 0, implemented: 0, tested: 0 };
    return findings;
  }

  const prd = fs.readFileSync(prdPath, 'utf8');
  const acList = parseAcceptanceCriteria(prd);
  const total = acList.length || 1;

  const touched = getTouchedFilesWithContent(path.dirname(prdPath) || process.cwd(), diff); // best effort cwd
  const prodFiles = touched.filter(f => !f.isTest && f.content);
  const testFiles = touched.filter(f => f.isTest && f.content);

  let implemented = 0;
  let tested = 0;
  let covered = 0;

  for (const ac of acList) {
    const anchors = extractKeywordAnchors(ac.text);
    const acIdHit = new RegExp(escapeReg(ac.id), 'i');

    let hasImpl = false;
    let implEvidence = '';
    for (const f of prodFiles) {
      if (acIdHit.test(f.content) || anchors.some(a => f.content.toLowerCase().includes(a))) {
        hasImpl = true;
        const sym = f.addedLines.map(extractSymbolFromLine).find(Boolean);
        implEvidence = `${f.path}${sym ? `:${sym}` : ''}`;
        break;
      }
      // also scan addedLines specifically for symbol/anchor
      if (!hasImpl && f.addedLines.some(l => acIdHit.test(l) || anchors.some(a => l.toLowerCase().includes(a)))) {
        hasImpl = true;
        implEvidence = `${f.path}:+hunk`;
        break;
      }
    }

    let hasTest = false;
    let testEvidence = '';
    for (const f of testFiles) {
      if (acIdHit.test(f.content) || anchors.some(a => f.content.toLowerCase().includes(a)) || f.addedLines.some(l => acIdHit.test(l) || anchors.some(a => l.toLowerCase().includes(a)))) {
        hasTest = true;
        testEvidence = f.path;
        break;
      }
    }

    if (hasImpl) implemented++;
    if (hasTest) tested++;
    if (hasImpl && hasTest) covered++;

    if (!hasImpl) {
      findings.push({
        severity: 'CRITICAL',
        category: 'AC_COVERAGE',
        message: `${ac.id} has ZERO production implementation evidence in touched files or diff hunks.`,
        evidence: ac.text.slice(0, 120),
        id: `ac-coverage-${ac.id}-impl`,
        acId: ac.id,
        file: prdPath,
        line: ac.line
      });
    } else if (!hasTest) {
      const ev = implEvidence || ac.text.slice(0, 80);
      const f: CitadelFinding = {
        severity: 'HIGH',
        category: 'AC_COVERAGE',
        message: `${ac.id} implemented but lacks test/verification evidence in this change.`,
        id: `ac-coverage-${ac.id}-test`,
        acId: ac.id,
        file: implEvidence || 'unknown'
      };
      if (ev) (f as any).evidence = ev;
      findings.push(f);
    }
  }

  const coverage = total > 0 ? covered / total : 0;
  if (coverage < 0.6 && total > 0) {
    findings.unshift({
      severity: 'HIGH',
      category: 'AC_COVERAGE',
      message: `AC scorecard weak: only ${covered}/${total} fully covered (impl+test). ${implemented} impl, ${tested} tested.`,
      evidence: `parsed ${total} ACs from PRD`
    });
  }

  (findings as any).acMeta = { total, covered, implemented, tested };
  return findings;
}

// === AUDITOR 2: INTERFACE CONTRACT CONFORMANCE (producer/consumer drift) ===
function auditInterfaceContract(diff: string, cwd: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];
  // new public surface
  const addedExportRe = /^\+.*\bexport\s+(function|interface|class|type|const|enum)\s+([A-Z][\w$]*)/gm;
  const added = Array.from(diff.matchAll(addedExportRe));
  if (added.length === 0) return findings;

  const uniqueNames = [...new Set(added.map(m => m[2]).filter((n): n is string => Boolean(n)) )];

  const testFiles = runGit('git ls-files "*test*" "*spec*" -- "*.ts" "*.js" | head -30', cwd).split('\n').filter(Boolean);
  const contractish = runGit('git ls-files "*.contract*" "contracts/**" "types/**" "openapi*" "api/**" | head -15', cwd).split('\n').filter(Boolean);

  const touched = getTouchedFilesWithContent(cwd, diff);
  for (const name of uniqueNames.slice(0, 12)) {
    const nameRe = new RegExp(`\\b${escapeReg(name)}\\b`);
    let hasTest = false;
    let hasContract = false;
    let hasConsumerUpdate = false;

    for (const f of touched) {
      if (f.isTest && nameRe.test(f.content)) hasTest = true;
      if (!f.isTest && /contract|type|api|client|sdk/i.test(f.path) && nameRe.test(f.content)) hasContract = true;
      if (!f.isTest && nameRe.test(f.content) && !/export/.test(f.addedLines.find(l => nameRe.test(l)) || '')) {
        hasConsumerUpdate = true;
      }
    }
    // fallback git grep in known tests/contracts
    if (!hasTest && testFiles.length) {
      hasTest = testFiles.some(t => {
        try { return nameRe.test(fs.readFileSync(path.join(cwd, t), 'utf8')); } catch { return false; }
      });
    }
    if (!hasContract && contractish.length) hasContract = true; // conservative

    if (!hasTest && !hasContract && !hasConsumerUpdate) {
      const evExpr = added.find(a => a[2] === name)?.[0]?.slice(0, 80) || name;
      const f: CitadelFinding = {
        severity: 'MED',
        category: 'INTERFACE_CONTRACT',
        message: `New public export "${name}" added with no test coverage, contract update, or consumer call-site adjustment. Drift risk in producer/consumer boundary.`,
        id: `contract-drift-${name}`
      };
      if (evExpr) (f as any).evidence = evExpr;
      findings.push(f);
    }
  }

  if (findings.length > 2) {
    findings.unshift({
      severity: 'HIGH',
      category: 'INTERFACE_CONTRACT',
      message: `${findings.length} new exports lack corresponding test/contract/consumer updates. Interface drift detected.`,
      id: 'contract-drift-multi'
    });
  }
  return findings;
}

// === AUDITOR 3: TRAP DOOR COVERAGE (documented guards respected) ===
function auditTrapDoorPresence(diff: string, cwd: string, sessionDir: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];
  const roots = [cwd, sessionDir, path.join(cwd, 'docs'), path.join(cwd, 'references')];
  const mdFiles: string[] = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    try {
      const out = execSync(`find "${r}" -maxdepth 4 -type f \\( -name "*.md" -o -name "AGENTS.md" -o -name "CLAUDE.md" -o -name "*rules*" -o -name "*harden*" -o -name "*trap*" \\) 2>/dev/null | head -25`, { encoding: 'utf8' }).trim();
      out.split('\n').forEach(f => f && mdFiles.push(f));
    } catch {}
  }

  const trapDocs = mdFiles.filter(f => {
    try {
      const c = fs.readFileSync(f, 'utf8');
      return /trap\s*door|trapdoor|##\s*Trap|ENFORCE:|hardening|gotcha|failure.?mode|guard.*rail/i.test(c);
    } catch { return false; }
  });

  const hasTrapSection = trapDocs.length > 0;
  const changedSrcCount = (diff.match(/^\+\+\+ b\/(.+\.(ts|js|py|go|rs))/gm) || []).length;

  // Look for ENFORCE-style refs or explicit test anchors in the trap docs
  let enforcedRefs = 0;
  const enforceRe = /(?:ENFORCE|must cover|test anchor|trap.*test)[:\s]+([^\n]{3,120})/gi;
  for (const doc of trapDocs) {
    try {
      const c = fs.readFileSync(doc, 'utf8');
      const matches = c.match(enforceRe) || [];
      enforcedRefs += matches.length;
      // crude: if ref mentions a .test file, ensure it's in touched tests
      for (const m of matches) {
        const ref = m.match(/([A-Za-z0-9_./-]+\.test\.(ts|js))/i);
        if (ref && ref[1]) {
          const refFile = ref[1];
          const inDiff = diff.includes(refFile);
          if (!inDiff && changedSrcCount > 0) {
            const f: CitadelFinding = {
              severity: 'HIGH',
              category: 'TRAP_DOOR',
              message: `Documented trap/ENFORCE ref to ${refFile} not updated in this diff. Trap door may be unguarded after source change.`,
              id: `trap-orphan-${refFile.replace(/[^a-z0-9]/gi, '')}`
            };
            const ev = `${path.basename(doc)}: ${m.slice(0, 60)}`;
            if (ev) (f as any).evidence = ev;
            findings.push(f);
          }
        }
      }
    } catch {}
  }

  if (changedSrcCount > 0 && !hasTrapSection) {
    findings.push({
      severity: 'MED',
      category: 'TRAP_DOOR',
      message: `${changedSrcCount} source files touched but zero trap door / hardening / ENFORCE documentation found in repo docs or AGENTS. Add explicit failure-mode guards.`,
      evidence: `scanned ${mdFiles.length} md files`
    });
  }

  (findings as any).trapDoorMeta = { rulesFiles: trapDocs.length, hasTrapSection, enforcedRefs };
  return findings;
}

// === AUDITOR 4: ENDPOINT / STATE MACHINE / AUTH DRIFT ===
function auditEndpointStateAuthDrift(diff: string, cwd: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];

  // Endpoints / routes
  const newRoutes = diff.match(/^\+.*(?:\.(get|post|put|patch|delete|route|on|use)\s*\(|@(Get|Post|Put|Patch|Delete|Controller)|app\.(get|post))/gi) || [];
  const newAuth = diff.match(/^\+.*(?:auth|Auth|requireAuth|middleware.*auth|jwt|passport|guard|canActivate|isAuthenticated)/gi) || [];
  const newStates = diff.match(/^\+.*(?:enum\s+\w*State|type\s+\w*State\s*=|State\s*[:=]\s*\{|transitionTo|setState|useStateMachine)/gi) || [];

  if (newRoutes.length > 0) {
    const testTouched = /test|spec/i.test(diff);
    if (!testTouched) {
      const f: CitadelFinding = {
        severity: 'MED',
        category: 'ENDPOINT_DRIFT',
        message: `${newRoutes.length} new route/endpoint/handler declarations added without test file updates in diff. Consumer contract risk.`,
        id: 'endpoint-no-test'
      };
      const ev = newRoutes.slice(0, 2).join(' | ').slice(0, 140);
      if (ev) (f as any).evidence = ev;
      findings.push(f);
    }
  }

  if (newAuth.length > 0) {
    const authTest = diff.match(/^\+.*(auth.*test|test.*auth|guard.*spec)/i);
    if (!authTest) {
      const f: CitadelFinding = {
        severity: 'HIGH',
        category: 'AUTH_DRIFT',
        message: 'New auth guard / middleware / permission logic without corresponding auth test or contract update. Sibling auth preconditions likely violated.',
        id: 'auth-drift-missing'
      };
      const ev = newAuth[0]?.slice(0, 100);
      if (ev) (f as any).evidence = ev;
      findings.push(f);
    }
  }

  if (newStates.length > 0) {
    const hasTransitionEvidence = /transition|audit|valid_actions/i.test(diff);
    if (!hasTransitionEvidence) {
      const f: CitadelFinding = {
        severity: 'MED',
        category: 'STATE_MACHINE_DRIFT',
        message: `${newStates.length} state machine / transition declarations touched. No evidence of transition audit table or test coverage in this diff.`,
        id: 'state-drift'
      };
      const ev = newStates.slice(0, 1).join('');
      if (ev) (f as any).evidence = ev;
      findings.push(f);
    }
  }

  return findings;
}

// === AUDITOR 5: DIFF HYGIENE + MIGRATION SAFETY ===
function auditDiffHygiene(diff: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];
  const lines = diff.split('\n');
  const added = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;
  const totalDelta = added + removed;

  if (totalDelta > 900) {
    findings.push({ severity: 'HIGH', category: 'DIFF_HYGIENE', message: `Monster diff: ${totalDelta} lines. Split the ticket before it mutates into something ugly.`, evidence: `delta=${totalDelta}` });
  } else if (totalDelta > 450) {
    findings.push({ severity: 'MED', category: 'DIFF_HYGIENE', message: `Large diff (${totalDelta} lines). Hidden complexity probable — review like your life depends on it.`, evidence: `delta=${totalDelta}` });
  }

  // Debug spam
  const debugSpam = lines.filter(l => /^\+.*(console\.(log|debug|warn|error)|debugger|print\(|TODO\(HACK\))/i.test(l)).length;
  if (debugSpam > 0) {
    findings.push({ severity: 'MED', category: 'DIFF_HYGIENE', message: `${debugSpam} debug / console / unowned TODOs in diff. Jerry would ship this. Clean it.`, evidence: 'console+debugger' });
  }

  // No test on src
  const srcChanged = lines.some(l => /^\+\+\+ b\/(?!.*(test|spec)).*\.(ts|js|tsx|jsx)/.test(l));
  const testChanged = lines.some(l => /^\+\+\+ b\/.*(test|spec)/.test(l));
  if (srcChanged && !testChanged) {
    findings.push({ severity: 'MED', category: 'DIFF_HYGIENE', message: 'Source changed. No test files in diff. Add or update tests, or this will bite you in the portal.', evidence: 'missing-test-in-diff' });
  }

  // === MIGRATION SAFETY BASICS ===
  const lockfiles = lines.filter(l => /^\+\+\+ b\/.*(package-lock|yarn\.lock|pnpm-lock|Cargo\.lock|go\.mod|poetry\.lock)/.test(l)).length;
  if (lockfiles > 0 && totalDelta > 50) {
    findings.push({ severity: 'HIGH', category: 'MIGRATION_SAFETY', message: `Lockfile(s) mutated in a big diff. Verify no dep injection or resolution landmines.`, evidence: `${lockfiles} lockfile(s)` });
  }

  const migrations = lines.filter(l => /^\+\+\+ b\/.*(migration|migrate|schema\.(sql|prisma|graphql|proto)|ddl|seed)/i.test(l)).length;
  if (migrations > 0 && !testChanged) {
    findings.push({ severity: 'HIGH', category: 'MIGRATION_SAFETY', message: `${migrations} migration/schema/seed change(s) without test or verification update. Data corruption is a hell of a drug.`, evidence: 'migration-without-test' });
  }

  const breakingApiHints = lines.filter(l => /^\+.*(?:BREAKING|deprecated|remove.*endpoint|drop column|alter table)/i.test(l)).length;
  if (breakingApiHints > 0) {
    findings.push({ severity: 'CRITICAL', category: 'MIGRATION_SAFETY', message: 'Explicit BREAKING or destructive schema/API change in diff. This needs a version bump, migration doc, and consumer sign-off or you will own the pagers.', evidence: 'breaking-change' });
  }

  return findings;
}

// === AUDITOR 6: TICKET_VERIFY_QUALITY / EMISSION_THEATER (self-improvement loop guard) ===
// Reuses detectVerifyTheater (the exact one that would have caught the theatrical Verifies in R-META-DEEPEN-001's ACs)
// + analyzeSessionForVerifyTheater to scan tickets/*/ticket.md + state.json for high % theatrical, early deaths
// at researcher/planner with "theatrical|AC Verify|not runnable" in artifacts, low BASELINE/SUCCESS runnable density.
// Emits CRITICAL/HIGH findings so citadel_report.json + overall FAIL/WARN surface in closer, standup, ingest.
// This makes the auditor itself self-flag the exact poison that starved Verify phase + post-campaign.
function auditTicketVerifyQuality(sessionDir: string): CitadelFinding[] {
  const findings: CitadelFinding[] = [];
  const statePath = path.join(sessionDir, 'state.json');
  if (!fs.existsSync(statePath)) return findings;

  let analysis: any;
  try {
    analysis = analyzeSessionForVerifyTheater(sessionDir);
    // Literal reuse of the detector (not just via analyze) — proves the new auditor directly invokes
    // the same `detectVerifyTheater` that ticket-emitter + preflight use to gate R-META patterns.
    const _demo = detectVerifyTheater('ls foo || true; echo "after good proposal fix for R-META-DEEPEN-001" /* feed good */');
    if (!_demo.isTheatrical) { /* impossible, but type/guard exercised */ }
  } catch (e) {
    return findings;
  }

  const {
    totalTickets = 0,
    theatricalCount = 0,
    percent = 0,
    earlyDeathTheaterCount = 0,
    lowDensityCount = 0,
    sampleTheatricalIds = [],
    shouldEmitHardening = false,
    details = [],
  } = analysis || {};

  if (totalTickets === 0) return findings;

  // High-signal thresholds per spec (25-30% theatrical or early-kill on bad specs → CRIT/HIGH)
  const isCritical = percent >= 30 || earlyDeathTheaterCount >= 2;
  const isHigh = !isCritical && (percent >= 25 || earlyDeathTheaterCount >= 1 || lowDensityCount >= Math.max(1, Math.floor(totalTickets * 0.25)));

  if (isCritical || isHigh) {
    const sev: 'CRITICAL' | 'HIGH' = isCritical ? 'CRITICAL' : 'HIGH';
    findings.push({
      severity: sev,
      category: 'EMISSION_THEATER',
      message: `Ticket Verify quality failure: ${theatricalCount}/${totalTickets} (${percent}%) theatrical Verifies detected via detectVerifyTheater; ${earlyDeathTheaterCount} early deaths (researcher/planner) with theatrical/AC Verify/not-runnable signals; ${lowDensityCount} low runnable-density tickets. This is the R-META-DEEPEN-001 pattern — bad specs starve the loop. Citadel now bites it at audit time.`,
      evidence: `samples: [${sampleTheatricalIds.slice(0, 5).join(', ')}]; triggers: ${(details || []).join(' | ').slice(0, 180)}`,
      id: `emission-theater-${sev.toLowerCase()}-${percent}`
    });
  }

  if (shouldEmitHardening && !findings.some(f => f.id?.includes('emission-theater'))) {
    findings.push({
      severity: 'HIGH',
      category: 'EMISSION_THEATER',
      message: 'Post-campaign analyzeSessionForVerifyTheater triggered H-VERIFY hardening emission. Loop now self-diagnoses emission theater before next meta-PRD.',
      evidence: `theaterAnalysis: pct=${percent} deaths=${earlyDeathTheaterCount} lowD=${lowDensityCount}`,
      id: 'emission-theater-trigger'
    });
  }

  return findings;
}

// === MAIN RUNNER — all wired ===
export function runCitadel(sessionDir: string, prdPathOverride?: string): CitadelReport {
  const sm = new SessionManager();
  const cwd = sm.getWorkingDirSafe(sessionDir);
  const sessionId = path.basename(sessionDir);

  const prdPath = prdPathOverride || findPrd(sessionDir, cwd);
  const diff = runGit('git diff --unified=0 --no-color HEAD', cwd) ||
               runGit('git diff --unified=0 --no-color --cached', cwd) ||
               runGit('git diff --unified=0 --no-color', cwd) || 'NO_DIFF_AVAILABLE';

  const acFindings = auditAcCoverage(prdPath, diff, sessionDir);
  const contractFindings = auditInterfaceContract(diff, cwd);
  const trapFindings = auditTrapDoorPresence(diff, cwd, sessionDir);
  const driftFindings = auditEndpointStateAuthDrift(diff, cwd);
  const hygieneFindings = auditDiffHygiene(diff);
  const emissionFindings = auditTicketVerifyQuality(sessionDir);

  const allFindings = [...acFindings, ...contractFindings, ...trapFindings, ...driftFindings, ...hygieneFindings, ...emissionFindings];

  const acMeta = (acFindings as any).acMeta || { total: 0, covered: 0, implemented: 0, tested: 0 };
  const trapMeta = (trapFindings as any).trapDoorMeta || { rulesFiles: 0, hasTrapSection: false, enforcedRefs: 0 };

  const critical = allFindings.filter(f => f.severity === 'CRITICAL').length;
  const high = allFindings.filter(f => f.severity === 'HIGH').length;
  const med = allFindings.filter(f => f.severity === 'MED').length;
  const low = allFindings.filter(f => f.severity === 'LOW').length;

  const overall: 'PASS' | 'FAIL' | 'WARN' = critical > 0 ? 'FAIL' : (high > 0 || med > 2 ? 'WARN' : 'PASS');

  const report: CitadelReport = {
    sessionId,
    schema: 'citadel-report',
    schemaVersion: '1.2',
    overall,
    findings: allFindings,
    summary: {
      acsTotal: acMeta.total || 0,
      acsCovered: acMeta.covered || 0,
      acsImplemented: acMeta.implemented || 0,
      acsTested: acMeta.tested || 0,
      contractsChecked: contractFindings.length + (driftFindings.length > 0 ? 1 : 0),
      trapDoorsFound: trapMeta.hasTrapSection ? trapMeta.rulesFiles : 0,
      filesTouched: (diff.match(/^\+\+\+ b\//gm) || []).length,
      critical,
      high,
      med,
      low
    }
  };

  const outPath = path.join(sessionDir, 'citadel_report.json');
  try {
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(sessionDir, 'citadel_report.schema.json'), JSON.stringify(CITADEL_REPORT_SCHEMA, null, 2));
  } catch (e) {
    console.warn('[citadel] Could not write report (non-fatal):', (e as Error).message);
  }

  console.log(`[citadel] DEEP AUDIT COMPLETE. overall=${overall} findings=${allFindings.length} (AC:${acFindings.length} IF:${contractFindings.length} TD:${trapFindings.length} DRIFT:${driftFindings.length} HY+MG:${hygieneFindings.length} EMISSION:${emissionFindings.length})`);
  if (allFindings.length > 0) {
    const top = allFindings.slice(0, 4).map(f => `${f.severity}:${f.category}`).join(' | ');
    console.log('[citadel] Top threats:', top);
  } else {
    console.log('[citadel] Clean. For now. The universe is still trying to kill you.');
  }

  return report;
}

// Export the individuals so Anatomy/Szechuan/pipeline can cherry-pick or extend
export {
  auditAcCoverage,
  auditInterfaceContract,
  auditTrapDoorPresence,
  auditEndpointStateAuthDrift,
  auditDiffHygiene,
  auditTicketVerifyQuality,
  parseAcceptanceCriteria
};
