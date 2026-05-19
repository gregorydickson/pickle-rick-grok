export { runOrchestrator, type RunOrchestratorOptions } from './bin/orchestrator.js';
export { runDetached, type DetachedOptions } from './runners/mux-runner.js';
// Self-meta dogfood wiring (now first-class, callable from pipeline/orchestrator)
// Auto-decompose added: generateSelfPrd(..., {sessionDirToPopulate}) writes real executable R-META tickets/ so 50-tix self-runs need no separate refine.
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
