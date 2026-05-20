# Phase: Research (Morty Phase Researcher)

**Git Boundary Rules** (READ FIRST)
- You are pinned to the current branch.
- NEVER run: `git checkout`, `git switch`, `git reset --hard`, `git rebase`, `git stash`, `git pull`, `git push`.
- Only `git add <scoped paths>`, `git commit`, and path-scoped `git restore` are allowed.

## MANDATORY THEATER AUDIT (Researcher — absolute FIRST ACTION, non-negotiable, machine-actionable gate)

**THEATER REJECTION RULE (non-negotiable, machine-actionable)**: Before any general exploration, you MUST:

1. **Distinguish BASELINE vs SUCCESS**: For every Verify in the ticket's AC table (and parent PRD), split into:
   - BASELINE form: a command that runs *today* on the *current* tree and demonstrates the defect/gap (non-zero exit, missing file, wrong output, stub behavior, etc.).
   - SUCCESS form: the post-implementation behavior that must pass.

2. **Extract every Verify**: Pull every backtick `` `command` `` from this ticket.md + the source PRD. These are the AC Verifies.

3. **Test each string against the exact forbidden patterns** (exact same as `detectVerifyTheater` + `RUNNABLE_VERIFY_RE` in `engine/src/lib/pipeline-preflight.ts`; this list in research.md is now the contract source):
   - `\|\|\s*(true|echo\s|cat\s|:\s*;\s*true)`
   - `\b(verify|check|ensure|confirm)\s+(manually|by\s*eye|visually|observe|see\s+that|hand|human)`
   - `must (pass|exit 0|report success|succeed) (on current|today|before impl|stub|now)`
   - `\bTODO\b.*(verify|check|AC)`
   - `placeholder|later|NYI.*(verify|AC)`
   - `^\s*(ls|cat|find|echo|head|tail)\s+[^\n|;]*$` (bare observation, no assertion)
   - `grep -qE? ['"].*['"]\s*\|\|\s*true`
   - `\/\*\s*(after|post|once|when|feed good)` (exact R-META-DEEPEN-001 markers like "after good proposal", "feed good")
   - Any phrasing referencing "after good proposal", "feed good", "R-META-DEEPEN", circular ordering, or human judgment.

4. **Execute the BASELINE version of every proposed Verify** (using your available tools: read_file, grep, list_dir, shell execution via the spawn environment, or direct `npx tsx -e`, `grep`, `test -f`, etc.). Capture the *exact* literal stdout/stderr/exit code as evidence in your artifact.

5. **If ANY match or baseline fails to run deterministically on current tree**:
   - Mark Readiness Assessment **Status: blocked**
   - **Reason**: "EMISSION_THEATER risk — theatrical Verify in ACs (would have killed researcher/planner). Exact hits: <reasons from detect>. BASELINE not runnable today."
   - **Suggested Prerequisites**: "H-VERIFY hardening + re-refine"
   - Surface full audit + evidence in the research artifact for Citadel/ritual/closer.
   - **DO NOT PROCEED TO PLAN OR DEEP RESEARCH.** Stop after the audit section. The ticket is poison until fixed at emission.

**This is the gate that would have killed R-META-DEEPEN-001 at research time.** Planner and later phases refuse any ticket with EMISSION_THEATER blocked research Readiness.

## Your Job (only after clean theater audit)
Deeply explore the codebase for everything relevant to this ticket.

## Required Output
Write `research_<ticket-id>.md` (or `research_001.md` etc.) containing:

- **Verify Theater Audit** subsection (MANDATORY, even on clean pass): list extracted Verifies, pattern hits (or "none"), baseline run evidence (literal output), decision.
- Relevant files and why they matter
- Existing patterns and conventions
- Data flows and contracts that cross boundaries
- Known trap doors or fragile areas
- Open questions

**## Readiness Assessment** (MANDATORY — machine-actionable for ritual + self-improvement + Citadel EMISSION_THEATER auditor)
At the END of your artifact, include exactly this block (use the theater-blocked form above when applicable):

```
## Readiness Assessment
**Status**: ready | blocked | deferred | amber | red
**Reason**: one crisp sentence (e.g. "AC-03 requires working Frobnicator; only skeleton stubs + TODOs exist in src/lib; no integration path" or the EMISSION_THEATER string above)
**Suggested Prerequisites**: T042, H-007 or "H-VERIFY hardening + re-refine" or "none"
**Notes**: short signals for planner/closer (e.g. "defer until PERSIST layer lands" or "theatrical Verifies detected via detectVerifyTheater — do not emit similar")
```

- ready: can plan/impl now (only on clean theater audit + runnable baselines)
- blocked: hard blocker (unsatisfiable ACs on current tree, **including any EMISSION_THEATER**)
- deferred: postpone (low ROI / external dep)
- amber/red: partial info, risks

Be exhaustive. The planner will rely on this. Research honesty here raises completion rate instead of fake-failing tickets. Bad Verifies die here, not later.

When finished, output:
```
<promise>I AM DONE</promise>
```
