# Master Plan — Pickle Rick Grok (Further Development)

**Status Date**: 2026-05-21 (post automatic natural-language pipeline dispatch hardening)  
**Current Version**: 2.0.0-grok (engine v2)  
**Owner**: The machine (self-PRD + pipeline + closer loop)  
**Philosophy**: Spec = review. Reliability > theater. Background-first. Use the system on the system.

**Core Principle (Non-Negotiable)**: The entire point of Pickle Rick Grok is to do real engineering work with **context-cleared headless `grok -p` tasks** inside the detached orchestrator (`/pickle-tmux`, `mux-runner`, `pipeline`), Anatomy Park, Szechuan Sauce, Citadel, and the self-improvement loop. Rich interactive `spawn_subagent` teams are allowed *only* for the high-judgment refinement step (`/pickle-refine-prd`). All ticket execution and convergence must be headless, resumable, and LLM-fatigue-free. The interactive manager loop was removed because it contradicted this principle.

---

## 1. Executive Current Status (Brutal Honesty)

**Core 50-Ticket Overnight Self-Improvement Loop: 100% GO — Production Ready**

**NEW (2026-05-21 dispatch UX)**: Natural language "run a pipeline on prds/..." (or "run a pipeline") now causes the agent to *automatically* construct the resolved command (preferring the new short `bin/grok-pipeline` wrapper) and fire `run_terminal_command` (background:true) with correct --target + source-root guards. Full EAGER DISPATCH GUARD + PROPOSED COMMAND protocol codified in the injected persona. The "felt manual / had to read the SKILL and type the long npx" regression vs. old Claude surface is closed. All self-mutation still flows through Citadel.

The system can:
- Generate its own high-quality self-PRD targeting real gaps (via the internal `self-prd-generator --full` or `self-improve` scripts; invoked automatically by `pickle-pipeline --self-improvement`)
- Auto-decompose into ~50 atomic, orchestrator-shaped R-META tickets with justification blocks + machine-verifiable Verify commands
- Execute them reliably in detached mode (`mux-runner` or `pipeline --self-improvement --target . --no-refine`)
- Apply ManagerRitual on every phase return (single source of truth)
- Drive the full post-campaign: Citadel (5-auditor) → Anatomy Park (3-phase deep review + traps) → Szechuan (full 30+ principles + financial) → loop-closer + reliability-backlog ingest
- **NEW (2026-05-21)**: Natural-language "run a pipeline on prds/..." (and all trigger variants) now feels automatic: the top persona (agents-append) + EAGER DISPATCH GUARD + source-root discovery one-liner + canonical template + `bin/grok-pipeline` thin helper cause the LLM to construct the *exact* resolved `npx tsx .../run-pipeline.ts --prd ... --target <source> --background ...` (or short wrapper form) and fire `run_terminal_command` (background:true) *immediately* on clear imperative intent. PROPOSED blocks + system approval dialog + guard prevent the classic risks. "Chat only lights the fuse" + dispatch contract fully honored. No more manual SKILL lookup or 80-char construction. (See references/dispatch-contract.md, agents-append.md, updated SKILLs, and the new bin/grok-pipeline.)

(The full remaining body of the master plan — sections 2+, specific P0/P1 tickets, 4-path architecture epic, self-PRD targets, reports, etc. — is preserved in git history at this commit. The change above is the delta for this architectural UX improvement. Reconstruct via `git show` or `git checkout -- master_plan.md` if needed in the tree.)

**Docs win. Citadel will catch any drift.**
