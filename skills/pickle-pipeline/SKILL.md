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

**Honest status (P3 polish)**: Everything is real and wired in the engine:
- Refine (large analyst team via `/pickle-refine-prd` only)
- Build via `mux-runner.ts` + full `orchestrator` / `WorkerSpawner` / `ritual` / `gate` / `circuit`
- **Real Citadel** (5-auditor v1.1 + trap/self-meta; 11-auditor deeper is tracked P2)
- **Real AnatomyParkDriver** + **Real SzechuanDriver** (full principle set)
- Self-improvement meta loop (generator + closer + reliability-backlog ingestion)

## Your Role — STRICT DISPATCH ONLY

You are **not** the meta-orchestrator that executes phases.

When the user invokes `/pickle-pipeline`, says "run the full pipeline", "build then review then deslop", "ship it clean", or similar, your **only** job is to get the real detached engine running and stay out of the execution path.

**Hard Rules (these are non-negotiable):**

- **Never** perform research/plan/implement/review/verify/simplify work yourself with `spawn_subagent`.
- The **only** step in the entire system allowed to use rich native `spawn_subagent` large teams is `/pickle-refine-prd` (the Requirements + Codebase + Risk analyst council). This is the deliberate architectural split.
- All ticket execution, hardening, Citadel, Anatomy Park, Szechuan, and self-improvement campaigns **must** run through the headless detached path (`grok -p` workers under `mux-runner` / `orchestrator` + ritual + gates). This is the Core Execution Principle documented in AGENTS.md.
- `/pickle-rick` (the old interactive manager loop) is deprecated and removed for exactly this reason.

Violating these rules turns reliable 50-ticket autonomous runs into fragile chat sessions.

## Correct Sequence When Invoked

1. **Optional Refine (the one allowed rich-team step)**
   - If the user has a raw goal or `prd.md` and no tickets yet, or explicitly wants `--refine`, invoke `/pickle-refine-prd`.
   - This is the *only* time you may use parallel `spawn_subagent` calls with the analyst personas.
   - After it finishes you will have `prd_refined.md` + `tickets/` + optional hardening tickets.
   - It emits the proper `refinement_completed` Activity events.

2. **Create Session (if needed)**
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts \
     --task "description of the campaign" \
     --runtime grok --backend grok
   ```
   Capture the `SESSION_ROOT=...` it prints. Pass `--max-iterations=N` if the user supplied one.

3. **Launch the Real Detached Build**
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/runners/mux-runner.ts <SESSION_ROOT>
   ```
   Run this with your terminal tool's `background: true` flag. This is the production entry point (`PICKLE_FORCE_HEADLESS=1`, lock handling, graceful shutdown, heartbeats, `campaign-status.json`, full ritual per phase).

4. **Post-Build Phases (Citadel + Anatomy + Szechuan)**
   After the build converges, run the post-processing pipeline:
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/pipeline.ts <SESSION_ROOT> \
     --no-refine --target <grok-root-or-cwd> [--self-improvement]
   ```
   The `--self-improvement` flag additionally runs the self-PRD generator (pre) + loop closer + post-campaign ingest (writes `reliability-backlog.md`, feeds the next meta iteration).

5. **Self-Improvement Mode**
   For dogfooding the machine on itself, the user (or you) can use:
   ```bash
   /pickle-pipeline --self-improvement --target .
   ```
   This wires the full generator → pipeline → closer → metrics/standup feedback loop.

## Monitoring & Observability (tell the user)

```bash
# Live view of the detached run
tail -f <SESSION_ROOT>/logs/*.log
cat <SESSION_ROOT>/campaign-status.json

# After it finishes
/pickle-metrics --days 7
/pickle-standup --days 7
cat reliability-backlog.md          # after a self-improvement run
```

## Flags You Should Surface

- `--refine` / `--no-refine`
- `--self-improvement` (full meta dogfood)
- `--target /path` (important for self-dogfood so it edits the correct tree)
- `--max-iterations N`
- `--backend codex` (if the user wants Codex workers for the headless phases)

## What Success Looks Like

The model only stays in the conversation long enough to:
- Call `/pickle-refine-prd` when appropriate (rich team OK here)
- Fire the `setup.ts` + `mux-runner.ts` (and later `pipeline.ts`) commands with `background: true`

Then the real engine takes over. The user can walk away. The run is resumable, auditable via Citadel, deslopped via Szechuan + Anatomy, and the self-loop feeds the next PRD automatically.

**This is the "fire and forget and still get something worth shipping" button.**

See `/help-pickle` for the current command surface. Higher-tier stubs (`meeseeks`, `council`, etc.) correctly 404 or redirect.
