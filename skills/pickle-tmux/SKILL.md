---
name: pickle-tmux
description: Launch a long-running Pickle Rick epic in detached/background mode using the Grok-native orchestrator (the spiritual successor to the old tmux + mux-runner pattern).
version: 3.0.0-grok-p0-dispatch
triggers:
  - pickle-tmux
  - detached build
  - overnight epic
---
# Pickle Tmux — Detached Long-Running Mode (Grok)

**This is the PRIMARY and ONLY supported execution path for real work.**

When the user asks to run a long-running Pickle Rick epic, launch a background build, do an overnight run, or says `/pickle-tmux`, your job is **strict dispatch only**.

**P0-6 note**: For any PRD-driven request ("run detached on this prd", "overnight this prd"), dispatch to the canonical `npx tsx engine/src/bin/run-pipeline.ts --prd <prd> --background [--self-improvement] [--no-refine]`. It does the linkage + preflight + spawns mux-runner for you. `pickle-tmux` is now mostly the "I already have a session" or "pure build, no PRD" case.

## Hard Rules (never violate)

- **You do NOT role-play the orchestrator.**
- **You do NOT call `spawn_subagent` for research, plan, implement, review, verify, or simplify phases.**
- The *only* place in the entire system where rich native `spawn_subagent` large teams are allowed is inside `/pickle-refine-prd` (the analyst council for PRD decomposition).
- Everything after tickets exist must run through the detached, crash-safe, resumable TypeScript orchestrator using headless `grok -p --yolo` workers + `WorkerSpawner` + `ManagerRitual` + `ConvergenceGate` + `CircuitBreaker`.

This is the Core Execution Principle. Violating it defeats the entire point of the Grok port.

## Correct Action When Invoked

**PRD-driven case (new canonical — "overnight this prd", "detached build on prds/foo.md")**:
- Dispatch straight to the single entrypoint that owns linkage + preflight:
  ```bash
  npx tsx engine/src/bin/run-pipeline.ts --prd <the-prd.md> --target . --background [--self-improvement] [--no-refine]
  ```
- The bin creates/stamps the session (or reuses linked), does preflight (will prompt for refine via /pickle-refine-prd if needed, using the stamp), then spawns the mux-runner detached.
- After refine complete, user re-invokes the *same* command with --no-refine.
- This is what the self-prd-generator now prints for 50-ticket runs.

**When you have an existing session / tickets already (pure "detached build" or resume)**:
1. (Optional) If the session came from a prior run-pipeline or manual, just use the bare form:
   `npx tsx engine/src/bin/run-pipeline.ts <SESSION_ROOT> --background --recover-failed`
   (preferred — it does the preflight/validate for you).

2. Legacy direct mux (power user / debug only):
   ```bash
   npx tsx engine/src/runners/mux-runner.ts <SESSION_ROOT> [--recover-failed]
   ```
   Run with your terminal's `background: true`.

Tell the user:

```bash
# Live view
cat <SESSION_ROOT>/campaign-status.json
tail -f ~/.local/share/pickle-rick-grok/activity/$(date +%Y-%m-%d).jsonl | grep <SESSION_ID>

# Recover failed before re-launch:
npx tsx engine/src/bin/recover.ts <SESSION_ROOT> --reset-failed
# or atomically:
npx tsx engine/src/runners/mux-runner.ts <SESSION_ROOT> --recover-failed
```

The mux-runner (whether called directly or via run-pipeline) sets `PICKLE_FORCE_HEADLESS=1`, claims the lock, drives the full 8-phase via ritual, is resumable, and emits Activity for metrics/standup.

**Old manual dance** (setup.ts + manual refine + direct mux-runner) is now only for deep debug or resurrecting ancient sessions. The run-pipeline surface owns the happy path and prevents zombie sessions via stamped provenance.

## What Success Looks Like

The model stays in the chat only long enough to emit one of:
- `npx tsx engine/src/bin/run-pipeline.ts --prd <foo> --background ...` (preferred for any PRD)
- or the bare `.../run-pipeline.ts <SESSION> --background` (or legacy direct mux-runner)

Then you are done. The engine owns preflight, the build, resumability, and (for --self) the full post-phases.

The actual work happens in headless `grok -p` workers under mux-runner/orchestrator/ritual. Close the terminal. 50+ ticket runs are now routine.

Wubba lubba dub dub. The pickle only runs when the machine is in charge.
