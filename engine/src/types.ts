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
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'blocked' | 'deferred';
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

// === CAMPAIGN MONITORING (campaign-status.json surface for mux/orchestrator/standup/recovery/self-loop) ===
export interface CampaignProgress {
  total: number;
  done: number;
  failed: number;
  remaining: number;
  blocked?: number;
  deferred?: number;
  [key: string]: any;
}

export interface CampaignStatus {
  sessionId?: string;
  status?: string;
  currentTicketId?: string;
  note?: string;
  lastUpdated?: string;
  progress?: CampaignProgress;
  resource?: Record<string, any>;
  /** Timestamp of last real meaningful progress delta (ticket/phase advance, git change via ritual, non-stall outcome). Powers campaign-level no-progress watchdog. */
  lastMeaningfulProgressTs?: string;
  /** Set true by thin watchdog when long window (default ~4h tunable) exceeded without recordProgress. Never auto-kills. */
  noProgressAlarm?: boolean;
  noProgressAlarmReason?: string;
  noProgressAlarmAt?: string;
  [key: string]: any;
}

// === POST-CAMPAIGN PHASE CLASSIFICATION (P1: explicit best-effort vs mandatory) ===
// Post phases (polish/deslop) default best-effort so failures never poison overallSuccess
// semantics, campaign result, closer release decision, or watchdog "no progress" alarms.
// Ticket phases (in ritual/orchestrator) are mandatory (bestEffort=false).
// Wire classification here for easy future extension (add phase to union + map entry).
// Visible in: campaign-status.json (postCampaign.phases.*.bestEffort), Activity meta_phase_started extras, PhaseResult.
export type PostCampaignPhase = 'citadel' | 'anatomy-park' | 'szechuan-sauce';
export type PhaseKind = 'mandatory' | 'best-effort';

export interface PhaseResult {
  phase: PostCampaignPhase;
  success: boolean;
  error?: string;
  details?: any;
  /** Explicit: true for polish (failures ignored for gates/closer/watchdog); false for mandatory (block release). */
  bestEffort: boolean;
}

export interface PostCampaignResult {
  phases: Record<PostCampaignPhase, PhaseResult>;
  overallSuccess: boolean;
  recoverableFailures: PostCampaignPhase[];
  shouldReleaseCloser: boolean;
}

/** Centralized classification. Flip bestEffort for future mandatory post-phases (e.g. hard gate). All current are polish best-effort. */
export const POST_PHASE_CLASSIFICATION: Record<PostCampaignPhase, { bestEffort: boolean; kind: PhaseKind }> = {
  citadel: { bestEffort: true, kind: 'best-effort' },
  'anatomy-park': { bestEffort: true, kind: 'best-effort' },
  'szechuan-sauce': { bestEffort: true, kind: 'best-effort' },
};

export function isBestEffortPostPhase(phase: PostCampaignPhase): boolean {
  return POST_PHASE_CLASSIFICATION[phase]?.bestEffort ?? true;
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

// === ITERATION / CONVERGENCE DRIVER STATE (canonical contracts for ConvergenceLoop + drivers) ===
export interface MetricSnapshot {
  score: number;
  raw: string;
  timestamp: string;
  [key: string]: any;
}

export interface IterationOutcome {
  kind: 'improved' | 'held' | 'regressed' | 'failed';
  rollback: boolean;
  exitReason?: string;
  metric?: MetricSnapshot;
}

export interface MicroverseState extends BaseConvergenceState {
  sessionId: string;
  mode: string;
  description?: string;
  validation?: string;
  direction: 'higher' | 'lower';
  tolerance: number;
  stallLimit: number;
  maxIterations: number;
  currentIteration: number;
  status: string;
  history: any[];
  failedApproaches: any[];
  keyMetric?: Record<string, any>;
  convergenceFile?: string;
  [key: string]: any;
}

export interface ConvergenceConfig {
  stallLimit?: number;
  maxIterations?: number;
  direction?: 'higher' | 'lower';
  tolerance?: number;
  gateEnabled?: boolean;
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
  currentIteration?: number;
  [key: string]: any;
}

// === SESSION STATE (was ad-hoc / inferred; now first-class for PRD linkage + preflight) ===
export interface SessionTicket extends Ticket {
  path?: string;
  phasesCompleted?: string[];
  sourcePrd?: string;
  justification?: string;
  isHardening?: boolean;
  category?: string;
  severity?: string;
  [key: string]: any; // tolerate rich meta from emitter / generators

  /** Populated by runtime-owned discrete ticket commit model (orchestrator post-final-ritual success). */
  completionCommit?: string;
  completionCommitSource?: 'runtime-orchestrator' | 'worker-direct' | 'inferred' | 'fallback';
  completionCommitAt?: string;

  /** Per-ticket stall/timeout repeat isolation (P1): incremented on WorkerResult.timedOut/stallReason.
   * After getTicketStallLimit() repeats, ticket is failed/halted (rest of campaign unaffected).
   * Persisted on state.json tickets (same as phasesCompleted); survives resume/recovery. */
  stallCount?: number;
  lastStallReason?: string;
  lastStallPhase?: string;
  lastStallAt?: string;
}

export interface SessionState {
  sessionId: string;
  createdAt: string;
  workingDir: string;
  step: Step;
  tickets: Array<Ticket & Record<string, any>>;
  maxIterations: number;
  backend: Backend;
  runtime: Runtime;
  flags: Record<string, any>;
  breaker: Record<string, any>;
  currentTicketId?: string;
  /** PRD linkage for machine-owned "run pipeline on PRD" flows (P0-1) */
  sourcePrd?: string;
  prdLinkedAt?: string;
  prdContentHash?: string;
  /** P0 ticket manifest seal (hash of ticket ids + canonical PRD) — single source in state for deterministic re-dispatch, partial refine, and --no-refine gate. */
  ticketManifestHash?: string;
  [key: string]: any; // graceful evolution + backward compat for old sessions
}

// === PREFLIGHT (P0-2 machine guards for PRD→session) ===
export interface PreflightReport {
  ok: boolean;
  needsRefine: boolean;
  isZombie: boolean;
  isConsistent: boolean;
  ticketCountOnDisk: number;
  missingTicketIds: string[];
  sourcePrdMatch: boolean;
  diagnostics: string[];
  prdPath?: string;
  sessionSourcePrd?: string;
  refinement?: {
    sufficient: boolean;
    score: number;
    reasons: string[];
  };
  ticketFilesOnDisk?: number; // alias/detail
  isMeta?: boolean; // attached by run-pipeline for post decision (meta R-META tickets)

  // Post-incident P0 policy + provenance (zero-ticket PRD bypass prevention + ticket manifest seal)
  hasRealMaterializedTickets?: boolean;
  ticketManifestHash?: string;
  ticketManifestHashMatch?: boolean;
  legalForNoRefine?: boolean;
  [key: string]: any;
}

/** Machine-actionable Readiness Assessment from cheap preflight skeletal probe (P0 for meta PRDs on skeleton drivers). */
export interface ReadinessAssessment {
  status: 'green' | 'amber' | 'red' | 'ready' | 'blocked' | 'deferred';
  /** 0-100; 100 = no skeletal markers on any mentioned target files (preflight); research paths use neutral */
  score: number;
  signals: Array<{
    file: string;
    pattern: string;
    hits: number;
    example?: string;
  }>;
  filesScanned: string[];
  suggestedPrereqs: string[];
  scannedAt: string;
  summary?: string;
  /** Research-phase (from ## Readiness Assessment in research_*.md) — machine-actionable for ritual/orchestrator/closer.
   *  | undefined allowed for exactOptional + tolerant regex extraction of optional sections. */
  reason?: string | undefined;
  suggestedPrerequisites?: string[] | undefined; // synonym for md section parsing
  extractedFromResearch?: boolean | undefined;
}
