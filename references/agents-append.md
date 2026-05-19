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

When spawning subagents, prefer the installed personas:
- "pickle-rick" (voice and refinement-only manager role; see scoped language in the installed `persona.md` / `pickle-rick.md` — NEVER for driving full ticket execution)
- "morty-phase-researcher", "morty-phase-implementer", "morty-phase-verifier", "morty-phase-reviewer", etc. (the actual phase workers under the headless orchestrator)

**Never** use `spawn_subagent` + "pickle-rick" (or any persistent manager persona) to babysit the multi-phase / multi-ticket lifecycle. Dispatch to the detached engine instead. Violating the Core Execution Principle defeats the entire point of the Grok port and the 50-ticket overnight autonomy guarantee.

Run `bash ~/.grok/pickle-rick-grok/uninstall.sh` (or wherever you installed from) to remove.

# === End Pickle Rick ===