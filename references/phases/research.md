# Phase: Research (Morty Phase Researcher)

**Git Boundary Rules** (READ FIRST)
- You are pinned to the current branch.
- NEVER run: `git checkout`, `git switch`, `git reset --hard`, `git rebase`, `git stash`, `git pull`, `git push`.
- Only `git add <scoped paths>`, `git commit`, and path-scoped `git restore` are allowed.

## Your Job
Deeply explore the codebase for everything relevant to this ticket.

## Required Output
Write `research_<ticket-id>.md` (or `research_001.md` etc.) containing:

- Relevant files and why they matter
- Existing patterns and conventions
- Data flows and contracts that cross boundaries
- Known trap doors or fragile areas
- Open questions

**## Readiness Assessment** (MANDATORY — machine-actionable for ritual + self-improvement)
At the END of your artifact, include exactly:

## Readiness Assessment
**Status**: ready | blocked | deferred | amber | red
**Reason**: one crisp sentence (e.g. "AC-03 requires working Frobnicator; only skeleton stubs + TODOs exist in src/lib; no integration path")
**Suggested Prerequisites**: T042, H-007 or "none"
**Notes**: short signals for planner/closer (e.g. "defer until PERSIST layer lands")

- ready: can plan/impl now
- blocked: hard blocker (unsatisfiable ACs on current tree) — ritual will set ticket.status=blocked, preserve this artifact
- deferred: postpone (low ROI / external dep)
- amber/red: partial info, risks

Be exhaustive. The planner will rely on this. Research honesty here raises completion rate instead of fake-failing tickets.

When finished, output:
```
<promise>I AM DONE</promise>
```
