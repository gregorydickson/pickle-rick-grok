/**
 * MicroverseDriver — metric / LLM-judge convergence loop (TypeScript version)
 *
 * Replaces the old microverse-runner.ts + microverse-state.ts logic.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MicroverseState, MetricSnapshot } from './types.js';
import { SessionManager, writeJsonAtomic } from './session.js';
import { ConvergenceLoop } from './iteration.js';
import { Activity } from './activity-logger.js';
import { enforceGitBoundaries } from './git_safety.js';

export class MicroverseDriver {
  private statePath: string;
  private workingDir: string;

  constructor(private sessionDir: string) {
    this.statePath = path.join(sessionDir, 'microverse.json');
    const sm = new SessionManager();
    this.workingDir = sm.getWorkingDirSafe(sessionDir);
  }

  init(
    prdPath: string,
    metric: Record<string, any>,
    stallLimit = 5,
    maxIterations = 300
  ): MicroverseState {
    const mv: MicroverseState = {
      sessionId: path.basename(this.sessionDir),
      mode: metric.type || 'command',
      description: metric.description || '',
      validation: metric.validation || '',
      direction: metric.direction || 'higher',
      tolerance: metric.tolerance ?? 0,
      stallLimit,
      maxIterations,
      currentIteration: 0,
      status: 'gap_analysis',
      history: [],
      failedApproaches: [],
      keyMetric: metric,
      convergenceFile: metric.convergenceFile,
    };

    this.writeState(mv);
    return mv;
  }

  load(): MicroverseState {
    if (!fs.existsSync(this.statePath)) {
      throw new Error('No microverse.json — call init() first');
    }
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  writeState(state: MicroverseState): void {
    // Atomic write prevents truncated microverse.json on crash/power loss during long convergence
    writeJsonAtomic(this.statePath, state);
  }

  /**
   * High-level entry point: runs the full convergence loop.
   * The caller (skill or runner) supplies the apply/measure/rollback functions,
   * which typically involve spawning workers via the WorkerSpawner or direct spawn_subagent.
   */
  runLoop(
    state: MicroverseState,
    applyChange: () => { preSha: string; postSha: string; notes: string },
    measure: () => MetricSnapshot | null,
    rollback: (sha: string) => void,
    gate: () => boolean = () => true
  ): { converged: boolean; iterations: number } {
    const config = {
      stallLimit: state.stallLimit,
      maxIterations: state.maxIterations,
      direction: state.direction,
      tolerance: state.tolerance,
      gateEnabled: true,
    };

    // Wire incremental persistence: every iteration flushes microverse.json so crashes mid-run lose at most 1 iter
    const persist = (s: MicroverseState) => this.writeState(s);

    const loop = new ConvergenceLoop(
      this.sessionDir,
      config,
      measure,
      applyChange,
      rollback,
      gate,
      persist
    );

    const result = loop.run(state);

    // Log final convergence outcome for observability
    Activity.convergenceIteration(
      'microverse',
      path.basename(this.sessionDir),
      undefined,
      result.converged ? 'converged' : 'stopped',
      undefined,
      state.currentIteration
    );

    this.writeState(state); // ensure final even if no persist hook hit on early return
    return result;
  }

  /**
   * Run a command-style metric and return the parsed score.
   * Convention: last non-empty line, last token is the numeric score.
   */
  runCommandMetric(cmd: string, timeoutSeconds = 60): MetricSnapshot | null {
    enforceGitBoundaries(cmd);
    try {
      const result = execSync(cmd, {
        cwd: this.workingDir,
        encoding: 'utf8',
        timeout: timeoutSeconds * 1000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const lines = result.trim().split('\n').filter(Boolean);
      if (lines.length === 0) return null;

      const last = lines[lines.length - 1].trim();
      const tokens = last.split(/\s+/);
      const score = parseFloat(tokens[tokens.length - 1]);

      if (isNaN(score)) return null;

      return {
        raw: last,
        score,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[microverse] metric command failed:', err.message);
      return null;
    }
  }
}
