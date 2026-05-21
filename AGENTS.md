# Pickle Rick Grok — AGENTS.md

Local rules for agents working in this source tree.

## Project Objectives

Build a production-grade autonomous engineering system that can:

- Run full campaigns (PRD → tickets → 8-phase ritual → convergence) via headless `grok -p` + orchestrator at 50+ ticket scale.
- Drive sustained improvement via Anatomy Park (deep review), Szechuan Sauce (deslopping), and Citadel (conformance + traps).
- Do self-directed iteration: discover gaps, emit self-PRDs, execute, measure deltas, repeat — approaching Karpathy-style autoresearch for engineering.
- Dogfood aggressively while enforcing strict source vs deployed separation.

## Core Safety Rules

- **Source-only mutation**: All autonomous work (orchestrator, workers, drivers, generator, closer) **must** target only the discovered source root. Never write to `~/.grok/pickle-rick-grok/`.
- **Self-loop is canonical**: Generator → R-META tickets → execution → closer → reliability-backlog → next campaign. P0 count must trend to zero.
- **No overclaims**: Only core engine + convergence drivers are production. Higher-tier items (council-of-ricks, portal-gun, plumbus, meeseeks) are honest stubs or removed.
- **Docs win**: Update this file, `SKILL.md`s, `master_plan.md`, and reports on any process or trap change.

## Contributor Rules

- **Production work**: Use Morty phase workers + full ritual. Always delegate return to `ManagerRitual`.
- **Chat / dev work**: Use engineering personas + native `spawn_subagent` with `fork_context: false`.
- **Mutating work**: Use worktree isolation.
- **Self-changes**: Must pass Citadel. Update this AGENTS.md + reports.
- **Global updates**: Run `bash install.sh` after source changes.

## Trap Doors

- Source/Deployed separation (highest priority P0).
- Root discovery must always resolve to this tree (fixed).
- Arch-deepener self-mutation guards (FORBIDDEN_SELF_MUT).
- Specific known issues: szechuan bare catches, aux bin type debt, preflight edge cases on meta PRDs.
- 2026-05-21 dispatch UX: "run a pipeline" (natural phrase) now has automatic, guard-protected, tool-direct execution via strengthened persona (EAGER DISPATCH GUARD) + new `bin/grok-pipeline` thin wrapper (auto root discovery + deployed-tree refusal). See references/agents-append.md + dispatch-contract.md.

## Dispatch UX (2026-05-21 addition)
Natural language "run a pipeline on <prd>" (and trigger variants) now triggers automatic construction + `run_terminal_command` (background:true, --target = discovered source root via the one-liner, using `bin/grok-pipeline` helper or full run-pipeline.ts) from the top persona in agents-append.md. EAGER DISPATCH GUARD + PROPOSED COMMAND blocks + system approval dialog enforce safety. The `bin/grok-pipeline` wrapper (propagated by install.sh) gives the LLM a dramatically shorter argv while baking the source-root --target. All changes to dispatch paths require full pipeline + Citadel.

## Key References

- `master_plan.md` — current prioritized backlog and next self-campaign targets.
- `engine/references/50-Ticket_Overnight_Self_Run_Readiness_Report.md` — self-run viability details.
- `references/agents-append.md` — content for global `~/.grok/AGENTS.md`.
- `persona.md`, `SKILL_MANIFEST.md`, `COMPLETION_STATUS.md`.
