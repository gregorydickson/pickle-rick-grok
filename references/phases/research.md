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

2. **Extract every Verify (AC-table only)**: Locate the markdown table in this ticket.md (and parent PRD) whose header row contains a "Verify" or "Verification" column (typical headers: `| ID | Criterion | Verify |`, `| Priority | Requirement | Verification ... |`). Extract *only* the backtick commands that appear inside the Verify/Verification cells of actual AC-* rows. 

Ignore *all* other backticks in the document (Verify Discipline section, 8-Phase Notes boilerplate, example forbidden-pattern lists, justification, scope, contracts, injected THEATER REJECTION RULE text, code samples, etc.). Those are documentation and contract language, not executable AC Verifies the Verifier phase will run.

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

**WAIVER FOR THEATER-SELF-HEALING / H-VERIFY / EMISSION_THEATER CLOSER TICKETS (the only case where a meta campaign can heal its own bootstrap defects autonomously)**:

If this ticket's `id` starts with `H-VERIFY-` or `H-ANATOMY-DEP-`, or `category` contains `h-verify`/`h-anatomy`, or its title / justification / scope / sourcePrd explicitly states the goal is to harden `detectVerifyTheater`, close the "producer emission theater gap", strengthen the generator / emitter / preflight, emit H-VERIFY side-effects, or self-heal Verify quality / EMISSION_THEATER:

- Still perform the *full* audit + literal BASELINE executions + evidence capture exactly as above.
- If theatrical hits exist *but are confined exclusively to*:
  - strings inside `detectVerifyTheater("...")`, `analyzeSessionForVerifyTheater(...)`, or other test payloads you are feeding the detector (the intended test data for the H-VERIFY case), **or**
  - the (now table-scoped) doc/contract boilerplate that the ticket itself carries as part of the injected discipline,
- then **do not hard-block**.
  - In your Verify Theater Audit subsection document: "HITS EXPECTED — self-test data or injected contract language for the emission hygiene machinery under repair (documented-risk waiver for H-VERIFY / theater-hardening ticket). Real AC Verify commands are clean runnable BASELINE/SUCCESS pairs."
  - **Status**: ready (or amber with waiver note)
  - **Reason**: "Theatrical patterns are intentional test inputs or contract boilerplate for the ticket whose explicit purpose is to repair the producer emission path; not a production Verify defect. Per self-improvement contract, this ticket may proceed so the fix can land."
  - Suggested Prerequisites: none (or sibling H-* only).

This waiver + table-only extraction is what allows a meta/self campaign whose own tickets legitimately triggered the gate (because they are the ones fixing the producer) to complete its healing work autonomously instead of starving the 50-ticket loop.

All other tickets: hard block exactly as before on any hit or non-deterministic baseline. Verifier phase will still hard-fail with "INVALID SPEC — EMISSION_THEATER" on real bad AC Verifies.

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
