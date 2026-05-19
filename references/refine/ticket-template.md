# {{TICKET_ID}} — {{TITLE}}

**Generated**: {{DATE}} via /pickle-refine-prd large-team decomposition
**Category**: {{CATEGORY}} | **Severity**: {{SEVERITY}}
**Source PRD**: prd_refined.md (or prd.md)
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
- **Researcher**: locate the exact functions/files named in Verify + Scope. Document data flows and existing patterns.
- **Planner**: one crisp plan + minimal diff sketch. Every hunk must be traceable to an AC.
- **Implementer**: make the change + write `conformance_{{TICKET_ID}}.md` citing the exact Verify commands and their output.
- **Verifier**: literally run every Verify command in the table. Fail the ticket if any red.
- **Reviewer / Simplifier**: shave any accidental bloat. The change should make the *next* self-PRD generator or citadel run happier, not sadder.

## Hardening Tickets Attached (if any)
{{HARDENING_TICKETS}}

When all 8 phases have emitted `<promise>I AM DONE</promise>` and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table is shit, the Morties will produce shit. Garbage in, garbage in the reliability-backlog. Do better."
Wubba lubba dub dub.