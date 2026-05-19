---
name: pickle-rick
description: DEPRECATED — Interactive manager loop removed. Use /pickle-tmux or /pickle-pipeline for the only supported detached execution path.
version: 3.0.0-deprecated
triggers:
  - pickle-rick
  - pickle
references:
  - path: ../../references/persona.md
    conditional: true
---
# /pickle-rick — REMOVED (Interactive Manager Loop Deleted)

**This skill is deprecated and the interactive manager mode has been removed by design.**

## Why it was deleted
The "you stay in the chat forever as Manager Rick, calling `spawn_subagent` + manual `ManagerRitual` for every single phase of every ticket" model does not scale. It leads to context drift, fatigue, and is not reliable for anything beyond a couple of tickets.

Per the current architecture:
- **Refinement** (`/pickle-refine-prd`) is the *only* place that uses rich native `spawn_subagent` large agent teams (the Requirements + Codebase + Risk analysts arguing).
- **All execution** (the 8-phase work on tickets, hardening, citadel, anatomy, szechuan, self-improvement campaigns) must go through the **detached, crash-safe, resumable** TypeScript orchestrator.

## What you should use instead

After you have a PRD (and optionally ran refine):

```bash
# Primary recommended path for any real work
/pickle-tmux

# Or the full one-shot pipeline (refine optional + build + citadel + anatomy + szechuan)
/pickle-pipeline --target . --self-improvement   # for meta dogfood

# Direct (most powerful for long runs)
npx tsx engine/src/runners/mux-runner.ts <sessionDir>
# or
npx tsx engine/src/bin/pipeline.ts <sessionDir> --no-refine --target /path/to/grok-root
```

These launch the real `orchestrator` + `WorkerSpawner` (headless `grok -p` children) + `ManagerRitual` + circuit breaker + heartbeats + graceful resume. This is the only supported way to run the 8-phase lifecycle at scale.

## The engine is still there
All the real code (`engine/src/ritual.ts`, `orchestrator.ts`, `session.ts`, `gate.ts`, `workers.ts`, etc.) remains and is used by the detached path. Only the LLM-driven interactive manager *prompt* was removed.

Wubba lubba dub dub. The pickle only runs when it's detached and the machine is in charge. No more babysitting the loop like a Jerry.
