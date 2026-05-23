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
- **Researcher** (MANDATORY THEATER AUDIT): First action — extract **only from the Acceptance Criteria table Verify/Verification column cells** every `Verify` backtick from this ticket + parent PRD (ignore all doc boilerplate, 8-phase examples, contract text, etc.). Test each against the exact forbidden patterns (see research.md + pipeline-preflight.ts:detectVerifyTheater). If ANY theatrical/non-runnable pattern or non-deterministic BASELINE on current tree: **check immediately for EMISSION_THEATER DEBT WAIVER block (or theaterWaiverSibling / auto sibling in hardening)**. If waiver present: mark **Status: amber** (debt from producer; sibling H-VERIFY-EMIT-* auto-scheduled per "never stop + progress then fix"), document hits+baselines, proceed with work. Else: mark **Status: blocked** with EMISSION_THEATER reason + "H-VERIFY + re-refine" prereq (except for explicit H-VERIFY / emission-hardening tickets). Surface full evidence. Do not proceed to plan on unwaived poison.
- **Planner**: Refuse any ticket whose research Readiness is blocked on EMISSION_THEATER or whose Verifies fail the theater list. One crisp plan only on clean runnable Verifies. Waived debt tickets (amber + sibling) are allowed to plan/impl.
- **Implementer**: make the change + write `implement_{{TICKET_ID}}.md` citing the exact Verify commands and their output.
- **Verifier**: literally run every Verify command in the table. Fail the ticket if any red. **Additionally: if any Verify string matches the theatrical patterns list, immediately fail the phase and write "INVALID SPEC — EMISSION_THEATER: <exact match>" in verify_*.md before running.**
- **Reviewer / Simplifier + Research/Plan Reviewers**: Explicitly re-audit all Verifies in the ticket + artifacts for theater patterns. Any survivor → demand re-research or blocked status + EMISSION_THEATER signal (unless explicit debt waiver block present).

## Hardening Tickets Attached (if any)
{{HARDENING_TICKETS}}

When all 8 phases have emitted `<promise>I AM DONE</promise>` and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table is shit, the Morties will produce shit. Garbage in, garbage in the reliability-backlog. Do better."
Wubba lubba dub dub.