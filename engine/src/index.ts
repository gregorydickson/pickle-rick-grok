export { runOrchestrator, type RunOrchestratorOptions } from './bin/orchestrator.js';
export { runDetached, type DetachedOptions } from './runners/mux-runner.js';
// Self-meta dogfood wiring (now first-class, callable from pipeline/orchestrator)
export { generateSelfPrd, performPostCampaignIngest, autoDecomposeIntoTickets, type SelfTicketSeed } from './self-prd-generator.js';
export { runSelfImprovementLoopCloser, runFullSelfLoop } from './self-improvement-loop-closer.js';

// Resource & monitoring surface for long autonomous campaigns (50-tix safety)
export {
  withRetry,
  getMemSnapshot,
  hintGC,
  pruneDirOlderThan,
  gentleGitGc,
  getDiskFreeApprox,
  type RetryOptions,
} from './lib/resource-guard.js';

// Reusable ticket emission (the thing that stops the "write a /tmp script every refine" Jerry pattern)
export {
  emitRefinedTickets,
  emitRefineCouncilTickets,
  generateTicketMarkdown,
  type TicketSpec,
  type EmitOptions
} from './lib/ticket-emitter.js';

// Phase authority + phase-aware turn budgets (for 50-tix self-runs and future self-PRDs targeting researcher/planner exhaustion)
// DEFAULT_PHASE_TURN_BUDGETS and resolvePhaseTurnBudget are the single source — mutate here, not in orchestrator.
export {
  TICKET_PHASES,
  getPhaseFileName,
  getExpectedArtifactName,
  safeRead,
  DEFAULT_PHASE_TURN_BUDGETS,
  getDefaultPhaseTurnBudget,
  resolvePhaseTurnBudget,
} from './lib/phase-utils.js';

// WorkerRole type (for typing phaseMaxTurns overrides in RunOrchestratorOptions)
export type { WorkerRole } from './workers.js';
