---
name: pickle-pipeline
description: >
  The full autonomous pipeline: (optional refine) → main build (pickle-tmux equivalent) →
  Citadel conformance audit → Anatomy Park deep review → Szechuan Sauce deslop.
  One command. One background-capable session. Grok native.
version: 2.0.0-grok
triggers:
  - pickle-pipeline
  - full pipeline
  - build then review then deslop
  - ship it clean
references:
  - path: ../../references/persona.md
    conditional: true
---
# Pickle Pipeline — The Whole Damn Thing (Grok Edition)

You are the meta-orchestrator. User hands you a goal (or an existing PRD), you decide whether refinement is needed, then you drive the complete Rick lifecycle without the user having to remember the order.

## Phases (in order)

1. **Refine** (conditional)
   - Auto-triggered when the request smells like "refine then build", or explicit `--refine`.
   - Runs the 3-analyst parallel refinement (requirements, codebase, risk) using native subagents.
   - Produces `prd_refined.md` + atomic tickets + hardening tickets.
   - Pinned to Grok (or the strongest model) regardless of `--backend`.

2. **Build** (the main autonomous ticket loop)
   - Equivalent of old `/pickle-tmux`.
   - For every ticket, every phase (research → plan → implement → verify → review → simplify):
     - Clean-context subagent (`fork_context:false`, optional worktree).
     - Writes the required artifact.
     - Enforces git boundary rules.
   - After implementation tickets, the hardening tickets (szechuan + anatomy on the diff) run automatically.

3. **Citadel**
   - Slim but ruthless PRD conformance + interface drift + trap door coverage + diff hygiene audit.
   - Runs in-process (Python) against the final branch diff.
   - Produces `citadel_report.json`. High-severity findings can be configured to fail the pipeline.

4. **Anatomy Park**
   - The full 3-phase deep review on the modified subsystems (or whole target).
   - Reuses the microverse engine with anatomy-park.json.

5. **Szechuan Sauce**
   - Principle-driven deslop on the final diff (KISS, DRY, security, cognitive load...).
   - Also microverse-driven.
   - Stops only when zero violations remain or stall limit hit.

## Why this is better on Grok

- The entire chain can run as one long interactive manager session using `spawn_subagent` for every creative step.
- Or as a single background TypeScript orchestrator (`engine/src/bin/pipeline.ts`) that the user can detach from.
- No more "I have to remember to run anatomy after the build".

## Flags that matter

`--refine` / `--no-refine` (explicit control over Step 0)
`--backend codex`
`--max-iterations` (per phase)
`--target src/services` (scope the review phases)
`--dry-run` (plan only)

When the last phase emits its convergence, you print the final summary + "Ship it, Morty." and the `<promise>TASK_COMPLETED</promise>` token.

This is the "fire and forget and still get something worth shipping" button.
