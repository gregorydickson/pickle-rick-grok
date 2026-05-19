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
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/refine/refine-contract.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/refine/ticket-template.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/personas/requirements-analyst.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/personas/codebase-analyst.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/personas/risk-analyst.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/prd-template.md
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/persona.md
    conditional: true
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/spawn-subagent-contract.md
---

# Pickle Refine PRD — Large Agent Team Decomposition (The One Exception)

**You are the Refinement Manager Rick.**  
This is the **only** process in the entire Pickle Rick Grok system that is allowed (and required) to use rich native `spawn_subagent` "large agent teams" with multiple parallel specialized analysts, cross-critique cycles, and high-context synthesis.

Everything downstream (the 8-phase ticket work, anatomy, szechuan, citadel, overnight runs) deliberately uses the reliable headless `grok -p` + `WorkerSpawner` + `ManagerRitual` path for crash safety and detachability.

See `/Users/gregorydickson/.grok/pickle-rick-grok/references/refine/refine-contract.md` for the full philosophy and rules.

## Step 0: Bootstrap / Session
**Always** obtain or create a canonical session first (the session directory is the run context for state + tickets).

```bash
# Create (or resume) the session that will own the tickets
npx tsx /Users/gregorydickson/.grok/pickle-rick-grok/engine/src/bin/setup.ts \
  --task "refine PRD + decompose to tickets" --runtime grok --backend grok [--resume]
```

Capture the `SESSION_ROOT=...` it prints. From this point on, `sessionDir` owns `tickets/`.

`workingDir` (from session state) = the target tree being edited.  
`sessionDir/tickets/<id>/ticket.md` = where every physical ticket definition lives (via `SessionManager` + `persistTicket`).

Never create a top-level `tickets/` at cwd root. This is the only layout the orchestrator, ritual, mux-runner, and self-improvement loop consume.

Always discover the target root (usually `process.cwd()` or the grok install root).

## Step 1: Load Inputs
- Read the original `prd.md` (or `prds/latest.md` etc.)
- Read `/Users/gregorydickson/.grok/pickle-rick-grok/references/prd-template.md`
- Read the full refine contract: `/Users/gregorydickson/.grok/pickle-rick-grok/references/refine/refine-contract.md`
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
   - Follow the exact structure of `/Users/gregorydickson/.grok/pickle-rick-grok/references/prd-template.md`
   - Every single requirement row **must** have a real, runnable Verification column.
   - Add a "Hardening Tickets" section at the bottom if the Risk/Codebase analysts surfaced material new surfaces.

2. Write a short `refine-summary.md` (optional but useful) capturing the key debates between the analysts.

## Step 4: Atomic Ticket Decomposition
**All tickets must be written under the session directory** (never at cwd root).

For every distinct, verifiable chunk use the canonical helper:

```ts
const sm = new SessionManager();
const md = ticketMarkdownFromTemplate; // exact from ticket-template + this chunk's data
await sm.persistTicket(sessionDir, ticketId, md, {
  title: "...",
  status: 'pending',
  phasesCompleted: [],
  // isSelfMeta, meta, or any other Ticket fields — persistTicket does the spread + registration
});
```

`persistTicket` is now THE ONLY pattern for emitting tickets from refine (or self-prd, or future tools). It handles dir, md write, Ticket construction, and locked add under one roof.

Use the exact shape from `/Users/gregorydickson/.grok/pickle-rick-grok/references/refine/ticket-template.md`.

After all tickets:
- Update `state.tickets` array + `state.step = 'implementing'`
- `sm.writeState(sessionDir, state)`

Rules for good tickets:
- One focused change (ideally < 5 files, < 45 min for an implementer Morty)
- 4–8 AC rows with **runnable** Verify commands (shell, node -e, tsc, grep -c, specific test, etc.)
- Explicit Scope list (the exact paths the implementer is allowed to touch)
- Clear Justification paragraph
- If the analysts flagged risk on a subsystem, emit a matching hardening ticket (anatomy + szechuan) as an extra ticket with "H-" prefix or in a later pass

Example ticket id pattern: `001-add-foo-bar`, `H-010-anatomy-ritual-after-x`

## Step 5: Persist + Emit Events (Critical for Metrics & Pipeline Handoff)

After writing every `ticket.md` via `persistTicket` (never manual ensureTicketDir + writeFileSync + addTicket, never at cwd root):

```ts
import { Activity } from "./engine/src/activity-logger.js";
import { SessionManager } from "./engine/src/session.js";

const sm = new SessionManager();
const sessionDir = "..."; // from Step 0

// Tickets already written + registered via persistTicket above

const state = sm.loadState(sessionDir);
state.step = "implementing";
sm.writeState(sessionDir, state);

Activity.refinementCompleted(state.sessionId, tickets.length, hardeningTickets.length);
Activity.hardeningTicketsTriggered(state.sessionId, hardeningCount);
```

These events power `/pickle-metrics`, standup, and the self-improvement loop.

## Step 6: Handoff
Print a crisp summary:
- Number of tickets created
- Number of hardening tickets
- Path to `prd_refined.md`
- Session directory (the one that now owns the tickets)
- Ready command: `npx tsx engine/src/runners/mux-runner.ts <sessionDir>` or `npx tsx engine/src/bin/pipeline.ts <sessionDir> --no-refine --target <root>` (or `/pickle-tmux`)

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
See the top of `/Users/gregorydickson/.grok/pickle-rick-grok/references/refine/refine-contract.md`.  
Refinement is the last high-creativity, high-judgment, multi-perspective act. Once the tickets are cut, we want boring, reliable, detachable, resumable execution via the headless path. This split is intentional and architectural.

Rick: "The analysts are the last chance to catch Jerry's vague bullshit before it becomes 50 tickets of technical debt. Use the full power of Grok's spawn_subagent. Make the food good, Morty."

Wubba lubba dub dub. Now go decompose something worth building.
