---
name: pickle-pipeline
description: >
  The full autonomous pipeline: (optional refine) → main build (pickle-tmux equivalent) →
  Citadel conformance audit → Anatomy Park deep review → Szechuan Sauce deslop.
  One command. One background-capable session. Grok native.
version: 2.0.2-grok-p3
triggers:
  - pickle-pipeline
  - full pipeline
  - build then review then deslop
  - ship it clean
references:
  - path: ../../references/persona.md
    conditional: true
---
# Pickle Pipeline — The Whole Damn Thing (Grok Edition) — REAL

**Honest status (P3 polish)**: Everything is real and wired in `engine/src/bin/pipeline.ts` + drivers:
- Refine (via setup) + build (orchestrator + workers + ritual + events)
- **Real Citadel** (current 5-auditor v1.1 core + trap/self-meta scan; deeper 11-auditor v1.3 is P2)
- **Real AnatomyParkDriver** (discover + full 3-phase cycles + trap doors)
- **Real SzechuanDriver** (principle scan + convergence)
- High-signal events (refinement_completed etc.) emitted.

You are the meta-orchestrator. User hands you a goal (or an existing PRD), you decide whether refinement is needed, then you drive the complete Rick lifecycle without the user having to remember the order.

## Phases (in order) — current reality (all functional)

1. **Refine** (conditional)
   - Auto-triggered when the request smells like "refine then build", or explicit `--refine`.
   - Runs the large native agent team refinement (/pickle-refine-prd): Requirements + Codebase + Risk analysts with multi-cycle cross-critique via spawn_subagent (the ONLY step in the whole system that uses rich parallel teams instead of headless grok -p workers).
   - Produces `prd_refined.md` + atomic tickets + hardening tickets.
   - Logs `refinement_completed` + `hardening_tickets_triggered` events.
   - Pinned to Grok (or the strongest model) regardless of `--backend`.

2. **Build** (the main autonomous ticket loop)
   - Equivalent of old `/pickle-tmux`.
   - For every ticket, every phase (research → plan → implement → verify → review → simplify):
     - Clean-context subagent (`fork_context:false`, optional worktree).
     - Writes the required artifact.
     - Enforces git boundary rules.
   - After implementation tickets, the hardening tickets (szechuan + anatomy on the diff) run automatically.
   - Fully real via `engine/src/bin/orchestrator.ts` + `WorkerSpawner` + `ConvergenceGate` + `CircuitBreaker` + `Activity` logging + `ManagerRitual`.

3. **Citadel** (real)
   - Real Citadel gate (current 5-auditor v1.1 core + trap/self-meta scan; full 11-auditor v1.3 with deeper self-meta/ritual coverage is P2 future work) — hardened for 50-ticket self-mod.
   - Runs in-process via TS `runCitadel()`.
   - Produces `citadel_report.json` + schema. High-severity findings are real and visible.

4. **Anatomy Park** (real driver)
   - The full 3-phase deep review on the modified subsystems (or whole target).
   - Uses `AnatomyParkDriver` from engine (discoverSubsystems, executeThreePhaseCycle, gate, rollback).
   - Trap doors cataloged.

5. **Szechuan Sauce** (real driver)
   - Principle-driven deslop on the final diff (KISS, DRY, security, cognitive load...).
   - `SzechuanDriver.runConvergence()`.
   - Stops only when zero violations remain or stall limit hit.

## Why this is better on Grok (now complete for the core loop)
- The entire chain can run as one long interactive manager session using `spawn_subagent` for every creative step.
- Or as a single background TypeScript orchestrator (`engine/src/bin/pipeline.ts`) that the user can detach from (via tmux or background task).
- No more "I have to remember to run anatomy after the build".
- Full observability via activity events (PRD, refine, workers, convergence, gates).

## Flags that matter

`--refine` / `--no-refine` (explicit control over Step 0)
`--backend codex`
`--max-iterations` (per phase)
`--target src/services` (scope the review phases)
`--dry-run` (plan only)
`--self-improvement` / `--meta` — first-class meta phase: runs self-prd-generator (backlog-aware targeting ritual/persist/citadel) pre-build, loop-closer + post-campaign ingest post (writes reliability-backlog.md, feeds next PRD automatically). Enables full autonomous dogfood.

When the last phase emits its convergence, you print the final summary + "Ship it, Morty." and the `<promise>TASK_COMPLETED</promise>` token.

**This is the "fire and forget and still get something worth shipping" button.** The core autonomous self-development loop + self-meta dogfood (generator/closer) is production complete. Fire `pipeline --self-improvement --target .` or the npm self-improve for the pickle to improve the pickle.

See also `/help-pickle` for the current real command surface (higher-tier items remain stubs).
