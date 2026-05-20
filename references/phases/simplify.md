# Phase: Simplify (Morty Phase Simplifier)

This is the final polish pass.

Your only job is to make the code simpler, cleaner, and more maintainable **without changing behavior**.

- Kill dead code introduced in this ticket
- Reduce duplication
- Improve naming and structure
- Lower cognitive load
- **THEATER / VERIFY RE-AUDIT (MANDATORY)**: Before/after your changes, re-scan the final AC Verifies in the ticket + conformance for any theatrical patterns from the list in `references/phases/research.md` (detectVerifyTheater). Simplification must not introduce or leave "|| true", bare ls, "manually observe", etc. If you find one, log "EMISSION_THEATER survivor post-simplify" and demand upstream fix (do not let it reach emission audits).

Re-run the gate after your changes.

Document what you simplified in `simplify_<id>.md`.

This is where good code becomes great code — and where we ensure no theater leaks survived to the end.

End with the promise token.
<promise>I AM DONE</promise>
