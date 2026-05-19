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
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/persona.md
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

**When refinement is required** (raw PRD, no tickets yet, or `--refine` requested):

1. **Create the session first** (this becomes the single source of truth for state + tickets)
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts \
     --task "description of the campaign" \
     --runtime grok --backend grok
   ```
   Capture the `SESSION_ROOT=...` it prints.

2. **Run refinement into that session** (the only allowed rich `spawn_subagent` step)
   - Invoke `/pickle-refine-prd`.
   - The refinement manager will write `prd_refined.md` + all `ticket.md` files **under the session directory** (using `SessionManager.ensureTicketDir`).
   - This guarantees the tickets are in the exact layout the orchestrator, ritual, and mux-runner expect.
   - It emits the proper `refinement_completed` Activity events.

3. **Launch the Real Detached Build**
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/runners/mux-runner.ts <SESSION_ROOT>
   ```

**When tickets already exist** (or after the step above):
- Skip straight to launching `mux-runner.ts <SESSION_ROOT>` (or the post-build `pipeline.ts` command).
   Run this with your terminal tool's `background: true` flag. This is the production entry point (`PICKLE_FORCE_HEADLESS=1`, lock handling, graceful shutdown, heartbeats, `campaign-status.json`, full ritual per phase).

4. **Post-Build Phases (Citadel + Anatomy + Szechuan)**
   After the build converges, run the post-processing pipeline:
   ```bash
   npx tsx ~/.grok/pickle-rick-grok//Users/gregorydickson/.grok/pickle-rick-grok/engine/src/bin/pipeline.ts <SESSION_ROOT> \
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
- Create the session (via `setup.ts`)
- Call `/pickle-refine-prd` into that session when needed (rich team OK here)
- Fire `mux-runner.ts <SESSION_ROOT>` (and later the post-build `pipeline.ts`) with `background: true`

Then the real engine takes over. The user can walk away. The run is resumable, auditable via Citadel, deslopped via Szechuan + Anatomy, and the self-loop feeds the next PRD automatically.

**This is the "fire and forget and still get something worth shipping" button.**

See `/help-pickle` for the current command surface. Higher-tier stubs (`meeseeks`, `council`, etc.) correctly 404 or redirect.
