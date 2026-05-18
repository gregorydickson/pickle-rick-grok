/**
 * Core types for the Pickle Rick Grok engine (TypeScript reimplementation)
 *
 * Clean, minimal, faithful to the concepts that actually mattered from v1.
 */

export type Step =
  | 'prd'
  | 'refinement'
  | 'breakdown'
  | 'implementing'
  | 'review'
  | 'converged'
  | 'stopped';

export type Backend = 'grok' | 'codex' | 'hermes' | 'claude';
export type Runtime = 'grok' | 'claude' | 'other';

export interface Ticket {
  id: string;                    // "001", "002"...
  title: string;
  path: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';
  phasesCompleted: string[];
  workingDir?: string;
}

export interface SessionState {
  sessionId: string;
  createdAt: string;
  workingDir: string;
  step: Step;
  tickets: Ticket[];
  currentTicketId?: string;
  maxIterations: number;
  backend: Backend;
  runtime: Runtime;
  flags: Record<string, any>;
  breaker: Record<string, any>;
}

export interface MetricSnapshot {
  raw: string;
  score: number;
  timestamp: string;
}

export interface MicroverseHistoryEntry {
  iteration: number;
  preSha: string;
  postSha: string;
  measurement?: MetricSnapshot;
  outcome: 'improved' | 'held' | 'regressed' | 'failed';
  commit?: string;
  notes?: string;
}

export interface MicroverseState {
  sessionId: string;
  mode: 'metric' | 'llm' | 'worker';
  description: string;
  validation: string;                 // shell command or judge goal
  direction: 'higher' | 'lower';
  tolerance: number;
  stallLimit: number;
  maxIterations: number;
  currentIteration: number;
  status: 'gap_analysis' | 'iterating' | 'converged' | 'stopped';
  history: MicroverseHistoryEntry[];
  failedApproaches: string[];
  keyMetric?: Record<string, any>;
  convergenceFile?: string;           // "anatomy-park.json" etc.
}

export interface AnatomyParkState {
  sessionId: string;
  subsystems: string[];
  currentIndex: number;
  passCounts: Record<string, number>;
  consecutiveClean: Record<string, number>;
  stallCounts: Record<string, number>;
  stallLimit: number;
  findingsHistory: Record<string, any[]>;
  trapDoorsAdded: any[];
  status: string;
}

export interface IterationOutcome {
  kind: 'improved' | 'held' | 'regressed' | 'failed';
  metric?: MetricSnapshot;
  rollback: boolean;
  exitReason?: string;
}

export type ConvergenceMode = 'metric' | 'llm' | 'worker';
