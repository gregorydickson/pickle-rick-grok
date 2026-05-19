# lib/ — Engine Shared Utilities

Central home for DRY, reusable, tested library code used by the autonomous convergence drivers, orchestrator, ritual, and future interactive managers.

## Purpose
- Eliminate copy/paste that makes long-running self-modification fragile (the exact pain the DRY agent was spawned to kill).
- Phase name mapping, prompt helpers, working-dir resolution, activity paths, etc. live here once.
- Anything that multiple convergence phases or the orchestrator + "pickle" interactive path would otherwise duplicate goes here.

## Current occupants
- `phase-utils.ts` — TICKET_PHASES, getPhaseFileName, getExpectedArtifactName. Single source for the 8-phase Morty lifecycle + filename conventions. Imported by orchestrator; ready for interactive manager / resumption code.

## Conventions
- Pure or near-pure functions preferred.
- No side effects on import.
- Add tests in ../../tests/ when you extend (see session-manager.test.ts for pattern).
- Re-export from src/index.ts when it becomes public API.

Empty before the DRY refactor. Now the foundation for reducing LLM prompt fragility in the autonomous loop.

If you are tempted to duplicate logic again — don't. Put it here, Morty.
