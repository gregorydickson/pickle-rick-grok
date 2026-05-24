# Refine PRD Contract — Large Agent Team Edition (The One Exception)

This document is the single source of truth for `/pickle-refine-prd`.

**Philosophy (per user directive)**:
> The only process that should **not** use headless `grok -p` subprocesses is PRD refinement.  
> Refinement is allowed (and required) to use rich native `spawn_subagent` "large agent teams" — multiple parallel specialized analysts, multiple critique cycles, high-context synthesis, and careful human-visible decomposition.

Everything after this point (the 8-phase ticket execution, anatomy, szechuan, citadel, self-improvement) uses the reliable detached `WorkerSpawner` + `grok -p` + `ManagerRitual` path for crash safety and detachability.

## The Three Analysts (always spawn with these exact persona names)
- `requirements-analyst` — from `references/personas/requirements-analyst.md`
- `codebase-analyst`
- `risk-analyst`

All three are spawned with:
```ts
spawn_subagent({
  subagent_type: "general-purpose",
  persona: "requirements-analyst",   // or the other two
  fork_context: false,               // clean slate every time
  // isolation: "none" is fine — they are read-heavy and write only analysis docs
  prompt: <full context + previous round outputs + "read each others' work and deepen">
})
```

## Refinement Cycle Protocol (Manager Rick owns this loop)
1. **Round 0 (optional bootstrap)**: Manager explores the tree + reads original `prd.md` + template.
2. **Round 1**: Spawn all three analysts **in parallel** with the original PRD + any existing codebase signals.
3. **Rounds 2..N** (usually 2 total, max 3 for very hairy PRDs):
   - Each analyst receives the full set of outputs from the previous round.
   - They are instructed to "read the other two analysts' work and either strengthen or refute".
   - Manager may add a 4th "synthesis critic" pass if the three are in violent agreement on something suspicious.
4. **Synthesis** (Manager only):
   - **Default**: Overwrite the **original input PRD file in place** with the refined version (rich ACs, machine Verifies, hardening section).
   - Rationale: "Refine this PRD" naturally means the supplied artifact gets upgraded. Separate `prd_refined.md` files create sprawl and version-tracking debt.
   - Legacy sidecar: Only emit an additional `prd_refined.md` if the user explicitly requests it.
   - The result must still be a strict superset of the original template with every requirement now having a real Verification column.
   - Append a "Hardening Tickets" section when the work is non-trivial.
5. **Decomposition** (Manager only):
   - Break the refined requirements into atomic `tickets/<NNN-slug>/ticket.md` files.
   - Use the shape in `references/refine/ticket-template.md`.
   - Every ticket gets 4–8 AC rows with runnable Verify commands.
   - Scope is brutally small.
   - Auto-emit 0–N hardening tickets (anatomy + szechuan) for the subsystems the analysts flagged.
6. **Persistence**:
   - If a sessionDir exists (from prior `/pickle-prd` or setup), write tickets under it and update `state.json` step to `breakdown` or `implementing`.
   - Always emit Activity events:
     - `refinement_completed` with ticket count + hardening count
     - `hardening_tickets_triggered` for each hardening ticket created
   - These are done via small `npx tsx -e 'import {Activity} from "./engine/src/activity-logger.js"; ...'` calls (same pattern used by the detached orchestrator and pipeline).

## Output Artifacts (non-negotiable)
- The **original PRD file** (updated in place with rich ACs, Verifies, and hardening section) — this is the new default.
- `tickets/` tree (under the session directory only) with one dir per ticket containing `ticket.md`
- Optional: `refine-summary.md`, analyst round notes, or `prd_refined.md` (only if user explicitly asked for sidecar)
- Activity events written to the unified log (refinement_completed, hardening_tickets_triggered)

## Hardening Ticket Rules
When analysts surface material risk or new subsystems, the manager **must** emit 1–2 extra tickets of the form:
- `H-{{NNN}} — Anatomy: data flows & trap doors in <subsystem> after <change>`
- `H-{{NNN}} — Szechuan: principle violations introduced by <feature>`

These hardening tickets are executed **after** the main implementation tickets in the pipeline, using the same 8-phase ritual but scoped to the final diff.

## Success Criteria for the Refine Step
- The original PRD file has been updated in place; every requirement row now has a non-theatrical, runnable Verify cell.
- Every Verify in the final PRD and every emitted ticket **must** be accompanied by Requirements Analyst round artifacts containing literal execution evidence (BASELINE run output on current tree) proving it was tested and is free of all patterns in the THEATER REJECTION RULE (see requirements-analyst.md). Manager must refuse synthesis if evidence is missing or any theatrical pattern remains.
- **Post-synthesis readiness gate** (engine/src/lib/readiness-gate.ts + bin/check-readiness.ts) **must pass with zero blocking findings** before <promise> or handoff to headless. The gate enforces machinability (MACHINE_HINT_RE vs PURE_PROSE), contract volume, and R-RTRC-7 path/symbol hygiene + exact forward-ref annotation format (one ASCII space + (forward-created) / (created by ticket ...) outside backticks, pre-verified via git). Writes readiness-gate-report.md artifact. Failures (including malformed anno → annotation_format) are blocking; report feeds closer for H- hardening auto-gen (see synthesis PRD 2026-05-24 + ticket-emitter integration).
- At least 60% of tickets are < 5 files changed (the analysts were good at scoping).
- Hardening tickets exist for any change that touches ritual, session, citadel, orchestrator, git_safety, or self-* surfaces.
- Manager emits `<promise>REFINEMENT_COMPLETE</promise>` (or the standard `TASK_COMPLETED` for pipeline handoff).

## Why This Step Alone Gets the Big Team Treatment
- Refinement is the **last high-judgment creative act** before we lock into atomic tickets.
- Once tickets exist, we want boring, reliable, detachable, crash-safe execution (hence `grok -p` + ritual + worktree isolation + promise tokens).
- The analysts need to argue with each other, read the live tree deeply, and iterate — exactly what native `spawn_subagent` + long manager context is good for.
- Headless single `grok -p` for refinement would be the same as the old Claude `-p` worker — we are deliberately choosing the richer native path here and only here.

Rick: "Refine like you mean it, Morty. Everything after this is just the machine eating the tickets. Make the food good."

Wubba lubba dub dub.