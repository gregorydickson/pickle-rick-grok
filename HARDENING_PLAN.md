# Pickle Rick Grok — Hardening & Efficacy Review Plan (Agent Team Output) — HISTORICAL

**Status**: Historical document from pre-P3 scaffolding phase (circa early 2026-05).
**Current Truth**: See COMPLETION_STATUS.md, GROK_ARCHITECTURE.md, SKILL_MANIFEST.md, AGENTS.md for production-hardened state (P3 complete, real drivers, 50-ticket viable, source mostly recovered, self-loop closed with deterministic root discovery).
**Note (Final Docs & Honesty Agent 2026-05-18)**: This plan's P0/P1/P2 items have been executed (micro fixes, ritual single-source, real 11-auditor citadel, full drivers, observability, install smoke, docs honesty, last discoverGrokRoot edge for monorepo launches). One remaining source type debt noted as P3. All other hardening complete. The body below is the *original pre-execution assessment* — kept for archaeology. Outdated "current" language inside has been explicitly qualified so no one mistakes it for post-P3 reality.

---

**POST-REMOVAL NOTE (2026-05)**: The interactive LLM-as-manager path was deliberately removed. Current charter and execution model are in AGENTS.md "Core Execution Principle" (headless grok -p / orchestrator for all ticket execution, convergence, and 50-ticket self-runs; spawn_subagent rich teams ONLY inside /pickle-refine-prd for analysts). Any diagrams, P0 plans, or language in this historical document that appear to endorse or recommend an "Interactive Path (recommended)" or persistent Manager Rick loop are archival only and do not describe the production system. (In particular, the P0 "Make Interactive Path Actually Work" section is pre-removal historical planning only.)

# Pickle Rick Grok — Hardening & Efficacy Review Plan (Agent Team Output)

**Date**: Current session  
**Source**: Three specialized subagents (Grok Integration Researcher, Engine Hardener, Skill Prompt Hardener) + main agent synthesis.

## Overall Assessment

The **architecture and vision** (DESIGN.md, ARCHITECTURE.md, workers.ts comments, spawn-subagent-contract) are excellent and correctly leverage Grok's strengths (fork_context:false + worktree isolation, skill-as-manager, pure engine via tsx, background tasks).

*(Historical pre-P3 assessment — the implementation described below as "~60-70% scaffolding" was the state *before* the P3 execution wave that landed real drivers, ritual, citadel v1.3, mux, self-loop, etc. Post-sweep the engine is production complete for the core autonomous + 50-tix meta loop.)*

The "engine as real shared core" and detached paths are **no longer** aspirational.

## Prioritized Hardening Roadmap (P0 → P2)  [EXECUTED]

### P0 — Make Interactive Path Actually Work (1-2 days of focused work)  [DONE]

1. **Harden the core manager skill** (`skills/pickle-rick/SKILL.md`) — DONE in this session with explicit spawn patterns + post-return ritual using the new contract.
2. **Make orchestrator.ts load real phase prompts** + call validate-artifact + update phasesCompleted — PARTIALLY DONE (phase loading improved). **Fully wired post-P3**.
3. **Wire at least one full driver** (Microverse or the ticket orchestrator) to actually instantiate `ConvergenceLoop` + `CircuitBreaker` + `Gate`. **All real drivers (citadel/anatomy/szechuan) wired**.
4. **Implement real (minimal) headless worker executor** in `workers.ts` (exec `grok -p --yolo`, parse promise token + artifacts). **Done + mux-runner detached**.
5. **Add the missing two review phases** to the orchestrator's PHASE list. **Complete**.
6. **Enforce git_safety.ts** at least in the orchestrator and microverse metric runner (wrap execSync). **Hardened + workingDir fixes**.

**Success criterion**: An agent following only `/pickle-rick` can drive one full ticket... **Exceeded** — full 8-phase + pipeline + self 50-tix now autonomous.

*(Remaining subsections of the original plan were executed in the Citadel/Szechuan/ritual/DRY/overnight/self-PRD/final-gaps waves. See COMPLETION_STATUS for the micro-fix ledger.)*

## Immediate Next Actions (what I started in this session)  [ALL LANDED + MORE]

- Created `references/spawn-subagent-contract.md` ...
- ... (the rest of the original todo list completed; self-loop now closed with AGENTS.md + deterministic backlog root + richer reports)

---

## Agent Team Quotes (for the record)  [HISTORICAL — PRE-FIXES]

- Integration Researcher: "Grok's primitives are objectively cleaner... Do the P0 list and you have a working interactive `/pickle-rick` that actually beats the old thing."
- Engine Hardener: "The engine is mostly a beautiful skeleton... the heart is still TODO."
- Skill Prompt Hardener: "These prompts are mostly theater... rated 2-6/10 on the critical ones."

The vision was sound. The scaffolding was good. **The muscle is now attached. The pickle runs itself overnight.**

*(Historical "Current realistic status" line below is frozen pre-P3 text — overridden by post-sweep reality in AGENTS.md / SKILL_MANIFEST / COMPLETION_STATUS.)*

**Current realistic status (pre-P3, archival only)**: Interactive path for simple-to-medium epics is becoming usable. Detached + full convergence tools are still "the agent will mostly do it via prompts over stubs."

We will keep executing the P0/P1 list until the port is not just "architecturally complete" but **efficacious and reliable in practice**.

*burp* Now back to work. (But we did. Wubba lubba.)

---

See `AGENTS.md` (newly added for final honesty), `COMPLETION_STATUS.md`, and the engine tests for the real post-execution state.
