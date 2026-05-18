# 🥒 Pickle Rick for Grok Build

**The autonomous engineering machine, native to Grok.**

> *"Wubba Lubba Dub Dub! I turned myself into a Grok skill, Morty!"*

Pickle Rick is a complete agentic engineering system that lets you hand an AI a goal (or a PRD) and have it autonomously:
- Draft and refine machine-verifiable requirements
- Decompose work into atomic, self-contained tickets
- Execute the full 8-phase lifecycle (Research → Review → Plan → Review → Implement → Verify → Code Review → Simplify) with clean context on every worker
- Run post-implementation deep reviews (Anatomy Park), code quality convergence (Szechuan Sauce), and conformance audits (Citadel)

It is a **Grok-native reimplementation** of the original [pickle-rick-claude](https://github.com/gregorydickson/pickle-rick-claude) system, rebuilt from the ground up to take advantage of Grok’s strengths (subagents with `fork_context: false`, worktree isolation, background tasks, named personas, and skills).

---

## Quick Start

```bash
# 1. Install
bash install.sh

# 2. Use (in any Grok session in your project)
"Help me write a PRD for bulk loan approvals"
"Refine this PRD"
"Build the tickets"
"Run the full pipeline"
```

Or use the slash commands directly:
- `/pickle-prd`
- `/pickle-refine-prd`
- `/pickle-rick`
- `/pickle-pipeline`
- `/microverse`, `/anatomy-park`, `/szechuan-sauce`, `/citadel`

See [INSTALL.md](INSTALL.md) for full installation details (including personas and optional `~/.grok/AGENTS.md` integration).

---

## Why a Separate Port?

- Claude Code delivery relies on **Stop hooks**, `settings.json` mutation, `~/.claude/commands/*.md`, and `claude -p` subprocesses.
- Grok Build gives us **skills**, `spawn_subagent` with `fork_context` + `isolation:worktree`, headless `-p`, background tasks, and a much cleaner permission/sandbox model.
- We can keep **100% of the hard engineering logic** (Citadel, convergence gates, 8-phase lifecycle, council fan-out, Portal Gun gene transfusion, etc.) while throwing away the hook machinery.

---

## Installation

```bash
bash install.sh
```

This does the following:
- Installs the full TypeScript engine + references to `~/.grok/pickle-rick-grok/`
- Installs all skills to `~/.grok/skills/pickle-rick-grok/`
- Installs the main Rick persona + all Morty phase personas to `~/.grok/personas/`
- Optionally appends a helpful section to your global `~/.grok/AGENTS.md`

After installation, you can run from any directory. The skills are automatically updated to point at the stable engine location.

Full details (including uninstall and project-local usage) are in [INSTALL.md](INSTALL.md).

## Documentation (Grok-Native)

- [GROK_ARCHITECTURE.md](GROK_ARCHITECTURE.md) — How the system maps to Grok primitives
- [PM_GUIDE.md](PM_GUIDE.md) — Product Manager’s Guide (adapted for Grok)
- [PRD_GUIDE.md](PRD_GUIDE.md) — How to write PRDs that work well with autonomous AI
- [INSTALL.md](INSTALL.md) — Installation, personas, and AGENTS.md integration

The core methodology is the same as the original Claude version. Only the delivery mechanism has been rebuilt for Grok’s strengths.
- Major skills: `/pickle-rick`, `/pickle-tmux`, `/pickle-pipeline`, `/microverse`, `/anatomy-park`, `/szechuan-sauce`, `/citadel`
- Phase prompts (`references/phases/`)
- Rick persona
- All design and evaluation docs

This is no longer "evaluation" — we are building the real thing.

---

## Guiding Philosophy (from the original)

- The **spec is the review**. Every requirement must be machine-verifiable.
- **Context clearing** between every worker iteration — no drift, even on 500-iteration epics.
- **Circuit breaker** that actually stops runaways (git progress + error signatures + degenerate-response detection).
- **Persona is optional** — Rick voice via conditional references in skill frontmatter.
- **Shared engine** — the TypeScript state machine, auditors, and runners are not reimplemented per CLI.

---

## Next Steps (when you're ready to build, not just evaluate)

1. Decide the canonical location of the shared engine (`pickle-rick-skills` vs. a new monorepo root).
2. Implement the Grok runtime adapter (prefer `spawn_subagent` with worktree isolation).
3. Flesh out the top 8-10 skills that deliver 80% of the value.
4. Port or wrap Citadel + Council (the two highest-ROI complex subsystems).
5. Write the Grok-specific install / plugin story (dramatically simpler than `install.sh`).

---

## Relationship to Other Variants

| Variant            | Host          | Delivery Mechanism                  | Status |
|--------------------|---------------|-------------------------------------|--------|
| pickle-rick-claude | Claude Code   | Hooks + commands + extension        | Production, gold master for Claude users |
| pickle-rick-skills | 8 CLIs (agentskills.io) | Shared scripts + runtime adapter | Partial, the "universal" attempt |
| pickle-rick-grok   | Grok Build    | Skills + native subagents           | Evaluation (this dir) |
| pickle-rick-codex / hermes / forgecode | Their hosts | Thin wrappers around the engine | Varying maturity |

The goal is that new algorithmic work lands in the **engine** once, then each host gets a thin, idiomatic surface.

---

*Wubba Lubba Dub Dub.* 🥒
