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

export function hasPromiseToken(output: string): boolean {
  return /<promise>\s*I\s+AM\s+DONE\s*<\/promise>/i.test(output || '');
}

export function validateArtifactContract(filePath: string, pattern: string): { ok: boolean; error?: string } {
  if (!fs.existsSync(filePath)) return { ok: false, error: 'file missing for contract check' };
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    if (/research/.test(pattern)) {
      const required = ['relevant files', 'open questions', 'existing patterns', 'data flows'];
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
