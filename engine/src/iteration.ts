/**
 * ConvergenceLoop — reusable iteration brain (TypeScript)
 *
 * This is the spiritual successor to the microverse-runner + mux-runner iteration logic.
 * Used by Microverse, Anatomy Park, Szechuan, and the main ticket phases.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { IterationOutcome, MetricSnapshot, MicroverseState } from './types.js';

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

export class ConvergenceLoop {
  constructor(
    private sessionDir: string,
    private config: ConvergenceConfig,
    private measureFn: () => MetricSnapshot | null,
    private applyChangeFn: () => ApplyChangeResult,
    private rollbackFn: (sha: string, paths?: string[] | null) => void,
    private gateFn: () => boolean = () => true
  ) {}

  /**
   * Full convergence loop.
   * Repeatedly applies changes, measures, classifies, accepts/rolls back,
   * checks the gate, and stops on convergence or stall limit.
   */
  run(state: MicroverseState): { converged: boolean; finalOutcome?: IterationOutcome; iterations: number } {
    const stallLimit = this.config.stallLimit ?? 5;
    let stallCount = 0;
    let iterations = 0;
    const maxIters = this.config.maxIterations ?? 300;

    while (state.currentIteration < maxIters) {
      iterations++;

      const outcome = this.runOneIteration(state);

      if (outcome.kind === 'improved') {
        stallCount = 0;
        if (this.config.gateEnabled && !this.gateFn()) {
          // Gate failed after improvement — treat as regression for safety
          this.rollbackFn(state.history[state.history.length - 1]?.preSha || this.getGitHead());
          outcome.kind = 'regressed';
          outcome.rollback = true;
        }
      } else if (outcome.kind === 'regressed') {
        stallCount = 0; // we already rolled back inside runOneIteration
      } else {
        stallCount++;
      }

      // Simple convergence heuristic
      const recent = state.history.slice(-3);
      const allImprovedOrHeld = recent.length > 0 && recent.every(h => h.outcome !== 'regressed');

      if (stallCount >= stallLimit) {
        state.status = 'converged';
        return { converged: true, finalOutcome: outcome, iterations };
      }

      if (state.currentIteration >= maxIters) {
        state.status = 'stopped';
        return { converged: false, finalOutcome: outcome, iterations };
      }
    }

    return { converged: false, iterations };
  }

  private classify(
    measurement: MetricSnapshot | null,
    preSha: string,
    postSha: string
  ): IterationOutcome {
    if (!measurement) {
      // Worker / anatomy mode — classification happens inside the phase workers
      return {
        kind: preSha !== postSha ? 'improved' : 'held',
        rollback: false,
      };
    }

    // Real scoring logic lives in the Microverse driver
    return {
      kind: 'held',
      metric: measurement,
      rollback: false,
    };
  }

  private getGitHead(): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: path.dirname(this.sessionDir),
        encoding: 'utf8',
      }).trim();
    } catch {
      return 'unknown';
    }
  }
}


