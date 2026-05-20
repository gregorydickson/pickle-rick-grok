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
import { spawn, type ChildProcess } from 'child_process';

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
  /** Resilience fields for multi-day detached runs (populated by output-stall / wall-hang guards) */
  timedOut?: boolean;
  stallReason?: 'output_stall' | 'wall_hang' | 'spawn_error' | string;
  killed?: boolean;
  signal?: NodeJS.Signals | null;
  /** Path to the sync-written worker stdout/stderr log (for live watchers) */
  logFile?: string;
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

/** Kill entire process tree (pgid on unix for detached children) then fallback. Matches Claude spawn-morty/mux-runner pattern for reliable child cleanup on stall. */
function killProcessTree(proc: ChildProcess, signal: NodeJS.Signals): boolean {
  const pid = proc.pid;
  if (!pid) return false;
  if (process.platform !== 'win32') {
    try {
      process.kill(-pid, signal);
      return true;
    } catch {
      // process group gone; fall through to direct
    }
  }
  try {
    proc.kill(signal);
    return true;
  } catch {
    return false;
  }
}

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

      let flags = `--max-turns ${maxTurns} --always-approve`;
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
      // Extra flags for reliable non-tty headless in detached mux runs (no TUI assumptions, auto-everything).
      flags += ' --no-alt-screen --permission-mode bypassPermissions --no-plan --no-subagents --no-memory';
      cmd = `grok --prompt-file "${promptFile}" ${flags} --output-format json`;
    } else if (backend === 'codex') {
      cmd = `codex exec --prompt "${opts.prompt}"`; // placeholder
    } else {
      const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';
      Activity.workerOutcome(sessId, role, false, opts.ticketId, { reason: 'unsupported_backend', maxTurns });
      return { success: false, output: `Unsupported backend ${backend}`, artifactsWritten: [], exitCode: 1 };
    }

    if (backend === 'grok') {
      // Resilient path (grok --prompt-file only): async spawn + dual guards. Codex stub falls through.
      return await this._runGrokHeadlessWithGuards(cmd, promptFile, opts, role, maxTurns);
    }

    // codex placeholder path (non-production)
    try {
      const output = execSync(cmd, {
        cwd: opts.workingDir || process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      });

      // Robust promise token + artifact discovery (handles --output-format json envelopes + partial transcripts)
      let textForCheck = output;
      try {
        const j = JSON.parse(output);
        textForCheck = j.text || j.response || j.output || j.message || j.final || JSON.stringify(j);
      } catch {}
      const lowerOutput = textForCheck.toLowerCase();
      const hasPromise = textForCheck.includes('<promise>I AM DONE</promise>') ||
                         lowerOutput.includes('i am done') ||
                         (lowerOutput.includes('promise') && lowerOutput.includes('done'));

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
      const stdout = (err.stdout || '').toString();
      const exitStatus = err.status || 'unknown';
      const fullError = `grok CLI exited ${exitStatus}\n${err.message || String(err)}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\n(promptFile: ${promptFile || 'n/a'})`;

      // Persist the raw failure for instant RCA (visible in session, survives resume)
      if (opts.sessionDir) {
        try {
          const failDir = path.join(opts.sessionDir, 'worker-failures');
          fs.mkdirSync(failDir, { recursive: true });
          const failFile = path.join(failDir, `${opts.ticketId || 'anon'}-${role}-${Date.now()}.err.txt`);
          fs.writeFileSync(failFile, `CMD: ${cmd}\nCWD: ${opts.workingDir || process.cwd()}\n\n${fullError}`, 'utf8');
        } catch {}
      }

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

  /**
   * Core of the refactor: run grok --prompt-file via async spawn (not execSync) with
   * streaming + dual per-invocation guards for multi-day detached resilience.
   *
   * - Sliding output-stall guard: if no new stdout/stderr data for N minutes, kill tree, return structured fail.
   *   Timer resets on every data chunk. Default 30min (tunable via PICKLE_WORKER_OUTPUT_STALL_MS).
   * - Longer wall-hang guard: absolute ceiling (default 8h) catches completely silent deadlock.
   *   No short phase wall-clocks; long campaigns (days) are safe because real work produces output or finishes.
   * - killProcessTree (pgid SIGTERM then SIGKILL escalation) so child + descendants die, outer loop stays alive.
   * - Sync fs writes to per-invocation .log under tmp/worker-logs/ for immediate visibility to watchers/tmux/external monitors (no 16KB buffer starvation).
   * - Live chunk echo to process stdio so detached mux/orchestrator pane shows worker progress.
   * - On any guard fire or error: persist failure artifact, emit rich worker_outcome (with stallReason/timedOut/killed/promptFile/maxTurns), return augmented WorkerResult.
   * - Preserves 100% of prior contract: --prompt-file, prompt forensics file, workingDir cwd, artifact scan, promise-token detection, Activity.workerCompleted/Outcome, json output handling.
   *
   * This directly ports the proven Claude pattern (spawn-morty.ts:killProcessTree + runCommand; mux-runner.ts:runIteration + lastDataAt + armOutputStallGuard + hangGuard + resolveTimeout + sync logFd + currentChildProc style) into Grok's WorkerSpawner without changing call sites or architecture.
   */
  private async _runGrokHeadlessWithGuards(
    cmd: string,
    promptFile: string | null,
    opts: SpawnOptions,
    role: WorkerRole,
    maxTurns: number
  ): Promise<WorkerResult> {
    const cwd = opts.workingDir || process.cwd();
    const sessId = opts.sessionDir ? path.basename(opts.sessionDir) : 'unknown-session';

    // Worker output log with sync writes (for watchers that stat the file; matches mux-runner pattern)
    let logFd: number | null = null;
    let logFile: string | null = null;
    if (opts.sessionDir) {
      const logDir = path.join(opts.sessionDir, 'tmp', 'worker-logs');
      fs.mkdirSync(logDir, { recursive: true });
      logFile = path.join(
        logDir,
        `${opts.ticketId || 'anon'}-${role}-${Date.now()}.log`
      );
      try {
        logFd = fs.openSync(logFile, 'w');
      } catch {
        /* best effort */
      }
    }

    const writeLog = (chunk: Buffer | string) => {
      if (logFd != null) {
        const fd = logFd;
        try {
          if (typeof chunk === 'string') {
            fs.writeSync(fd, chunk);
          } else {
            fs.writeSync(fd, chunk);
          }
        } catch {
          /* fd closed or late write */
        }
      }
    };

    const closeLog = () => {
      if (logFd != null) {
        try {
          fs.fsyncSync(logFd);
        } catch {}
        try {
          fs.closeSync(logFd);
        } catch {}
        logFd = null;
      }
    };

    return new Promise<WorkerResult>((resolve) => {
      let settled = false;
      let lastDataAt = Date.now();
      let outputStallTimer: NodeJS.Timeout | null = null;
      let wallTimer: NodeJS.Timeout | null = null;
      let didKill = false;
      let stallReason: WorkerResult['stallReason'];
      let timedOut = false;
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      // Tunables: generous for days-long campaigns; sliding stall catches silent wedges without per-phase hard deadlines
      const OUTPUT_STALL_MS = Number(
        process.env.PICKLE_WORKER_OUTPUT_STALL_MS || 30 * 60 * 1000
      ); // 30m sliding default
      const WALL_HANG_MS = Number(
        process.env.PICKLE_WORKER_WALL_HANG_MS || 8 * 60 * 60 * 1000
      ); // 8h wall safety net (longer than any realistic phase; prevents total wedge)

      const child: ChildProcess = spawn(
        process.platform === 'win32' ? 'cmd.exe' : 'sh',
        [process.platform === 'win32' ? '/c' : '-c', cmd],
        {
          cwd,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      const clearGuards = () => {
        if (outputStallTimer) {
          clearTimeout(outputStallTimer);
          outputStallTimer = null;
        }
        if (wallTimer) {
          clearTimeout(wallTimer);
          wallTimer = null;
        }
      };

      const finishStall = (reason: 'output_stall' | 'wall_hang') => {
        if (settled) return;
        settled = true;
        stallReason = reason;
        timedOut = true;
        clearGuards();
        // best-effort escalation
        if (!didKill) {
          didKill = killProcessTree(child, 'SIGTERM');
          setTimeout(() => {
            try {
              killProcessTree(child, 'SIGKILL');
            } catch {}
          }, 3000).unref();
        }
        const partial = (stdoutChunks.join('') + '\n' + stderrChunks.join('')).slice(0, 5000);
        closeLog();

        const errMsg = `grok worker ${reason} — killed child (killed=${didKill}). partial: ${partial} (promptFile: ${promptFile || 'n/a'}, logFile: ${logFile || 'n/a'})`;

        // Persist for RCA (like the old exec catch)
        if (opts.sessionDir) {
          try {
            const failDir = path.join(opts.sessionDir, 'worker-failures');
            fs.mkdirSync(failDir, { recursive: true });
            const failFile = path.join(
              failDir,
              `${opts.ticketId || 'anon'}-${role}-${Date.now()}.stall.txt`
            );
            fs.writeFileSync(failFile, `CMD: ${cmd}\nCWD: ${cwd}\nREASON: ${reason}\n${errMsg}`, 'utf8');
          } catch {}
        }

        Activity.workerCompleted(sessId, role, false, opts.ticketId, {
          exitCode: -1,
          error: errMsg,
          promptFile,
          maxTurns,
          timedOut: true,
          stallReason: reason,
          killed: didKill,
          logFile,
        });
        Activity.workerOutcome(sessId, role, false, opts.ticketId, {
          exitCode: -1,
          error: errMsg,
          reason,
          promptFile,
          promptLen: opts.prompt.length,
          maxTurns,
          timedOut: true,
          stallReason: reason,
          killed: didKill,
          logFile,
        });

        resolve({
          success: false,
          output: errMsg,
          artifactsWritten: [],
          exitCode: -1,
          failureReason: reason,
          error: errMsg,
          timedOut: true,
          stallReason: reason,
          killed: didKill,
          signal: 'SIGTERM',
        });
      };

      const armOutputStall = () => {
        if (settled) return;
        if (outputStallTimer) clearTimeout(outputStallTimer);
        const remaining = Math.max(1000, OUTPUT_STALL_MS - (Date.now() - lastDataAt));
        outputStallTimer = setTimeout(() => {
          if (settled) return;
          if (Date.now() - lastDataAt >= OUTPUT_STALL_MS) {
            finishStall('output_stall');
          } else {
            armOutputStall();
          }
        }, remaining);
        outputStallTimer.unref();
      };

      wallTimer = setTimeout(() => {
        if (settled) return;
        finishStall('wall_hang');
      }, WALL_HANG_MS);
      wallTimer.unref();
      armOutputStall();

      // Stream handlers — reset stall on data, sync-log for watchers, echo for live pane
      child.stdout?.setEncoding('utf8');
      child.stderr?.setEncoding('utf8');

      child.stdout?.on('data', (chunk: string) => {
        lastDataAt = Date.now();
        armOutputStall();
        stdoutChunks.push(chunk);
        writeLog(chunk);
        process.stdout.write(chunk);
      });
      child.stderr?.on('data', (chunk: string) => {
        lastDataAt = Date.now();
        armOutputStall();
        stderrChunks.push(chunk);
        writeLog(chunk);
        process.stderr.write(chunk);
      });

      child.on('error', (err: any) => {
        if (settled) return;
        settled = true;
        clearGuards();
        closeLog();
        const message = err?.message || String(err);
        const fullError = `grok spawn error: ${message}\n(promptFile: ${promptFile || 'n/a'})`;

        if (opts.sessionDir) {
          try {
            const failDir = path.join(opts.sessionDir, 'worker-failures');
            fs.mkdirSync(failDir, { recursive: true });
            const failFile = path.join(failDir, `${opts.ticketId || 'anon'}-${role}-${Date.now()}.err.txt`);
            fs.writeFileSync(failFile, `CMD: ${cmd}\nCWD: ${cwd}\n\n${fullError}`, 'utf8');
          } catch {}
        }

        Activity.workerCompleted(sessId, role, false, opts.ticketId, {
          exitCode: 1,
          error: fullError,
          promptFile,
          maxTurns,
        });
        Activity.workerOutcome(sessId, role, false, opts.ticketId, {
          exitCode: 1,
          error: fullError,
          reason: 'spawn_error',
          promptFile,
          maxTurns,
        });

        resolve({
          success: false,
          output: fullError,
          artifactsWritten: [],
          exitCode: 1,
          failureReason: 'spawn_error',
          error: fullError,
          timedOut: false,
          stallReason: 'spawn_error',
          killed: didKill,
        });
      });

      child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        if (settled) return;
        settled = true;
        clearGuards();
        closeLog();

        const output = stdoutChunks.join('') + (stderrChunks.length ? '\n' + stderrChunks.join('') : '');

        // same robust parse as before (json envelope or raw, promise token, artifacts)
        let textForCheck = output;
        try {
          const j = JSON.parse(output);
          textForCheck = j.text || j.response || j.output || j.message || j.final || JSON.stringify(j);
        } catch {}
        const lowerOutput = textForCheck.toLowerCase();
        const hasPromise =
          textForCheck.includes('<promise>I AM DONE</promise>') ||
          lowerOutput.includes('i am done') ||
          (lowerOutput.includes('promise') && lowerOutput.includes('done'));

        const artifactsWritten: string[] = [];
        if (opts.ticketId && opts.sessionDir) {
          const ticketDir = path.join(opts.sessionDir, 'tickets', opts.ticketId);
          if (fs.existsSync(ticketDir)) {
            const files = fs.readdirSync(ticketDir)
              .filter(
                (f) =>
                  f.endsWith('.md') &&
                  (f.includes('research') ||
                    f.includes('plan') ||
                    f.includes('conformance') ||
                    f.includes('review') ||
                    f.includes('simplify'))
              )
              .map((f) => path.join(ticketDir, f));
            artifactsWritten.push(...files);
          }
        }

        const success = hasPromise || artifactsWritten.length > 0;
        const exitCode = code ?? (signal ? 128 : 0);

        Activity.workerCompleted(sessId, role, success, opts.ticketId, {
          exitCode,
          artifactsWritten: artifactsWritten.length,
          hasPromise,
          promptFile,
          maxTurns,
          logFile,
          signal,
        });
        Activity.workerOutcome(sessId, role, success, opts.ticketId, {
          exitCode,
          artifactsWritten: artifactsWritten.length,
          hasPromise,
          promptLen: opts.prompt.length,
          promptFile,
          maxTurns,
          logFile,
          signal,
        });

        resolve({
          success,
          output,
          artifactsWritten,
          exitCode,
          ...(logFile ? { logFile } : {}),
        });
      });
    });
  }
}
