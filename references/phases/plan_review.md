# Phase: Plan Review

Review the plan the same way you would review research.

- Is it complete?
- Does it actually solve the requirements?
- Are the verification steps sufficient and machine-checkable?
- Is the scope controlled?
- **THEATER / READINESS AUDIT (MANDATORY)**: Confirm the plan only exists because research Readiness was clean (no EMISSION_THEATER). If the plan references or ignores a blocked theatrical Verify, reject it and demand the planner surface the block. Re-check Verifies in plan against patterns in research.md. Any "after fix" or non-runnable assumption in plan steps → call out as EMISSION_THEATER leak, block the plan.

Produce `plan_review.md`.

Only when the plan passes review (and upstream research theater audit is clean) does the implementer get the green light. This keeps the pipeline from chewing cycles on poison tickets.

End with the promise token.
<promise>I AM DONE</promise>
