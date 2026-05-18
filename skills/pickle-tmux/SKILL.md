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

Use this when you want the build to continue even if you close the terminal or switch tasks.

## How it works on Grok

1. Run `setup.ts --tmux` to create the session.
2. Launch the orchestrator as a **background task**:

```bash
npx tsx engine/src/bin/orchestrator.ts "$SESSION_ROOT" &
```

Or use the engine's future `runners/` module that integrates with Grok's `background: true` + monitor.

3. The orchestrator drives the full ticket loop using headless `grok -p` workers (because no live agent is attached).

4. You can watch logs with:
   - `tail -f $SESSION_ROOT/logs/*`
   - Or the future TUI dashboard component.

This path is deliberately secondary. The preferred experience on Grok is the interactive `/pickle-rick` skill that uses live `spawn_subagent` calls.

The old 4-pane tmux monitor was a workaround for Claude's limitations. We can do better here.
