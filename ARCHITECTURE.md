# Pickle Rick Grok — Architecture (Target State) — HISTORICAL / PORT PLAN

**WARNING (Final Gaps Sweeper)**: This document describes the *desired* Grok-native target architecture from the porting evaluation phase. 
The actual implemented and hardened production system is described in:
- GROK_ARCHITECTURE.md (current)
- COMPLETION_STATUS.md (Final Gaps Closed)
- SKILL_MANIFEST.md
- engine/src/ (the real TS engine with ritual, real Citadel/Anatomy/Szechuan, mux-runner, self-PRD loop)

Higher-tier stubs are explicit. 50-ticket overnight self-run is production viable (modulo identified source hygiene items).

The port succeeded. This file is kept for design rationale only.

---

**POST-REMOVAL NOTE (2026-05)**: The interactive LLM-as-manager path was deliberately removed. Current charter and execution model are in AGENTS.md "Core Execution Principle" (headless grok -p / orchestrator for all ticket execution, convergence, and 50-ticket self-runs; spawn_subagent rich teams ONLY inside /pickle-refine-prd for analysts). Any diagrams, P0 plans, or language in this historical document that appear to endorse or recommend an "Interactive Path (recommended)" or persistent Manager Rick loop are archival only and do not describe the production system.

# Pickle Rick Grok — Architecture (Target State)

This is the *desired* architecture for the Grok-native port. It deliberately diverges from the Claude hook-heavy design where Grok primitives provide a better path.

---

## Guiding Principles

1. **Engine is shared, surface is per-CLI**  
   `pickle-rick-skills/scripts/` (or a future monorepo `engine/`) contains the state machine, runners, citadel, circuit breaker, etc. All variants (claude, grok, codex, hermes, forgecode) consume it.

2. **Grok subagents are first-class workers**  
   When the host is Grok, prefer `spawn_subagent(fork_context:false, isolation:worktree, persona:"morty-implementer")` over shelling `grok -p`. Cleaner context, better isolation, native parallelism.

3. **No Stop hooks, no settings.json surgery**  
   The orchestrator (or the long-lived manager agent) owns the loop. Completion is signaled by subagent return or by `<promise>` token in a headless child.

4. **Skills are the only public API**  
   Every `/pickle-*` becomes a `~/.grok/skills/pickle-*/SKILL.md`. No separate "commands" directory.

5. **Persona is data, not code**  
   `persona.md` + conditional references in frontmatter. Rick voice is opt-in via config.

---

## Runtime Layers

```
User types "/pickle-rick build the thing"
          │
          ▼
Grok skill dispatcher (SKILL.md frontmatter + description match)
          │
          ▼
pickle-rick/SKILL.md  (launcher)
   - runs setup.js --runtime grok
   - captures SESSION_ROOT
   - either:
     a) becomes the live manager (spawns subagents directly via task tool), or
     b) launches background `node engine/bin/mux-runner.js --runtime grok <session>`
          │
          ▼
Grok Runtime Adapter (lib/grok-adapter.ts)
   - detect "grok" host
   - expose:
     * spawnWorker(phase, ticket, opts) → uses spawn_subagent when possible,
       falls back to `grok -p` for --backend codex/hermes
     * observeCompletion(child) → parses promise tokens or waits for subagent result
     * getContextBudget() etc.
          │
          ▼
Shared Engine (mux-runner, microverse-runner, state-manager, citadel/*, ...)
   - identical behavior across hosts
   - only difference is "how do I spawn a morty and how do I know it finished?"
```

---

## Subagent Personas (Grok-Native)

We define (or extend) personas under the skill or in `~/.grok/personas/`:

- `morty-researcher` — phase 1, read-only explore
- `morty-planner` — phase 3
- `morty-implementer` — phase 5 (execute + write)
- `morty-verifier` — phase 6 (run gates, no new code unless fixing)
- `morty-reviewer` — phase 7 (read-only + findings)
- `morty-simplifier` — phase 8
- `morty-debater-*` — for council and debate flows
- `meeseeks` — fully removed (replaced by Szechuan + Anatomy relentless deslopping)

Each persona file carries:
- Tone (Rick-isms allowed but not required)
- IO contract (`research_*.md` must be written, etc.)
- Allowed tool restrictions where sensible (verifier shouldn't write except test fixes)

The orchestrator can request `capability_mode: "read-only"` for research/review phases and `"all"` for implement.

---

## Session & State

**Identical** to current:

```
~/.local/share/pickle-rick/
  sessions/<date-hash>/
    state.json
    prd.md (or user-supplied PRD, updated in place by refine) / legacy prd_refined.md
    tickets/
      001-foo/
        research_*.md, plan_*.md, ...
    gate/
      baseline.json
    logs/
    ...
  activity/*.jsonl
```

`state.json` already has `runtime: "grok" | "claude" | ...` and `backend` for worker spawns. The adapter reads this.

---

## Long-Running / Detached Execution

Options (pick one primary + keep tmux as escape hatch):

1. **Pure Agent Manager** (recommended for interactive)
   - User stays in the TUI.
   - The `/pickle-rick` skill becomes a long conversation that spawns subagents, waits for results (the `task` tool blocks until child done), updates state, loops.
   - Context for the *manager* is managed by Grok's compaction + the handoff summary the skill injects on each wake (same pattern as the old stop-hook summary).

2. **Background Orchestrator + Headless Workers**
   - `node engine/bin/mux-runner.js` runs as `background: true` task.
   - It spawns `grok -p "You are Morty phase X for ticket Y. Read state. Do the thing." --max-turns 40` (or with a prompt that immediately spawns its own subagents).
   - The main TUI can `monitor` the background task or tail logs.

3. **Hybrid** (what the existing pickle-rick-skills already does): the runner script is the driver; it uses whatever CLI the runtime adapter tells it to use.

For "fire and forget overnight" → option 2 or the Pickle Jar runner.

---

## Key Subsystems — Grok Port Notes

### Citadel
- Pure analysis + git + file reads. 100% reusable as a library.
- The `/citadel` skill just calls the audit runner with `--report` and renders the JSON nicely.

### Council of Ricks
- The fan-out is the killer feature.
- In Grok we can do true parallel `spawn_subagent` calls from the manager skill (or from a Node process that has a way to request subagent work).
- Each subagent writes its `council-directive.json` fragment; the synthesis step collects them.
- Isolation: `worktree` per branch review would be amazing (no checkout races).

### Convergence Gate + Remediator
- The gate commands (`npm test`, `tsc`, `eslint`) are project-specific; the engine already reads `data/gate-commands.json` and project-type classifiers.
- Remediator is mechanical (shells prettier, eslint --fix, and 4 small fixers). Works the same.

### Microverse / Szechuan / Anatomy
- These are already convergence loops that call the shared engine.
- The only change is "how do I spawn the 'make one change' worker?" → adapter.

### Portal Gun + Plumbus + Attract
- Heavily git + file + LLM analysis. The gene-transplant logic, pattern classification, 6-frame generative audit — all reusable.
- The attractor server call is external; unchanged.

---

## Skill Frontmatter Example (Target)

```markdown
---
name: pickle-rick
description: >
  Autonomous iterative engineering lifecycle — PRD to implementation to review.
  Use when the user says "build the tickets", "run pickle", "autonomous lifecycle",
  or hands you a PRD and wants the full Ralph loop.
version: 2.0.0
triggers:
  - pickle-rick
  - pickle
  - autonomous build
  - ralph loop
references:
  - path: ../../references/persona.md
    description: Rick voice and philosophy (opt-in)
    conditional: true
    condition: "config.persona !== false"
  - path: ../../references/send-to-morty.md
    description: The 8-phase worker contract
  - path: ../../references/ticket-template.md
  - path: ../../engine/prd-template.md
allowed-tools: [run_terminal_command, spawn_subagent, read_file, grep, ...]
argument-hint: "<task description or --resume <session>>"
---
# Pickle Rick — Grok Native

You are the launcher + optional live manager.

... (rest of the skill instructions, much shorter than the claude command files
because the heavy lifting is in the engine scripts or in subagent personas)
```

---

## Migration / Coexistence

- `pickle-rick-claude` continues to be the gold master for Claude Code users.
- New features should land in the **shared engine** first, then get thin wrappers in each variant.
- The `pickle-rick-skills` package becomes the "reference consumer" for the engine + the place where the Grok adapter is developed.

---

*This is the target. The PORTING_EVALUATION.md contains the "how we get there from the current claude + partial skills state" plan.*


---
**Final Docs & Honesty (2026-05-18)**: AGENTS.md created at grok root (closing proposed structure gap); all historical docs cross-referenced to current truth (COMPLETION, SKILL_MANIFEST, AGENTS, 50-tix report). P3 stubs + self-loop viability language kept brutally accurate across the tree. No remaining doc drift.
