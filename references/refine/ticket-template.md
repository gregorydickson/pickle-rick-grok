# {{TICKET_ID}} — {{TITLE}}

<!-- P0 port from Claude sibling (prescriptive emission template):
     - Concrete form: Criterion text ends with " — Verify: `exact-cmd-here` — Type: shell|node|tsc|... "
     - Explicit Test Expectations table (populated 1:1+ from ACs)
     - "NO PLACEHOLDERS RULE" + forward-ref annotation (one space outside `) enforced at emission
     - References: prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md
     - Used by generateTicketMarkdown in ticket-emitter.ts and the 3 analyst personas + SKILL.md synthesis
-->

**Generated**: {{DATE}} via /pickle-refine-prd large-team decomposition
**Category**: {{CATEGORY}} | **Severity**: {{SEVERITY}}
**Source PRD**: the refined PRD (original file updated in place by `/pickle-refine-prd`, or `prd_refined.md` / `prd.md` in legacy runs) — see synthesis PRD `prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md` (includes post-synthesis readiness gate expectations)
**Working Dir**: {{GROK_ROOT}}

## Justification
{{JUSTIFICATION}}

This ticket was carved out of the refined PRD by the Requirements + Codebase + Risk analyst council. It is intentionally atomic: one focused change that a single Morty implementer can finish in one sitting (< 30-45 min ideal), with clear machine-checkable success criteria.

## Acceptance Criteria (machine-checkable)
| ID | Criterion | Verify |
|----|-----------|--------|
{{AC_TABLE_ROWS}}

<!-- Example of prescriptive row (what analysts + emitter produce; no placeholders):
| AC1 | The new helper `doTheThing` exists and returns the correct shape on happy path — Verify: `node -e '
  const {doTheThing} = require("./dist/lib/foo.js");
  console.log(JSON.stringify(doTheThing({x:1})));
' | grep -q '"ok":true' ` — Type: node |
-->

**Prescriptive Verify format (Claude-style, enforced at emission + all gates)**: Every Verify cell value **MUST** follow exactly:
`— Verify: `concrete-runnable-command` — Type: test|typecheck|lint|shell|grep|node|tsc|integration|fs|json|activity|...`
- Command must be directly executable today (BASELINE form on current tree succeeds or fails deterministically; no `|| echo`, no "manually observe", no post-change assumptions).
- Type classifies the check for readiness gate, symbol audit, and verifier.
- All such commands were literally executed by the emitting manager/analyst as BASELINE before `emitRefineCouncilTickets` (or equivalent) was called.

## Test Expectations
| ID | Scenario | Given / Pre-State (on current tree) | Then / Expected Result | Verify Command |
|----|----------|-------------------------------------|------------------------|----------------|
{{TEST_EXPECTATIONS_ROWS or "See AC Verifies above. For non-trivial tickets the Requirements Analyst populates 3–6 concrete rows at emission time mapping 1:1 (or better) to the ACs + edge cases. All entries machine-checkable; no prose-only expectations."}}

This table (or equivalent explicit mapping in the AC Verifies) makes success/failure unambiguous for Implementer + Verifier + Citadel. Every expectation has a corresponding runnable Verify.

## Contracts & Invariants
{{CONTRACTS}}

## Scope (Morty may ONLY touch these paths)
{{SCOPE_LIST}}

- No other files. Violating scope fails the ConvergenceGate in the ritual.

## Forward-Ref Hygiene + No-Placeholder Rule (pre-emit gates — non-negotiable)
**Path / symbol verification hygiene**: Every backticked path (`src/foo.ts`), symbol (`barBaz`), or command in Justification / AC table / Verifies / Scope / Contracts / Non-Goals **was pre-verified at HEAD** via `git ls-files --error-unmatch` or `git grep -l` (or equivalent) by the emitting analysts before inclusion. Stdlib, node:builtin, external packages, and pure prose never appear backticked.

**Forward-created annotation format (exact — outside backticks, single ASCII space separator)**:
- Existing on HEAD: `engine/src/lib/ticket-emitter.ts`
- Forward-created (new artifact introduced by work **in this ticket**): `src/new-thing.ts` (forward-created)
- Forward-created by this or sibling: `helper.ts` (created by ticket {{TICKET_ID}})
- Forward by prior/peer ticket: `docs/report.md` (introduced by ticket H-VERIFY-EMIT-042-abc) or `(created by ticket R-7f3a2b1c)`

Malformed annotation, unverified backtick, or phantom symbol → `annotation_format` or phantom finding in symbol audit / readiness gate. Blocks clean emission or triggers auto H-VERIFY healer sibling (never-stop policy).

**No unresolved placeholders survive emission rule**: The pre-emit gates (AC-shape smell detection, path/symbol hygiene, readiness-style machinability + contract gate using `MACHINE_HINT_RE` vs `PURE_PROSE_RE`, symbol audit) **guarantee** that no `{{PLACEHOLDER}}`, `TODO`, `NYI`, `placeholder`, `later`, `TBD`, "after the change", "once fixed", bare future-tense in AC/Verify/Scope/Contracts text reach the emitted `ticket.md`. All content is fully concrete the moment emission functions are called. Violations are rejected before the refine hands off to the autonomous runner.

See the synthesis PRD (sections 1–3) for the full AC_SHAPE_PROMPT_SECTION, PATH_VERIFICATION_PROMPT_SECTION, ACTIVITY_EVENT_SCHEMA_SECTION, `runAcShapeEnforcement`, `evaluateSymbolAudit`, `check-readiness --machinability-only --contract-only`, and the 4 always-emitted proactive hardening tickets.

## Non-Goals
{{NON_GOALS}}

## 8-Phase Notes for the Morty Team
- **Researcher** (MANDATORY THEATER AUDIT + NEW GATES AUDIT): First action — extract **only from the Acceptance Criteria table Verify/Verification column cells** (and Test Expectations table) every `Verify` backtick + the prescriptive `— Verify: `cmd` — Type: ...` forms from this ticket + parent PRD (ignore boilerplate, examples, contracts). Test each against forbidden patterns in research.md + `engine/src/lib/pipeline-preflight.ts:detectVerifyTheater`. Execute literal BASELINE on current tree for every one. 
  - Also audit for forward-ref hygiene violations (missing/malformed `(forward-created)` annotations on new paths) and unresolved placeholders.
  - If ANY theatrical/non-runnable, bad annotation, placeholder, or non-deterministic BASELINE: **check immediately for EMISSION_THEATER DEBT WAIVER block (or theaterWaiverSibling / auto sibling)**. 
  - If waiver: mark **Status: amber** (debt from producer; sibling H-VERIFY-EMIT-* auto-scheduled per "never stop + progress then fix"), document hits+baselines+annotation evidence, proceed. Else: **Status: blocked** with EMISSION_THEATER + "H-VERIFY + re-refine" prereq (except explicit hardening tickets). 
  - **New pre-emit context**: This ticket was only emitted after (or with healer for) the synthesis PRD gates: AC-shape smell detection (no uncollapsed enumeration without universal quantifier or JUSTIFICATION + test), path/symbol hygiene + forward-ref annotation enforcement, readiness-style machinability/contract gate. Improved runner skip behavior treats pure-research Verify blocks (DEFERRED / no evidence) as normal terminal state — `skipped` status makes them invisible to pending queue and filtered from `EPIC_COMPLETED` / phase completion (one bad early research ticket no longer freezes the campaign). Surface full evidence.
- **Planner**: Refuse any ticket whose research Readiness is blocked on EMISSION_THEATER / hygiene / placeholder or whose Verifies fail the theater list. One crisp plan only on clean runnable Verifies that passed pre-emit gates. Waived debt tickets (amber + sibling) are allowed to plan/impl.
- **Implementer**: make the change + write `implement_{{TICKET_ID}}.md` citing the exact Verify commands, their BASELINE/SUCCESS outputs, and any forward-ref artifacts created.
- **Verifier**: literally run every Verify command in the AC + Test Expectations tables. Fail the ticket if any red. **Additionally: if any Verify string matches theatrical patterns, or any path lacks correct forward-ref annotation, or placeholders remain: immediately fail the phase and write "INVALID SPEC — EMISSION_THEATER: <exact match>" (or hygiene/placeholder detail) in verify_*.md before running.**
- **Reviewer / Simplifier + Research/Plan Reviewers**: Explicitly re-audit all Verifies, Test Expectations, forward-ref annotations, and absence of placeholders in the ticket + artifacts. Any survivor → demand re-research or blocked status + EMISSION_THEATER/hygiene signal (unless explicit debt waiver block present).

## Hardening Tickets Attached (if any)
{{HARDENING_TICKETS}}

**Always-emitted proactive hardening (per synthesis PRD)**: For any non-trivial refine (not pure 1-ticket), the emission step produces (in addition to any theater-debt H-VERIFY healers) the canonical 4 proactive hardening tickets:
1. Code quality review of the feature area (P0-P1 violations, review-fix loop on MODIFIED_FILES union).
2. Data flow integrity audit (3-phase trace + fix on AFFECTED_SUBSYSTEMS; trap doors on non-convergence).
3. Test quality review (AC mapping, assertion strength, isolation, transforms).
4. Cross-reference consistency audit (doc↔code, patterns, error codes, activity events, etc.).
These are generated with concrete derived Verify commands from the tech stack analysis. They run after the main feature tickets in the pipeline. See synthesis PRD §3.

When all 8 phases have emitted `<promise>I AM DONE</promise>` and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table + Test Expectations + forward-refs are shit, the Morties will produce shit and the autonomous loop starves. The new pre-emit gates + prescriptive template + always-on H- quartet are the shift-left that makes 50-ticket overnight runs actually reliable. Garbage in, reliability-backlog bloats. Do better."
Wubba lubba dub dub.