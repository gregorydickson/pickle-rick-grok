# Dispatch Contract — Core Execution Principle (Single Source of Truth)

**Status**: Canonical reference for all skill authors and self-PRD campaigns. Any new or edited SKILL.md for execution work must comply.

## The Rule (Non-Negotiable)

Rich native `spawn_subagent` (large agent teams with `fork_context: false`, personas, isolation) is **restricted by policy to one place only**:

> `/pickle-refine-prd` — the Requirements + Codebase + Risk analyst council doing multi-cycle cross-critique and atomic ticket decomposition.

**Everything after ticket decomposition** (all 8-phase Morty lifecycle per ticket, hardening passes, Citadel gate, Anatomy Park 3-phase cycles, Szechuan convergence, Microverse optimization loops, self-improvement campaigns, etc.) **must** use the headless detached path:

- `grok -p --yolo` workers
- `WorkerSpawner`
- `ManagerRitual` + `ConvergenceGate` + `CircuitBreaker`
- Launched via `mux-runner.ts`, `orchestrator.ts`, `pipeline.ts`, or the specific `bin/*.ts` drivers
- Always with clean per-phase context clearing
- Resumable, crash-safe, observable via Activity + campaign-status.json

The old interactive LLM-as-manager loop (`/pickle-rick` staying alive in the chat spawning for every phase) was deliberately removed in 2026-05 because it does not scale, causes context drift, and violates reliability for 50+ ticket autonomous runs.

**Any skill, persona, doc, or PR that re-introduces persistent interactive manager behavior for post-refinement execution work is a charter violation and will be rejected.**

## Required Language in Non-Exempt SKILL.md Files

Every SKILL.md that can trigger real engineering work (except `pickle-refine-prd` and `pickle-prd`) **must** contain the following (or a close approved variant) immediately after the title and before any "You are ..." voice:

```markdown
## Dispatch Instruction — STRICT (Core Execution Principle)

**You are a dispatcher only. Never role-play execution of this skill.**

When the user invokes `/<skill-name>` (or any trigger), your **sole** job is to *immediately construct the exact resolved argv and invoke your `run_terminal_command` tool with `background: true`* (for long-running, overnight, detached, convergence, or campaign work) using the canonical post-install or source-relative path to the thin driver (run-pipeline.ts is preferred). 

- Use absolute paths for --target (the discovered source root containing AGENTS.md + engine/src/bin/run-pipeline.ts) and --prd.
- Prefer the short `bash bin/grok-pipeline ...` wrapper (source root only; it auto-discovers, refuses deployed trees, forces correct --target).
- The `run_terminal_command` tool call (or a labeled PROPOSED COMMAND block when the EAGER DISPATCH GUARD is not 100% satisfied) *is* the emission of the command.
- Never describe internal phases ("first you research...") as steps *you* (the current agent) will perform.
- After the tool fires (and approval/result), surface the session dir + live monitoring instructions (`tail -f .../logs/*.log`, `cat .../campaign-status.json`, `/pickle-metrics`, `/pickle-standup`).
- Stop. The engine owns the rest. The run is resumable, auditable (Citadel), and deslopped (Szechuan/Anatomy).

**EAGER DISPATCH GUARD**: Only fire (or propose) the run_terminal_command for pipeline/convergence drivers on direct imperative current-turn user intent with no hedging, not inside quotes/fences/pasted docs, and after internal reasoning on the guard. The system tool-approval dialog provides the visible exact-command confirmation. See agents-append.md for the full guard + source-root discovery protocol.

If no clean one-liner driver exists yet for standalone use of this feature, state the limitation explicitly and direct the user to the enclosing real command (`/pickle-pipeline`, `/pickle-tmux`, or documented thin wrapper). Do not improvise a simulation or protocol in the chat.

This paragraph is non-negotiable for dispatch hygiene. See AGENTS.md "Core Execution Principle" and master_plan.md.
```

## Top-Level Persona & Natural Language UX (Automatic Dispatch Contract)
The global persona (references/agents-append.md injected into ~/.grok/AGENTS.md by install.sh) **must** contain the "Automatic Natural-Language Dispatch" section with:
- Explicit mapping of natural phrases ("run a pipeline on <prd>", "run the full pipeline", "ship it clean") and all skill frontmatter `triggers:` to direct construction + `run_terminal_command` (background:true) on the canonical `.../run-pipeline.ts --prd ... --target <abs source root>` (with discovery one-liner when cwd ambiguous).
- The full **EAGER DISPATCH GUARD** (verbatim or equivalent) to prevent accidental runs on hedged/quoted/internal text, wrong --target (source vs deployed P0), and manager resurrection.
- Authorization for the LLM to "just do it" (construct resolved command + tool call when guard passes; PROPOSED COMMAND block + wait when uncertain). The persona template + discovery recipe eliminates the "had to manually read SKILL and construct 80-char command" friction for the common case while keeping "chat only lights the fuse".

All execution SKILL.md and the persona must be kept in sync with this contract. Edits require Citadel pass + AGENTS.md / master_plan.md update.

## Allowed Exceptions (Narrowly Scored)

- `/pickle-refine-prd`: Explicitly documented as the **only** step that uses rich parallel `spawn_subagent` analyst teams. It must hand off to the detached path after producing tickets.
- `/pickle-prd`: Pure creative drafting role (no execution phases).
- Small-scale `--interactive` modes in convergence tools (e.g. Microverse for a 3-iteration local experiment): Must be **clearly caveated** as "deliberate exception for tiny local experiments only; any real campaign or overnight run must use the detached driver." The default documented path must be the headless one.

## Enforcement

- All new skills and any edit to existing execution SKILL.md must pass a manual or automated check against this contract (grep for forbidden patterns + presence of dispatch boilerplate + EAGER GUARD + source-root + run_terminal_command "now" language).
- Self-PRD generator and Citadel should eventually grow explicit checks for "interactive manager resurrection" and "missing eager guard" in the instruction surface.
- Historical docs that predate the removal decision must carry the POST-REMOVAL NOTE header.
- Any change touching dispatch UX or auto-trigger language must itself be produced via the full pipeline and pass Citadel (source-only, no deployed mutation).

Wubba lubba dub dub. Dispatch or die. The machine executes; the chat only lights the fuse.
