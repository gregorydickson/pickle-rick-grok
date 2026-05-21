# Pipeline Meta-Readiness & Execution Improvements (Post R-META-DEEPEN-001)

**Date**: 2026-05-21  
**Origin**: Promoted from `prds/internal/` (original design doc dated 2026-05-19 after R-META-DEEPEN-001) + current-state review performed on promotion day.

**Trigger**: R-META-DEEPEN-001 campaign (10 tickets) only fully completed 1 ticket. Research honesty was punished as failure — theatrical Verifies + skeletal targets + flat execution order caused the researcher/planner to die early, and the system treated honest "this cannot be done yet" signals as failures.

**Goal**: Raise completion rate and signal quality on meta/hardening PRDs while preserving the headless `grok -p` + ritual execution contract.

This document is the approved design synthesized from the Codebase Analyst, Risk Analyst, and Engineering Architect council (May 19). The sections below were updated with actual implementation status on 2026-05-21 during promotion to the standard prds/ directory.

---

## Incident Context (R-META-DEEPEN-001)

A self-PRD on meta infrastructure produced 10 tickets. Only one completed. Root causes:
- Theatrical / non-runnable Verify commands in AC tables (`|| true`, "after the fix", "manually observe", bare `ls`/`cat`, TODO-in-Verify).
- Targeting files that were still skeletal/stub (no real implementation surface yet).
- Flat declaration order + no dependency graph → dependents ran before foundation work.
- No machine-readable signal for "research found this is blocked/deferred" — the ritual treated it as a normal failure.
- No emission-time gate that could have rejected the bad tickets before they ever reached the orchestrator.

The mitigations below were the direct response.

---

## Top 3 Improvements — Current State (2026-05-21)

### 1. Machine-Actionable Research Signals (Blocked / Deferred + Readiness Assessment) — **DONE**

**Implemented**:
- `ReadinessAssessment` interface in [types.ts](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/types.ts:322) (`green | amber | red | ready | blocked | deferred`, `signals[]`, `suggestedPrereqs`, `reason`, `score`).
- `extractReadinessAssessment()` in [ritual.ts](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/ritual.ts:80) — tolerant regex extraction from research artifacts (`## Readiness Assessment ... Status: blocked` etc.).
- P0 research-honesty rescue path in ritual (lines 145–192, 264–272): on `blocked`/`deferred` after research phase:
  - Always appends the research artifact + records the phase
  - Calls `updateTicketReadiness()` (flips ticket status)
  - Halts remaining phases for that ticket
  - Never marks the ticket `failed`
- Orchestrator [orchestrator.ts](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/bin/orchestrator.ts:277) respects the live status post-research and skips the rest of the ticket.
- `SessionManager.updateTicketReadiness()` + `countRemainingTickets()` now surfaces `blocked`/`deferred` counts.
- Ticket template + 8-phase notes explicitly instruct Researcher to emit the structured Readiness Assessment section and Planner/Verifier/Reviewer to re-audit it.

**Evidence in production**:
- Commit `cddf218` ("ritual: P0 blocked research rescue")
- Research artifacts from blocked meta tickets are now preserved and visible to closer + next self-PRD generator.

**Remaining**:
- Richer auto-ingestion of `suggestedPrereqs` + research reasons into the *next* self-PRD generator (still mostly aspirational — the generator currently rescans the reliability-backlog + Activity, not deep research_*.md content yet).
- Standup/metrics surfaces for "blocked tickets this campaign + their reasons" are present but not first-class yet.

**Verdict**: The core "honest research no longer kills the ticket" contract is solid and has been exercised.

### 2. Dependency Graph + Topological Execution — **CORE RUNTIME DONE, EMISSION SIDE WEAK**

**Implemented**:
- `Ticket` interface carries `dependencies?: string[]` ([types.ts:31](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/types.ts:31)).
- Pure functions in [phase-utils.ts](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/lib/phase-utils.ts:150):
  - `detectCycles()`
  - `topologicalSort()`
  - `getReadyTickets()` (respects done + external deps + excludes blocked/deferred/failed)
- Orchestrator ([orchestrator.ts:328](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/bin/orchestrator.ts:328)):
  - Runs `topologicalSort` at campaign start (falls back to declaration order + warning on cycles)
  - Logs the initial ready queue
  - Runtime gate inside the loop: if any declared prereq is not `done`, the dependent is skipped (logged)
- `TicketRef` lightweight type for the pure graph functions.

**Evidence**:
- Orchestrator now prints "Ready queue (deps satisfied)" and "skipped — unsatisfied prereqs".
- Commits around `dbe057a` / `848e3f3` (P1 isolation + best-effort) + the meta-readiness wave.

**Remaining (the real gap)**:
- **Producers almost never emit `dependencies` today.**
  - `self-prd-generator.ts` and `ticket-emitter.ts` do not yet synthesize or declare rich prerequisite relationships between R-META tickets.
  - The refine-council path (via `/pickle-refine-prd`) could in theory emit them, but the analyst outputs and the `TicketSpec` population rarely include them.
  - Result: the beautiful runtime graph mostly sees empty arrays → falls back to declaration order in practice for most self-campaigns.

**Verdict**: Runtime machinery is production-grade. The "write the edges" half is still theater for meta PRDs.

### 3. Preflight + Emission-Time Readiness Scanning for Meta PRDs — **STRONG & ENFORCED**

**Implemented**:
- `assessMetaReadiness()` in [pipeline-preflight.ts:470](/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/lib/pipeline-preflight.ts:470):
  - Cheap skeletal probe using `SKELETAL_RE` (TODO/FIXME/stub/skeleton/not implemented/placeholder, empty fns, throw NotImplemented, etc.)
  - Also runs `detectVerifyTheater()` on the Verify strings themselves
  - Returns full `ReadinessAssessment` with signals + suggestedPrereqs
- Wired at emission time inside `ticket-emitter.ts:141` (`emitRefinedTickets`):
  - Probe runs on every ticket before markdown is written
  - Result is injected as a visible "**Preflight Readiness**" section in the generated `ticket.md`
  - **Hard gate**: for self/meta-generated tickets (`generatedBy` containing "self" or sourcePrd self-generated), theatrical Verifies or red readiness now **throw** before any ticket is emitted
- `analyzeSessionForVerifyTheater()` + post-campaign logic can trigger H-VERIFY hardening tickets
- Full provenance seal (`computeTicketManifestHash`), materialization guards, and `PreflightReport` in the same file
- Ticket template 8-phase notes now contain explicit theater-audit language for Researcher/Planner/Verifier/Reviewer

**Evidence**:
- Multiple commits: `87e191e`, `37fd4fb`, `df30ca7`, `1462986`, `bc34bf5` — all titled around "theater rejection", "emission gate", "R-META-DEEPEN incident", "provenance seal".
- Self-PRD generator now documents "This PRD + its tickets are pre-audited at emission (detectVerifyTheater + assessMetaReadiness)".

**Remaining**:
- The probe is intentionally cheap (regex, limited file set). It will miss subtle "this is a stub that looks like real code" cases.
- Suggested prereqs are still generic ("run foundation P0s first"); they do not yet synthesize concrete ticket IDs from the prior campaign's research blockers.

**Verdict**: This is the part that directly prevents another R-META-DEEPEN-001. Emission theater is now a hard failure for autonomous paths.

---

## Rollout Order — Actual Status

| Step | Item | Status | Notes |
|------|------|--------|-------|
| 1 | Types + session readiness storage | **DONE** | `ReadinessAssessment`, `updateTicketReadiness`, blocked/deferred in state + progress counts |
| 2 | Ritual + phase prompt contracts | **DONE** | Extraction, rescue path, explicit instructions in ticket template + research.md |
| 3 | Orchestrator topo + ready queue | **DONE** (runtime) | `topologicalSort` + runtime dep gating + logging; emission of edges still weak |
| 4 | Preflight + emitter + self-prd | **DONE** (strong) | `assessMetaReadiness` at birth, hard gates, theater detection, injected sections, self-prd generator hardened |
| 5 | Closer / post-phase / metrics polish | **PARTIAL** | `analyzeSessionForVerifyTheater` exists and can trigger hardening. Rich "ingest research blockers + suggestedPrereqs into next generator" is the remaining high-leverage piece (see master_plan G) |

All infra changes went through the normal (or self-PRD) path and tests stayed green.

---

## Success Criteria — Re-evaluated

**Met**:
- Research artifacts from blocked/deferred tickets are preserved with structured Readiness Assessment (ritual + session).
- Orchestrator respects declared dependencies and will not run dependents before prereqs are `done` (when edges exist).
- Preflight/emission probe on meta PRDs surfaces amber/red + signals + suggested prereqs and **blocks** bad self/meta emission.
- Hard emission gate prevents theatrical Verifies from ever reaching the 8-phase ritual on autonomous paths.
- All existing engine tests + campaign simulator remained green; new coverage for the rescue paths, topo, and preflight probe.

**Not yet met / still valuable**:
- Next self-PRD generator does **not** yet deeply ingest prior research artifacts' `suggestedPrereqs` + blocker reasons to auto-order or pre-declare `dependencies` in the new ticket batch. It still primarily drives from the reliability-backlog + Activity.
- Real-world meta PRDs still rarely declare `dependencies` (the graph is under-fed).

---

## Irony Note

This design doc (originally living at `prds/internal/pipeline-meta-readiness-improvements-2026-05-19.md`) was produced by the council after the incident but was **never turned into executable R-META tickets** and run through the 8-phase ritual. On 2026-05-21 it was promoted to the standard `prds/` directory (renamed with today's date) as a first-class planning artifact. The actual fixes were shipped via the self-improvement wave that followed the RCA (the commits listed above). The document accurately described the problems; the machine fixed them through the normal self-PRD + pipeline path instead of treating this note as a PRD.

---

## Recommendations (for the next self-PRD that touches meta readiness)

1. Make `dependencies` population first-class in `self-prd-generator.ts` + `autoDecomposeIntoTickets` (use prior campaign's research "suggestedPrereqs" + blocked tickets to synthesize edges).
2. Teach the generator to read `readiness.reason` and `suggestedPrerequisites` from the previous session's research artifacts when `--self-improvement` is run after a campaign that produced blockers.
3. Add a `readiness` section to the reliability-backlog ingest so the closer can promote concrete "these tickets were blocked because X — next campaign should do Y first".
4. Consider a cheap "dependency inference" pass during emission for obviously layered meta work (persist → ritual → gate → orchestrator → closer).

---

**Rick**: "We got the hard part right — the birth canal now has teeth. The next step is making the generator actually use the teeth marks from the last litter to arrange the next litter's birth order. Stop emitting flat lists of orphans."

Wubba lubba dub dub.

— Updated 2026-05-21 after live codebase review of the three P0 items and the incident-driven hardening commits.
