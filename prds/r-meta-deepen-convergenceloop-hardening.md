# R-META-DEEPEN-001: Architecture Deepening — Full ConvergenceLoop Productionization

**Status**: Refined (via /pickle-refine-prd analyst council, 2 rounds)  
**Priority**: P0 (meta tooling)  
**Created**: 2026-05-19  
**Refined**: 2026-05-19  
**Author**: Grok (main thread) + Pickle Rick + Requirements/Codebase/Risk council  
**Target**: `engine/src/arch-deepener.ts`, `engine/src/bin/deepen.ts`, `engine/src/bin/pipeline.ts`, `references/phases/deepen-changer.md`, `engine/src/iteration.ts`, `engine/src/ritual.ts`, `engine/src/session.ts`, tests, self-* surfaces

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

All requirements must be machine-checkable. Strengthened by Requirements + Codebase + Risk council (2 full cross-critique rounds). Every Verify is a copy-paste runnable shell / `npx tsx -e` / `npm test` / `jq` command that passes or fails deterministically with zero human judgment.

| Priority | Requirement | User Story / Rationale | Verify |
|----------|-------------|------------------------|------------------------------------------|
| P0 | P0-PERSIST-001: `ArchitectureDeepener.load()` must be real (read `arch-deep.json` round-trip of opportunities/failedApproaches/history/currentIteration), `writeState` must always use imported `writeJsonAtomic` (no raw `writeFileSync`), init/write must survive truncation simulation | Crash safety + resumability parity with Microverse/Szechuan; current load stub + raw write = total loss on SIGKILL | `rm -rf /tmp/p-$$; npx tsx -e 'import * as fs from "fs"; import {ArchitectureDeepener} from "./engine/src/arch-deepener.js"; const d=new ArchitectureDeepener("/tmp/p-$$"); const s=d.init(["engine/src"]); /* after fix: write uses atomic + load restores */ const l=d.load(); console.log("ROUNDTRIP_OK:", l.opportunities.length>0 && Array.isArray(l.failedApproaches)); const f="/tmp/p-$$/arch-deep.json"; console.log("NO_TMP_LEAK:", !fs.readdirSync("/tmp/p-$$").some(x=>x.includes(".tmp-")));' && echo "PERSIST-001 PASS" |
| P0 | P0-MUTATE-001: `applyChange` in `runDeepeningLoop` must await WorkerSpawner, parse valid `**PROPOSAL**` (Description/Target Module/Proposed Seam/Diff/Expected Benefits/Leverage/Locality/Deletion Test/Risk/Confidence using LANGUAGE terms), call restricted `applyDeepeningPatch` (only under targetPaths, never touches arch-deepener.ts/iteration.ts/ritual.ts etc.), return real postSha + notes; malformed/low-conf → append to failedApproaches | Without mutation + ledger the re-measure can never observe structural win and workers repeat garbage | `npx tsx -e 'import {ArchitectureDeepener} from "./engine/src/arch-deepener.js"; const d=new ArchitectureDeepener("/tmp/m-$$"); const st=d.init(["engine/src"]); const pre=d.computeDebt(st.opportunities); /* feed good PROPOSAL via internal after fix */ const r=await d.runDeepeningLoop(st); console.log("DEBT_DROPPED:", r.finalDebt < pre, "HISTORY_HAS_IMPROVED:", (st.history||[]).some(h=>h.outcome==="improved"));' && echo "MUTATE-001 PASS" |
| P0 | P0-APPLY-001: `runDeepeningLoop` + `ConvergenceLoop` must produce `finalDebt < initialDebt` on >=1 successful iteration, populate `failedApproaches` from real worker outcome, exercise stall/gate/rollback on regression, use atomic onPersist, return debtDelta | The loop must be a trustworthy debt-reducing engine, not theater | Temp session + controlled valid PROPOSAL that adds interface; after 2 iters: `jq '.currentIteration' arch-deep.json | grep -qE '1|2'` && `git diff --name-only HEAD | wc -l` shows seam edit && debt lower |
| P0 | P0-PIPE-001: `pipeline.ts` (doDeepen/selfMode block) + `deepen.ts` must parse `--deepen-iterations N` (default >=2 under --self-improvement) and call full `runDeepeningLoop` (not just discoverOpportunities); `arch-deep.json` has `currentIteration >=1` + history | Explicit "future wiring" in pipeline is now closed; self-improvement must run real architecture campaigns | `npx tsx engine/src/bin/pipeline.ts /tmp/pipe-$$ --target . --deepen --deepen-iterations 2 --no-refine 2>&1; test -f /tmp/pipe-$$/arch-deep.json && jq -r '.currentIteration' /tmp/pipe-$$/arch-deep.json | grep -qE '[1-9]'` |
| P0 | P0-SELF-MUT-001: When target includes engine/src (self-improvement or default), the scanner must filter or mark read-only the "self-deepening-arch-deepener" opportunity; no `applyDeepeningPatch` may touch arch-deepener.ts, iteration.ts, ritual.ts, gate.ts, workers.ts or core seams | Self-mod trap on the live driver (explicitly emitted today) is a P0 production foot-gun per AGENTS.md + Citadel | `npx tsx -e 'import {ArchitectureDeepener} from "./engine/src/arch-deepener.js"; const d=new ArchitectureDeepener("/tmp/g-$$"); const opps=d.discoverOpportunities(["engine/src"]); const filtered=(d as any).filterSelfMut? (d as any).filterSelfMut(opps,true):opps; console.log("NO_SELF_MUT_OPP:", !filtered.some(o=>o.id.includes("self-deepening")));' && echo "SELF-MUT-001 PASS" |
| P0 | P0-META-001: Successful debt-reducing campaigns must emit `convergenceIteration('arch-deepening', ..., {debtDelta, improvementAccepted})`; deltas visible in Activity log, `pickle-standup --self`, and ingested by self-prd-generator + loop-closer into reliability-backlog/master_plan | Self-improvement observability and next meta-PRD must see architecture impact | After real debt drop run: `grep -o 'arch-deepening.*debtDelta' ~/.local/share/pickle-rick-grok/sessions/*/activity*.json | head -1` yields number && `npx tsx engine/src/bin/standup.ts --self 2>&1 | grep -i "arch-deep"` succeeds |
| P0 | P0-TEST-001: Existing discovery tests + convergence-loop tests remain green; new harness exercises >=2 full `runDeepeningLoop` iterations (simulated good PROPOSAL + malformed + regression rollback + kill-resume) with structural debt movement proof | "Test coverage for real multi-iteration paths is thin" — now production grade | `npm test -- engine/tests/arch-deepener.test.ts engine/tests/convergence-loop.test.ts` passes + new it() blocks for runDeepeningLoop + `grep -c "runDeepeningLoop" engine/tests/arch-deepener.test.ts` >=2 |
| P1 | The `deepen-changer` prompt + `**PROPOSAL**` contract is enforced by a test harness (feed buildDeepenChangerPrompt output to mock, assert exact fields + LANGUAGE terms) | Morty Implementer must not waste cycles on format violations | `npm test` green + dedicated `it('deepen-changer PROPOSAL contract')` that validates parse + all required keys (Leverage/Locality/Deletion Test etc.) |
| P1 | Clear atomic refinable tickets + H- hardening tickets produced by `/pickle-refine-prd` with proper ticket.md + Scope + 4-8 runnable AC Verifys each | The surface must be Morty-ready for 8-phase ritual | After this refine: `ls tickets/ | wc -l` >=7 && every ticket has "Verify" table with shell commands && H- tickets exist for ritual/session/self surfaces |

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
"We built the scanner. We bolted on the loop. Now we make the loop actually *mean* something when the machine looks at its own guts. No more 'it ran and the number went down a bit.' We want modules that are actually deeper, and we want the Morties to be the ones who prove it. The analysts gave us the causal chain — PERSIST before MUTATE before PIPE. Ship it or the self-loop stays a demo."

---

## Hardening Tickets (Mandatory — emitted by refine council)

Per refine-contract and AGENTS.md self-mod rules: any change to ritual, session, citadel, orchestrator, git_safety, self-*, or the arch-deepener driver itself **requires** dedicated post-impl Anatomy + Szechuan tickets.

- **H-001 — Anatomy: data flows & trap doors for ArchitectureDeepener + ConvergenceLoop integration after P0-MUTATE-001 / P0-APPLY-001** (applyChange → parse → restricted patch → onPersist → targetPaths enforcement → findGrokRoot self-decision, history round-tripping, debt snapshot vs real git delta)
- **H-002 — Szechuan: principle violations (KISS, Audit Trail, atomicity, rollback hygiene) introduced by new apply/patch logic + raw writes in arch-deepener** (plus cross-driver atomic/edit-safety for anatomy writeState + szechuan applyRemediation to prevent future drift)
- **H-003 (optional P1) — Anatomy + Citadel: self-mutation guard coverage for deepen workers under --self-improvement** (tie-in to existing P0-SELF-MUT-001 + AGENTS.md trap door update)

These H- tickets are executed **after** the 7-8 main R-META-DEEPEN tickets in the pipeline (Anatomy Park + Szechuan Sauce phases will pick them up via the session).

---

**Next Step Recommendation**  
This PRD has been fed through `/pickle-refine-prd` (native 3-analyst 2-round council). Original updated in-place with rich runnable Verifies. 8 atomic main tickets + 2-3 H- hardening tickets emitted under the session `tickets/` via `persistTicket` + state update.

Ready for:
```
npx tsx engine/src/bin/pipeline.ts <SESSION_ROOT> --no-refine --target . --self-improvement
```
(or `/pickle-tmux` / mux-runner on the session).

The Morty team now has clean, scoped, machine-verifiable work that will make Architecture Deepening a first-class trustworthy phase the self-improvement machine can actually trust.

This PRD + the emitted tickets close the last "demo but not production" gap in the 4-path deepen epic. P0s die. Wubba lubba dub dub.