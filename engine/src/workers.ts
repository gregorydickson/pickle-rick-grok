/**
 * WorkerSpawner — Grok-native worker abstraction
 *
 * Production path: ALWAYS headless `grok -p` (or codex/hermes) via the detached orchestrator.
 * Per AGENTS.md Core Execution Principle, rich `spawn_subagent` is permitted ONLY inside /pickle-refine-prd (analyst teams).
 * This class is the fallback/CLI executor for all ticket work, convergence drivers, and 50-ticket self-runs.
 *
 * NOW: Activity.worker* events wired for first-class observability in metrics/standup (worker_outcome for forensics).
 *
 * ULTIMATE FINAL GAPS: workingDir honored from SpawnOptions (passed by orchestrator from session workingDirSafe or --target-root).
 * Ensures detached 50-tix self-dogfood ALWAYS edits the correct target tree even if mux-runner launched from arbitrary cwd.
 * No more Jerry "wrong tree" surprises at 3am.
 */

import { Backend } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { Activity } from './activity-logger.js';

export type WorkerRole =
  | 'morty-phase-researcher'
  | 'morty-phase-research-reviewer'
  | 'morty-phase-planner'
  | 'morty-phase-plan-reviewer'
  | 'morty-phase-implementer'
  | 'morty-phase-verifier'
  | 'morty-phase-reviewer'
  | 'morty-phase-simplifier'
  | 'microverse-changer'
  | 'anatomy-reviewer'
  | 'anatomy-fixer'
  | 'anatomy-verifier'
  | 'deepen-changer';

export interface SpawnOptions {
  sessionDir: string;
  ticketId?: string;
  phase?: string;
  prompt: string;                    // full prompt text
  backend?: Backend;
  role?: WorkerRole;
  maxTurns?: number;
  readOnly?: boolean;                // for review/verifier phases
  isolation?: 'none' | 'worktree';   // Grok subagent feature
  /** Target working directory for the worker process (critical for self-improvement on arbitrary target trees from detached launch) */
  workingDir?: string;
}

export interface WorkerResult {
  success: boolean;
  output: string;
  artifactsWritten: string[];        // paths to research_*.md etc.
  exitCode: number;
  /** optional rich failure details for orchestrator/ritual (pre-existing usage, now typed) */
  failureReason?: string;
  error?: string;
}

/**
 * WorkerSpawner — Grok-native worker abstraction
 *
 * Headless grok -p is the production path per AGENTS.md. spawn_subagent only inside /pickle-refine-prd for analysts.
 * This class is exclusively the headless/CLI executor (never the interactive manager).
 *
 * Detached / CLI path (the only one used for execution):
 *   This class shells `grok -p "..."` or `codex exec` / `hermes ...`
 */
export class WorkerSpawner {
  constructor(private defaultBackend: Backend = 'grok') {}

  async spawn(role: WorkerRole, opts: SpawnOptions): Promise<WorkerResult> {
    const backend = opts.backend || this.defaultBackend;

    if (backend === 'grok' && !process.env.PICKLE_FORCE_HEADLESS) {
      // Headless grok -p is the production path per AGENTS.md. spawn_subagent only inside /pickle-refine-prd for analysts.
      // This class is fallback/CLI only; interactive manager model was removed.
    }

    return this.spawnViaHeadless(backend, role, opts);
  }

  private async spawnViaHeadless(backend: Backend, role: WorkerRole, opts: SpawnOptions): Promise<WorkerResult> {
    const { execSync } = await import('child_process');

    let cmd = '';
    if (backend === 'grok') {
      // Deliberate headless `grok -p` path (the production execution engine per project principle).
      // We maximize native Grok CLI strengths: structured output when possible, native worktree isolation,
      // --always-approve for non-interactive safety, and clear promise/artifact contracts.
      const prompt = opts.prompt.replace(/"/g, '\\"');
      let flags = `--max-turns ${opts.maxTurns || 50} --always-approve --no-subagents`;
      if (opts.isolation === 'worktree') {
        flags += ` --worktree "worker-${opts.ticketId || 'anon'}-${opts.phase || 'phase'}"`;
      }
      // Prefer json for future structured returns (promise + artifacts); fall back to plain for compatibility
      cmd = `grok -p "${prompt}" ${flags} --output-format json 2>/dev/null || grok -p "${prompt}" ${flags} --output-format plain`;
    } else if (backend === 'codex') {
      cmd = `codex exec --prompt "${opts.prompt}"`; // placeholder
    } else {
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerOutcome(sessId, role, false, opts.ticketId, { reason: 'unsupported_backend' });
      return { success: false, output: `Unsupported backend ${backend}`, artifactsWritten: [], exitCode: 1 };
    }

    try {
      const output = execSync(cmd, {
        cwd: opts.workingDir || process.cwd(),  // ULTIMATE: respect orchestrator-provided targetRoot / session workingDir for correct self-dogfood tree
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      });

      // Robust promise token + artifact discovery
      const lowerOutput = output.toLowerCase();
      const hasPromise = output.includes('<promise>I AM DONE</promise>') ||
                         lowerOutput.includes('i am done') ||
                         lowerOutput.includes('promise') && lowerOutput.includes('done');

      const artifactsWritten: string[] = [];
      if (opts.ticketId && opts.sessionDir) {
        const ticketDir = path.join(opts.sessionDir, 'tickets', opts.ticketId);
        if (fs.existsSync(ticketDir)) {
          const files = fs.readdirSync(ticketDir)
            .filter(f => f.endsWith('.md') && (f.includes('research') || f.includes('plan') || f.includes('conformance') || f.includes('review') || f.includes('simplify')))
            .map(f => path.join(ticketDir, f));
          artifactsWritten.push(...files);
        }
      }

      const success = hasPromise || artifactsWritten.length > 0;

      // High-signal observability — now reports will actually see worker data for long campaigns
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerCompleted(sessId, role, success, opts.ticketId, {
        exitCode: 0,
        artifactsWritten: artifactsWritten.length,
        hasPromise,
      });
      Activity.workerOutcome(sessId, role, success, opts.ticketId, {
        exitCode: 0,
        artifactsWritten: artifactsWritten.length,
        hasPromise,
        promptLen: opts.prompt.length,
      });

      return { success, output, artifactsWritten, exitCode: 0 };
    } catch (err: any) {
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerCompleted(sessId, role, false, opts.ticketId, {
        exitCode: 1,
        error: err.message || String(err),
      });
      Activity.workerOutcome(sessId, role, false, opts.ticketId, {
        exitCode: 1,
        error: err.message || String(err),
        reason: 'exec_failed',
      });
      return { success: false, output: err.message || String(err), artifactsWritten: [], exitCode: 1, failureReason: 'exec_failed', error: err.message || String(err) };
    }
  }
}
