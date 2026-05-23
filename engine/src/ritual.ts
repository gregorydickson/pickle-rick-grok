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
import { getTicketStallLimit, getExpectedArtifactName } from './lib/phase-utils.js';
import { extractWorkerOutputText } from './workers.js';

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

/**
 * recoverOrphanPhasesFromLogs
 * P0 desync fix (see prds/fix-runner-ritual-desync-after-large-researcher-output-2026-05-23.md + RCA from requirements/codebase/risk/plan agents).
 * On every mux-runner launch (and recover tool), scan tmp/worker-logs for any log whose content contains a well-formed
 * promise token for a phase whose artifact is missing and whose phase is not yet in the ticket's phasesCompleted.
 * Materializes the report text (from JSON .text envelope or raw — handles the exact 28k forensic blob) into the canonical
 * research_*.md (or plan_ etc), then calls the same locked appendPhase the live ritual uses.
 * Idempotent, per-log try/catch, skips 0B/empty, best-effort RA validation on recovered content.
 * Runtime-only mutation of *session* state/ticket dirs (never source root) — compliant with source-only + self-mut rules.
 * Returns list of recovered {ticketId, phase, artifactPath} for logging / campaign-status.
 */
export async function recoverOrphanPhasesFromLogs(sessionDir: string): Promise<Array<{ticketId: string; phase: string; artifactPath: string}>> {
  const sm = new SessionManager();
  const healed: Array<{ticketId: string; phase: string; artifactPath: string}> = [];
  const logDir = path.join(sessionDir, 'tmp', 'worker-logs');
  if (!fs.existsSync(logDir)) return healed;
  let logFiles: string[] = [];
  try {
    logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log') && fs.statSync(path.join(logDir, f)).size > 0);
  } catch {
    return healed;
  }
  // sort newest first per ticket/role to prefer latest attempt
  logFiles.sort((a, b) => b.localeCompare(a));

  for (const f of logFiles) {
    try {
      const lp = path.join(logDir, f);
      const raw = fs.readFileSync(lp, 'utf8');
      if (!raw) continue;
      const textForCheck = extractWorkerOutputText(raw);
      if (!hasPromiseToken(raw) && !hasPromiseToken(textForCheck)) continue;

      // Filename convention from workers: ${ticketId}-${role}-${ts}.log  (role e.g. morty-phase-researcher)
      const m = f.match(/^([A-Za-z0-9._-]+)-(morty-phase-[a-z-]+)-\d+\.log$/);
      if (!m) continue;
      const ticketId = m[1];
      const phaseRole = m[2]; // canonical e.g. 'morty-phase-researcher' — appendPhase accepts the role string used in TICKET_PHASES

      const ticketDir = path.join(sessionDir, 'tickets', ticketId);
      if (!fs.existsSync(ticketDir)) continue;

      const expectedName = getExpectedArtifactName(phaseRole, ticketId);
      const artifactPath = path.join(ticketDir, expectedName);

      const state = sm.loadState(sessionDir);
      const t = (state.tickets || []).find((x: any) => x.id === ticketId);
      const alreadyDone = !!(t && (t.phasesCompleted || []).includes(phaseRole));
      const alreadyArtifact = fs.existsSync(artifactPath);

      if (alreadyArtifact && alreadyDone) continue; // fully idempotent no-op

      if (alreadyArtifact) {
        // Prefer the on-disk artifact (post-resilience direct-write case: Morty wrote research_*.md via tool, runner died before append)
        if (!alreadyDone) {
          await sm.appendPhase(sessionDir, ticketId, phaseRole, artifactPath);
          healed.push({ ticketId, phase: phaseRole, artifactPath });
        }
        continue;
      }

      // Legacy path (pre-resilience giant stdout blob in log, no artifact yet) — materialize from the captured report text
      let report = textForCheck.replace(/<promise>[\s\S]*?<\/promise>/i, '').trim();
      if (!report || report.length < 50) {
        report = raw.replace(/<promise>[\s\S]*?<\/promise>/i, '').trim() || 'Orphan phase recovered from worker log. No structured report body was present in the captured stdout (post-contract short-stdout run or early death). Re-run the phase for full artifact.';
      }

      // Atomic write for the artifact (tmp+rename, survives crash mid-write; risk mitigation from RCA)
      const tmpMd = artifactPath + `.tmp-orphan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(tmpMd, report + '\n\n<!-- RECOVERED_ORPHAN_PHASE from ' + f + ' at ' + new Date().toISOString() + ' -->\n', 'utf8');
      fs.renameSync(tmpMd, artifactPath);

      // Use the exact same locked append as live ritual (self-mut safe, idempotent inside appendPhase)
      await sm.appendPhase(sessionDir, ticketId, phaseRole, artifactPath);

      healed.push({ ticketId, phase: phaseRole, artifactPath });

      // Best-effort observability (no new hard dependency; Activity may be soft)
      try {
        const sessId = path.basename(sessionDir);
        Activity.workerOutcome?.(sessId, phaseRole as any, true, ticketId, { reason: 'recovered_orphan_log', logFile: f, artifact: expectedName });
      } catch { /* non-fatal */ }
    } catch (e: any) {
      console.warn('[ritual] per-log orphan recovery skipped (robust):', f, e?.message || e);
      continue;
    }
  }
  return healed;
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
    if (gitProgress) {
      try { this.sm.recordProgress(this.sessionDir, `ritual git/artifact delta (${phase || 'phase'})`); } catch {}
    }
    const hasPromise = hasPromiseToken(workerResult?.output || '');
    // Canonical layout via SessionManager (tests/harness that pass artifactDir continue to work; real orch now consistent)
    let artifactDir = ctx.artifactDir || (ticketId ? this.sm.getTicketDir(this.sessionDir, ticketId) : this.sessionDir);
    let artifactPath: string | undefined; let artifactOk = true; let artifactError: string | undefined;
    if (expectedArtifact) {
      const res = resolveAndValidateArtifact(artifactDir, expectedArtifact, true);
      artifactOk = res.ok; artifactPath = res.path; artifactError = res.error;
    }

    // === P0 RESEARCH BLOCKED/DEFERRED RESCUE (early + defensive, before any !valid return) ===
    // For research phases, if the worker reported non-success / exec_failed / missing stdout <promise>
    // (common when LLM emits the token + ## Readiness Assessment *inside* the research_*.md per the phase contract,
    // or artifact write races the worker's readdir snapshot, or transcript extraction misses it on --output-format json),
    // but resolveAndValidateArtifact (enforceContract=true) succeeded (file exists + research sections incl. 'readiness assessment'),
    // we ALWAYS honor a 'blocked' or 'deferred' RA here:
    //   - appendPhase (so phasesCompleted records the research)
    //   - updateTicketReadiness (flips ticket.status to blocked/deferred)
    //   - updateCampaignStatusSync (clear note for tmux/monitors/closer)
    //   - Activity log
    //   - return non-fatal {valid:true, researchBlocked:...} outcome
    // This bypasses the generic "Missing <promise> token" / artifact-failed return, the !outcome.valid failure path in orchestrator
    // (no 'failed' status, no phase_failed_* circuit entry), and lets the existing liveStatus===blocked check in orchestrator
    // cleanly halt remaining phases for the ticket.
    // This is the P0 resilience rule for honest research: EMISSION_THEATER theater audit, unsatisfiable ACs, etc. must never
    // produce zombie in_progress tickets or starve the self-PRD/closer loop. The artifact + RA always wins for research.
    if (ticketId && phase && /research/i.test(phase) && artifactPath && fs.existsSync(artifactPath)) {
      try {
        const content = fs.readFileSync(artifactPath, 'utf8');
        const ra = extractReadinessAssessment(content);
        if (ra && (ra.status === 'blocked' || ra.status === 'deferred')) {
          try { await this.sm.appendPhase(this.sessionDir, ticketId, phase, artifactPath); } catch (e) { console.warn('[ritual] append non-fatal'); }
          await this.sm.updateTicketReadiness(this.sessionDir, ticketId, ra);
          const sessId = path.basename(this.sessionDir);
          this.sm.updateCampaignStatusSync(this.sessionDir, {
            note: `RESEARCH ${ra.status.toUpperCase()}: ${ticketId} @ ${phase} — honest RA: ${ra.reason || 'blocked/deferred per EMISSION_THEATER or similar'} (artifact + phasesCompleted preserved; non-fatal, no planner path; P0 research honesty rule)`,
            lastPhaseResult: { ticketId, phase, bestEffort: true, status: ra.status },
          } as any);
          Activity.convergenceIteration('ritual', sessId, phase, `research_${ra.status}`, undefined, undefined);
          try { (Activity as any).ticketReadinessBlocked?.(sessId, ticketId, ra.status); } catch {}
          return {
            valid: true,
            hasPromise,
            researchBlocked: true,
            blockedStatus: ra.status,
            circuitTripped: false,
            rolledBack: false,
            restoredPaths: [],
            gitProgress,
            changedPaths: [],
            currentHead,
            workingDir,
            artifactPath,
          };
        }
      } catch (e: any) {
        console.warn('[ritual] research blocked/deferred rescue non-fatal:', e?.message || e);
      }
    }

    const valid = hasPromise && artifactOk;
    const isStall = !!(workerResult?.timedOut || workerResult?.stallReason);
    const stallReason = workerResult?.stallReason || (workerResult?.timedOut ? 'timed_out' : undefined);
    if (!valid) {
      if (isStall && ticketId && phase) {
        // P1: per-ticket stall/timeout-repeat isolation (wired from WorkerResult.timedOut + stallReason)
        // Increment via locked helper (updates state + campaign-status note). Halt after N; else pending for resume retry.
        // Non-stall failures and other tickets unaffected; campaign proceeds.
        const limit = getTicketStallLimit();
        const reason = stallReason || 'unknown_stall';
        const sessId = path.basename(this.sessionDir);
        const count = await this.sm.recordStallForTicket(this.sessionDir, ticketId, reason, phase);
        const halted = count >= limit;
        Activity.phaseFailed(sessId, ticketId, phase, `stall repeat #${count}/${limit}: ${reason}`);
        if (halted) {
          await this.sm.updateTicketStatus(this.sessionDir, ticketId, 'failed');
          this.sm.updateCampaignStatusSync(this.sessionDir, {
            note: `TICKET ${ticketId} HALTED after ${count} stalls (phase ${phase}, reason ${reason}) — isolated, campaign continues (mandatory phase: bestEffort=false; ticket phases gate vs post-campaign polish)`,
            lastPhaseResult: { ticketId, phase, bestEffort: false, status: 'halted' },
          } as any);
          Activity.ticketFailed(sessId, ticketId, `halted after ${count} stall repeats on ${phase}: ${reason}`);
          return {
            valid: false,
            reason: `halted after ${count} stalls`,
            hasPromise,
            circuitTripped: false,
            rolledBack: false,
            restoredPaths: [],
            gitProgress,
            changedPaths: [],
            currentHead,
            workingDir,
            stallHalted: true,
            stallCount: count,
            stallReason: reason,
          };
        } else {
          // transient: allow one more attempt on resume (repeat counter prevents infinite)
          await this.sm.updateTicketStatus(this.sessionDir, ticketId, 'pending');
          this.sm.updateCampaignStatusSync(this.sessionDir, {
            note: `transient stall #${count} for ${ticketId} on ${phase} (limit ${limit}; retry on resume) (mandatory phase: bestEffort=false)`,
            lastPhaseResult: { ticketId, phase, bestEffort: false, status: 'transient-stall' },
          } as any);
          return {
            valid: false,
            reason: `transient stall #${count}/${limit}`,
            hasPromise,
            circuitTripped: false,
            rolledBack: false,
            restoredPaths: [],
            gitProgress,
            changedPaths: [],
            currentHead,
            workingDir,
            isTransientStall: true,
            stallCount: count,
            stallReason: reason,
          };
        }
      }
      // non-stall failure path (bad promise/artifact)
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
