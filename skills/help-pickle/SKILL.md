---
name: help-pickle
description: List all available Pickle Rick commands/skills and their purpose. Use when the user asks "what can pickle do", "help with pickle", or "list pickle commands".
version: 2.0.0-grok
triggers:
  - help-pickle
  - pickle help
  - what can pickle do
---
# Help Pickle — Command Reference (Grok Native)

## Core Workflow
- `/pickle-prd` — Draft a machine-verifiable PRD
- `/pickle-refine-prd` — 3-analyst parallel refinement + atomic ticket decomposition + hardening tickets
- `/pickle-rick` — Main autonomous 8-phase ticket loop (interactive, uses native subagents)
- `/pickle-tmux` — Detached / background long-running mode

## Full Pipeline
- `/pickle-pipeline` — The whole thing: (refine) → build → citadel → anatomy-park → szechuan-sauce

## Specialized Convergence Tools
- `/microverse` — Metric or LLM-judge optimization loop
- `/anatomy-park` — Deep subsystem data-flow review + 3-phase fix + trap doors
- `/szechuan-sauce` — Principle-driven code deslopping (KISS, DRY, security, etc.)
- `/citadel` — PRD conformance + contract drift audit

## Other Powerful Tools
- `/council-of-ricks` — Graphite PR stack reviewer with parallel fan-out
- `/meeseeks` — Relentless review-and-fix loop until clean
- `/portal-gun` — Gene transfusion (pattern transplant from another codebase)
- `/plumbus` — DAG shaping + generative audit for attractor pipelines
- `/pickle-metrics`, `/pickle-status`, `/pickle-standup`

## Emergency / Meta
- `/eat-pickle` — Emergency stop
- `/pickle-retry <ticket>` — Restart one failed ticket
- `/help-pickle` — This list

All commands are now native Grok skills backed by the TypeScript engine in `engine/`.

The old Claude hook hell is gone. This is cleaner, more powerful, and uses real subagents with fork_context and worktree isolation.

Ask me about any of them for details.
