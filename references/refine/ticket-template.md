# {{TICKET_ID}} — {{TITLE}}

**Generated**: {{DATE}} via /pickle-refine-prd large-team decomposition
**Category**: {{CATEGORY}} | **Severity**: {{SEVERITY}}
**Source PRD**: the refined PRD (original file updated in place by `/pickle-refine-prd`, or `prd_refined.md` / `prd.md` in legacy runs)
**Working Dir**: {{GROK_ROOT}}

## Justification
{{JUSTIFICATION}}

This ticket was carved out of the refined PRD by the Requirements + Codebase + Risk analyst council. It is intentionally atomic: one focused change that a single Morty implementer can finish in one sitting (< 30-45 min ideal), with clear machine-checkable success criteria.

## Acceptance Criteria (machine-checkable)
| ID | Criterion | Verify |
|----|-----------|--------|
{{AC_TABLE_ROWS}}

## Contracts & Invariants
{{CONTRACTS}}

## Scope (Morty may ONLY touch these paths)
{{SCOPE_LIST}}

- No other files. Violating scope fails the ConvergenceGate in the ritual.

## Non-Goals
{{NON_GOALS}}

## 8-Phase Notes for the Morty Team
- **Researcher** (MANDATORY THEATER AUDIT): First action — extract every `Verify` backtick from this ticket + parent PRD. Test each string against the exact forbidden patterns (see full list in research.md + pipeline-preflight.ts:detectVerifyTheater). If ANY theatrical/non-runnable/"after fix"/human-observe/|| true / "feed good" / bare ls / TODO-in-Verify pattern, or if the BASELINE form does not run deterministically on the *current* tree: mark Readiness Assessment **Status: blocked**, Reason: "EMISSION_THEATER risk — theatrical Verify in ACs (would have killed researcher/planner)", Suggested Prerequisites: "H-VERIFY hardening + re-refine". Surface in research artifact for Citadel/ritual. Do not proceed to plan.
- **Planner**: Refuse any ticket whose research Readiness is blocked on EMISSION_THEATER or whose Verifies fail the theater list. One crisp plan only on clean runnable Verifies.
- **Implementer**: make the change + write `conformance_{{TICKET_ID}}.md` citing the exact Verify commands and their output.
- **Verifier**: literally run every Verify command in the table. Fail the ticket if any red. **Additionally: if any Verify string matches the theatrical patterns list, immediately fail the phase and write "INVALID SPEC — EMISSION_THEATER: <exact match>" in conformance_*.md before running.**
- **Reviewer / Simplifier + Research/Plan Reviewers**: Explicitly re-audit all Verifies in the ticket + artifacts for theater patterns. Any survivor → demand re-research or blocked status + EMISSION_THEATER signal.

## Hardening Tickets Attached (if any)
{{HARDENING_TICKETS}}

When all 8 phases have emitted `<promise>I AM DONE</promise>` and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table is shit, the Morties will produce shit. Garbage in, garbage in the reliability-backlog. Do better."
Wubba lubba dub dub.