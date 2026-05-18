# Pickle Rick Grok — Architecture & Grok Integration

This document explains how the autonomous engineering system is implemented natively for **Grok Build**, and how it differs from (and improves upon) the Claude Code version.

## Core Philosophy (Grok Native)

The original Pickle Rick was built around Claude Code’s strengths and limitations:
- Stop hooks for the Ralph Wiggum loop
- `claude -p` subprocesses for workers
- Heavy `settings.json` mutation and command registration

Grok Build gives us much better primitives:
- `spawn_subagent` with `fork_context: false` + `isolation: "worktree"`
- Background tasks + monitoring
- Headless mode (`grok -p`)
- Skills as first-class, discoverable extensions
- Named personas (`~/.grok/personas/`)

The Grok port is designed to **lean into these strengths** instead of fighting the old model.

## High-Level Architecture

```
User types /pickle-rick "build X"
          │
          ▼
Grok Skill (thin orchestrator + Rick voice)
          │
          ├── Interactive Path (recommended)
          │     └── Main agent stays alive as "Manager Rick"
          │           └── Repeatedly calls spawn_subagent(
          │                 persona: "morty-phase-xxx",
          │                 fork_context: false,
          │                 isolation: "worktree",
          │                 capability_mode: "..."
          │               )
          │
          └── Detached / Background Path
                └── npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/orchestrator.ts
                      └── Uses headless `grok -p "..." --yolo` for workers
```

### Stable Home

After `bash install.sh`, everything lives at:

- **Engine + References**: `~/.grok/pickle-rick-grok/`
- **Skills**: `~/.grok/skills/pickle-rick-grok/`
- **Personas**: `~/.grok/personas/`
- **Sessions / State**: `~/.local/share/pickle-rick-grok/sessions/` (XDG)

This mirrors the Claude version’s split between `~/.claude/pickle-rick/` and `~/.local/share/pickle-rick/`.

## Interactive Mode (Primary Experience)

When the user runs `/pickle-rick` or `/pickle-pipeline`:

1. The skill becomes the long-lived **Manager**.
2. It uses the engine (`SessionManager`, `ConvergenceLoop`, etc.) for state.
3. For every phase it spawns a clean Morty via `spawn_subagent`.
4. After the subagent returns, the manager:
   - Validates the required artifact
   - Runs gate + circuit breaker
   - Updates state
   - Decides next step

**Advantages over Claude version**:
- True context isolation (`fork_context: false`)
- Real git isolation via worktrees
- No hook ceremony
- Manager conversation stays relatively clean

## Detached / Background Mode

For long-running or overnight work:

- User (or another skill) launches the orchestrator as a background task.
- The orchestrator drives the same logic using **headless** `grok -p` calls with the full prompt (including persona + send-to-morty contract + phase instructions).
- Progress is observable via Grok’s `monitor` tool, `get_command_or_subagent_output`, or log tailing.

This is the spiritual successor to the old `mux-runner + tmux` pattern, but much lighter.

## Personas

We use two layers:

1. **Named personas** (`~/.grok/personas/morty-phase-*.md`)
   - Used directly in `spawn_subagent({ persona: "..." })`
   - Clean, explicit, and reusable across skills

2. **Skill-level conditional persona**
   - The main Rick voice is injected into manager skills via frontmatter references.
   - Can be toggled per-skill or globally.

## State & Sessions

- Same layout as the Claude version for familiarity:
  - `state.json`
  - `tickets/`
  - `microverse.json`, `anatomy-park.json`, etc.
  - `gate/`, `logs/`

- `SessionManager` already uses proper XDG paths (`~/.local/share/pickle-rick-grok/sessions`).

## Comparison Table

| Aspect                    | Claude Version                  | Grok Version (Current)                  | Winner |
|---------------------------|----------------------------------|------------------------------------------|--------|
| Worker isolation          | `claude -p` + Stop hook         | `spawn_subagent` + `fork_context:false` + worktree | Grok |
| Long-running              | tmux + mux-runner               | Background tasks + headless `grok -p`   | Grok (lighter) |
| Persona delivery          | Append to CLAUDE.md             | Named personas + skill references       | Tie |
| Installation complexity   | Heavy (hooks, settings.json)    | Simple (`install.sh` + personas)        | Grok |
| Subagent fan-out          | Agent tool (limited)            | Native `spawn_subagent` (parallel)      | Grok |
| Context control           | Hard (Stop hook hacks)          | First-class (`fork_context`)            | Grok |

## Future / Nice-to-Have Grok Integrations

- MCP server exposing session/ticket status
- Custom dashboard component inside a skill
- Better structured output from subagents (JSON schemas)
- Native support for `PICKLE_GROK_ROOT` environment variable in the engine

---

This document is the Grok-specific counterpart to the original `internals.md` and `ARCHITECTURE.md` files from the Claude version.

The goal is not to be a 1:1 clone, but to be the best possible autonomous engineering system *for Grok users*.