---
name: pickle-refine-prd
description: Run the 3-analyst parallel refinement + ticket decomposition. Produces prd_refined.md and atomic tickets. Critical for /pickle-pipeline and serious /pickle-rick runs.
version: 2.0.0-grok
triggers:
  - pickle-refine-prd
  - refine prd
  - decompose tickets
---
# Pickle Refine PRD — Parallel Analyst Decomposition (Grok)

This skill runs three specialized subagents in parallel:

1. **Requirements Analyst** — gaps in acceptance criteria, missing verification, scope creep
2. **Codebase Integration Analyst** — how this touches existing modules, contracts, patterns
3. **Risk & Scope Analyst** — blast radius, hidden complexity, hardening needs

They run for N cycles, cross-reference each other, then the manager synthesizes `prd_refined.md` + `tickets/`.

Hardening tickets (szechuan principles review + anatomy data flow on the planned changes) are automatically appended for non-trivial work.

## Grok Advantage

We can fan out three `spawn_subagent` calls with different personas (`requirements-analyst`, `codebase-analyst`, `risk-analyst`) in one step, then synthesize. Much cleaner than the old Claude Agent tool dance.

After refinement, hand off to `/pickle-rick --resume` or `/pickle-pipeline`.
