/**
 * WorkerSpawner — Grok-native worker abstraction
 *
 * Production path: ALWAYS headless `grok -p` (or codex/hermes) via the detached orchestrator.
 * Per AGENTS.md Core Execution Principle, rich `spawn_subagent` is permitted ONLY inside /pickle-refine-prd (analyst teams).
 * This class is the fallback/CLI executor for all ticket work, convergence drivers, and 50-ticket self-runs.
 *
 * NOW: Activity.worker* events wired for first-class observability in metrics/standup (worker_outcome for forensics).
 * maxTurns (resolved by orchestrator via phase-utils table for ticket phases, or passed explicitly) is logged
 * in every worker_outcome so activity logs + self-PRDs can correlate prompt size, phase, budget, and exhaustion.
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
    let promptFile: string | null = null;
    const maxTurns = opts.maxTurns ?? 80;  // hoisted: phase-aware value from orchestrator (or 80 for side drivers)

    if (backend === 'grok') {
      // === ROOT CAUSE (fixed 2026-05-19) ===
      // Previous implementation did:
      //   const prompt = opts.prompt.replace(/"/g, '\\"');
      //   cmd = `grok -p "${prompt}" ${flags} ...`
      //
      // This is catastrophic for any real ticket because buildPhasePrompt() produces a 4–12kB+
      // string containing:
      //   - the full ticket.md (with Verify shell commands, backticks, newlines, $(), git fragments)
      //   - the entire "Send to Morty" immutable contract
      //   - phase-specific instructions from references/phases/*.md
      //
      // Double-quoting that blob into a single argv element causes:
      //   - /bin/sh to reinterpret newlines/backticks/command-substitutions inside the prompt
      //   - esbuild (inside the grok CLI) to choke on embedded TS/await snippets from Verify tables
      //   - max_turns explosions and silent corruption
      //
      // The correct, safe, supported mechanism (grok --help) is --prompt-file.
      // We now materialize the prompt to a file under the session (for forensics) and invoke via
      // `--prompt-file`. No shell escaping of the content is ever required.

      let flags = `--max-turns ${maxTurns} --always-approve --no-subagents`;
      if (opts.isolation === 'worktree') {
        flags += ` --worktree "worker-${opts.ticketId || 'anon'}-${opts.phase || 'phase'}"`;
      }

      // Write the exact prompt to a session-owned temp file so we have perfect post-mortem
      // visibility into what the Morty actually received. This also completely sidesteps
      // every shell-metacharacter / quoting / ARG_MAX problem.
      if (opts.sessionDir) {
        const promptDir = path.join(opts.sessionDir, 'tmp', 'worker-prompts');
        fs.mkdirSync(promptDir, { recursive: true });
        promptFile = path.join(
          promptDir,
          `${opts.ticketId || 'anon'}-${role}-${Date.now()}.prompt.md`
        );
        fs.writeFileSync(promptFile, opts.prompt, 'utf8');
      } else {
        // Fallback (tests, ad-hoc): use a system temp
        promptFile = `/tmp/pickle-worker-${Date.now()}.prompt.md`;
        fs.writeFileSync(promptFile, opts.prompt, 'utf8');
      }

      // Use the official file-based single-turn path. No quoting, no newlines in argv,
      // full fidelity, and the exact prompt is persisted next to the session for debugging.
      cmd = `grok --prompt-file "${promptFile}" ${flags} --output-format json`;
    } else if (backend === 'codex') {
      cmd = `codex exec --prompt "${opts.prompt}"`; // placeholder
    } else {
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerOutcome(sessId, role, false, opts.ticketId, { reason: 'unsupported_backend', maxTurns });
      return { success: false, output: `Unsupported backend ${backend}`, artifactsWritten: [], exitCode: 1 };
    }

    try {
      const output = execSync(cmd, {
        cwd: opts.workingDir || process.cwd(),
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

      // High-signal observability — now includes the *effective* maxTurns used for this invocation
      // (sourced from phase-aware table for ticket Morty phases, or explicit override / 80 fallback).
      // This powers self-improvement targeting of DEFAULT_PHASE_TURN_BUDGETS in phase-utils.
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerCompleted(sessId, role, success, opts.ticketId, {
        exitCode: 0,
        artifactsWritten: artifactsWritten.length,
        hasPromise,
        promptFile,
        maxTurns,
      });
      Activity.workerOutcome(sessId, role, success, opts.ticketId, {
        exitCode: 0,
        artifactsWritten: artifactsWritten.length,
        hasPromise,
        promptLen: opts.prompt.length,
        promptFile,
        maxTurns,
      });

      // Leave the prompt file for post-run forensics (very valuable when debugging why a Morty did something weird).
      // A future cleanup pass or --clean-prompt-files flag can remove them.

      return { success, output, artifactsWritten, exitCode: 0 };
    } catch (err: any) {
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      const stderr = (err.stderr || '').toString();
      const fullError = `${err.message || String(err)}\n\nSTDERR:\n${stderr}\n\n(promptFile: ${promptFile || 'n/a'})`;

      Activity.workerCompleted(sessId, role, false, opts.ticketId, {
        exitCode: 1,
        error: fullError,
        promptFile,
        maxTurns,
      });
      Activity.workerOutcome(sessId, role, false, opts.ticketId, {
        exitCode: 1,
        error: fullError,
        reason: 'exec_failed',
        promptFile,
        maxTurns,
      });

      return {
        success: false,
        output: fullError,
        artifactsWritten: [],
        exitCode: 1,
        failureReason: 'exec_failed',
        error: fullError,
      };
    }
  }
}
