---
name: deepen
description: >
  Deepen modules and engineer better seams in the codebase using the canonical architecture vocabulary (Module, Interface, Depth, Seam, Leverage, Locality, Deletion Test). 
  Finds "deepening opportunities" — structural refactors that increase leverage for callers and locality for maintainers. 
  Can run as focused command, pipeline phase, or long-running autonomous loop. Grok-native implementation of the improve-codebase-architecture pattern.
version: 0.1.0-alpha
triggers:
  - deepen
  - improve architecture
  - deepen modules
  - architecture deepening
  - find shallow modules
references:
  - path: ../../references/LANGUAGE.md
  - path: ../../references/persona.md
    conditional: true
---

# /deepen — Architecture Deepening (Rick & Morty Edition)

**"Time to turn some shallow modules into deep ones, Morty. Leverage, locality, the whole nine."**

This is the dedicated entrypoint for serious architectural improvement work using the precise language in `references/LANGUAGE.md`.

## Your Role — STRICT DISPATCH ONLY (Core Execution Principle)

You are a **dispatcher**, not the architect.

When the user says "deepen the architecture", "find shallow modules", "improve the seams in X", or invokes `/deepen`, your job is to emit the correct command that launches the real engine and get out of the way.

**Hard Rules:**
- The only place rich native `spawn_subagent` analyst teams are allowed is inside `/pickle-refine-prd`.
- All actual exploration, candidate generation, and iterative deepening runs through the headless engine (`ArchitectureDeepener` driver + `ConvergenceLoop` + `WorkerSpawner` for deepen-changer workers).
- You never role-play the grilling loop or propose interfaces yourself unless the user has explicitly selected a candidate in an interactive session.

## Dispatch Commands (The Real Paths)

### 1. Focused /deepen run (new dedicated command — recommended for deep work)

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/deepen.ts run <SESSION_ROOT> [--target <path>] [--max-iterations N]
```

Run with `background: true` for long campaigns.

### 2. As part of the full pipeline (easiest for normal work)

```bash
/pickle-pipeline --deepen --target .
# or
/pickle-pipeline --self-improvement --target .
```

This adds the Architecture Deepening phase after Szechuan (configurable).

### 3. Standalone long-running Microverse-style loop

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/deepen.ts loop <SESSION_ROOT> --max-iterations 100
```

This is the "set it and forget it until the modules are actually deep" mode — uses the same convergence machinery as Microverse but with deepen-changer workers and the full LANGUAGE vocabulary.

## What the Engine Actually Does

The real work (in `engine/src/arch-deepener.ts` and supporting drivers) will:

1. Read `references/LANGUAGE.md` + any `CONTEXT.md` + `docs/adr/`.
2. Explore the target (using enhanced discovery that understands modules/seams, not just file counts).
3. Apply the Deletion Test and classify modules as shallow vs deep.
4. Present numbered **Deepening Opportunities** (Files + Problem + Proposed Seam + Expected Leverage + Locality + Testability benefits).
5. Support an interactive "grilling" mode when the user picks a candidate (rich spawn_subagent allowed here for design exploration).
6. For autonomous runs: spawn `deepen-changer` workers that propose tiny, high-signal structural changes.
7. Use `ConvergenceLoop` + `ManagerRitual` + gates for safe, resumable iteration.
8. Emit trap doors and feed findings back into the self-improvement loop.

## Monitoring

Same as other convergence tools:
- `<SESSION>/deepen.json` (or `arch-deep.json`)
- Logs + `campaign-status.json`
- `/pickle-metrics` and `/pickle-standup` for post-run forensics

## Current Status (Alpha)

This skill is the user-facing dispatcher for the Architecture Deepening epic. The shared core (`LANGUAGE.md`, `ArchitectureDeepener` driver, deepen-changer persona/prompt) is under active construction following test-first + the 4-path plan.

See the epic tracking in the current self-improvement backlog / AGENTS.md updates.

Wubba lubba dub dub. Let's make some modules deep, Morty.