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

**When tickets do not yet exist** (most common case for a new epic):

1. **Create the session first** (this owns state + all tickets for the entire run)
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts --task "your task description here" --runtime grok --backend grok
   ```
   Capture the `SESSION_ROOT=...` it prints.

2. **Run refinement into that session**
   - Direct the user (or invoke) `/pickle-refine-prd`.
   - The refinement manager will now **update the original PRD in place** (rich ACs + Verifies) + write every `ticket.md` **under the session directory** (`<SESSION_ROOT>/tickets/...`) using `persistTicket`. A separate `prd_refined.md` is not created unless the user explicitly requests the legacy sidecar.
   - This is the only layout the orchestrator and ritual understand.

3. **Launch the real detached orchestrator** using the installed path and `background: true`:
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/runners/mux-runner.ts <SESSION_ROOT>
   ```

**When tickets already exist**:
- You can go straight to step 3 (launch `mux-runner` on the existing session).

   Run this with the `background: true` option on your terminal tool so the process survives the current conversation.

4. Tell the user the session directory and how to monitor:

```bash
tail -f <SESSION_ROOT>/logs/*.log
# or watch campaign-status.json for live progress
cat <SESSION_ROOT>/campaign-status.json
```

The `mux-runner` sets `PICKLE_FORCE_HEADLESS=1`, claims the lock, drives the full 8-phase lifecycle per ticket via the real engine, persists state for resumability, and emits high-signal Activity events for metrics/standup.

## What Success Looks Like

The model stays in the chat only long enough to:
- Create the session
- (If needed) run `/pickle-refine-prd` into that session
- Fire the real `mux-runner <SESSION_ROOT>` with `background: true`

The actual engineering work (all 8 phases per ticket, hardening, gates, etc.) happens in headless `grok -p` workers. You can close the terminal. The run survives and is fully resumable. This is the only path that scales to 50+ ticket self-improvement campaigns.

Wubba lubba dub dub. The pickle only runs when the machine is in charge.
