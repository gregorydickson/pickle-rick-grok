# R-META-DEEPEN-001: Architecture Deepening — Full ConvergenceLoop Productionization

**Status**: Draft  
**Priority**: P0 (meta tooling)  
**Created**: 2026-05-19  
**Author**: Grok (main thread) + Pickle Rick  
**Target**: `engine/src/arch-deepener.ts`, `engine/src/bin/deepen.ts`, `engine/src/bin/pipeline.ts`, `references/phases/deepen-changer.md`, tests

---

## Completion Checklist

- [ ] Introduction
- [ ] Problem Statement
- [ ] Objective & Scope
- [ ] Requirements (machine-verifiable ACs with Verification column)
- [ ] Interface Contracts
- [ ] Test Expectations
- [ ] Risks & Trap Doors

---

## Introduction

The Architecture Deepening system (`/deepen`, `ArchitectureDeepener`, `deepen-changer` worker) was delivered in two waves:

1. Initial scanner + 4-path foundation (discovery, Anatomy hook, pipeline phase, standalone loop).
2. ConvergenceLoop integration (`runDeepeningLoop`, debt metric, prompt builder, thin CLI).

The current implementation works for short runs and discovery, but is not yet production-grade for the self-improvement loop. The apply step is fire-and-forget, the debt metric is purely static, the pipeline phase only does discovery, and there is no reliable "structural improvement" signal that the rest of the machine can trust.

This ticket makes Architecture Deepening a first-class, measurable, resumable phase that the Morty team and the self-improvement machinery can use with the same guarantees as Microverse / Anatomy / Szechuan.

---

## Problem Statement

- `runDeepeningLoop` spawns `deepen-changer` workers but has no reliable way to know whether a worker produced a *structural* win versus noise.
- Debt is calculated from static export counts and file analysis — it does not move when a worker actually extracts a better seam or introduces a missing adapter.
- The `--deepen` phase in `pipeline.ts` only runs discovery. Full convergence loops are not yet wired.
- Failed approaches and iteration history are not yet first-class citizens inside the driver (they exist in the manual loop but are not fully surfaced through `ConvergenceLoop` history + `onPersist`).
- The self-improvement loop has no good way to decide "now is a good time to run architecture deepening" or to measure its impact on future campaigns.
- Test coverage for real multi-iteration `runDeepeningLoop` paths is thin.
- The Morty Implementer team cannot yet be given clean tickets for this work because the PRD/ticket surface is still fuzzy.

Result: Architecture deepening is a cool demo but not yet a reliable tool the machine can use to improve itself.

---

## Objective & Scope

### Goal
Turn Architecture Deepening into a trustworthy, ConvergenceLoop-driven phase with measurable structural improvement, proper pipeline integration, and clean surfaces for the Morty team and self-PRD generator.

### In Scope
- Harden `runDeepeningLoop` so the apply step produces verifiable structural change and the measure step can reliably detect it.
- Improve the debt / improvement metric to be sensitive to real architectural moves (new seams, extracted interfaces, adapter introduction, duplication removal at seams).
- Wire a real convergence loop into the `--deepen` phase of `pipeline.ts` (optional, behind flag or when `--self-improvement`).
- Make failed approaches, iteration history, and debt trajectory first-class persisted state.
- Improve the `deepen-changer` prompt and worker contract for higher signal proposals.
- Add machine-checkable tests that exercise multi-iteration `runDeepeningLoop` (with mocked or real workers).
- Produce clear, refinable tickets so the Morty team can own the remaining polish.

### Out of Scope (for this ticket)
- Full 11-auditor Citadel depth on architecture changes (tracked separately).
- New LANGUAGE.md terms or major vocabulary changes.
- Rewriting existing drivers (Microverse, Anatomy, Szechuan) to use the deepener.
- UI / visualization of debt trends (nice-to-have later).

---

## Product Requirements

All requirements must be machine-checkable.

| Priority | Requirement | User Story / Rationale | Verification (must be machine-checkable) |
|----------|-------------|------------------------|------------------------------------------|
| P0 | `runDeepeningLoop` must produce a measurable reduction in a structural debt signal after a successful worker iteration | As a self-improvement campaign, I want to know that running architecture deepening actually made modules deeper, not just changed file counts | After a successful apply + re-measure, the returned debt score is strictly lower than the starting debt for at least one iteration in a 2+ iteration test run |
| P0 | Debt metric must be sensitive to real seam/interface changes, not just static export counts | Static analysis alone cannot tell whether a worker introduced a better interface or just moved code | There exists a deterministic way (test or CLI) to inject a known "good seam extraction" change and see debt drop while a cosmetic change does not |
| P0 | The `--deepen` phase in `pipeline.ts` can run a full multi-iteration `runDeepeningLoop` (not just discovery) when requested | When doing `--self-improvement`, the pipeline should be able to run real architecture deepening campaigns instead of only scanning | `npx tsx engine/src/bin/pipeline.ts ... --deepen --deepen-iterations 3` produces a `arch-deep.json` with `currentIteration >= 2` and at least one accepted improvement |
| P0 | Failed approaches and per-iteration debt history are persisted and passed to every `deepen-changer` worker | Workers must never repeat bad ideas; the ledger must survive crashes | After a failed iteration + restart of `runDeepeningLoop`, the next worker prompt contains the previous failed approach description |
| P0 | `deepen loop` and `pipeline --deepen` respect the same `ConvergenceLoop` guarantees (stall detection, gate, rollback on regression, atomic persistence) | Long-running architecture campaigns must be as safe as Microverse runs | Killing the process mid-loop and resuming results in at most one lost iteration and correct rollback state |
| P1 | Clear, refinable tickets exist so the Morty team can be given this work | The current surface is too fuzzy for the 8-phase ritual | After running this PRD through `/pickle-refine-prd`, at least 4 atomic, refinable tickets are produced with proper `ticket.md` structure |
| P1 | The `deepen-changer` prompt + output contract is tight enough that a Morty Implementer can reliably produce a proposal that passes the format check | Workers should not waste iterations on malformed output | A test or harness can feed the current prompt to a mock worker and validate that the expected `**PROPOSAL**` format is produced |
| P1 | Debt trajectory and final improvement delta are emitted as Activity events and visible in `/pickle-standup --self` | Self-improvement observability must include architecture work | After a successful deepening campaign, `pickle-standup` or the activity log contains `arch-deepening` events with debt delta |

---

## Interface Contracts

- `ArchitectureDeepener.runDeepeningLoop(state: ArchDeepenerState): Promise<{converged, iterations, finalDebt, history}>`
- `computeDebt(opportunities: DeepeningOpportunity[]): number` — must be pure and deterministic
- `buildDeepenChangerPrompt(state, opps, failedApproaches): string` — must include the full `deepen-changer.md` rules + current ledger
- `deepen loop <session> --max-iterations N --stall-limit M` must forward those values into state before calling the driver
- Pipeline `--deepen` phase must be able to call either discovery or full `runDeepeningLoop` based on flags

All new persisted fields in `arch-deep.json` must be documented in the driver.

---

## Test Expectations

- Existing `arch-deepener.test.ts` must continue to pass.
- New tests (or expanded stress tests) must exercise `runDeepeningLoop` for ≥2 iterations with simulated worker success/failure.
- A "structural improvement detector" test or harness must exist that proves the debt metric can distinguish real seam work from noise.
- Pipeline integration test (or smoke) must show `--deepen` with iterations > 1 actually running the loop.

---

## Risks & Trap Doors

- Risk: Debt metric remains too noisy → campaigns never converge.  
  Mitigation: Start with a conservative, multi-signal metric (static + git diff structural signals + optional LLM judge for "was a seam introduced?").

- Risk: Workers produce proposals that look good on paper but don't actually reduce long-term complexity.  
  Mitigation: The Deletion Test language + post-campaign Citadel review on changed modules.

- Trap Door: If we make the apply step wait for worker result, we risk turning the loop into a long synchronous thing. Keep the fire-and-measure pattern but add optional post-worker validation via ritual when run inside the orchestrator.

- Trap Door: Self-PRD generator starts emitting R-META tickets for this area before the surface is stable. Document clearly in `master_plan.md` and `reliability-backlog.md`.

---

**Rick Note**:  
"We built the scanner. We bolted on the loop. Now we make the loop actually *mean* something when the machine looks at its own guts. No more 'it ran and the number went down a bit.' We want modules that are actually deeper, and we want the Morties to be the ones who prove it."

---

**Next Step Recommendation**  
Feed this PRD to `/pickle-refine-prd` (or the self-PRD generator if we want it fully meta). The refinement council should produce 4–7 atomic tickets that the full pipeline + Morty Implementers can execute with proper `TICKET_DIR` artifacts.

This PRD is intentionally written so the refinement step can do its job without the author having to guess the perfect decomposition.