/**
 * ConvergenceLoop — reusable iteration brain (TypeScript)
 *
 * This is the spiritual successor to the microverse-runner + mux-runner iteration logic.
 * Used by Microverse, Anatomy Park, Szechuan, and the main ticket phases.
 *
 * Guarantees for long autonomous runs:
 * - mid-iteration persistence hook (onPersist) flushes after every step
 * - robust error handling around apply/measure so one bad worker doesn't silent-stall the loop
 * - correct first-measurement bootstrap + delta classification (with history resumption)
 * - safe workingDir resolution (prevents bogus git SHAs and wrong rollbacks)
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { IterationOutcome, MetricSnapshot, MicroverseState } from './types.js';
import { SessionManager } from './session.js';

export interface ConvergenceConfig {
  stallLimit?: number;
  tolerance?: number;
  direction?: 'higher' | 'lower';
  maxIterations?: number;
  gateEnabled?: boolean;
}

export type ApplyChangeResult = {
  preSha: string;
  postSha: string;
  notes: string;
};

/** Loose base for any driver state (microverse, anatomy, szechuan) that wants the loop brain */
export interface BaseConvergenceState {
  currentIteration: number;
  history?: any[];
  status?: string;
  [key: string]: any;
}

export class ConvergenceLoop {
  private lastScore: number | null = null;
  private workingDir: string;

  constructor(
    private sessionDir: string,
    private config: ConvergenceConfig,
    private measureFn: () => MetricSnapshot | null,
    private applyChangeFn: () => ApplyChangeResult,
    private rollbackFn: (sha: string, paths?: string[] | null) => void,
    private gateFn: () => boolean = () => true,
    /** Called after every iteration mutation for incremental JSON persistence (crash safety) */
    private onPersist?: (state: BaseConvergenceState) => void
  ) {
    const sm = new SessionManager();
    this.workingDir = sm.getWorkingDirSafe(sessionDir);
  }

  /**
   * Full convergence loop. Persists after each iteration when hook supplied.
   * Accepts MicroverseState or any BaseConvergenceState from anatomy/szechuan drivers.
   */
  run(state: BaseConvergenceState): { converged: boolean; finalOutcome?: IterationOutcome; iterations: number } {
    const stallLimit = this.config.stallLimit ?? 5;
    let stallCount = 0;
    let iterations = 0;
    const maxIters = this.config.maxIterations ?? 300;

    // ensure arrays exist
    if (!state.history) state.history = [];
    if (typeof state.currentIteration !== 'number') state.currentIteration = 0;

    while (state.currentIteration < maxIters) {
      iterations++;

      const outcome = this.runOneIteration(state);

      if (outcome.kind === 'improved') {
        stallCount = 0;
        if (this.config.gateEnabled && !this.safeGate()) {
          const last = state.history[state.history.length - 1];
          this.safeRollback(last?.preSha || this.getGitHead());
          outcome.kind = 'regressed';
          outcome.rollback = true;
          outcome.exitReason = outcome.exitReason || 'gate_failed_post_improve';
        }
      } else if (outcome.kind === 'regressed') {
        stallCount = 0;
      } else {
        stallCount++;
      }

      if (stallCount >= stallLimit) {
        state.status = 'converged';
        if (this.onPersist) this.onPersist(state);
        return { converged: true, finalOutcome: outcome, iterations };
      }

      if (state.currentIteration >= maxIters) {
        state.status = 'stopped';
        if (this.onPersist) this.onPersist(state);
        return { converged: false, finalOutcome: outcome, iterations };
      }

      if (this.onPersist) this.onPersist(state);
    }

    return { converged: false, iterations };
  }

  private safeGate(): boolean {
    try {
      return this.gateFn();
    } catch {
      return true; // don't let gate throw kill the loop
    }
  }

  private safeRollback(sha: string) {
    try { this.rollbackFn(sha); } catch (e: any) {
      console.error('[ConvergenceLoop] rollback threw (ignored):', e?.message || e);
    }
  }

  private runOneIteration(state: BaseConvergenceState): IterationOutcome {
    const preSha = this.getGitHead();
    let applyRes: ApplyChangeResult | null = null;
    let measurement: MetricSnapshot | null = null;

    try {
      applyRes = this.applyChangeFn();
    } catch (e: any) {
      console.error('[ConvergenceLoop] applyChangeFn exception — recording failed outcome (no silent stall):', e?.message || e);
      const outcome: IterationOutcome = { kind: 'failed', rollback: false, exitReason: 'apply_exception' };
      if (!state.history) state.history = [];
      state.history.push({ iteration: state.currentIteration || 0, preSha, postSha: preSha, outcome: 'failed', notes: String(e?.message || e) } as any);
      state.currentIteration = (state.currentIteration || 0) + 1;
      if (this.onPersist) this.onPersist(state);
      return outcome;
    }

    const postSha = (applyRes && applyRes.postSha) || this.getGitHead();
    if (this.onPersist) this.onPersist(state);

    try {
      measurement = this.measureFn ? this.measureFn() : null;
    } catch (e: any) {
      console.error('[ConvergenceLoop] measureFn exception (treating measurement as null):', e?.message || e);
      measurement = null;
    }
    if (this.onPersist) this.onPersist(state);

    let outcome = this.classify(measurement, preSha, postSha);

    // Bootstrap + delta with resumption awareness (use last history measurement if lastScore not yet set)
    const dir = this.config.direction || 'lower';
    const tol = this.config.tolerance ?? 0;
    if (measurement) {
      let prevScore: number | null = this.lastScore;
      if (prevScore === null && state.history && state.history.length > 0) {
        const lastEntry: any = state.history[state.history.length - 1];
        if (lastEntry && lastEntry.measurement && typeof lastEntry.measurement.score === 'number') {
          prevScore = lastEntry.measurement.score;
        }
      }
      if (prevScore === null) {
        outcome.kind = 'improved'; // first real measurement or no prior score -> accept as baseline
      } else {
        const delta = measurement.score - prevScore;
        if (dir === 'lower') {
          if (delta < -tol) outcome.kind = 'improved';
          else if (delta > tol) outcome.kind = 'regressed';
          else outcome.kind = 'held';
        } else {
          if (delta > tol) outcome.kind = 'improved';
          else if (delta < -tol) outcome.kind = 'regressed';
          else outcome.kind = 'held';
        }
      }
      this.lastScore = measurement.score;
    }

    if (outcome.kind === 'regressed' && preSha !== postSha) {
      this.safeRollback(preSha);
      outcome.rollback = true;
    }
    if (this.onPersist) this.onPersist(state);

    if (!state.history) state.history = [];
    state.history.push({
      iteration: state.currentIteration || 0,
      preSha,
      postSha,
      measurement: measurement || undefined,
      outcome: outcome.kind,
      notes: applyRes ? applyRes.notes : 'no-apply',
    } as any);

    state.currentIteration = (state.currentIteration || 0) + 1;
    return outcome;
  }

  private classify(
    measurement: MetricSnapshot | null,
    preSha: string,
    postSha: string
  ): IterationOutcome {
    if (!measurement) {
      return {
        kind: preSha !== postSha ? 'improved' : 'held',
        rollback: false,
      };
    }
    return {
      kind: 'held',
      metric: measurement,
      rollback: false,
    };
  }

  private getGitHead(): string {
    try {
      // Use real project working dir, not dirname(sessionDir) — prevents corrupt rollback SHAs on long runs
      return execSync('git rev-parse HEAD', {
        cwd: this.workingDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }
}
