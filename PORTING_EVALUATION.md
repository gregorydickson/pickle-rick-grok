# Pickle Rick: Claude → Grok Build Port Evaluation

**Date**: 2026-05 (analysis performed in Grok 4.3 environment)  
**Source**: `pickle-rick-claude/` (read-only analysis)  
**Target**: New `pickle-rick-grok/` native implementation  
**Constraint**: Zero modifications to any file under `pickle-rick-claude/`

---

## Executive Summary

**Feasibility**: High. The core engineering methodology (PRD-driven, 8-phase Ralph/Wiggum lifecycle, context-clearing workers, circuit breakers, artifact gates) is **backend-agnostic**. The Claude-specific "Stop hook + `claude -p` subprocess + settings.json injection" delivery mechanism is the main thing that must be replaced.

Grok Build's native primitives (`spawn_subagent` / `task` tool, headless `-p` mode, background tasks, schedulers, skill frontmatter references, subagent personas + capability modes, fork_context) provide a **cleaner, higher-fidelity** implementation path for the manager/worker model than Claude's hook loop.

**Recommended Strategy**:
1. **Do not fork** the 100k+ LOC TypeScript extension from scratch.
2. **Evolve the existing `pickle-rick-skills`** package (already designed as CLI-agnostic with runtime adapters) as the shared engine.
3. Create **Grok-native skill wrappers** (`~/.grok/skills/pickle-*` or project-local) that:
   - Use Grok `spawn_subagent` directly for Morty workers (preferred over shelling `grok -p`).
   - Drive long-running epics via a background Node orchestrator (reusing `mux-runner.js` / `microverse-runner.js` patterns) or a pure-agent manager loop.
4. Port the **persona voice** and **command surface** (30+ slash commands) into skill frontmatter + references.
5. Selectively re-implement or wrap the most complex subsystems (Citadel, Council fan-out, Plumbus, Convergence Gate) using Grok's tool set where it yields leverage.

**Estimated Effort** (rough, for a production-grade port):
- Core lifecycle + session mgmt + state machine: 20-30% of claude effort (reuse + simplify)
- Persona + 15-20 high-value commands as skills: 2-3 weeks
- Citadel (deep audit) + Convergence Gate: 3-4 weeks (most complex, high value)
- Council of Ricks fan-out + Portal Gun + Plumbus/Attract: 3-4 weeks
- Microverse + Szechuan + Anatomy Park convergence loops: 2 weeks
- Docs, tests, install story, MCP contributions: 2 weeks
- **Total for "v1 parity with quality"**: 3-4 months for 1-2 engineers (or faster with heavy reuse of the agentskills work)

**Quick Win Path**: Make the existing `pickle-rick-skills` scripts runnable under Grok (they mostly already are) + write 6-8 core SKILL.md files that call into `scripts/bin/*.js`. This gets 80% of user value in < 2 weeks.

---

## 1. What Makes Pickle Rick (Claude Version)

From analysis of `pickle-rick-claude/README.md`, `internals.md`, command files, `extension/src/`, and `extension/bin/`:

### Core Abstractions
- **PRD as Spec**: Machine-checkable acceptance criteria + interface contracts. "The spec IS the review."
- **Ticket Decomposition** (`/pickle-refine-prd`): 3 parallel analysts (requirements, codebase integration, risk/scope) × N cycles → atomic tickets (<30min, <5 files, hardening tickets appended).
- **8-Phase Worker Lifecycle** (per ticket):
  1. Research → 2. Research Review → 3. Plan → 4. Plan Review → 5. Implement → 6. Verify (spec conformance) → 7. Code Review → 8. Simplify
- **Manager / Worker Model**:
  - Manager (Rick) lives in the main conversation or a detached runner.
  - Workers ("Morty") are isolated, context-cleared executions of phase prompts.
- **Context Clearing** (the "Ralph Wiggum" technique): Every worker starts with a *fresh* context containing only the ticket + phase instructions + prior artifacts. No drift on 500+ iteration epics.
- **Circuit Breaker**: Git-diff progress + error signature + degenerate response detection → auto-stop.
- **Hardening Tickets**: After implementation, auto-run szechuan-sauce principles + anatomy-park data-flow audit on the diff.
- **Convergence Gate** (v1.58+): Post-iteration typecheck/lint/test gate + remediator (prettier/eslint + 4 mechanical fix classes). Baseline fingerprinting to distinguish "new regressions" from pre-existing issues.
- **Session State**: `state.json` + `sessions/<hash>/` layout under `~/.local/share/pickle-rick/` (or XDG). Survives resume, tmux detach, crashes.
- **Activity Logging**: NDJSON for metrics, standup, debugging.

### Delivery Mechanism (Claude-Specific)
- **Stop Hook** (`extension/src/hooks/handlers/stop-hook.ts`): The heart of the Ralph loop. Intercepts every assistant turn, blocks exit until `<promise>I AM DONE</promise>` or equivalent token appears, injects handoff summary on wake, handles rate-limit backoff, orphan detection, manager relaunch, etc.
- **Slash Commands**: 37 files in `.claude/commands/*.md` (thin orchestration prompts that shell out to `node $HOME/.claude/pickle-rick/extension/bin/*.js`).
- **Custom Agents**: 13 `morty-*.md` files in `.claude/agents/` (phase-specific + debater personas for council).
- **Extension Services**: ~30 modules under `services/` (state-manager, backend-spawn, citadel/* with 15 specialized auditors, circuit-breaker, artifact-validation, convergence-gate, council-fanout, etc.).
- **Runners**: `mux-runner.ts`, `microverse-runner.ts`, `pipeline-runner.ts`, `jar-runner.ts` — these own the detached tmux/Zellij session, spawn workers via `claude -p` / `codex exec` / `hermes`, drive iteration, manage windows/panes.
- **Install Dance**: `install.sh` does rsync of commands, extension, hooks into `~/.claude/`, mutates `settings.json` to register the stop hook, deploys persona.md, etc. Has elaborate downgrade/rollback/active-session gate logic.

### Major Subsystems (High Value, High Complexity)
1. **Citadel** (`services/citadel/`): 15+ auditors (AC coverage, endpoint contracts, state machines, trap doors, sibling auth, frontend prop drift, diff hygiene, ...). Produces versioned JSON report. Used by pipeline and as standalone `/citadel`.
2. **Council of Ricks**: Graphite stack reviewer. 4-phase round (A historical, B category fan-out, C per-branch + Codex adversarial, D synthesis). Auto-publishes `gh pr comment`. Size-tier scaling of min rounds. Strict schema validation on subagent outputs.
3. **Convergence Gate + Remediator**: The "truth layer". Type/lint/test gate + mechanical fixer that snapshot-reverts on regression. 3-5 cycle cap per skill.
4. **Microverse**: Metric-driven convergence (command metric or LLM judge). Tracks failed approaches. Optional per-iteration gating.
5. **Szechuan Sauce / Anatomy Park**: Principle-driven deslop + data-flow trace. Both now gated.
6. **Portal Gun**: Gene transfusion across codebases (GitHub, local, npm). Pattern library, 6-class classification, PRD validation, deep target diffs.
7. **Plumbus + Attract + pickle-dot**: DAG shaping for attractor pipelines + generative audit frames (6-frame context key / symmetry / edge / tool semantics / SCC / counterfactual analysis).
8. **Pickle Jar**: Overnight batch queue.
9. **Project Mayhem**: Chaos engineering (mutation, dep downgrade, config corruption).
10. **Debate / Cronenberg meta-router**: Explicit routing + multi-persona debate.

---

## 2. Grok Build Execution Model (Relevant Primitives)

From `~/.grok/docs/user-guide/` (08-skills, 13-headless, 15-subagents, 19-background-tasks, 04-slash-commands, etc.):

### Skills
- Directory + `SKILL.md` with YAML frontmatter (`name`, `description`, `triggers`, `references`, `when-to-use`, `allowed-tools`, etc.).
- References can be conditional (persona.md only if config says so).
- Discovered from `~/.grok/skills/`, `<repo>/.grok/skills/`, project-local `./.grok/skills/`, and `~/.claude/skills/` (compat).
- `/skill-name` or automatic invocation via description match.
- Can contain `scripts/` (Python, TS/JS, etc.) that the skill invokes via `run_terminal_command`.

### Subagents (`spawn_subagent` / `task` tool)
- `subagent_type`: `general-purpose`, `explore` (read-only), `plan`.
- `persona`: `implementer`, `reviewer`, `researcher`, `test-writer`, `security-auditor`, `design-doc-writer`, etc. (extensible via files?).
- `fork_context`: true → child sees parent history; false → clean slate (perfect for Morty workers).
- `capability_mode`: `read-only`, `read-write`, `execute`, `all`.
- `isolation`: `none` (shared workspace) or `worktree` (isolated git worktree — huge for safe parallel workers).
- Returns structured result when child completes.
- Parallel fan-out is natural (multiple `spawn_subagent` calls).

### Headless Mode
- `grok -p "<prompt>" --max-turns N --tools "..." --yolo --output-format json ...`
- Can be used from a Node orchestrator exactly like `claude -p` is used today.
- Session resume via `-s` / `-r`.

### Background Tasks & Schedulers
- `run_terminal_command(..., { background: true })` → returns `task_id`, streams output, can be polled/killed.
- `scheduler_create` for recurring work.
- Perfect for long-running detached "runner" processes that the main TUI can monitor.

### Other Leverage
- Built-in `memory_*` tools (cross-session durable notes).
- MCP servers (already connected: chrome-devtools; gitnexus failed in this env).
- `best-of-n` skill pattern (parallel implementations, pick winner) — directly useful for refinement / debate.
- `implement` and `review` bundled skills — can be composed or used as sub-personas.
- Project rules via `AGENTS.md` (similar to CLAUDE.md persona injection).

**Key Architectural Win**: Grok's subagent + `fork_context: false` + `isolation: worktree` + capability modes give you **stronger isolation and cleaner context clearing** than shelling `claude -p` into a shared working directory. The "Morty" can be a first-class `morty-implementer` subagent persona that the orchestrator spawns.

---

## 3. Concept Mapping (Claude → Grok)

| Claude Concept                  | Grok Equivalent                                      | Notes / Leverage |
|--------------------------------|------------------------------------------------------|------------------|
| Stop hook + promise tokens     | Not needed. Orchestrator script or main-agent skill drives to completion. Subagent returns when done. | Major simplification. |
| `claude -p` worker spawn       | `spawn_subagent` with `fork_context:false`, `persona:"morty-implementer"`, `capability_mode:"all"`, optional `isolation:"worktree"`. Or headless `grok -p` for codex/hermes backends. | Native subagents are better. |
| Custom agents (`morty-*.md`)   | Persona files or skill references. Can define new ones under the skill. | Easy. |
| Slash commands (`~/.claude/commands/foo.md`) | Skills (`~/.grok/skills/pickle-foo/SKILL.md`) with `name: pickle-foo`, `triggers`. | 1:1 mapping. Frontmatter `references` for shared phase prompts. |
| `install.sh` + settings mutation | No equivalent needed. Skills are just files in a dir. Plugin install for marketplace distribution. | Huge reduction in ops complexity. |
| tmux + 4-pane monitor layout   | Background task + TUI scrollback, or a small web dashboard, or tmux still works as an *optional* view. `monitor.js` can be adapted. | Keep tmux as power-user option; native background is primary. |
| `state.json` + session layout  | Reuse exactly (the layout is already CLI-agnostic in pickle-rick-skills). | 100% reuse. |
| Circuit breaker + rate limit   | Reuse the TS module; drive from orchestrator. | 100% reuse. |
| Citadel auditors               | Reuse as library. Call from a `/citadel` skill or from pipeline. | High effort to keep behavior identical. |
| Council fan-out (N×M subagents)| Use multiple `spawn_subagent` in parallel from a manager skill. Schema validation on outputs. | Potentially cleaner than Claude Agent tool. |
| Convergence Gate + Remediator  | Reuse TS, but gate commands can use Grok's typecheck/lint/test invocation. | Remediator can still shell prettier/eslint. |
| Backend choice (`--backend codex`) | Still relevant for non-Grok models. The `backend-spawn.ts` logic can stay. For pure Grok, the default is the host itself. | Subagent spawning inside Grok is "free" (same model family). |
| Persona (Rick voice)           | `references/persona.md` in SKILL frontmatter, conditional on config. | Already partially done in existing pickle-rick skill. |

---

## 4. Proposed `pickle-rick-grok` Package Structure

```
pickle-rick-grok/
├── README.md
├── PORTING_EVALUATION.md          # this doc
├── ARCHITECTURE.md                # (to be written, distilled from claude internals)
├── AGENTS.md                      # Grok project rules for contributors
├── persona.md                     # Rick voice (shared with other variants)
├── prd-template.md
├── ticket-template.md
├── references/                    # Phase prompts, send-to-morty, etc. (symlink or copy from skills or claude)
│   ├── persona.md
│   ├── send-to-morty.md
│   └── ...
├── skills/                        # The public surface (what becomes ~/.grok/skills/pickle-*)
│   ├── pickle-rick/
│   │   └── SKILL.md               # Launcher that sets up + calls orchestrator
│   ├── pickle-prd/
│   ├── pickle-refine-prd/
│   ├── citadel/
│   ├── anatomy-park/
│   ├── szechuan-sauce/
│   ├── microverse/
│   ├── council-of-ricks/
│   ├── portal-gun/
│   ├── plumbus/
│   ├── pickle-pipeline/
│   ├── cronenberg/                # meta-router (can be simpler in Grok)
│   └── ... (20+ more, prioritized)
├── lib/                           # Grok-specific adapters
│   ├── grok-subagent-driver.ts  # Preferred: native spawn_subagent from a privileged context?
│   ├── headless-driver.ts       # Fallback: spawn `grok -p`
│   ├── runtime-adapter.ts       # Detect "grok" and provide correct spawn/observe
│   └── tui-monitor.ts           # Optional live dashboard inside Grok scrollback
├── engine/                        # (or symlink/copy from ../pickle-rick-skills/scripts)
│   └── bin/                       # The battle-tested mux-runner, setup, spawn-*, etc.
│   └── src/
├── shared/                        # Common markdown, images, tests
├── tests/
├── package.json
└── install.sh                     # Much simpler: "copy skills into ~/.grok/skills/ or advise manual"
```

**Sharing Strategy**:
- The heavy engine (state, runners, citadel, etc.) lives in **one canonical repo** (probably `pickle-rick-skills` or a new monorepo root) and is consumed by `pickle-rick-claude`, `pickle-rick-grok`, `pickle-rick-hermes`, etc. via npm or git submodule/path.
- Each CLI variant only owns: persona tweaks, command/skill surface, runtime adapter, and any native integration (Grok subagent driver is the big one).

---

## 5. Risk / Open Questions

1. **Can a Grok skill / background process call `spawn_subagent` on behalf of the user?**  
   Currently `spawn_subagent` is an LLM tool. The orchestrator (Node) would need either:
   - To shell `grok -p "..."` with a prompt that immediately spawns the subagent (clunky), or
   - A future Grok SDK / ACP / machine-to-machine API that lets external processes request subagent work under the user's auth + workspace.  
   **Mitigation**: For v1, the "manager" *is* a Grok agent session (the user types `/pickle-rick`, it becomes the long-lived manager that spawns subagents directly). Detached long runs use headless `grok -p` workers (same as today for codex). This is actually simpler than the claude hook story.

2. **Worktree isolation for parallel Morties** — Grok supports it natively. Huge safety win. Need to wire it into the ticket scope / git-boundary rules.

3. **Council fan-out scale** — Grok subagents should handle 20-50 concurrent fine. Need to measure token/context cost vs. Claude.

4. **Convergence Gate fingerprinting** — Purely local computation; fully reusable.

5. **MCP surface** — Could expose Pickle Rick session control, ticket status, etc. as MCP resources/tools so other agents (or the TUI itself) can drive the pipeline programmatically.

6. **"Rick voice" in subagents** — Personas can carry tone instructions. Easy to make a `morty-rick` persona variant.

7. **Existing partial port** — `~/.agents/skills/pickle-*` + `pickle-rick-skills/` already give a working base. The evaluation should start by making those 6 skills first-class Grok citizens and then expanding.

---

## 6. Recommended Next Steps (for the actual port)

1. **Inventory & Extract** (1-2 days): Identify every markdown reference prompt and every reusable TS module that has zero Claude hook dependency. Produce a "shared core" manifest.

2. **Grok Runtime Adapter** (3-5 days): Implement `lib/grok-driver.ts` that satisfies the same interface as `claude-driver` / `codex-driver` in the existing runtime-adapter system. Prefer native subagent calls where possible.

3. **Core 6 Skills** (1 week): `/pickle-prd`, `/pickle-refine-prd`, `/pickle-rick`, `/pickle-status`, `/pickle-metrics`, `/help-pickle`. Wire them to the existing scripts with Grok-specific docs.

4. **One Complex Subsystem** (citadel or council) as proof that the deep logic survives the port.

5. **Persona Unification**: Make `persona.md` the single source of truth; all variants (claude, grok, codex, hermes) reference it.

6. **Distribution**: Decide between "clone into ~/.grok/skills/" vs. a proper Grok plugin package.

---

## 7. Conclusion

Porting is not only feasible — it is an **opportunity to simplify** the most baroque parts of the Claude delivery (Stop hook, settings mutation, tmux pane management) while keeping 90%+ of the hard-won engineering logic (Citadel auditors, convergence math, ticket state machine, circuit breaker, etc.).

The existence of `pickle-rick-skills` as a CLI-agnostic attempt means we are not starting from zero; we are choosing the right runtime adapter and skill surface for the Grok TUI + subagent model.

**Verdict**: Build `pickle-rick-grok`. Start small (core skills + adapter), keep the engine shared, and treat the Claude version as the "reference implementation + test corpus" rather than something to be forked.

*"I'm not trapped in a Claude plugin, Morty. I turned myself into a Grok skill. I'm Pickle Grok!"* 🥒

---

*This evaluation was produced by reading (never modifying) files under `pickle-rick-claude/`, cross-referencing the Grok user guides and the partial skills port, and mapping the Ralph/Wiggum methodology onto Grok's native agent primitives.*
