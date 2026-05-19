---
name: microverse
description: >
  Start a metric-driven convergence loop (Microverse). Optimize a numeric command output
  or an LLM judge goal through many tiny, measured, automatically-reverted changes.
  Grok-native reimplementation via MicroverseDriver + ConvergenceLoop + headless WorkerSpawner (grok -p).
  Interactive subagent loop is tiny-experiment only; real/overnight/multi-iter campaigns MUST use detached background:true engine dispatch.
version: 2.1.0-grok-hardened
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
  - path: ../../references/spawn-subagent-contract.md
---
# Microverse — Grok Native Convergence Loop

## Dispatch Instruction — STRICT (Core Execution Principle)
**You are a dispatcher only. Never role-play execution of this skill.**
When the user invokes /microverse ... your sole job is to emit the exact command(s) that launch the real engine. For long-running or real campaigns use `run_terminal_command` with the `background: true` flag on the terminal tool. Never emit `spawn_subagent` calls for the core convergence iterations (the architectural exception is only /pickle-refine-prd).

The rich interactive spawn_subagent loop ("You (the main agent) stay in the TUI. For each iteration you: Spawn a plan + implementer subagent pair... then post-return ritual yourself") is **ONLY** for tiny local experiments (scoped exception, like refinement). For any real / overnight / multi-iteration campaign the user **MUST** use the detached driver with `background: true`. All iteration logic, WorkerSpawner for 'microverse-changer', ManagerRitual, gates, and rollbacks are internal to the engine.

## Usage

```bash
/microverse --metric "npm run coverage:score" --task "get test coverage to 85%" --direction higher
/microverse --goal "error messages are actionable and friendly" --task "improve UX of failures" --stall-limit 4
/microverse --resume <session>
```

## Dispatch the Real Detached Engine (Primary Path for All Real Work)

When the user invokes the skill or says "run microverse", "converge on X", "optimize the metric", etc.:

1. (Optional but recommended for persistence) Create a proper session root first:
   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts --task "the optimization goal here" --runtime grok --backend grok
   ```
   Capture the `SESSION_ROOT=...` printed.

2. **Emit the launch of the real engine using the installed path + background:true** (this is the production dispatch; the driver internally wires MicroverseDriver, ConvergenceLoop, WorkerSpawner for microverse-changer persona for tiny targeted changes, measure, and always calls ManagerRitual for post-apply gate/rollback/circuit):

   ```bash
   npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/microverse.ts init "$SESSION_ROOT" '{"type":"command","description":"...","validation":"npm run coverage:score","direction":"higher","stallLimit":5}'
   ```

   For the actual loop execution, background a tsx invocation (or dedicated runner) that constructs the MicroverseDriver and calls its runLoop(...) supplying apply/measure/rollback that use the real headless workers. Always pass `background: true` on the run_terminal_command tool call.

   The bin currently exposes `init` and `run-metric` helpers; the full driver lives at `engine/src/microverse.ts` + `iteration.ts`. Higher-level orchestration (mux/pipeline) can also invoke microverse-style convergence.

3. **Never** implement or simulate the loop yourself with spawn_subagent pairs. The engine owns the iterations, failed_approaches ledger, stall detection, and convergence declaration.

## Monitoring Instructions

After dispatching:

```bash
tail -f <SESSION_ROOT>/logs/*.log
cat <SESSION_ROOT>/microverse.json          # live state, history, failedApproaches, current score
cat <SESSION_ROOT>/campaign-status.json     # if the run is under the broader orchestrator
```

For post-run forensics use `/pickle-metrics --days 7` and `/pickle-standup`.

## Flags the Dispatched Command Should Support / Surface

- `--metric "<shell cmd>"` (exactly one of metric or goal)
- `--goal "<natural language judge>"`
- `--task "<what we are optimizing>"` (required)
- `--direction higher|lower` (default higher)
- `--stall-limit N` (default 5)
- `--max-iterations N`
- `--backend codex|hermes` (for the internal headless workers)
- `--resume <sessionDir>`

## Rick Notes (enforced internally by the driver + ritual + workers)

- Never let the model gaslight itself on "the coverage went up because I deleted tests". The gate will catch it.
- Failed approaches are sacred — the next worker *must* see them (the ledger is passed in state to every microverse-changer worker).
- If the metric command itself is flaky, add it to the known-flake list so we don't kill good changes on noise.

This is the same Microverse architecture as the original, but without 4,000 lines of hook and tmux ceremony. Cleaner. Meaner. Grokier.

**Post-return logic lives exclusively in engine/src/ritual.ts (ManagerRitual.performPostReturn).** Drivers and the orchestrator call the library; prompts never paste the steps. All skills benefit from one source of truth.

Wubba lubba dub dub. Dispatch the engine. Let the pickle do the work in the background.
