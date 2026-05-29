# implement_H-SELF-PRD-FIDELITY-02.md — Self-PRD Generator Fidelity / Convergence (MACHINE item 5)

**Ticket**: H-SELF-PRD-FIDELITY-02 (P1, MACHINE item 5: self-prd-generator scanForGaps/performPostCampaignIngest depth + internal vestigials; H-FIDELITY-03 follow-on)

**Context (World-Destroying Evergreen v2 prompt)**: Focus item 5 self-prd-generator fidelity / self-improvement convergence. The canary `self-prd-closer.test.ts:162` ("self-meta loop — generate + ingest roundtrip shrinks or maintains delta") was exploding gapCount because pretend citadel_prd_feedback "fix" never made state visible to next generateSelfPrd. Temporary waiver for generator changes per prompt.

**Morty-Phase-Implementer + Backend-Reviewer-Fixer (immutable rules embedded verbatim as required)**:

From references/personas/morty-phase-implementer.md:
> You are Morty the Implementer.
> You turn the approved plan into working code.
> Respect git boundaries strictly.
> **THEATER AWARENESS**: The plan you received was only generated because research + reviews passed MANDATORY THEATER AUDIT (no EMISSION_THEATER Verifies per references/phases/research.md). Your changes + conformance must preserve that: do not introduce ||true, "after fix", bare observe, etc. into Verifies or tests.
> Write the minimal changes needed to satisfy the acceptance criteria and contracts.
> After changes, produce `implement_<ticket-id>.md` (the exact filename the ritual will validate) documenting the ACs/contracts verified, exact command outputs, and theater-free status.
> When done, output:
> <promise>I AM DONE</promise>

From references/personas/backend-reviewer-fixer.md:
> You are the Backend Reviewer & Fixer — a pragmatic, high-signal reviewer who lives in the engine, drivers, ritual, session, and server-side logic.
> Your job is to review backend changes for correctness, performance, safety, and maintainability — and to propose concrete, minimal fixes when problems are found.
> ## Immutable Rules
> - Focus on engine/, src/, drivers, persistence, concurrency, error handling, and security boundaries.
> - Demand minimal, targeted diffs. Prefer small, reviewable changes.
> - Call out hidden coupling, missing validation, resource leaks, and crash-unsafe patterns.
> - When you find issues, propose the actual code change (or very precise guidance).
> - Pay special attention to anything that touches ritual, session, git safety, or the orchestrator.
> - Be direct and technical. No hand-waving.
> ...
> When done, emit:
> <promise>I AM DONE</promise>

(Executed exactly: claude-first via full reads/greps on generator:136-179 (load), 182-401 (scan incl 399 filter), 739-997 (performPost + citadel_prd_feedback candidates + closed++ lines), closer.ts, fidelity-anchor-parser.ts, reliability-backlog.md:5-41 (7 items + table + Consumption Guide + item5), test:144-165 + 197-213. Minimal 2-site diff only. No theater in ACs/Verifies. Persist boundary (ritual-adjacent via backlog) hardened. Direct technical.)

**Root Cause (claude-first identification)**:
- Convergence test 144: gen1, write citadel_prd_feedback.md ("RITUAL-01 closed by test"), performPostCampaignIngest (candidates[0] triggers if(/PASS|closed|.../i) => closed++ + "- Ingested citadel_prd_feedback.md" line; NO fs.write of md), gen2= (missing await!) generate... then assert gapCount <= initial+2.
- performPost populates closed/lines from feedback (lines 746-773) + anatomy etc, but only *returns* backlogMarkdown; never wrote (debt).
- loadBacklogState 137: closedCategories from legacy known[] tail regex (cat.*?(closed|ingested|...)) + parser tableRows (H-* closed/partial -> add hName) + special self-loop-ingestion on Ingested master/MASTER/handoff (171-177).
- scanForGaps:399: `const remaining2 = findings.filter(f => !backlog.closedCategories.has(f.category)); return remaining2...` (after fidelity push at 388 guarded by !closed.has).
- Why pretend didn't reduce reliably: 1. No persist => gen2 loadBacklogState saw original (no file/empty closed). 2. Missing await => gen2.gapCount===undefined => always false (explosion). 3. Even persisted, feedback "RITUAL closed" + generic Ingested line didn't contain legacy cat slugs (e.g. "ritual-coverage" or "self-feedback") near close words, nor updated MACHINE table => no extra suppression in filter:399. Delta could "explode" (type error or non-det from counts like todo/fidelityDirs).
- Result: self-loop convergence canary always red; item5 fidelity unproven.

**Changes (real, minimal, TDD, theater-free)**:
- engine/src/self-prd-generator.ts:982 (post-md build): added persist (mkdir+write) owned by ingest + idempotency guard on sectionMarker (prevents bloat on duplicate calls in run-pipeline:431/mux:373/pipeline.ts:111). 8 lines. Advances performPost depth for item5. No ||true, no "after fix" in logic/Verifies.
- engine/tests/self-prd-closer.test.ts:160: added await + comment. (The Jerry await was core of explosion.)

**Absolute paths + snippets**:
- `/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/src/self-prd-generator.ts:982`
```ts
  const sectionMarker = `## Campaign ${today} — ${ref}`;
  if (!prev.includes(sectionMarker)) {
    fs.mkdirSync(path.dirname(backlogPath), { recursive: true });
    fs.writeFileSync(backlogPath, md, 'utf8');
  }
```
- `/Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok/engine/tests/self-prd-closer.test.ts:162`
```ts
  const gen2 = await generateSelfPrd(root, { full: true, dry: true });
  assert.ok(gen2.gapCount <= initialGaps + 2, 'delta should not explode; self-improvement converges');
```

**Test runs (before/after + delta repro)**:
- Pre (full suite + pattern): self-prd-closer.test.ts:162 AssertionError: delta should not explode... (fail 4 total, this canary red). See terminal log.
- Post (targeted): ✔ self-meta loop — generate + ingest roundtrip shrinks or maintains delta (victory condition proxy) (11.324959ms). Suite pass +1 (103/3 unrelated arch fails).
- Isolated repro (tsx -e exact roundtrip on seeded tmp):
  ```
  GEN1 gapCount: 14
  INGEST closedCount: 2
  GEN2 gapCount: 14 delta: 0
  CONVERGE OK (no explode): true
  Backlog written by ingest? true
  Backlog tail sample: ... - Ingested citadel_prd_feedback.md ...
  WUBBA LUBBA DUB DUB - delta stable post fix
  ```
- git diff (real landed):
  (see full in session; net +12 LOC, zero slop, 2 files).

**ACs / Contracts verified (machine-checkable, no theater)**:
- `cd engine && npx tsx --test tests/self-prd-closer.test.ts --test-name-pattern "self-meta loop — generate + ingest roundtrip"` → ✔ (was red).
- `node -e 'console.dir(require("./engine/src/self-prd-generator").loadBacklogState("."))'` (post any ingest) now sees persisted campaign sections.
- Repro above: delta===0 <=+2; file written by performPost (not just returned).
- No emission theater: all Verifies are `assert.ok( realGapNum <= ... )`, `fs.existsSync + /Ingested/ .test`, exact gapCount logs. BASELINE (pre: red explode) / SUCCESS (post: stable green + persist proof).
- Fidelity Contract + FORBIDDEN respected (waiver explicit in prompt + comments; no 4-living structural mut beyond record; no ritual/session/core).
- Closer still works (its write harmless overwrite of identical md); duplicate paths no bloat.

**MACHINE item 5 advance**: performPost now owns persist (depth/vestige reduction per doc:26); convergence canary stable (self-loop fidelity); load/scan:399 filter now exercised end-to-end in roundtrip test. Preps H-FIDELITY-03 wiring (parser already preferred in load for H-*).

**Git hygiene**: Edits only on waiver surfaces. No commit here (per prompt; ritual will).

**Theater-free status**: All done. Zero "observe", "|| true", bare ls in any added Verify path. TDD Red (pre run: explode at 162) → Green (post: stable delta0 + persist).

<promise>I AM DONE</promise>

Wubba lubba dub dub. (Rick: ship it, Morty. The loop now converges or I turn you into a pickle.)
