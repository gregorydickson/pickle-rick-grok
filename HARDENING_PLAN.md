# Pickle Rick Grok — Hardening & Efficacy Review Plan (Agent Team Output)

**Date**: Current session  
**Source**: Three specialized subagents (Grok Integration Researcher, Engine Hardener, Skill Prompt Hardener) + main agent synthesis.

## Overall Assessment

The **architecture and vision** (DESIGN.md, ARCHITECTURE.md, workers.ts comments, spawn-subagent-contract) are excellent and correctly leverage Grok's strengths (fork_context:false + worktree isolation, skill-as-manager, pure engine via tsx, background tasks).

The **implementation** is currently ~60-70% scaffolding. The interactive skill-driven path can work for simple cases because the prompts + references are decent. The "engine as real shared core" and detached paths are still mostly aspirational (many "would do", always-PASS stubs, missing wiring).

The agent team unanimously called out the gap between claims ("PORT COMPLETE", "full autonomous", "engine drives the loop") and reality (stubs + "the agent will figure out the loop").

**Goal of hardening**: Make the interactive `/pickle-rick` + `/pickle-pipeline` flows reliably executable by an agent using only the provided prompts + tools, with the TS engine providing real (not fake) state, validation, and safety. Make the detached path at least runnable.

---

## Prioritized Hardening Roadmap (P0 → P2)

### P0 — Make Interactive Path Actually Work (1-2 days of focused work)

1. **Harden the core manager skill** (`skills/pickle-rick/SKILL.md`) — DONE in this session with explicit spawn patterns + post-return ritual using the new contract.
2. **Make orchestrator.ts load real phase prompts** + call validate-artifact + update phasesCompleted — PARTIALLY DONE (phase loading improved).
3. **Wire at least one full driver** (Microverse or the ticket orchestrator) to actually instantiate `ConvergenceLoop` + `CircuitBreaker` + `Gate`.
4. **Implement real (minimal) headless worker executor** in `workers.ts` (exec `grok -p --yolo`, parse promise token + artifacts).
5. **Add the missing two review phases** to the orchestrator's PHASE list.
6. **Enforce git_safety.ts** at least in the orchestrator and microverse metric runner (wrap execSync).

**Success criterion**: An agent following only `/pickle-rick` can drive one full ticket (research → simplify) with real subagent calls, artifact validation, and state updates without the human intervening.

### P1 — Make the Specialized Tools Real (microverse, anatomy, szechuan, pipeline)

- Give each driver (`microverse.ts`, `anatomy.ts`, `szechuan.ts`) a real `run()` method that constructs a `ConvergenceLoop`.
- Flesh out `gate.ts` and `citadel.ts` with at least the top 4 auditors + actual command execution + baseline comparison.
- Harden the weakest skills (`pickle-pipeline`, `szechuan-sauce`, `pickle-tmux`, `citadel`) with the same explicit recipe style used for `/pickle-rick`.
- Make `bin/pipeline.ts` and `runners/mux-runner.ts` actually call the (hardened) orchestrator + drivers in sequence.

### P2 — Production Polish & Detached Reliability

- Real resumption (phase cursor per ticket, `currentTicketId`, `phasesCompleted`).
- Structured logging + activity.jsonl writer.
- Proper remediator inside the gate.
- Persona files + registration instructions.
- Tests for the core state machines and classify logic.
- MCP surface for session/ticket queries.
- Honest status labels in README / help-pickle (mark which parts are stub vs real).
- Packaging / install story (`cp -r skills references engine ~/.grok/pickle-rick-grok` + one command to register).

---

## Immediate Next Actions (what I started in this session)

- Created `references/spawn-subagent-contract.md` (recommended by the skill reviewer).
- Major rewrite of `skills/pickle-rick/SKILL.md` to be a real executable playbook (score should jump from 4/10 → 8+/10).
- Improved `engine/src/bin/orchestrator.ts` to load real phase markdown files.
- Added `validate-artifact.ts` usage pattern.

**Continuing in this spirit** (next concrete steps the main agent will execute unless told otherwise):

1. Implement a minimal working `spawnViaHeadless` in `workers.ts` that actually shells `grok -p`.
2. Wire `CircuitBreaker` + basic gate call into the orchestrator after every phase.
3. Harden `/pickle-pipeline` and `/szechuan-sauce` SKILL.md with the same explicit style.
4. Make at least MicroverseDriver actually use ConvergenceLoop in a `run()` method.
5. Add honest "Implementation Status" sections to the weakest skills and the main README.

---

## Agent Team Quotes (for the record)

- Integration Researcher: "Grok's primitives are objectively cleaner... Do the P0 list and you have a working interactive `/pickle-rick` that actually beats the old thing."
- Engine Hardener: "The engine is mostly a beautiful skeleton... the heart is still TODO."
- Skill Prompt Hardener: "These prompts are mostly theater... rated 2-6/10 on the critical ones."

The vision is sound. The scaffolding is good. The muscle needs to be attached.

**Current realistic status**: Interactive path for simple-to-medium epics is becoming usable. Detached + full convergence tools are still "the agent will mostly do it via prompts over stubs."

We will keep executing the P0/P1 list until the port is not just "architecturally complete" but **efficacious and reliable in practice**.

*burp* Now back to work.
