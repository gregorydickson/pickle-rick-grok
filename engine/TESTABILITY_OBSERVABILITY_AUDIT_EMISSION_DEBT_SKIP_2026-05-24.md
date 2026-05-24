# TESTABILITY + OBSERVABILITY AUDIT: Skip Logic, Theater Gates, Emitter Healers, Preflight, Debt Tickets (50-tix Overnight)
**Auditor**: Pickle Rick (Grok subagent, no mercy, no sycophancy)  
**Date**: 2026-05-24  
**Scope**: engine/tests/ (esp. ritual.test.ts, orchestrator-integration.test.ts, campaign-simulator.ts, stress-longrun.test.ts, activity-logger.test.ts, citadel.test.ts) + production paths (ritual.ts, session.ts, lib/pipeline-preflight.ts + ticket-emitter.ts + phase-utils.ts + bin/orchestrator.ts + activity-logger.ts + citadel.ts + self-prd-generator.ts + bin/run-pipeline.ts)  
**Key Rule Enforced**: Untested critical paths cross-checked vs ../pickle-rick-claude/extension/tests/ (678 files, heavy mux-runner.test.js, pickle-utils.test.js, activity-logger.test.js, check-readiness.test.js, transaction-ticket-ops, schema conformance, fixtures with real skip events/harnesses). Claude sibling has the density; grok is starving.  
**Focus Areas** (per query):  
- New skip logic (pureResearchTheaterNoEvidence + isHardening guard + markTicketSkipped), theater gates (detectVerifyTheater), emitter healers (theaterWaiverSibling auto-emit + amber debt), preflight (assessMetaReadiness + runPreflight + hygiene)  
- Lack of harness/integration for 50-ticket campaigns with *injected debt*  
- Observability (Activity events, campaign-status.json, logs) *for debt tickets* (skipped theater, blocked RA, H-VERIFY healers)  
- Ability to debug a stuck overnight run (watchdog, RCA surface)  

**Rick voice on entry**: "Listen up, Morty — you ported the 'honest research never freezes the campaign' gospel from the Claude rig, slapped some skip logic and healer siblings on it, declared victory in the 50-tix report... *buuurp* ...and left the tests as a Jerry-shaped hole. The gates that were supposed to *prevent* emission theater are themselves un-runnable garbage. I read the src, the dist, the callsites, the sibling's 300+ skip/observability tests. This ain't coverage, this is a crime scene. Let's autopsy it clean."

---

## Executive Summary (No Slop)
**Current State**: Gaps are *severe* and concentrated exactly on the "new" autonomous reliability features from the 2026-05-24 emission-quality port PRD. The skip resilience + theater gates + healers were added to *enable* reliable 50-tix overnights with debt, but:
- Core implementation (preflight.ts) is a 65-line stub in src/ (only detectVerifyTheater); 5+ imported fns (assessMetaReadiness is in dist only, others like analyzeSessionForVerifyTheater / scanAnalystOutputsForUnverifiedPaths / checkVerifyMachinability / computeTicketManifestHash are pure ghosts — referenced 30+ times across ticket-emitter, citadel, self-prd, SKILLs, refs, PRDs). tsx runs (dev + some detached) = instant crash on first refine/citadel/self-prd. Built dist is partial/old.
- Skip logic duplicated (ritual.ts:319-336 + 446-461), uses unlocked fs.readFileSync for isHardening guard (racy vs locked session.ts paths), hardening protection is comment-anchored not robust.
- No tests exercise the *theater branch* or healer emission. ritual.test.ts has RA fixtures + orphan recovery (theater-free by design). campaign-simulator has chaos injection but zero debt/theater cases. Zero coverage of emitter healers.
- Observability for debt is partial/best-effort + post-mortem only. Activity has ticketSkipped + verify_theater_rejected + preflightReport, but ticketReadinessBlocked is (as any)?.() with catch (no impl in logger). campaign-status gets notes but no structured `theater_debt` / skipped list live. No activity-events.schema.json (sibling has one).
- Stuck overnight debug: watchdog + progress ts + activity jsonl + worker logs + campaign-status exist (good port), but without debt surface or preflight tests, a theater wave looks "healthy" until closer/citadel at 3am.
- **vs sibling (the bar)**: Claude's extension/tests/ has dedicated mux-runner skip event tests (auto-mark-done emits 'ticket_auto_skip_no_evidence' with reason/iteration), pickle-utils.test.js has 8+ markTicketSkipped cases (locked, idempotent, timestamps), activity-logger.test.js asserts skip/readiness events, check-readiness.test.js + forward-ref tests, pipeline-empty-scope-skip-schema, full-suite log fixtures for regression, harnesses that inject debt-like conditions. Single canonical skip path (mux-runner + pickle-utils locked). Shift-left gates live in check-readiness + spawn-refinement (pre-emit, no src/dist cancer). Live debt visibility during runs.

**Verdict**: These features are *untested critical paths*. A 50-tix campaign with one theatrical Verify at emission (the exact R-META-DEEPEN-001 pattern the port was to kill) will either crash the gates, mis-skip a healer, starve dependents, or leave you blind at 4am staring at a "healthy" tmux with 0 forward progress. Bugs are Jerry mistakes — this batch is a whole Jerry family reunion. TDD was supposed to be Red/Green/Refactor, not "ship the port, pray the tests catch up."

**Prioritization** (P0 = will 100% bite a real overnight or self-prd; P1 = high value for 50-tix reliability; P2 = coverage debt; P3 = nice-to-have):
1. **P0: Complete + test the preflight module** (theater gates + preflight + healers are DOA without it).
2. **P0/P1: Unit + integration tests for skip logic + hardening guard** (the ~40-line rescue + dupe site).
3. **P1: Tests for emitter healer auto-emit path + waiver/amber** (core "never stop" policy).
4. **P1: Debt-injected harness/integration for 50-tix sim + orchestrator paths** (the "lack of harness" the query flags).
5. **P1/P2: Observability hardening + tests for debt tickets** (events, campaign-status, debug surface).
6. **P2: Schema + full activity event coverage + stuck-run RCA aids**.
7. **P3: Cross-checks vs sibling harness patterns + more phase-utils coverage**.

All gaps below are line-anchored to current files. Minimal high-value tests described with *exact* machine-checkable asserts (theater-free, per contract). Suggested locations: new `engine/tests/pipeline-preflight.test.ts`, extensions to existing ritual/orchestrator/campaign-sim/activity tests.

---

## P0 Gap 1: pipeline-preflight.ts is a Ghost Module (Theater Gates, Healers, Preflight, analyze etc. Unrunnable)
**Files**:
- `engine/src/lib/pipeline-preflight.ts:1-65`: Header + RUNNABLE_VERIFY_RE + VERIFY_THEATER_RE (12 patterns, incl. the P0 self-healer wc/grep/node-e|grep fixes) + `detectVerifyTheater` only. Ends at 65. No assessMetaReadiness (skeletal scan), no runPreflight, no isPrdSufficientlyRefined, no checkTicketMaterialization, etc. (those live only in dist/).
- `engine/src/lib/ticket-emitter.ts:22` (barrel import of 5 fns), `208` (assess in loop), `213` (detect), `222-239` (theater.isTheatrical || red → healer sibling + amber + waiver), `243-278` (auto-emit H-VERIFY-EMIT-* with ACs that themselves reference the missing p.scan/p.check), `360-361` (self-check in H-VERIFY-EMISSION-HONESTY AC), `406-407` (post-emit hygiene: scan + checkVerifyMachinability + computeTicketManifestHash), `422`.
- `engine/src/citadel.ts:31,568` (analyzeSessionForVerifyTheater call in TICKET_VERIFY_QUALITY auditor; reuses detect for EMISSION_THEATER findings).
- `engine/src/self-prd-generator.ts:33,705,729,756,776` (calls + H-VERIFY AC Verifies that invoke the missing analyze).
- Callers in SKILL.md (pickle-refine-prd), references/refine/analyst-gate-injections.md, prds/*, references/phases/research.md.
- Dist has partial (assess + summarize + runPreflight etc. in .js up to ~353; .d.ts declares only subset; analyze/scan/check/compute absent everywhere).
- No `engine/tests/*preflight*.test.ts` at all. citadel.test.ts only exercises detect via a fixture (lines 101-119) for R-META-DEEPEN-001 pattern.

**Impact on Focus**:
- Theater gates (detect) "work" in isolation but the full preflight (assess + hygiene + machinability) + healer emission path = crash or silent no-op on any real refine/self-prd/citadel.
- Emitter healers (the "progress then fix" for debt) never fire reliably.
- 50-tix with injected debt (theatrical Verify at birth) → either gate explosion or un-gated poison reaching ritual skip.
- "Preflight" in run-pipeline.ts / session.ts (preflightPipeline) is the *other* preflight (materialization/provenance) — separate but the emission one is the new P0.
- **vs sibling**: Claude shift-left is in check-readiness.ts (full isMachineCheckable + MACHINE_HINT_RE vs PURE_PROSE_RE + forward-ref exact parser + symbol audit + ac-shape + BASELINE exec pre-emit in spawn-refinement-team). Hard failures with reports. Tests: check-readiness.test.js (many), forward-ref-annotation-shared-predicate.test.js, etc. No ghosts.

**Minimal High-Value Tests (Add to new engine/tests/pipeline-preflight.test.ts or extend citadel/ritual)**:
```ts
// P0: detectVerifyTheater (already in code; make it a real test file)
import { detectVerifyTheater, /* once impl: assessMetaReadiness, checkVerifyMachinability, ... */ } from '../src/lib/pipeline-preflight.js';
test('detectVerifyTheater flags all 12 theater patterns + self-healer anti-patterns (P0 from preflight comments)', () => {
  const cases = [
    'ls foo || true',
    'verify manually by eye',
    'must pass on current tree',
    'TODO verify AC',
    'placeholder later verify',
    'bare ls foo',
    'grep -qE "pat" || true',
    '/* after good proposal */',
    'wc -l | grep -q "^0$"',  // self-healer pattern fix
    'grep -A 5 "foo" | grep -q bar',
    'node -e "..." | grep -q',
  ];
  for (const c of cases) {
    const r = detectVerifyTheater(c);
    assert.ok(r.isTheatrical, `must flag: ${c}`);
    assert.ok(r.hits >= 1);
  }
  assert.ok(!detectVerifyTheater('test -f engine/src/lib/pipeline-preflight.ts && echo BASELINE_OK').isTheatrical);
  assert.ok(!detectVerifyTheater('npx tsx -e "console.log(42)"').isTheatrical);
});

// P0: once the missing fns are ported from dist + sibling check-readiness patterns
test('assessMetaReadiness returns green/amber/red + signals + suggestedPrereqs on skeletal markers (scope+verify content)', () => {
  const red = assessMetaReadiness('engine/src/foo.ts', 'TODO stub placeholder', { grokRoot: process.cwd() });
  assert.equal(red.status, 'red'); assert.ok(red.score < 50); assert.ok(red.signals.length > 0);
  // ... amber, green cases; filesScanned; scannedAt
});

test('runPreflight + checkTicketMaterialization + isPrdSufficientlyRefined produce PreflightReport with correct ok/needsRefine/isZombie + Activity side-effect', async () => {
  // tmp session with state + tickets + prd; assert report shape, no throw
});

test('checkVerifyMachinability + scanAnalystOutputsForUnverifiedPaths (forward-ref one-space rule, path_not_found, ac_shape) reject theater/hygiene debt at emission time', () => { /* exact per ticket-template + port PRD */ });
```
**Why minimal/high-value**: These are the *exact* gates called on every refine emission and post-run citadel. 1 file, 5-7 tests, forces the port of missing bodies (no more src/dist split). Run via `npx tsx` in CI. Sibling equivalent density: dozens across 2-3 files.

**Also**: Add compile-time or test-time assert that all imported names from pipeline-preflight are actually exported (catches ghost imports immediately).

---

## P0/P1 Gap 2: Skip Logic (isPureResearchTheaterNoEvidence + Hardening Guard) Untested + Duplicated + Racy
**Files**:
- `engine/src/ritual.ts:312-367` (first rescue site: if research + artifact + RA blocked/deferred → extract, isPure... = blocked && EMISSION_THEATER && !gitProgress; if hardening (H- or isHardening) force BLOCKED + Activity.ticketReadinessBlocked else markTicketSkipped + ticketSkipped + updateCampaignStatus + convergenceIteration; return valid:true with researchBlocked).
- Duplicate at `438-468` (meta-readiness extraction site; almost identical logic, different var names).
- `engine/src/session.ts:232-267` (updateTicketReadiness sets status=blocked/deferred; markTicketSkipped sets 'skipped' + skipReason; both under withFileLock + writeState).
- `engine/src/bin/orchestrator.ts:278-290` (post-ritual: if liveStatus blocked/deferred/skipped → log + optional Activity; skipped treated as terminal non-freezing).
- `engine/src/lib/phase-utils.ts:306` (getReadyTickets excludes 'skipped' from ready; getPromotedHardeningTickets only scans blocked/deferred, *explicit comment* says skipped excluded).
- Fixtures in ritual.test.ts use "ready" RA only (lines 40,64,292); no EMISSION_THEATER + no-evidence case.
- campaign-simulator.ts / stress: no injection of blocked RA with theater reason.

**Impact**:
- The P0 resilience ("honest research block = skipped terminal, campaign continues, heal via H-VERIFY") is the *entire point* of the port for 50-tix with debt. Zero direct tests.
- Dupe = maintenance hazard (future stronger guard or gitProgress calc only hits one site).
- Racy isHardening read (direct fs + JSON.parse, no lock) vs locked writes → wrong decision on H-VERIFY healers during load.
- **vs sibling**: Single path in mux-runner.ts + pickle-utils.ts:940 (locked markTicketSkipped with timestamps, idempotent). Tests: mux-runner.test.js:3294 (exact 'ticket_auto_skip_no_evidence' event assert with reason/iteration/startCommit), pickle-utils.test.js:1016-1086 (8 cases: updates status, inserts skipped_at, no-op if already, nonexistent false, etc.).

**Minimal High-Value Tests (extend ritual.test.ts + new integration)**:
```ts
test('ritual performPostReturn research theater no-evidence skip path (non-hardening): extracts RA, calls markTicketSkipped + ticketSkipped + updateCampaignStatus + convergence, returns valid with researchBlocked:false', async () => {
  const sm = new (await import('../src/session.js')).SessionManager();
  const { sessionDir } = sm.createSession('/tmp/ritual-theater-skip', 'theater-skip-test');
  const ticketId = 'T-REAL-THEATER-01';
  // setup: ticket pending, git no-progress since preSha, research_*.md with ## Readiness Assessment\n**Status**: blocked\n**Reason**: EMISSION_THEATER: theatrical Verify "ls foo || true" ...
  // mock workerResult with no promise but artifact present (the rescue trigger)
  const outcome = await ritual.performPostReturn(... with theater RA artifact ...);
  const state = sm.loadState(sessionDir);
  const t = state.tickets.find(x => x.id === ticketId)!;
  assert.equal(t.status, 'skipped');
  assert.ok(t.skipReason?.includes('EMISSION_THEATER'));
  assert.ok(t.readiness?.status === 'blocked');
  // assert Activity calls (via spy or post-read jsonl)
  // assert campaign-status note contains "RESEARCH SKIPPED"
  assert.equal(outcome.blockedStatus, 'skipped');
  assert.ok(!outcome.researchBlocked);
});

test('hardening guard: H-VERIFY-* or isHardening=true theater block → FORCES BLOCKED, never skipped (preserves healing path)', async () => {
  // same setup but ticketId = 'H-VERIFY-EMIT-XXX' or meta {isHardening:true}
  // after performPostReturn: status === 'blocked' (not skipped), error log emitted, ticketReadinessBlocked called
});

test('no dupe logic: both rescue sites (pre-!valid and meta-readiness) take identical isPure + guard path (or better: unified helper)', () => { /* meta */ });
```
**Why high-value**: Directly Red/Green the exact new resilience + guard the port PRD + agent review comments celebrated. 3 tests, 1 file extension. Forces lock usage + dedupe. Sibling has equivalent + event asserts.

Add to session-manager.test.ts or new: tests for markTicketSkipped / updateTicketReadiness under lock contention (use the sibling test patterns).

---

## P1 Gap 3: Emitter Healers + Waiver + Amber Debt Path Zero Coverage
**Files**:
- `engine/src/lib/ticket-emitter.ts:222-278` (the if(theater || red && !isAlreadyHealing) block: for council emit sibling, set theaterWaiverSibling, force amber readiness on debt ticket, append to hardeningTickets, push __healerToEmit; meta/self hard-fail).
- Later hygiene + manifest smoke that call the ghost fns.
- generateTicketMarkdown injects the Preflight Readiness + EMISSION_THEATER DEBT WAIVER sections (per the template in references/refine/ticket-template.md).
- No tests anywhere call emitRefineCouncilTickets with a theatrical spec or red readiness.
- Self-check in the auto H-VERIFY-EMISSION-HONESTY AC Verifies (lines 358+) assume the ghosts exist.

**Impact**: The "auto sibling healer + amber debt for never-stop policy" (the exact mechanism so one bad refine doesn't poison 50-tix) is untested. Healers may not emit, or may emit with bad ACs (theater in the healer itself — the preflight comment guards against this but code is broken).
**vs sibling**: Analogous "healer" / hardening emission in refine paths is exercised in spawn-refinement + full integration; tests assert sibling creation + no poison in batch.

**Minimal High-Value Test (new in engine/tests/ticket-emitter.test.ts or inside ritual/orchestrator-integration)**:
```ts
test('ticket-emitter on council path with theatrical Verify: emits original amber + theaterWaiverSibling + auto H-VERIFY healer sibling in same batch; healer ACs are theater-free + reference the debt ticket; meta/self hard-fails', async () => {
  const specs = [{ id: 'R-META-FAIL-01', ... acceptanceCriteria with 'ls foo || true; echo after', category: 'normal' }];
  const created = await emitRefineCouncilTickets(sessionDir, specs, { generatedBy: 'refine-prd council' });
  assert.ok(created.some(p => p.includes('R-META-FAIL-01')));
  const debtTicket = ... read it; assert.ok(debtTicket.includes('AMBER (EMISSION_THEATER_DEBT_WAIVER)'));
  assert.ok(debtTicket.includes('H-VERIFY-EMIT-R-META-FAIL-01'));
  const healer = ... read H-VERIFY-EMIT-... ; assert.ok(healer.includes('AC1') && !/\\|\\| true/.test(healer)); // theater-free
  // assert readiness on debt is amber
  // for meta/self input: throws HARD EMISSION GATE
});
```
**Why**: Exercises the entire "progress then fix" + waiver injection. 1-2 tests. Sibling density forces this at emission time.

---

## P1 Gap 4: No Harness/Integration Tests for 50-tix Campaigns with Injected Debt
**Files**:
- `engine/tests/campaign-simulator.ts`: Chaos injections (timeout, bad-artifact, gate-regress, sigterm, disk) + assertions on isolation/resumption/rollback. No --inject-theater-debt, no blocked RA with EMISSION_THEATER, no healer sibling creation, no skip path verification.
- `engine/tests/stress-longrun.test.ts`: 25-tix proxy, basic marks, no debt.
- `engine/tests/orchestrator-integration.test.ts`: Small ticket sim + meta-readiness topo (phase-utils only). No full loop with debt tickets.
- ritual.test.ts: Recovery + contract; theater-free fixtures.
- No equivalent to sibling's full-suite-runs/ fixtures or large harness that seeds debt and asserts "campaign completes with exact skips + healers promoted + no freeze + events".

**Impact**: The "50-ticket overnight with injected debt" scenario the whole system is built for has *zero* automated proof that skip + healer + preflight + observability hold under load. The existing sim is good for general chaos but misses the new P0 resilience feature.
**vs sibling**: mux-runner.test.js + transaction tests + fixtures exercise skip + auto-mark + activity under simulated runs; setup.test.js mentions 50-tix scale expectations.

**Minimal High-Value Addition** (to campaign-simulator.ts or a new debt-harness.test.ts):
- Add `--inject-debt-theater-rate 0.1` option.
- In sim loop: for some tickets, write theatrical Verify into their ticket.md at creation, simulate research return with blocked RA + no git evidence → assert markSkipped called (spy), status=skipped (non-hardening), healer sibling auto-created in batch (or later by closer), campaign continues (executable not starved), specific Activity + campaign-status notes.
- Assert for 50-tix proxy: 0 frozen (executable eventually drains or pauses cleanly with debt summary), healers visible, no phase_failed_* for honest blocks.
- Extend stress test similarly.

This + the unit tests above = the "harness/integration tests for 50-ticket campaigns with injected debt" the query demands. Run it in the overnight rig.

---

## P1/P2 Gap 5: Observability for Debt Tickets is Partial + Best-Effort (Hard to Debug Stuck Runs)
**Files**:
- `engine/src/activity-logger.ts:172` (ticketSkipped), `325` (verifyTheaterRejected), `434` (preflightReport). No ticketReadinessBlocked / readinessBlocked impl (only called via (as any)?. in ritual:332,347,290 orchestrator).
- `engine/src/ritual.ts` + orchestrator: best-effort Activity + updateCampaignStatusSync notes on skip/block (includes reason slice, effectiveStatus).
- `engine/src/session.ts:552+` (recordProgress + watchdog alarm writes noProgressAlarm + Activity.campaignWatchdogAlarm; getLastProgressTs from campaign-status).
- campaign-status.json surface: note, lastPhaseResult, paused/pauseReason (from meta), progress. No dedicated theater_debt / skipped_debt array.
- No schema (sibling: extension/activity-events.schema.json with 'ticket_auto_skip_no_evidence' etc.).
- Worker logs (tmp/worker-logs/*), activity/*.jsonl, state.json (with readiness + skipReason), campaign-status, git are the debug surface — present but not enriched for debt.
- citadel + self-prd + closer do post-run forensics (good), but during 12h stuck run you're blind to accumulating debt.
- bin/orchestrator + mux (if present) log some, but no "debt ledger" dump on heartbeat or alarm.

**Impact on "debug a stuck overnight run"**: You can see the watchdog alarm + last progress ts + activity tail + "RESEARCH SKIPPED: T-XXX" notes. But you won't see *why* (full RA, suggested H-*, which Verifies were theatrical, % debt) live without grepping 50 ticket.md + artifacts. No structured event for readiness blocked on debt. ticketReadinessBlocked calls are no-ops.
**vs sibling**: Rich events (ticket_auto_skip_no_evidence with full payload), schema conformance tests, live MASTER_PLAN / bundle / watcher surfaces, activity logger tests assert every skip/readiness variant.

**Observability Improvements + Minimal Tests**:
1. **Implement the missing Activity methods** in activity-logger.ts:
   ```ts
   ticketReadinessBlocked(sessionId: string, ticketId: string, status: string, details?: any) {
     logActivity({ ts: iso, event: 'ticket_readiness_blocked', source: 'ritual', session: sessionId, ticket: ticketId, details: { status, ...details } });
   }
   // Similarly for others; add 'theater_debt_summary' event etc.
   ```
2. **Enrich campaign-status + meta compute**: In session.ts computeMetaPauseOrExecutable (or new getTheaterDebtSummary), aggregate skipped + blocked with readiness.suggestedPrereqs + recent RA signals → always patch `theaterDebt: { skipped: [...], suggestedHealers: [...], count: N }` into updateCampaignStatusSync. Surface in orchestrator pause note.
3. **Add activity-events.schema.json** (copy/adapt from sibling, extend for grok events: preflightReport, ticket_skipped with reason, verify_theater_rejected, campaignWatchdogAlarm, ticket_readiness_blocked). Add conformance test (like sibling pipeline-empty-scope-skip-schema-conformance.test.js).
4. **Tests** (extend activity-logger.test.ts):
   ```ts
   test('Activity.ticketSkipped + ticketReadinessBlocked + preflightReport + verifyTheaterRejected emit correct shapes to daily jsonl (for debt RCA)', () => {
     // spy or read after; assert event names, fields (session, ticket, reason, status, signals)
   });
   ```
5. **Debug aids for stuck runs**: On watchdog alarm, append a "RCA dump hint" to campaign-status (e.g. "Inspect: activity/ + tickets/*/research_*.md + git log --since=lastProgress + state.json | jq '.tickets[] | select(.status|IN("skipped","blocked")) | {id,status,readiness,skipReason}' "). Enhance bin/ or add a `node -e 'require("./engine/src/bin/debug-debt").dump(sessionDir)'` (thin, reuses existing).
6. **In ritual + orchestrator**: Always emit the readinessBlocked event (implement first); include full RA summary in the campaign-status note / lastPhaseResult.

These make debt *visible live* in the exact files (campaign-status.json, activity jsonl) an operator/tmux/closer bot would cat at 3am. Sibling-level.

---

## P2/P3 Other Gaps (Quick Hits)
- **phase-utils + orchestrator meta paths**: getPromotedHardeningTickets excludes skipped (by design per comment, but now conflicts with auto-skip creating skipped debt). Test + fix per earlier RCA in background subagent output (include skipped in promotion scan + treat terminal statuses as dep-satisfiers for getReadyTickets so dependents don't starve).
- **No preflight integration tests**: Extend orchestrator-integration or run-pipeline tests to assert preflightReport Activity + report.ok on clean vs debt sessions.
- **Worker/ritual logs for debt**: Ensure research_*.md + worker logs always capture the full RA + theatrical Verify hits (already mostly true via contract).
- **Sibling parity**: Port more test patterns (e.g. locked op tests, event payload schema tests, large log injection for desync like the 28k in ritual.test). Add fixtures/ dir with sample debt sessions.
- **Coverage metrics**: Current engine/coverage/ is spotty; the new paths are 0%. Add to CI.
- **Self-dogfood**: The self-prd-generator H-VERIFY AC Verifies for analyze etc. are currently lies (ghost calls). Tests would have caught.

---

## Recommended Minimal Test Suite Additions (Ship These First)
1. `engine/tests/pipeline-preflight.test.ts` (P0, 8-10 tests: detect all patterns, assess green/amber/red, runPreflight happy/zombie, machinability/hygiene once ported).
2. Extend `ritual.test.ts` (P0/P1, 4-5 tests: the two theater skip sites + hardening guard + RA extraction for blocked).
3. `engine/tests/ticket-emitter.test.ts` (P1, 2-3 tests: healer auto-emit on theater/red, waiver/amber, meta hard-fail).
4. Debt injection mode in `campaign-simulator.ts` + assertions (P1, 1 harness test exercising 10-20 tix with 1-2 debt).
5. Extend `activity-logger.test.ts` + add schema conformance (P1/P2, all debt events).
6. 1-2 orchestrator-integration extensions for full loop with skipped debt + healer promotion.
7. (Optional P3) `engine/tests/debt-observability.test.ts` for live campaign-status / watchdog + debt summary.

**Total new/changed LOC for tests**: ~300-500. High signal. Run as `npm test` in engine/ + in the 50-tix rig.

After Green: re-run the overnight sim with --inject-debt-theater-rate. Assert no stalls, healers surface, events rich, campaign-status tells the story at hour 6. Then Anatomy Park + Szechuan on the test debt.

---

**Final Rick Rant**: "The port PRD promised shift-left defenses and runner skip resilience so 50-tix self-runs could survive honest (or waived) theater without freezing. What we got is a beautiful comment in ritual.ts, a half-ported preflight that only exists after `tsc`, dupe logic a toddler could desync, and tests that only cover the happy 'ready' path. Meanwhile the Claude sibling laughs from its 678-test fortress with locked utils, event schemas, and skip harnesses that would have caught every one of these before the first detached mux.

Fix the ghosts. Write the 5 files of tests. Dogfood with injected debt. Or keep pretending the gates work and enjoy your 3am 'why is the campaign stuck on T-007 research?' surprise.

Wubba lubba dub dub. The pickle sees all."

**References Used** (all read via tools):
- engine/src/* (full key paths)
- engine/tests/* (all 15)
- ../pickle-rick-claude/extension/tests/ (targeted greps + reads of mux-runner.test.js ~3294, pickle-utils.test.js ~1016, activity-logger.test.js, check-readiness.test.js, schemas, fixtures)
- prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md + related
- 50-Ticket_Overnight...Report.md
- references/refine/ticket-template.md + phases/research.md
- dist/ artifacts for comparison
- memory from prior (skip rescue, watchdog, emission port)

All findings reproducible from `grep` + `read_file` on the listed paths. No speculation.

---

## R10 Fidelity / Prompt-Doc-Contract Alignment Update (019e5a71-5ad9-7763-804b-061082b708cc + full R10 swarm)
**Date**: 2026-05-24 (post subagent "Prompt / Doc / Contract Fidelity auditor (sibling truth source)")

**What was theater vs reality (per subagent + sibling cross-check on spawn-refinement-team.ts:1410/1925, check-readiness.ts, forward-ref-annotation.js, mux-runner ~1717+)**:
- Two hygiene fns (`checkVerifyMachinability`, `scanAnalystOutputsForUnverifiedPaths` + exact one-space FORWARD_REF regex + git bare-path enforcement) **are now real in src/** (restored R8/R9 + hygiene collectors at preflight end). Calls in ticket-emitter 407-408 and H-VERIFY attachment are live.
- `evaluateAcShapeEnforcement` (the AC-shape collapse-or-justify machine gate from Claude spawn-refinement-team:1410) is **still absent**. Docs/AGENTS/SKILL/refine-contract/injections overclaimed "full HARD EMISSION GATE" + "Exports ... evaluateAcShapeEnforcement".
- Scar comment in pipeline-preflight.ts:338 ("THE TWO MISSING...") was self-acknowledging Jerry; cleaned.
- H-VERIFY-EMISSION-HONESTY AC1 verify had "graceful on missing fns during transition" fallback; tightened to direct calls + note on the remaining AC-shape gap.
- SKILL synthesis "Call evaluate..." instruction + "0 blocking" flavor language (where present) rewritten to honest: real hygiene fns + auto H-VERIFY healer + manual per injected AC_SHAPE/PATH sections + never-stop amber waiver for council paths. Hard Rule at SKILL:227 was already accurate ("gate report + healers do **not** prevent REFINEMENT_COMPLETE on council paths").
- AGENTS:55, refine-contract:69, analyst-gate-injections:7+37, SKILL post-synth steps, and the driving PRD itself updated to qualify the port status vs Claude sibling. "Full port" claims dialed back; reliability-backlog owns the AC-shape fn + full test harness + live debt heartbeat.

**Current defense (real, post-fixes)**: Pre-emit verify-theater + machinability + path/forward-ref hygiene (R-RTRC-7) + proactive auto H-VERIFY-EMISSION-HONESTY sibling (always attached on council refine) + ritual skip for pure research theater (non-H only) + promotion/dep including 'skipped' + amber + never-stop contract. Closer/self-PRD turn debt clusters into next H-* PRDs.

**Still open (reliability-backlog / next self-campaign input)**: Implement `evaluateAcShapeEnforcement` + wire as blocking in synthesis (or keep healer path), debt-injected 50-tix harness (P0 per this audit), observability (theaterDebt in campaign-status + Activity impls), more any/swallow cleanup, stronger install parity, dist/src convergence, dogfood on a real meta or GitNexus lifecycle.

All doc changes surgical, pre-edit read + grep verified, sibling ground truth cited in every file. tsc + commit/push/install close this R10 round per standing user contract.

<promise>I AM DONE</promise>
