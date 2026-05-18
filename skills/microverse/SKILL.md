---
name: microverse
description: >
  Start a metric-driven convergence loop (Microverse). Optimize a numeric command output
  or an LLM judge goal through many tiny, measured, automatically-reverted changes.
  Grok-native reimplementation. Supports --interactive (subagents) and detached background.
version: 2.0.0-grok
triggers:
  - microverse
  - converge
  - optimize metric
  - push coverage
  - reduce latency
references:
  - path: ../../references/persona.md
    description: Rick voice (optional)
    conditional: true
---
# Microverse — Grok Native Convergence Loop

You are running the **Microverse** — a universe in a box that powers the car battery of code quality.

## Usage

```bash
/microverse --metric "npm run coverage:score" --task "get test coverage to 85%" --direction higher
/microverse --goal "error messages are actionable and friendly" --task "improve UX of failures" --stall-limit 4
/microverse --resume <session>
```

## Step 1: Parse & Validate

Extract:
- Exactly one of `--metric "<shell cmd>"` or `--goal "<natural language>"`
- `--task "<what we are optimizing>"` (required)
- `--direction higher|lower` (default higher)
- `--stall-limit N` (default 5)
- `--max-iterations N`
- `--interactive` (use native spawn_subagent — recommended)
- `--backend codex|hermes` (for non-Grok workers)

If neither metric nor goal, or both, fail fast with a clear message.

## Step 2: Session Bootstrap

Use the engine (TypeScript, run via tsx):

```bash
npx tsx engine/src/bin/microverse.ts init "$SESSION_ROOT" '{"type":"command","description":"...","validation":"npm run coverage:score"}'
```

Session creation is still done via the SessionManager (or a thin wrapper script we will add).

## Step 3: The Loop (Grok Native Magic)

Because we are on Grok, we have two excellent paths:

**Path A — Interactive (default, best experience)**

You (the main agent) stay in the TUI. For each iteration you:

1. Spawn a `plan` + `implementer` subagent pair (or one combined) with:
   - `fork_context: false`
   - `isolation: "worktree"` (ideal)
   - persona tuned for "make one tiny targeted change that moves the metric"
   - The subagent is given the failed_approaches ledger so it never repeats a dead end.

2. After the subagent returns, you run the metric command yourself (or spawn a read-only judge subagent for `--goal`).

3. Classify: improved → accept, held → stall++, regressed → `git restore --source <pre> -- <paths>` (never hard reset).

4. Run the convergence gate (typecheck/lint/test) via the engine gate module. Regressions here also revert.

5. Update `microverse.json` via the Python driver.

You print a tiny dashboard each iteration:
```
Iter 47 | cov=78.3 (+1.2) | stall=1/5 | last: src/foo.py:42
```

**Path B — Detached (for overnight runs)**

```bash
python -m engine.runners.microverse "$SESSION_ROOT" --background
```

This uses the background task facility. Workers are spawned via `grok -p "You are Morty the microverse change agent..."` so the runner can survive even if the original TUI session ends.

## Step 4: Convergence

When `stall >= stall_limit` or `current_iteration >= max`, or the gate says the metric is good enough, you declare convergence, write the final report, and emit `<promise>TASK_COMPLETED</promise>`.

## Rick Notes

- Never let the model gaslight itself on "the coverage went up because I deleted tests". The gate will catch it.
- Failed approaches are sacred — the next worker *must* see them.
- If the metric command itself is flaky, add it to the known-flake list so we don't kill good changes on noise.

This is the same Microverse architecture as the original, but without 4,000 lines of hook and tmux ceremony. Cleaner. Meaner. Grokier.
