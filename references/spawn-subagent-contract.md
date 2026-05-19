This contract is referenced by all major skills. The code, not the markdown, is law.

## Ritual Invocation Parity Note (Post-Interactive-Manager Removal)

The post-return ritual (`ManagerRitual.performPostReturn` in engine/src/ritual.ts) **is the single source of truth** and is invoked identically:
- From refine skill paths that use rich `spawn_subagent` (per AGENTS.md: only `/pickle-refine-prd` analyst teams)
- From the detached orchestrator (orchestrator.ts: `new ManagerRitual(sessionDir).performPostReturn(...)` after every WorkerSpawner return)

No duplicated ritual prose or logic remains in SKILL.md files. All long-running reliability improvements (workingDir resolution, locked appendPhase, precise git restore, circuit + gate) live only in the TS implementation.

(The old "trade-off table and hybrid recommendation" in the deprecated /pickle-rick SKILL.md has been removed along with the interactive LLM-as-manager path. See AGENTS.md Core Execution Principle.)