# Pickle Rick Grok — Clean Reimplementation Design

**Version**: 2.0 (Grok-native, no legacy hook debt)  
**Date**: 2026-05  
**Status**: Active implementation

## 1. Goals

- Full reimplementation of the autonomous engineering system from pickle-rick-claude.
- pickle-rick-skills is considered out of date; we start fresh with lessons learned.
- Native to Grok Build: leverage `spawn_subagent`, `fork_context`, `isolation:worktree`, background tasks, headless `grok -p`, skills.
- Dramatically simpler operational model (no Stop hooks, no settings.json mutation, no 6-pane tmux required).
- Preserve the soul: PRD-driven, machine-verifiable ACs, context-clearing workers, convergence loops, trap doors, Rick voice.
- Shareable core so future ports (or other hosts) can consume the engine.

## 2. Core Architecture Principles

1. **Engine is a TypeScript library** (`engine/src/`) — small, typed, testable, no Claude dependencies. Runs via `npx tsx` during development.
2. **Workers are either**:
   - Native Grok subagents (`spawn_subagent` with clean persona + fork_context=false + worktree) — preferred for interactive sessions.
   - Headless `grok -p` children — for detached background runners and `--backend codex/hermes`.
3. **State is simple JSON** under `~/.local/share/pickle-rick-grok/sessions/<id>/` (or XDG override).
4. **One orchestrator loop to rule them all** — the convergence/iteration harness is shared by Microverse, Anatomy Park, Szechuan, and the main ticket lifecycle.
5. **Git safety is non-negotiable** — every worker runs under explicit boundary rules; the engine enforces or the subagent prompt declares them.
6. **Persona is data** — Rick voice injected via skill references, not hard-coded in every prompt.

## 3. Session Layout (identical spirit to v1, cleaner)

```
SESSION_ROOT = ~/.local/share/pickle-rick-grok/sessions/2026-05-18-abc123/
├── state.json                 # step, tickets[], current_ticket, flags, runtime:"grok", backend
├── prd.md
├── prd_refined.md             # after refine
├── tickets/
│   ├── 001-feature-x/
│   │   ├── ticket.md (frontmatter + description + ACs)
│   │   ├── research_001.md
│   │   ├── research_review.md
│   │   ├── plan_001.md
│   │   ├── plan_review.md
│   │   ├── conformance_001.md
│   │   ├── code_review_001.md
│   │   └── simplify_001.md
│   └── ...
├── microverse.json            # for convergence tools
├── anatomy-park.json          # subsystem rotation state + findings + trap_doors
├── szechuan-sauce.json
├── gate/
│   └── baseline.json          # pre-existing lint/type/test failures
├── logs/
├── activity.jsonl
└── artifacts/                 # any large outputs
```

`state.json` is the source of truth for resume, circuit breaker, phase tracking.

## 4. The Iteration / Convergence Harness (the heart)

All long-running autonomous tools are built on one harness:

```python
# pseudocode
class ConvergenceLoop:
    def run(self, mode: "microverse" | "anatomy" | "szechuan" | "ticket_phase"):
        while not converged and not breaker.tripped:
            pre_sha = git.head()
            worker = self.spawn_worker_for_current_step()   # subagent or grok -p
            worker_result = await worker.complete()
            post_sha = git.head()

            if mode == "anatomy":
                classification = self.anatomy_three_phase_evaluate(...)  # review/fix/verify
            else:
                measurement = self.measure()  # command output or LLM judge
                classification = self.classify(measurement, tolerance, direction)

            if classification == "improved":
                accept()
                reset_stall()
            elif classification == "regressed":
                git.restore(pre_sha, paths=scope)
                record_failed_approach()
                increment_stall()
            else:
                # held
                increment_stall()

            if stall >= limit:
                converge()

            self.gate_check()  # type/lint/test + optional remediator
```

Key modules (TypeScript):
- `engine/src/iteration.ts` — the reusable ConvergenceLoop + stall logic
- `engine/src/microverse.ts` — metric + LLM judge measurement
- `engine/src/gate.ts` — (future) convergence gate + remediator
- `engine/src/circuit.ts` — (future) circuit breaker

## 5. Anatomy Park (ported cleanly)

- Subsystem discovery: immediate children of target with ≥3 source files, not test-heavy, not node_modules etc.
- State: `anatomy-park.json` with `subsystems[]`, `current_index`, `pass_counts`, `consecutive_clean`, `stall_counts`, `findings_history`, `trap_doors_added`
- Per subsystem, per iteration: **three-phase protocol** executed by a single Morty or three sequential subagents:
  1. **Review** (read-only explore subagent): trace data flows, git history for churn, rate CRITICAL/HIGH/MED, propose minimal fixes + trap door candidates.
  2. **Fix** (execute): minimal targeted edit, add regression test if possible, commit.
  3. **Verify** (read-only + execute): re-trace callers, run full relevant test surface, combinatorial check, **revert on any regression**.
- Round-robin: after a clean pass on a subsystem, move to next. Stall limit per subsystem.
- Trap doors written to the subsystem's nearest `CLAUDE.md` (or `.grok/AGENTS.md` equivalent) under a `## Trap Doors` section.

This is a microverse-driven loop (`convergence_file: anatomy-park.json`).

## 6. Main Autonomous Build (the "pickle" / "pickle-tmux" flow)

When user says "build the tickets":

1. PRD exists (or `/pickle-prd` creates one).
2. `/pickle-refine-prd` (3 parallel analyst subagents) produces `prd_refined.md` + `tickets/*.md` + hardening tickets.
3. Main loop (mux equivalent):
   - For each ticket:
     - For each phase in [research, research_review, plan, plan_review, implement, verify, review, simplify]:
       - Spawn clean-context subagent (`persona: morty-phase-{phase}`, `fork_context:false`, `isolation:worktree` recommended)
       - Subagent reads ticket + prior approved artifacts + PRD ACs
       - Writes the phase artifact (`research_*.md` etc.)
       - For implement/verify/review phases: runs commands inside the allowed scope
   - After all phases: mark ticket done, run hardening if present
   - Circuit breaker checked after every ticket/phase
4. On completion: Citadel optional, then handoff.

The 6-8 phase prompts live as reference markdown in `references/phases/`.

Because Grok subagents support `persona`, we can have first-class `morty-phase-implementer` etc. defined once and reused.

## 7. Pickle Pipeline (the meta-orchestrator)

`/pickle-pipeline` becomes a skill that:

- Optionally runs refine (auto-detect or `--refine`)
- Runs the main build (via the ticket loop)
- Runs Citadel (in-process TS auditors — slim reimplementation of the critical ones)
- Runs Anatomy Park (microverse on subsystems)
- Runs Szechuan Sauce (microverse on modified files against principles)
- Between phases: resets phase-specific state, pins `command_template`, cleans stale artifacts

Citadel will be a **much smaller** reimplementation — the 15 auditors were over-engineered; we keep the spirit in a few hundred lines of TypeScript.

## 8. Detached / "tmux" Experience

Two paths:

**A. Interactive (new default)**: The `/pickle-rick` or `/pickle-tmux` skill runs in your current Grok session. It becomes the long-lived manager. Every Morty is a `spawn_subagent(...)`. You watch the scrollback. No extra terminal needed. Use `/background` or schedulers if you want it to continue while you do other work.

**B. Detached runner (power user)**: 
```bash
npx tsx engine/src/bin/pickle-tmux.ts <session> --monitor
```
This launches a background task (via the tool), tails logs into the TUI, and can pop a simple dashboard using the monitor module. Still uses `grok -p` for workers so it survives the parent session ending.

The old 4-pane tmux layout is optional eye candy; the new default is cleaner.

## 9. Backends

- Default: native Grok (subagents or `grok -p`)
- `--backend codex`: shell `codex exec ...`
- `--backend hermes`: shell the hermes CLI
- The engine's `workers.py` abstracts `spawn_morty(phase, ticket, backend, prompt_template)`

## 10. Rick Persona

One `persona.md` file. Skills include it conditionally via frontmatter when the user's `pickle_settings.json` has `persona: true` (default).

The voice ("Wubba Lubba", belches, "Jerry mistake", "this code is an affront to God and man", etc.) is applied at the launcher + worker prompt level.

## 11. Package Structure (what we will build)

```
pickle-rick-grok/
├── engine/
│   ├── __init__.py
│   ├── session.py          # Session, Ticket, StateManager
│   ├── iteration.py        # ConvergenceLoop base
│   ├── microverse.py
│   ├── anatomy.py
│   ├── szechuan.py
│   ├── pipeline.py
│   ├── workers.py          # spawn_grok_worker, spawn_subagent_worker, headless_grok
│   ├── gate.py
│   ├── circuit.py
│   ├── git_safety.py
│   ├── citadel.py          # slim reimplementation
│   ├── types.py
│   └── utils.py
├── skills/
│   ├── pickle-prd/
│   ├── pickle-refine-prd/
│   ├── pickle-rick/
│   ├── pickle-tmux/
│   ├── microverse/
│   ├── anatomy-park/
│   ├── szechuan-sauce/
│   ├── pickle-pipeline/
│   ├── citadel/
│   ├── council-of-ricks/   # later
│   └── ...
├── references/
│   ├── persona.md
│   ├── phases/
│   │   ├── research.md
│   │   ├── implement.md
│   │   ...
│   ├── anatomy-review.md
│   └── ...
├── tests/
├── docs/
└── README.md
```

The `skills/*/SKILL.md` are thin — they parse args, call `python -m engine.xxx`, or (for interactive) drive the loop directly using tool calls + subagents.

## 12. Migration / Coexistence

- Existing `pickle-rick-claude` users stay on it.
- New Grok users install by cloning or symlinking the skills into `~/.grok/skills/pickle-rick-grok/` (or a proper plugin later).
- Session formats are intentionally similar so a future "universal session" format is possible.

## 13. Implementation Phases (this task)

1. Core engine (session + iteration harness + git safety)
2. Microverse (command metric + LLM judge)
3. Anatomy Park (discovery + 3-phase + trap doors)
4. Main ticket lifecycle (the 8-phase Morty loop)
5. Pipeline + Citadel slim
6. Szechuan + full command surface + Rick voice
7. Polish, tests, docs

This design deliberately throws away the 1.75 complexity tax while keeping (and improving) the parts that delivered value.

**Port Status (as of latest push)**: Core system is complete and usable. The interactive `/pickle-rick` flow with native subagents, all major convergence tools, full state machine, 8-phase lifecycle, detached runner, and supporting modules are implemented in clean TypeScript + Grok skills. The port of the requested architecture (microverse, anatomy park, pipeline, tmux-style, main autonomous loop) is functionally complete.

---

*Built by reading the soul of the claude version, not its scaffolding.*
