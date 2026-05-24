---
name: pickle-refine-prd
description: Run the large native agent team (Requirements + Codebase + Risk analysts) for parallel multi-cycle refinement + atomic ticket decomposition. This is the ONLY step allowed to use rich spawn_subagent teams instead of headless grok -p. Updates the original PRD **in place** by default (rich ACs, Verifies, hardening section) and emits session-owned tickets/. Sidecar `prd_refined.md` is opt-in only.
version: 3.2.0-grok-emission-quality-template-gates-2026-05-24
triggers:
  - pickle-refine-prd
  - refine prd
  - decompose tickets
  - 3-analyst
references:
  - path: ../../references/refine/refine-contract.md
  - path: ../../references/refine/ticket-template.md
  - path: ../../prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md
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

See the referenced `references/refine/refine-contract.md` (resolved relative to the skill or via install to the stable home).

## Step 0: Bootstrap / Session
**Always** obtain or create a canonical session first (the session directory is the run context for state + tickets).

**New P0-6 canonical flow (from run-pipeline)**:
- When the user (or /pickle-pipeline) says "run /pickle-refine-prd" after a `run-pipeline.ts --prd <foo>` invocation, the bin has *already* created the session, stamped the sourcePrd (in state + campaign-status.json + .prd-source.json sidecar), and printed `SESSION_ROOT=...`.
- **Do not run setup.ts again** (that would create a zombie/orphan). Use the SESSION_ROOT from the run-pipeline output.
- The stamp lets `/pickle-refine-prd` (and later run-pipeline --no-refine) know this session belongs to that PRD. Machine owns the linkage.

**If no stamped session was provided** (standalone refine or old sessions):
```bash
# Create (or resume) the session that will own the tickets
npx tsx engine/src/bin/setup.ts \
  --task "refine PRD + decompose to tickets" --runtime grok --backend grok [--resume]
```
Capture the `SESSION_ROOT=...` it prints.

From this point on, `sessionDir` owns `tickets/`.

`workingDir` (from session state) = the target tree being edited.  
`sessionDir/tickets/<id>/ticket.md` = where every physical ticket definition lives (via `SessionManager` + `persistTicket` via the emitter).

Never create a top-level `tickets/` at cwd root. This is the only layout the orchestrator, ritual, mux-runner, run-pipeline, and self-improvement loop consume.

Always discover the target root (usually `process.cwd()` or the grok install root).

The preflight in run-pipeline + stamp is what killed the zombie session problem.

## Step 1: Load Inputs
- Read the original `prd.md` (or `prds/latest.md` etc.)
- Read the referenced `references/prd-template.md` (portable across source and installed locations)
- Read the full refine contract: `references/refine/refine-contract.md` (resolved from skill root or installed home)
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
  prompt: `You are the Requirements Analyst. Read the original PRD and the prd-template. Explore the codebase. Produce your first-round analysis per your persona contract (including the AC_SHAPE_PROMPT_SECTION, PATH_VERIFICATION_PROMPT_SECTION, ACTIVITY_EVENT_SCHEMA_SECTION, and Ticket Complexity Classification at the end of the persona file). Emit the ac_shape_smells JSON, verify every backtick with git before emitting it, use exact activity event names, and classify ticket complexity. The other two analysts will see this.`
})

// Analyst 2 + 3 similarly with "codebase-analyst" and "risk-analyst" (pass them the full persona sections too)
```

Capture their outputs (the tool returns the full transcript + final text).

**Subsequent rounds (usually one more):**
Give **every** analyst the complete outputs of the previous round + instruction:
"Read the other two analysts' work. Strengthen, refute, or add depth. Pay special attention to anything the Risk analyst flagged."

You may do a 4th "synthesis critic" spawn if the three are suspiciously aligned on a risky area.

## Step 3: Synthesis (You, the Manager, do this)
After the analysts are quiet:

**Default behavior (in-place refinement)**: Overwrite the **original input PRD file** (the exact path the user supplied to you in Step 1) with the fully refined version.
   - This is now the canonical and preferred behavior. "Refine this PRD" means upgrade the artifact the user gave you.
   - Follow the exact structure of `../../references/prd-template.md`
   - Every single requirement row **must** have a real, runnable Verification column.
   - **THEATER AUDIT + PRE-EMIT GATES (non-negotiable before emit, per synthesis PRD `prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md`)**: For every proposed Verify in the AC/Verification tables (and Test Expectations), run the equivalent of `detectVerifyTheater` (from engine/src/lib/pipeline-preflight.ts) + mentally execute a BASELINE form on current tree. Enforce the new prescriptive Verify format (`— Verify: \`cmd\` — Type: ...`), Test Expectations table, forward-ref hygiene (exact `(forward-created)` / `(created by ticket ...)` annotation outside backticks, one space, pre-verified via git), and "no unresolved placeholders survive emission" rule. 
     - The emission must also satisfy (or attach explicit healer siblings for) the pre-emit gates: AC-shape smell detection (endpoint enumeration without universal quantifier collapsed to parametrized or justified+tested), path/symbol hygiene + symbol audit, readiness-style machinability/contract gate (`isMachineCheckable`, `MACHINE_HINT_RE` vs `PURE_PROSE_RE`, forward-ref parsing).
     - **Post-synthesis enforcement (manager must execute before calling emit or sealing)**:
       1. Parse every `## ac_shape_smells` JSON block from the three analysts' final round outputs (use regex or node -e to extract the object after the heading).
       2. Call `evaluateAcShapeEnforcement` (from engine/src/lib/pipeline-preflight.ts) on the collected smells array. If !passed, reject the smelly ACs: force a re-round with the analysts or rewrite with proper collapse/justification before proceeding.
       3. Run `scanAnalystOutputsForUnverifiedPaths` (same module) + the full `runReadinessGate` (from readiness-gate.ts) on the combined analyst outputs + your draft TicketSpec[] + manifest text. Any errors (esp. malformed forward-ref annotations, unverified backticked paths without git proof in transcripts, annotation_format findings) are severe: block synthesis, surface the exact violating tokens + required fix format, do not emit until clean (or waived with explicit H- healer sibling in the same batch).
       Emit clear errors in your thinking + write a `synthesis-enforcement-report.md` under session with the violations. Only clean or explicitly healed output reaches `emitRefineCouncilTickets`.
     - If ANY theatrical/non-runnable, bad annotation, placeholder, or non-deterministic pattern: either rewrite to clean concrete BASELINE/SUCCESS or explicitly attach sibling H-VERIFY-* healer(s) in the specs you will emit. Do not emit poison that would hard-stop the autonomous campaign.
   - **Always-emitted proactive hardening tickets (synthesis PRD §3)**: For non-trivial refines (anything beyond a trivial 1-ticket case), **always emit the canonical 4** (in addition to any theater-debt H-VERIFY healers):
     1. Code quality review of the feature area (P0-P1 violations, review-fix loop on MODIFIED_FILES union).
     2. Data flow integrity audit (3-phase trace + fix on AFFECTED_SUBSYSTEMS; trap doors on non-convergence).
     3. Test quality review (AC mapping, assertion strength, isolation, transforms).
     4. Cross-reference consistency audit (doc↔code, patterns, error codes, activity events, etc.).
     These are synthesized with concrete derived Verify commands from the tech stack analysis in earlier analyst steps. They are the proactive "schedule the fixers at emission time."
   - Add / ensure a "Hardening Tickets" section at the bottom (and produce the 4 + any risk-driven extras in the TicketSpec array passed to the emitter).
   - The file on disk is upgraded in place. No extra `prd_refined.md` sprawl.

**Legacy / opt-in sidecar mode**: Only if the user explicitly says "produce a separate prd_refined.md" (or passes a flag in future), emit an additional sidecar file. Default is always in-place.

2. Write a short `refine-summary.md` (optional but useful) capturing the key debates between the analysts. (You may also append analyst round notes under the session dir for auditability.)

## Step 4: Atomic Ticket Decomposition
**All tickets must be written under the session directory** (never at cwd root).

For every distinct, verifiable chunk use the **canonical reusable emitter** (no more /tmp scripts, no more hand-rolled markdown in the manager):

```ts
import { emitRefineCouncilTickets, type TicketSpec } from './engine/src/lib/ticket-emitter.js';   // or from the built dist

const specs: TicketSpec[] = [ /* collected from analyst council outputs */ ];

const result = await emitRefineCouncilTickets(sessionDir, specs, {
  updateStateToImplementing: true,
  emitActivity: true,
  grokRoot: discoveredRoot
});

console.log(`Emitted ${result.count} tickets (${result.hardeningCount} hardening)`);
```

**Post-Emit Readiness Gate (NEW — the post-synthesis static gate, mandatory before sealing for headless)**:
After the emitter returns, *immediately* run the full machinability + contract + path/forward-ref hygiene gate (the thing that would have caught the GitNexus stall at source):
```ts
import { runReadinessGate } from './engine/src/lib/readiness-gate.js';
// or the CLI: npx tsx engine/src/bin/check-readiness.ts --session ${sessionDir}

const gate = runReadinessGate(sessionDir, {
  grokRoot: discoveredRoot,
  writeReport: true,
  sessionDirForReport: sessionDir
});
if (!gate.ok || gate.blockingCount > 0) {
  console.error('READINESS GATE BLOCKED — detailed report written to readiness-gate-report.md');
  console.error(gate.summary);
  console.error('Suggested:', gate.suggestedHardening.join(' | '));
  // For council: do NOT emit REFINEMENT_COMPLETE / do not auto-chain headless yet.
  // Emit a healer H-REFINE-GATE-* if needed (emitter already did for basic theater), re-synth analysts with full injected hygiene prompts, or surface for manual.
  // The report artifact is the contract for closer/self-improvement (see task 2).
  throw new Error('Bad refine output — gate report in session dir. Fix before headless.');
}
console.log('Gate clean:', gate.summary, 'Report:', gate.reportPath);
```

The emitter itself (emitRefineCouncilTickets) now also runs this gate post-persist (see ticket-emitter.ts) and always produces the report artifact. The explicit call here makes the manager own the "refuse synthesis on bad output" contract from the Claude port + synthesis PRD.

`emitRefineCouncilTickets` (and the lower-level `emitRefinedTickets` + `generateTicketMarkdown`) is the single source of truth. It:
- Produces markdown that exactly follows `references/refine/ticket-template.md`
- Calls `persistTicket` for each
- Updates state.step + currentTicketId
- Fires the Activity events the metrics/standup/self-loop depend on

This is the library seam. The chat manager only collects the `TicketSpec` objects from the analysts — the machine owns the emission.

Use the exact shape from `../../references/refine/ticket-template.md`.

After all tickets:
- Update `state.tickets` array + `state.step = 'implementing'`
- `sm.writeState(sessionDir, state)`

Rules for good tickets (updated per synthesis PRD + prescriptive template):
- One focused change (ideally < 5 files, < 45 min for an implementer Morty)
- 4–8 AC rows using the **prescriptive Verify format** (`— Verify: \`concrete-cmd\` — Type: test|typecheck|...`) + explicit **Test Expectations table** (or equivalent mapping); all runnable, pre-baselined, theater-free.
- Explicit Scope list (the exact paths the implementer is allowed to touch)
- Clear Justification paragraph
- Forward-ref hygiene + no unresolved placeholders (enforced by pre-emit gates in emission)
- **Always** include the 4 proactive hardening tickets (see Step 3) for non-trivial work + any analyst-flagged risk ones (anatomy + szechuan etc.) as H- prefixed. The emitter (`emitRefineCouncilTickets`) + updated `references/refine/ticket-template.md` now bake in the full discipline.
- If the analysts flagged risk on a subsystem, emit a matching hardening ticket (anatomy + szechuan) as an extra ticket with "H-" prefix or in a later pass (the 4 are mandatory baseline)

Example ticket id pattern: `001-add-foo-bar`, `H-010-anatomy-ritual-after-x`, `H-VERIFY-EMIT-...` (auto healers)

## Step 5: Persist + Emit Events (Critical for Metrics & Pipeline Handoff)

The `emitRefineCouncilTickets` call in Step 4 already did the heavy lifting:
- Every ticket written via the canonical `persistTicket`
- State updated to `implementing`
- `refinementCompleted` + `hardeningTicketsTriggered` Activity events fired

If you emitted manually (legacy path), do the Activity bits yourself. The library path is preferred and already complete.

These events power `/pickle-metrics`, standup, and the self-improvement loop.

## Step 6: Handoff
Print a crisp summary:
- Number of tickets created
- Number of hardening tickets
- Original PRD path (now updated in place with rich ACs + Verifies)
- Session directory (the one that now owns the tickets, stamped to the PRD)
- Ready command: `npx tsx engine/src/bin/run-pipeline.ts --prd <the-original-prd> --no-refine --target <root> [--self-improvement] [--background]` (or bare `.../run-pipeline.ts <sessionDir> --no-refine` for power users; legacy: mux-runner or /pickle-tmux)

Then emit the completion token:

```
<promise>REFINEMENT_COMPLETE</promise>
```

If this was part of a run-pipeline flow (the common case now), **you finish it**.

Because you are the active refine manager in the direct lineage of the user's "run a pipeline" intent, auto-continue:

- Construct the plain continuation using the source root discovery (the same one the top persona and bin/grok-pipeline use): `bash <root>/bin/grok-pipeline --prd <the-original-prd-path> --background [--self-improvement if the original request or PRD was meta/self]`
- Call `run_terminal_command` with that command and `background: true`.
- Tell the user only the SESSION_ROOT + monitoring instructions.
- Emit the promise.
- Stop.

The next (auto-launched) invocation will hit the now-legal sealed prior (real tickets + manifest hash + sourcePrd stamp), skip the gate, and drive the full headless execution + Anatomy + Szechuan + closer. This is what "pipeline" means. Do not leave the user holding the next command.

(Only fall back to "re-invoke the plain command yourself" language if the context was explicitly "just do the refine, I'll handle execution".)

## Hard Rules You Must Never Violate
- **Never** use `grok -p` or `WorkerSpawner` for the analyst work in this skill. This is the deliberate large-team exception.
- Every analyst spawn must have `fork_context: false`.
- Every ticket must have machine-checkable Verify commands **in the new prescriptive format** (`— Verify: \`cmd\` — Type: ...`) + Test Expectations + forward-ref hygiene + zero unresolved placeholders (the Requirements Analyst's whole reason for existing). The canonical emitter and template now enforce this shape.
- **Refine output (updated PRD + emitted tickets) MUST pass the new pre-emit gates** (AC-shape smell detection, path/symbol verification hygiene with exact forward-ref annotation format, readiness-style machinability + contract + symbol audit) or carry explicit healer siblings, per the emission quality synthesis PRD `prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md`. This is required for reliable autonomous runs at 50+ ticket scale.
- Always emit the 4 proactive hardening tickets (code-qual, dataflow, test-qual, xref-consistency) for non-trivial cases + theater H-VERIFY healers (see Step 3). Hardening tickets are mandatory for any change that touches the meta surfaces (ritual, session, citadel, orchestrator, git_safety, self-*).
- Scope lists in tickets must be brutally honest — the ConvergenceGate will later punish violations.
- The original PRD (now updated in place) must be good enough that Citadel and the next self-PRD generator are happy with it. If a sidecar was explicitly requested, the `prd_refined.md` must also satisfy the same bar.
- **Post-synthesis readiness gate must pass with 0 blocking findings** (machinability + path/forward-ref hygiene per readiness-gate.ts + synthesis PRD). The report artifact + any debt must be in the session before <promise>REFINEMENT_COMPLETE</promise> or auto-chain to headless. Bad output is caught here, not 12h later in researcher.
- The improved runner skip behavior for research Verify blocks (pure DEFERRED/no-evidence cases treated as normal terminal `skipped` state, filtered from epic completion) is now a supported path; emission quality prevents the poison that used to cause total stalls.

## Why Only This Step Gets the Big Native Team
See the top of `../../references/refine/refine-contract.md`.  
Refinement is the last high-creativity, high-judgment, multi-perspective act. Once the tickets are cut, we want boring, reliable, detachable, resumable execution via the headless path. This split is intentional and architectural.

Rick: "The analysts are the last chance to catch Jerry's vague bullshit before it becomes 50 tickets of technical debt. Use the full power of Grok's spawn_subagent. Make the food good, Morty."

Wubba lubba dub dub. Now go decompose something worth building.
