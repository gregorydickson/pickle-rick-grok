# === Pickle Rick (Grok) ===

**CORE EXECUTION PRINCIPLE — CONTEXT-CLEARED HEADLESS `grok -p` IS THE POINT (NON-NEGOTIABLE)**

The entire reason this project exists is to perform serious engineering work using **context-cleared headless `grok -p` tasks** driven by the detached TypeScript orchestrator.

This is the production path in: `/pickle-tmux`, `mux-runner`, `orchestrator`, `pipeline`, Anatomy Park driver, Szechuan Sauce driver, Citadel, self-improvement loop, etc.

`WorkerSpawner` + `grok -p --yolo` + `ManagerRitual` + `ConvergenceGate` + `CircuitBreaker` on every phase is not a fallback — it is the deliberate design for reliability, resumability, crash safety, and true per-phase context clearing at 50+ ticket scale.

Rich native `spawn_subagent` (large agent teams) is **restricted by policy** to one place only: PRD refinement (`/pickle-refine-prd` with the Requirements + Codebase + Risk analyst council). Everything after ticket decomposition must use the headless detached path.

The old interactive LLM-as-manager loop (`/pickle-rick`) was removed precisely because it violated this principle. Long-running autonomous work requires the machine, not a tired LLM babysitting the conversation.

Any future feature that tries to re-introduce a persistent interactive manager loop for ticket execution is a violation of the project charter and must be rejected.

See root `AGENTS.md` (and the installed copy under `~/.grok/pickle-rick-grok/AGENTS.md`) for the full brutal honesty contract, trap doors, and self-loop rules.

Pickle Rick is installed.

Useful commands:
- /pickle-prd
- /pickle-refine-prd   (THE ONLY step that uses rich native `spawn_subagent` analyst teams — Requirements + Codebase + Risk council)
- /pickle-tmux         (PRIMARY detached orchestrator path — fire and forget, resumable, crash-safe)
- /pickle-pipeline     (full autonomous chain: optional refine + build + real citadel (5-auditor) + anatomy-park + szechuan-sauce + optional self-improvement meta loop)
- /microverse
- /anatomy-park
- /szechuan-sauce
- /citadel
- /pickle-metrics
- /pickle-standup
- /help-pickle
- /pickle-self-prd (generator + full meta dogfood campaign)

When spawning subagents, there are two distinct modes:

**1. Production Execution (inside real tickets)**
Use the installed Morty pipeline workers:
- "morty-phase-researcher", "morty-phase-implementer", "morty-phase-verifier", "morty-phase-reviewer", "morty-phase-simplifier", etc.
These are the correct workers when running through the orchestrator, ritual, and gates on formal tickets.

**2. Engineering & Development Work (in the chat)**
Use native Grok agent teams. The following engineering personas are installed with Pickle Rick Grok and are explicitly designed for flexible, ticket-free development work:
- "requirements-analyst", "codebase-analyst", "risk-analyst"
- "engineering-architect"
- "backend-reviewer-fixer"
- "frontend-reviewer-fixer"
- "code-simplifier"

See `references/personas/engineering-council.md` (after install: `~/.grok/pickle-rick-grok/references/personas/engineering-council.md`) for the recommended way to compose a strong engineering council.

**Critical Rule**: The strict "must have a TICKET_DIR" behavior only applies to the Morty phase workers when they are being used for orchestrated pipeline execution. For normal development, analysis, refactoring, and design work, you should continue using Grok's native `spawn_subagent` capability with flexible teams. The installation of Pickle Rick Grok is not intended to remove or degrade your ability to run rich agent teams in chat.

**Never** use `spawn_subagent` + "pickle-rick" (or any persistent manager persona) to babysit the multi-phase / multi-ticket lifecycle. That pattern is reserved for the detached engine.

Run `bash ~/.grok/pickle-rick-grok/uninstall.sh` (or wherever you installed from) to remove.

# === End Pickle Rick ===