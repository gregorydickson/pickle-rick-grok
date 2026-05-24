# Fix Runner + Ritual Desync After Large Researcher Phase Output (Promise Emitted but Phase Never Advanced)

**Date**: 2026-05-23  
**Origin**: Real production failure during autonomous run of `prds/gitnexus-deep-codebase-intelligence-integration-2026-05-21.md` (session `2026-05-22-c6176642`). Researcher for first ticket (H-002) completed and emitted `<promise>I AM DONE</promise>` in its stdout/log. The driving `mux-runner` process died (or its output capture broke on a ~28 KB single-line research blob). Subsequent re-launches of the runner on the same session hung or made zero progress. The ritual never materialized the `research_*.md` artifact, never updated `phasesCompleted`, and left the ticket in a permanent "researcher still running" state. Manual intervention outside the pipeline was required to unblock the core hygiene change.  

This violates the core invariant that **the autonomous pipeline must keep working and make forward progress even when workers or the runner process die**.

---

## Incident Summary

- `bash bin/grok-pipeline --prd prds/gitnexus-... --with-gitnexus --background` created a fresh session and launched the detached mux-runner.
- The researcher for `H-002-gitnexus-gitignore-hygiene` ran, performed its mandatory theater audit + baselines, produced a very large structured research report (28 KB), and correctly terminated with the promise token.
- The log file existed and contained the promise, but:
  - No `tickets/H-002/research_H-002-....md` was ever written.
  - `state.json` for the ticket kept `phasesCompleted: []` and `status: "in_progress"`.
  - `campaign-status.json` heartbeat froze on "HEARTBEAT ...@morty-phase-researcher".
- Any later `npx tsx .../mux-runner.ts <session>` either hung for minutes with no output or made no state progress.
- The session became unusable for autonomous execution. The only way to make progress on the actual engineering (the `.gitnexus/` hygiene) was manual chat patches — exactly what the "chat only lights the fuse" + headless ritual contract forbids.

The remaining three tickets (H-005 + two auto-generated H-VERIFY healers for the emission theater the refine step itself introduced) were never reached.

---

## Objective

Make the `mux-runner` + `ManagerRitual` + phase completion path **resilient to process death and large worker output** so that:

- A worker can finish (emit its promise in stdout/log) even if the parent runner dies immediately afterward.
- A fresh `mux-runner <session>` invocation can detect "this phase's worker log contains a valid completion promise but the expected artifact is missing" and **reconstruct/materialize the artifact + advance the ritual** without human intervention.
- Researcher (and other phases that can produce large reports) never again produce unparsable stdout blobs that poison the resumption path.
- The system stays in a state where `bash bin/grok-pipeline --prd <same-prd>` or direct `mux-runner <session>` "just works" even after hours of the runner being dead.

The fix must be fully autonomous — no chat/manual surgery allowed for future incidents of this class.

---

## Scope

**In scope (P0 for autonomy)**
- Detection + recovery of a completed phase from its worker log when the runner is re-launched.
- Safe materialization of the phase artifact (`research_*.md`, `plan_*.md`, etc.) from the captured worker output when it is missing.
- Hardening of the researcher contract + output handling so large-but-valid reports do not break the runner (size limits, streaming to artifact file directly, NDJSON or length-prefixed framing, etc.).
- Unit/integration tests that simulate "runner dies after promise, new runner resumes" for the researcher → research_review handoff (the exact failure point).
- Clear error + recovery logging so the next self-PRD generator / closer can see what happened.

**Out of scope (P2/P3)**
- Full replay of every intermediate tool call the researcher made.
- Changing how the rich refine council (the only place that uses big `spawn_subagent` teams) produces output.
- Generic "arbitrary large stdout" handling for every possible future phase.

---

## Functional Requirements

| ID | Requirement | Verification (runnable today or after the fix) |
|----|-------------|------------------------------------------------|
| P0-1 | When a researcher log file for a ticket contains a well-formed `<promise>I AM DONE</promise>` (anywhere in the captured output) but the corresponding `research_<id>.md` does not exist in the ticket dir, the next `mux-runner <session>` invocation must write a usable research artifact (containing the key findings + the researcher's final assessment) and advance the ticket's `phasesCompleted` to include "research". | Create a temp session + ticket + fake completed researcher log (with promise at the end, no artifact yet) → run `npx tsx engine/src/runners/mux-runner.ts <temp-session>` → assert the md file now exists with non-trivial content and `state.json` shows the phase complete. Must pass on a clean tree. |
| P0-2 | The researcher phase contract (and the worker harness) must guarantee that the final output containing the promise is written in a form the resumption logic can reliably extract (no more 28 KB single-line blobs that choke line-based or size-assuming parsers). | The researcher must either (a) write its final report directly to `tickets/<id>/research_<id>.md` and only emit a short summary + promise on stdout, or (b) use a framed/NDJSON format that the runner can parse incrementally. After the change, `grep -c $'\n' <log>` on a real researcher run must be >> 1 and the resumption test in P0-1 must still pass. |
| P0-3 | Re-launching the runner on a session that has a mix of completed phases (with promises in logs) and pending phases must only advance the completed ones and then correctly start the next pending phase (research_review or the healer sibling in the observed failure). It must not re-run already-completed researchers. | Same temp-session setup as P0-1, plus one additional pending ticket. After one runner pass the completed ticket must be advanced and the next pending ticket must have a fresh researcher process started (new log file appears). |
| P0-4 | The recovery path must be idempotent and safe. Running the runner 10 times on the same "promise present, artifact missing" situation must produce the same artifact and not corrupt state or create duplicate files. | The P0-1 test wrapped in a loop of 5 re-launches; after the first run the artifact must exist and subsequent runs must be no-ops for that phase (exit code 0, no new files, state unchanged for that ticket). |
| P0-5 | All of the above must work for the exact failure mode observed: a researcher that produced a very large report because the ticket itself was meta (emission theater, waiver sibling, long file:line analysis). The recovery must not depend on the report being small. | The test harness must be able to inject a 30+ KB research blob (copy of the real one from the incident) and still pass P0-1–P0-4. |

---

## Non-Functional / Cross-Cutting

- Recovery must be fast (< 5 s for a session with one large completed phase).
- The mechanism must live in the runner/ritual layer (not require changes to every phase worker except the researcher output contract).
- Must not regress normal happy-path runs (small reports, runner never dies).
- Must not introduce new sources of theater in the recovery logic itself (all new Verifies must be BASELINE + SUCCESS and actually executed in the test).

---

## Risks & Trap Doors

**P0 — "We already have logs, why didn't resumption just work?"**  
The original runner had no "replay from finished worker log" code path at all. It only ever advanced state while it was the live parent of the worker. Once it died, the information in the log was invisible to any future runner instance.

**P0 — Giant stdout poisoning the parser**  
The researcher (when given a complex meta ticket) produced its entire final report as one enormous stdout payload. Any assumption in the runner that "worker output will be line-oriented, reasonably sized, or will be consumed while the process is still alive" was violated.

**MED — Artifact format drift**  
If the recovery logic guesses the wrong structure for `research_*.md`, later phases (planner, verifier) will see garbage. The researcher must be the source of truth for what the artifact should contain; recovery should prefer "let the researcher write the real file" over "reconstruct from log".

**MED — Self-mut during recovery**  
The recovery code will touch session state and ticket directories. It must go through the same `withFileLock` + atomic write paths as the live ritual, and it must be covered by the existing `FORBIDDEN_SELF_MUT` / Citadel rules.

---

## Implementation Sketch (for the eventual tickets)

1. Add a small "phase completion healer" inside `mux-runner.ts` (or a new helper in `ritual.ts`) that, on startup for a session, scans every ticket's `tmp/worker-logs/` for files whose content contains the promise token but whose corresponding artifact is missing in the ticket dir.
2. For each such orphan, extract the final report section, write the canonical `research_<id>.md` (or the appropriate artifact name for the phase), call the same `markPhaseComplete` / state update logic the live runner uses, and log a clear "RECOVERED ORPHAN PHASE" event.
3. Change the researcher worker contract (in `references/phases/research.md` + the actual researcher prompt) so that it writes its final structured report directly to the expected `research_*.md` path inside the ticket directory (using the same safe-write helpers) and only emits a short "Research complete, see artifact" + the promise token on stdout. This makes the stdout tiny and the artifact authoritative.
4. Add a test in `engine/tests/` (or a new `orchestrator-resumption.test.ts`) that:
   - Creates a minimal session + ticket
   - Writes a fake completed researcher log containing a large report + promise
   - Runs the mux-runner binary against it
   - Asserts the artifact appears and the next phase is attempted
5. Wire the new recovery into the normal startup of `mux-runner` (before it claims the session or starts new workers) so it is always exercised.
6. Update the researcher prompt and any "keep your output reasonable" guidance in the phase docs.
7. Add Activity events for "phase_recovered_from_orphan_log".
8. Make sure the healer tickets that were auto-generated for emission theater in the original failure can now actually run (the resumption path must work for H-VERIFY tickets too).

All changes must pass the existing ritual, preflight, and Citadel tests plus the new resumption harness.

---

## Completion Checklist

- [ ] P0-1 through P0-5 Verifies pass on a clean checkout (including the 30 KB blob case).
- [ ] A fresh `bash bin/grok-pipeline --prd <any PRD>` that dies mid-researcher can be resumed later and will still complete the campaign without manual surgery.
- [ ] The GitNexus hygiene PRD incident (session 2026-05-22-c6176642) is closed as "root cause fixed; no more manual unblocks required".
- [ ] The recovery path itself has machine-checkable Verifies and is covered by the emission-theater / self-mut auditors.
- [ ] Next self-improvement cycle can run a meta ticket that deliberately kills the runner mid-researcher and asserts clean resumption.

**Wubba lubba dub dub.** The babysitter must be able to die and the Morties must still finish the job. No more "researcher said the words but nobody was listening."

---

**References for the diagnostic team**
- Observed failure session: `2026-05-22-c6176642` (kept as forensic; logs + giant researcher output preserved for reproduction).
- Key surfaces: `engine/src/runners/mux-runner.ts`, `engine/src/ritual.ts`, `references/phases/research.md`, the researcher prompt template, worker output capture, `tickets/<id>/research_*.md` contract, `state.json` `phasesCompleted` updates.
- The exact 28 KB researcher log that exposed the bug is still in the forensic session's `tmp/worker-logs/`.

This PRD is ready for `/pickle-refine-prd` (rich Requirements + Codebase + Risk council) followed by the full autonomous pipeline. The diagnostic deep-dive and ticket decomposition must happen inside the allowed rich team step so that the analysis itself is captured in the campaign artifacts and the resulting tickets are high-quality and autonomous.