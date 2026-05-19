/**
 * ArchitectureDeepener — the core driver for "deepening opportunities"
 *
 * This is the shared engine behind:
 *   - /deepen command
 *   - Anatomy Park evolution
 *   - Optional pipeline phase
 *   - Standalone Microverse-style Architecture Improvement Loop
 *
 * It reuses the battle-tested ConvergenceLoop + ManagerRitual + WorkerSpawner
 * infrastructure so all paths get the same safety, resumability, and detached
 * execution guarantees.
 */

import * as path from 'path';
import { SessionManager } from './session.js';
import { ConvergenceLoop, BaseConvergenceState } from './iteration.js';
import { Activity } from './activity-logger.js';

export interface DeepeningOpportunity {
  id: string;
  module: string;
  currentDepth: 'shallow' | 'medium' | 'deep';
  proposedSeam: string;
  expectedLeverage: string;
  expectedLocality: string;
  deletionTestImpact: string;
  files: string[];
}

export interface ArchDeepenerState extends BaseConvergenceState {
  targetPaths: string[];
  opportunities: DeepeningOpportunity[];
  // ... future fields (history, failed approaches, etc.)
}

export class ArchitectureDeepener {
  private statePath: string;
  private workingDir: string;

  constructor(private sessionDir: string) {
    this.statePath = path.join(sessionDir, 'arch-deep.json');
    const sm = new SessionManager();
    this.workingDir = sm.getWorkingDirSafe(sessionDir);
  }

  init(targetPaths: string[]): ArchDeepenerState {
    const state: ArchDeepenerState = {
      sessionId: path.basename(this.sessionDir),
      targetPaths,
      opportunities: [],
      currentIteration: 0,
      status: 'gap_analysis',
      history: [],
      failedApproaches: [],
      // ConvergenceLoop fields
      stallLimit: 5,
      maxIterations: 50,
      direction: 'lower', // we want to reduce "architectural debt"
      tolerance: 0,
    };
    this.writeState(state);
    return state;
  }

  load(): ArchDeepenerState {
    // In a real impl this would read from disk
    // For the skeleton we return a fresh state
    return this.init(['.']);
  }

  private writeState(state: ArchDeepenerState) {
    // TODO: use writeJsonAtomic like the other drivers
    // For now this is a stub so the shape is defined
  }

  /**
   * The actual "deepening" logic will live here.
   * For now this is a skeleton that reuses ConvergenceLoop.
   */
  async runDeepening(state: ArchDeepenerState) {
    // Placeholder — real implementation will:
    // 1. Scan using LANGUAGE.md concepts (Module, Seam, Depth, etc.)
    // 2. Propose deepening opportunities
    // 3. Spawn "deepen-changer" workers for tiny structural changes
    // 4. Use ConvergenceLoop for safe iteration + rollback + gates

    const config = {
      stallLimit: state.stallLimit,
      maxIterations: state.maxIterations,
      direction: state.direction,
      tolerance: state.tolerance,
      gateEnabled: true,
    };

    // This will eventually call a real ConvergenceLoop with
    // measure = arch-debt score
    // apply = propose + apply one deepening
    // etc.

    Activity.convergenceIteration(
      'arch-deepening',
      path.basename(this.sessionDir),
      undefined,
      'started',
      undefined,
      0
    );

    // Stub return so the driver is usable immediately
    return {
      converged: false,
      iterations: 0,
      message: 'ArchitectureDeepener skeleton — real logic coming next',
    };
  }
}