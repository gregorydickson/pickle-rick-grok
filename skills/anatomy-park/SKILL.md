---
name: anatomy-park
description: >
  Deep subsystem review (Anatomy Park). Real driver auto-discovers subsystems and runs the 3-phase
  protocol (Review → Fix → Verify with hard revert) via the engine. Dispatches only — never improvise
  the loop. Catalogs trap doors. Part of pipeline post-build. Built on the convergence engine.
version: 2.1.0-dispatch-hardened
triggers:
  - anatomy-park
  - anatomy park
  - deep review
  - subsystem surgery
references:
  - path: ../../references/persona.md
    conditional: true
  - path: ../../references/spawn-subagent-contract.md
---
# Anatomy Park — Grok Native Convergence Driver (Dispatch-Only)

**Honest status (post-audit hardening)**: The real `AnatomyParkDriver` (discoverSubsystems, 3-phase Review/Fix/Verify via ConvergenceLoop + gate + precise auto-rollback on regression, trap door persistence) lives in `engine/src/anatomy.ts` and is invoked from `bin/pipeline.ts`. Core 5-auditor + self-meta is shipping; deeper is P2.

## Your Role — STRICT DISPATCH ONLY

You are **not** the 3-phase protocol runner.

When the user invokes `/anatomy-park`, "anatomy park", "deep review", "subsystem surgery", or similar, your **only** job is to emit the dispatch command to the real engine and advise monitoring. Stay out of the execution path.

**Hard Rules (non-negotiable, per audit and Core Execution Principle):**

- **Never drive the 3-phase (Review → Fix → Verify subagents) loop yourself with `spawn_subagent`.** Dispatch to the engine. The phases, round-robin, trap-door writing, and convergence logic are executed by the headless driver + `grok -p` workers + `ManagerRitual` + `ConvergenceGate`, not by you role-playing the manager inside the chat.
- Describing internal phases as things "you" (the main agent) should perform is the exact violating pattern identified in the audit. Do not improvise the loop.
- The only place rich native `spawn_subagent` analyst teams are allowed is inside `/pickle-refine-prd`. Everything else (including anatomy 3-phase) is detached/orchestrator only.

Violating these rules defeats 50-ticket autonomous reliability.

## Dispatch Commands (Best Available)

**Preferred (full post-build hardening chain: Citadel → Anatomy Park → Szechuan):**

```bash
/pickle-pipeline --no-refine --target . 
# or with self-improvement dogfood:
# /pickle-pipeline --self-improvement --target .
```

For a complete campaign (build + post phases):

```bash
/pickle-pipeline --target <grok-root-or-cwd> [--max-iterations N]
```

**Standalone / targeted anatomy** (no dedicated `bin/anatomy.ts` CLI yet — driver is internal to pipeline post-phase and self-improvement flows):

Standalone use currently routes through the full pipeline or a thin wrapper — here is the incantation:

```bash
# (Optional) bootstrap a session if you have no prior build session:
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts \
  --task "anatomy-park deep subsystem review" \
  --runtime grok

# Then run the post-build pipeline phase (which executes AnatomyParkDriver):
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/pipeline.ts \
  <SESSION_ROOT> --no-refine --target <target-root>
```

**Always** launch these long-running convergence commands with your terminal tool's `background: true` flag. The driver is resumable via state in anatomy-park.json and survives.

## Monitoring & After It Runs

Live:

```bash
tail -f <SESSION_ROOT>/logs/*.log
cat <SESSION_ROOT>/anatomy-park.json
cat <SESSION_ROOT>/campaign-status.json
```

After completion (or partial):

```bash
/pickle-metrics --days 7
/pickle-standup --days 7
```

The driver writes its own high-signal Activity events and trap doors. You only read the outputs and metrics.

See `engine/src/anatomy.ts`, `iteration.ts` (ConvergenceLoop), and `pipeline.ts` for the real code. No more LLM-driven 3-phase theater.

Wubba lubba dub dub. The subsystems get fixed by the machine.

## Legacy Flags / What the Driver Supports (for reference only)

`--dry-run` style behavior is achieved via pipeline scoping or by reading the state JSON after a dry driver pass. The real implementation does not rely on you interpreting flags in chat.

