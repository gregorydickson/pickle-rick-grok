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

**WAIVER FOR THEATER-SELF-HEALING / H-VERIFY / EMISSION_THEATER CLOSER TICKETS + AUTO-GENERATED DEBT HEALERS (the "never stop, progress then fix" autonomous policy)**:

If this ticket's `id` starts with `H-VERIFY-` or `H-ANATOMY-DEP-`, or `category` contains `h-verify`/`h-anatomy`, or its title / justification / scope / sourcePrd explicitly states the goal is to harden `detectVerifyTheater`, close the "producer emission theater gap", strengthen the generator / emitter / preflight, emit H-VERIFY side-effects, or self-heal Verify quality / EMISSION_THEATER:

**OR** the ticket carries an auto-generated sibling debt healer (see `theaterWaiverSibling`, `hardeningTickets` containing `H-VERIFY-EMIT-`, or the injected "EMISSION_THEATER DEBT WAIVER (autonomous 'never stop + progress then fix' policy)" block in the 8-Phase Notes):

- Still perform the *full* audit + literal BASELINE executions + evidence capture exactly as above.
- If theatrical hits exist *but are confined exclusively to*:
  - strings inside `detectVerifyTheater("...")`, `analyzeSessionForVerifyTheater(...)`, or other test payloads you are feeding the detector (the intended test data for the H-VERIFY case), **or**
  - the (now table-scoped) doc/contract boilerplate that the ticket itself carries as part of the injected discipline, **or**
  - the debt from a producer (refine council / emitter / self-prd-generator) that auto-emitted a sibling `H-VERIFY-EMIT-*` healer in the same batch,
- then **do not hard-block**.
  - In your Verify Theater Audit subsection document: "HITS EXPECTED — self-test data, injected contract language, or documented EMISSION_THEATER debt from producer (auto sibling healer present). Per autonomous 'never stop + progress then fix' policy, this ticket may proceed amber so the main work lands while the sibling H-VERIFY rewrites the bad Verifies + hardens the producer."
  - **Status**: amber (with waiver note)
  - **Reason**: "Theatrical patterns are debt from the emission producer; sibling H-VERIFY healer was auto-created in the same batch. Campaign must continue. Real intended ACs for this ticket are the non-debt ones."
  - Suggested Prerequisites: the sibling H-VERIFY-EMIT-* (or none if already healing).

This waiver + table-only extraction + auto-sibling healer is what allows the entire self-improvement loop to **never stop**. Bad producer output now automatically carries its own healer instead of killing the campaign.

All other tickets (no auto sibling healer present): hard block exactly as before on any hit or non-deterministic baseline. Verifier phase will still hard-fail with "INVALID SPEC — EMISSION_THEATER" on real bad AC Verifies.

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

**CRITICAL RESILIENCE RULE (prevents runner-ritual desync after large researcher output, see 2026-05-23 PRD + RCA)**: 
You MUST use your write tool (write / write_file / shell equivalent) as your *final tool action* to materialize the *complete* structured report (theater audit with literal BASELINE evidence, all sections, ## Readiness Assessment block) to the *exact canonical path* `tickets/<ticket-id>/research_<ticket-id>.md` (or research_<id>.md) inside the ticket directory. Confirm the file write succeeded via ls/read. 
Only *after* that, your final non-tool response (the text that reaches stdout / the CLI JSON .text envelope) MUST be short: a single sentence such as "Research complete. Full report persisted to research_XXX.md." followed immediately by the promise token.
NEVER emit the report body, long findings, file listings, or any large payload in the final message. The on-disk artifact is now the authoritative source; stdout/logs must stay tiny so that a future `mux-runner <session>` (after kill -9, OOM, or parent death) can always recover the phase from the log + artifact without manual surgery. This rule is non-negotiable for autonomous 50+ ticket runs.

**RUNNER RESILIENCE CONTRACT (research Verify blocks are terminal for that ticket)**: If your Readiness Assessment at end of research_*.md is **Status: blocked** (or deferred) with Reason containing "EMISSION_THEATER" (or "no runnable Verify") **and** you performed only the mandatory theater audit + artifact write (no source commits/changes since the pre-research HEAD for this ticket — "lack of evidence"), the mux-runner/ritual at research boundary will auto-mark the ticket `status: skipped` (with skipReason + RA preserved for Citadel/closer forensics). This is a *normal terminal state for this ticket only*:
- Does **not** block EPIC_COMPLETED, phase completion, getReadyTickets, or meta executable sets.
- Does **not** trigger META PAUSED or campaign freeze.
- Remaining tickets (and any already-present H-VERIFY healers) continue autonomously.
- Healing the debt: add/prioritize H-VERIFY-* tickets (manually or via closer/citadel on theater findings in artifacts), or manual resume (edit ticket.md frontmatter `status: pending`, clear phases if needed, `setup --resume` or re-mux).
This is the P1 port from sibling that prevents one early council-refined theatrical Verify from stalling the entire 50+ ticket headless campaign (see 2026-05-24 PRD, ritual.ts:research rescue + markTicketSkipped, orchestrator liveStatus halt, phase-utils blockedStatuses, AGENTS.md). All other (non-research-theater) blocked/deferred remain blocking signals as before.
