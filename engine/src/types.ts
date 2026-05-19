/**
 * Core types for the Pickle Rick Grok engine (TypeScript reimplementation)
 *
 * Clean, minimal, faithful to the concepts that actually mattered from v1.
 * Hardened for 50-ticket overnight: Campaign* + Szechuan* shapes for session/ritual/monitoring/self-loop.
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
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'in_progress' | 'done' | 'blocked';
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  estimate?: number;
  dependencies?: string[];
}

export interface Campaign {
  id: string;
  prdId?: string;
  tickets: Ticket[];
  status: 'planning' | 'executing' | 'reviewing' | 'converged' | 'failed';
  createdAt: string;
  meta?: Record<string, any>;
}

// === CONVERGENCE TYPES (shared by anatomy, szechuan, microverse, citadel) ===
export interface Measurement {
  score: number;
  raw: string;
  timestamp: string;
  [key: string]: any;
}

export interface ApplyChangeResult {
  preSha: string;
  postSha: string;
  notes: string;
  [key: string]: any;
}

export interface BaseConvergenceState {
  currentIteration: number;
  history: any[];
  status: string;
  targetPaths?: string[];
  [key: string]: any;
}

export interface ConvergenceConfig {
  stallLimit: number;
  maxIterations: number;
  direction: 'higher' | 'lower';
  tolerance: number;
  gateEnabled: boolean;
  [key: string]: any;
}

// === SZECHUAN TYPES (FULLY EXPANDED — every principle from szechuan-sauce-principles.md + financial, adapted for Grok engine) ===

/**
 * Violation now carries full priority + confidence per the canonical scoring rules.
 * Scanner drops low-conf per spec (conf < 80 unless P0 + conf>=50 with NEEDS-VERIFICATION).
 */
export interface Violation {
  file: string;
  principle: string;          // e.g. 'KISS', 'DRY', 'MONETARY_PRECISION', 'FAIL_FAST'...
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  message: string;
  autoFixable: boolean;
  rule?: string;              // machine key e.g. 'no-eval', 'guard-clauses', 'float-money'
  suggestion?: string;
  line?: number;
  /** 0-100 per principles doc. High bar for inclusion. */
  confidence?: number;
  /** Only for low-conf P0 escape hatch */
  needsVerification?: boolean;
  /** For financial elevation tracking */
  originalSeverity?: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
}

export interface SzechuanScanResult {
  count: number;
  violations: Violation[];
  topViolation: Violation | undefined;
  byPrinciple: Record<string, number>;
  bySeverity: Record<string, number>;
  /** Optional rich summary for reports */
  summary?: string;
}

export interface SzechuanState {
  sessionId: string;
  targetPaths: string[];
  principles: string[];
  currentIteration: number;
  violationsFound: number;
  stallCount: number;
  stallLimit: number;
  status: string;
  history?: any[];
  /** Richer history for reports + 50-tix forensics (populated by driver for delta visibility) */
  violationsHistory?: any[];
  /** Snapshot of current convergence state for richer monitoring */
  currentState?: Record<string, any>;
  /** Domain for financial elevation etc. 'base' | 'financial' */
  domain?: 'base' | 'financial';
  [key: string]: any;
}

/** Optional overrides for runConvergence (used by tests + advanced callers) */
export interface SzechuanRunOptions {
  maxIterations?: number;
  stallLimit?: number;
  domain?: 'base' | 'financial';
  principles?: string[];
}
