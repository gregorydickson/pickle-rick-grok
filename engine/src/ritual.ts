/**
 * ritual.ts — ManagerRitual (full production port)
 * Single source for post-worker phase validation, state, gate, circuit, rollback.
 *
 * HARDENED for 50-ticket overnight:
// Meta self-improvement wiring visibility: integrates with self-prd-generator + runSelfImprovementLoopCloser as first-class meta-phases (ritual/persist contracts for 50-tix self campaigns)
 * - artifactDir now defaults to canonical SessionManager 'tickets/<id>' layout
 * - All git ops (getGitHead, changedPaths, safeRollback) use the *target workingDir*
 *   resolved from ctx or SessionState (not the session metadata dir). Gate already did this;
 *   ritual was the last holdout. Now real self-dogfood git rollbacks will hit the correct tree.
 */
import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from './session.js';
import { ConvergenceGate } from './gate.js';
import { CircuitBreaker } from './circuit.js';
import { getGitHead, getChangedPaths, safeRollback } from './git_safety.js';
import { Activity } from './activity-logger.js';
import type { ReadinessAssessment } from './types.js';

export function hasPromiseToken(output: string): boolean {
  return /<promise>\s*I\s+AM\s+DONE\s*<\/promise>/i.test(output || '');
}

export function validateArtifactContract(filePath: string, pattern: string): { ok: boolean; error?: string } {
  if (!fs.existsSync(filePath)) return { ok: false, error: 'file missing for contract check' };
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    if (/research/.test(pattern)) {
      const required = ['relevant files', 'open questions', 'existing patterns', 'data flows', 'readiness assessment'];
      const missing = required.filter(r => !lower.includes(r));
      if (missing.length) return { ok: false, error: `research contract missing sections: ${missing.join(', ')}` };
    } else if (/plan(?!_review)/.test(pattern)) {
      if (!lower.includes('implementation plan') && !lower.includes('steps') && !lower.includes('risk')) {
        return { ok: false, error: 'plan contract missing key planning signals' };
      }
    } else if (/implement|verify|review|simplify/.test(pattern)) {
      if (content.trim().length < 200) return { ok: false, error: 'artifact too thin for mutating phase — Jerry slop detected' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function resolveAndValidateArtifact(
  artifactDir: string,
  pattern: string,
  enforceContract = false
): { ok: boolean; path?: string; error?: string; matched?: string } {
  if (!pattern) return { ok: true };
  if (!fs.existsSync(artifactDir)) return { ok: false, error: `artifact dir missing: ${artifactDir}` };
  let candidate: { path: string; matched: string } | null = null;
  if (fs.existsSync(path.join(artifactDir, pattern)) && !pattern.includes('*')) {
    candidate = { path: path.join(artifactDir, pattern), matched: pattern };
  } else {
    try {
      const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\\\*/g, '.*');
      const re = new RegExp('^' + escaped + '$');
      const files = fs.readdirSync(artifactDir);
      const match = files.find(f => re.test(f));
      if (match) candidate = { path: path.join(artifactDir, match), matched: match };
      else return { ok: false, error: `No match for ${pattern} in ${artifactDir}` };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }
  if (candidate && enforceContract) {
    const c = validateArtifactContract(candidate.path, pattern);
    if (!c.ok) return { ok: false, error: c.error || 'contract failed', path: candidate.path, matched: candidate.matched };
  }
  return candidate ? { ok: true, path: candidate.path, matched: candidate.matched } : { ok: false, error: 'unknown' };
}

/**
 * Extract structured ## Readiness Assessment from a research artifact (research_*.md).
 * Enables ritual to detect 'blocked'/'deferred' without failing the ticket (preserve artifact + status + phasesCompleted).
 * Format mandated in references/phases/research.md ; tolerant regex for real Morty output.
 */
export function extractReadinessAssessment(artifactContent: string): ReadinessAssessment | null {
  if (!artifactContent) return null;
  // Capture from ## Readiness Assessment up to next ## or end
  const sectionMatch = artifactContent.match(/##\s*Readiness Assessment\b([\s\S]*?)(?:\n##\s|\n#|$)/i);
  if (!sectionMatch) return null;
  const body = sectionMatch[1];

  const statusMatch = body.match(/\*?\*?Status\*?\*?\s*[:\-]?\s*(\w+)/i);
  if (!statusMatch) return null;
  let rawStatus = statusMatch[1].toLowerCase().trim();
  // normalize common research variants to our type
  if (rawStatus === 'ready' || rawStatus === 'green') rawStatus = 'green';
  if (rawStatus === 'amber' || rawStatus === 'yellow') rawStatus = 'amber';
  if (rawStatus === 'red') rawStatus = 'red';
  const status = rawStatus as ReadinessAssessment['status'];

  const reasonMatch = body.match(/\*?\*?Reason\*?\*?\s*[:\-]?\s*([^\n]+(?:\n(?!\s*\*\*)[^\n]+)*)/i);
  const reason = reasonMatch ? reasonMatch[1].trim().replace(/\s+/g, ' ') : undefined;

  const prereqLine = body.match(/\*?\*?Suggested Prerequisites\*?\*?\s*[:\-]?\s*([^\n]+)/i);
  const suggestedPrerequisites = prereqLine
    ? prereqLine[1].split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
    : undefined;

  return {
    status,
    score: 60, // research-derived; preflight uses 0-100 skeletal
    signals: [],
    filesScanned: [],
    suggestedPrereqs: suggestedPrerequisites || [],
    suggestedPrerequisites,
    scannedAt: new Date().toISOString(),
    summary: `Research RA: ${status}${reason ? ' — ' + reason.slice(0, 80) : ''}`,
    reason,
    extractedFromResearch: true,
  };
}

export class ManagerRitual {
  private sm: SessionManager;
  private sessionDir: string;
  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
    this.sm = new SessionManager();
  }
  async performPostReturn(ctx: any): Promise<any> {
    const { workerResult, ticketId, phase, preSha, expectedArtifact, autoRollbackOnGateFail = false, autoRollbackOnCircuitTrip = false, workingDir: ctxWorkingDir } = ctx;
    // Resolve the *target repo* working dir for all git ops (the tree being edited by workers).
    // Falls back to SessionState.workingDir (what createSession stored) or process.cwd.
    // Critical for real 50-tix self-dogfood: rollbacks/gates must hit the pickle tree, not the sessions/ metadata dir.
    const workingDir = ctxWorkingDir || this.sm.getWorkingDirSafe(this.sessionDir);
    const currentHead = getGitHead(workingDir) || '';
    const gitProgress = !preSha || preSha !== currentHead || ((workerResult?.artifactsWritten?.length ?? 0) > 0);
    const hasPromise = hasPromiseToken(workerResult?.output || '');
    // Canonical layout via SessionManager (tests/harness that pass artifactDir continue to work; real orch now consistent)
    let artifactDir = ctx.artifactDir || (ticketId ? this.sm.getTicketDir(this.sessionDir, ticketId) : this.sessionDir);
    let artifactPath: string | undefined; let artifactOk = true; let artifactError: string | undefined;
    if (expectedArtifact) {
      const res = resolveAndValidateArtifact(artifactDir, expectedArtifact, true);
      artifactOk = res.ok; artifactPath = res.path; artifactError = res.error;
    }
    const valid = hasPromise && artifactOk;
    if (!valid) {
      const reason = !hasPromise ? 'Missing <promise>I AM DONE</promise> token' : (artifactError || 'Artifact validation failed');
      Activity.convergenceIteration('ritual', path.basename(this.sessionDir), phase, 'failed', undefined, undefined);
      return { valid: false, reason, hasPromise, circuitTripped: false, rolledBack: false, restoredPaths: [], gitProgress, changedPaths: [], currentHead, workingDir };
    }
    if (ticketId && phase) {
      try { await this.sm.appendPhase(this.sessionDir, ticketId, phase, artifactPath); } catch (e) { console.warn('[ritual] append non-fatal'); }
    }

    // === META-READINESS (research signals slice): extract from research artifacts, act on blocked/deferred
    // Preserve artifact + always appendPhase (above) + set status/readiness. Do not nuke as 'failed'.
    // "Do not proceed to planner" is signalled via ticket.status; full skip in remainingPhases happens in orchestrator rollout step 3.
    if (ticketId && phase && /research/i.test(phase) && artifactPath && fs.existsSync(artifactPath)) {
      try {
        const content = fs.readFileSync(artifactPath, 'utf8');
        const ra = extractReadinessAssessment(content);
        if (ra && (ra.status === 'blocked' || ra.status === 'deferred')) {
          await this.sm.updateTicketReadiness(this.sessionDir, ticketId, ra);
          // status flipped inside; research_*.md + phasesCompleted preserved for forensics/self-prd/closer
        }
      } catch (e: any) {
        console.warn('[ritual] research readiness extract non-fatal:', e?.message || e);
      }
    }

    const gate = new ConvergenceGate(this.sessionDir);
    const gateResult = await gate.runGate(gitProgress ? 'changed' : 'full');
    const circuit = new CircuitBreaker(this.sessionDir);
    const errorSig = (workerResult?.output || '').toLowerCase().includes('error') ? `ritual_${phase || 'worker'}_error` : undefined;
    const tripped = circuit.recordIteration(gitProgress, errorSig);
    let rolledBack = false; let restoredPaths: string[] = [];
    const changedPaths = preSha ? (getChangedPaths(preSha, currentHead, workingDir) || []) : [];
    const shouldRollback = (autoRollbackOnGateFail && !gateResult.passed) || (autoRollbackOnCircuitTrip && tripped);
    if (shouldRollback && preSha && changedPaths.length > 0) {
      try {
        const rb = await safeRollback(preSha, changedPaths, workingDir);
        rolledBack = !!rb.success; restoredPaths = rb.restored || [];
      } catch {}
    }
    Activity.convergenceIteration('ritual', path.basename(this.sessionDir), phase, 'converged', undefined, undefined);
    const outcome: any = { valid: true, hasPromise: true, circuitTripped: tripped, rolledBack, restoredPaths, gitProgress, changedPaths, currentHead, workingDir };
    if (artifactPath) outcome.artifactPath = artifactPath;
    if (gateResult) outcome.gateResult = gateResult;
    return outcome;
  }
  validateReturn(workerResult: any, artifactDir: string, expectedArtifact?: string) {
    const hasPromise = hasPromiseToken(workerResult?.output || '');
    if (!hasPromise) return { valid: false, reason: 'Missing promise token' };
    if (expectedArtifact) {
      const r = resolveAndValidateArtifact(artifactDir, expectedArtifact, true);
      if (!r.ok) return { valid: false, reason: r.error };
      return { valid: true, artifactPath: r.path };
    }
    return { valid: true };
  }
}
