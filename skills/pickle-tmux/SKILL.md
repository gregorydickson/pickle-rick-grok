---
name: pickle-tmux
description: Launch a long-running Pickle Rick epic in detached/background mode using the Grok-native orchestrator (the spiritual successor to the old tmux + mux-runner pattern).
version: 2.0.0-grok
triggers:
  - pickle-tmux
  - detached build
  - overnight epic
---
# Pickle Tmux — Detached Long-Running Mode (Grok)

**This is the PRIMARY and ONLY supported execution path for real work.**

When the user asks to run a long-running Pickle Rick epic, launch a background build, do an overnight run, or says `/pickle-tmux`, your job is **strict dispatch only**.

## Hard Rules (never violate)

- **You do NOT role-play the orchestrator.**
- **You do NOT call `spawn_subagent` for research, plan, implement, review, verify, or simplify phases.**
- The *only* place in the entire system where rich native `spawn_subagent` large teams are allowed is inside `/pickle-refine-prd` (the analyst council for PRD decomposition).
- Everything after tickets exist must run through the detached, crash-safe, resumable TypeScript orchestrator using headless `grok -p --yolo` workers + `WorkerSpawner` + `ManagerRitual` + `ConvergenceGate` + `CircuitBreaker`.

This is the Core Execution Principle. Violating it defeats the entire point of the Grok port.

## Correct Action When Invoked

1. If the user has not yet produced tickets + `prd_refined.md`, direct them to run `/pickle-refine-prd` first (or `/pickle-prd` then refine). Do not start executing work yourself.

2. Create a session if one does not exist:

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts --task "your task description here" --runtime grok --backend grok
```

   Note the `SESSION_ROOT=...` it prints.

3. **Launch the real detached orchestrator** using the installed path and `background: true`:

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/runners/mux-runner.ts <SESSION_ROOT>
```

   Run this with the `background: true` option on your terminal tool so the process survives the current conversation.

4. Tell the user the session directory and how to monitor:

```bash
tail -f <SESSION_ROOT>/logs/*.log
# or watch campaign-status.json for live progress
cat <SESSION_ROOT>/campaign-status.json
```

The `mux-runner` sets `PICKLE_FORCE_HEADLESS=1`, claims the lock, drives the full 8-phase lifecycle per ticket via the real engine, persists state for resumability, and emits high-signal Activity events for metrics/standup.

## What Success Looks Like

The model stays in the chat only long enough to fire the real detached process. The actual engineering work (all phases, all tickets, hardening, gates) happens in child `grok -p` processes with clean context. You can close the terminal. The run survives. This is the only path that scales to 50+ ticket self-improvement campaigns.

Wubba lubba dub dub. The pickle only runs when the machine is in charge.
