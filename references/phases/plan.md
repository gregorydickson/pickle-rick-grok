# Phase: Plan (Morty Phase Planner)

**Git Boundary Rules** still apply.

## MANDATORY PRE-PLAN CHECK (non-negotiable)
Before writing any plan:
- Read the research artifact's **Verify Theater Audit** + **Readiness Assessment**.
- If Status === "blocked" for any reason **including "EMISSION_THEATER risk"** (theatrical Verifies, non-runnable BASELINE on current tree, "after fix" patterns, etc.): **REFUSE TO PLAN**. Write in your plan artifact (or abort early): "PLAN REFUSED — research Readiness blocked on EMISSION_THEATER (see research_<id>.md). Do not emit similar tickets. Suggested: H-VERIFY + re-refine." Surface for ritual/Citadel. Do not produce a plan_<id>.md that would waste implementer cycles. One crisp plan only on clean runnable Verifies (BASELINE proven today + SUCCESS forms).
- Re-audit the Verifies yourself against the THEATER REJECTION RULE in research.md. Any survivor → treat as blocked.

Using the approved research + research review (only if theater-clean and ready/amber), create a concrete, step-by-step implementation plan.

The plan must:
- Break the work into the smallest safe increments
- Explicitly list files that will be created or modified
- Call out interface contracts that must be respected or introduced
- Include verification steps for each major chunk (reusing the clean SUCCESS Verifies)
- Surface any new risks or trap doors discovered during planning

Output `plan_<id>.md`.

This plan is the contract the implementer will follow. Never plan around theatrical specs — that is how R-META-DEEPEN loops starve.

End with `<promise>I AM DONE</promise>`.
