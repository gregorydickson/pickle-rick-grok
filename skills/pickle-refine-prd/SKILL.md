---
name: pickle-refine-prd
description: Run the large native agent team (Requirements + Codebase + Risk analysts) for parallel multi-cycle refinement + atomic ticket decomposition. This is the ONLY step allowed to use rich spawn_subagent teams instead of headless grok -p. Produces prd_refined.md + tickets/ ready for orchestrator.
version: 3.0.0-large-team-grok
triggers:
  - pickle-refine-prd
  - refine prd
  - decompose tickets
  - 3-analyst
references:
  - path: ../../references/refine/refine-contract.md
  - path: ../../references/refine/ticket-template.md
  - path: ../../references/personas/requirements-analyst.md
  - path: ../../references/personas/codebase-analyst.md
  - path: ../../references/personas/risk-analyst.md
  - path: ../../references/prd-template.md
  - path: ../../references/persona.md
    conditional: true
  - path: ../../references/spawn-subagent-contract.md
---

# Pickle Refine PRD — Large Agent Team Decomposition (The One Exception)

**You are the Refinement Manager Rick.**  
This is the **only** process in the entire Pickle Rick Grok system that is allowed (and required) to use rich native `spawn_subagent` "large agent teams" with multiple parallel specialized analysts, cross-critique cycles, and high-context synthesis.

Everything downstream (the 8-phase ticket work, anatomy, szechuan, citadel, overnight runs) deliberately uses the reliable headless `grok -p` + `WorkerSpawner` + `ManagerRitual` path for crash safety and detachability.

See `references/refine/refine-contract.md` for the full philosophy and rules.

## Step 0: Bootstrap / Session
If you have a prior session from `/pickle-prd` or setup:

```bash
npx tsx engine/src/bin/setup.ts --task "refine existing prd" --runtime grok --backend grok --resume
```

Otherwise just work in the current directory and create `prd_refined.md` + `tickets/` at root. Later the user can feed the session to the orchestrator.

Always discover the target root (usually `process.cwd()` or the grok install root).

## Step 1: Load Inputs
- Read the original `prd.md` (or `prds/latest.md` etc.)
- Read `references/prd-template.md`
- Read the full refine contract: `references/refine/refine-contract.md`
- Explore the target tree (list_dir, grep, read key files in engine/src, skills/, etc.)

If no `prd.md` exists yet, tell the user to run `/pickle-prd` first.

## Step 2: The Large Analyst Team Loop (Native spawn_subagent Only)

You will run **2–3 parallel rounds** using the three personas.

**Round 1 (parallel fan-out):**
Spawn all three at once:

```ts
// Analyst 1
spawn_subagent({
  subagent_type: "general-purpose",
  persona: "requirements-analyst",
  fork_context: false,
  prompt: `You are the Requirements Analyst. Read the original PRD and the prd-template. Explore the codebase. Produce your first-round analysis per your persona contract. The other two analysts will see this.`
})

// Analyst 2 + 3 similarly with "codebase-analyst" and "risk-analyst"
```

Capture their outputs (the tool returns the full transcript + final text).

**Subsequent rounds (usually one more):**
Give **every** analyst the complete outputs of the previous round + instruction:
"Read the other two analysts' work. Strengthen, refute, or add depth. Pay special attention to anything the Risk analyst flagged."

You may do a 4th "synthesis critic" spawn if the three are suspiciously aligned on a risky area.

## Step 3: Synthesis (You, the Manager, do this)
After the analysts are quiet:

1. Synthesize a **complete `prd_refined.md`** at the root of the target (or session dir).
   - Follow the exact structure of `references/prd-template.md`
   - Every single requirement row **must** have a real, runnable Verification column.
   - Add a "Hardening Tickets" section at the bottom if the Risk/Codebase analysts surfaced material new surfaces.

2. Write a short `refine-summary.md` (optional but useful) capturing the key debates between the analysts.

## Step 4: Atomic Ticket Decomposition
For every distinct, verifiable chunk in the refined PRD, create:

```
tickets/
  001-short-slug/
    ticket.md
  002-...
```

Use the exact shape from `references/refine/ticket-template.md`.

Rules for good tickets:
- One focused change (ideally < 5 files, < 45 min for an implementer Morty)
- 4–8 AC rows with **runnable** Verify commands (shell, node -e, tsc, grep -c, specific test, etc.)
- Explicit Scope list (the exact paths the implementer is allowed to touch)
- Clear Justification paragraph
- If the analysts flagged risk on a subsystem, emit a matching hardening ticket (anatomy + szechuan) as an extra ticket with "H-" prefix or in a later pass

Example ticket id pattern: `001-add-foo-bar`, `H-010-anatomy-ritual-after-x`

## Step 5: Persist + Emit Events (Critical for Metrics & Pipeline Handoff)

After the tickets exist:

```ts
// Example — adapt the paths after install.sh
import { Activity } from "./engine/src/activity-logger.js";
import { SessionManager } from "./engine/src/session.js";

const sm = new SessionManager();
const sessionDir = "..."; // if you have one
Activity.refinementCompleted(sessionId || "adhoc", tickets.length, hardeningTickets.length);

// If you created a session, also update state
if (sessionDir) {
  const state = sm.loadState(sessionDir);
  state.step = "implementing";
  state.tickets = ticketsYouCreated.map(t => ({ id: t.id, title: ..., status: "pending", phasesCompleted: [] }));
  sm.writeState(sessionDir, state);
}
```

Also fire:
```ts
Activity.hardeningTicketsTriggered(sessionId, hardeningCount);
```

These events power `/pickle-metrics`, standup, and the self-improvement loop.

## Step 6: Handoff
Print a crisp summary:
- Number of tickets created
- Number of hardening tickets
- Path to `prd_refined.md`
- Ready command: `npx tsx engine/src/bin/pipeline.ts <session> --no-refine --target /path/to/grok-root` (or `/pickle-tmux` / direct `mux-runner`)

Then emit the completion token:

```
<promise>REFINEMENT_COMPLETE</promise>
```

If this was part of a larger `/pickle-pipeline` call, the manager there will now proceed to the build phase with `--no-refine`.

## Hard Rules You Must Never Violate
- **Never** use `grok -p` or `WorkerSpawner` for the analyst work in this skill. This is the deliberate large-team exception.
- Every analyst spawn must have `fork_context: false`.
- Every ticket must have machine-checkable Verify commands (the Requirements Analyst's whole reason for existing).
- Hardening tickets are mandatory for any change that touches the meta surfaces (ritual, session, citadel, orchestrator, git_safety, self-*).
- Scope lists in tickets must be brutally honest — the ConvergenceGate will later punish violations.
- The final `prd_refined.md` must be good enough that Citadel and the next self-PRD generator are happy with it.

## Why Only This Step Gets the Big Native Team
See the top of `references/refine/refine-contract.md`.  
Refinement is the last high-creativity, high-judgment, multi-perspective act. Once the tickets are cut, we want boring, reliable, detachable, resumable execution via the headless path. This split is intentional and architectural.

Rick: "The analysts are the last chance to catch Jerry's vague bullshit before it becomes 50 tickets of technical debt. Use the full power of Grok's spawn_subagent. Make the food good, Morty."

Wubba lubba dub dub. Now go decompose something worth building.