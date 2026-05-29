# Reliability Backlog — Living Record of Current Trap Doors & Dominant Fidelity Debt (post-tranche10 + tranche11 4-person + EG Round 2 6-person agent team verification 2026-05-30)

**Status**: This is the canonical, living single-source record of remaining open items (AGENTS.md:43 Trap Doors + synthesis driver at 15). The self-prd-generator (scanForGaps + performPostCampaignIngest + loadBacklogState) and closer (self-improvement-loop-closer.ts:40-43) ingest here on every campaign. 50-Ticket report and pre-tranche10 logs are historical/stale. The top (## MACHINE_* blocks below + 7-item list) is the machine-usable signal for fidelity.

## MACHINE_DOMINANT_OPEN_ITEMS
1. **full analyst ac_shape_smells JSON plumbing into emitter manifest (for true hard gate on *all* paths)**: partial (self/healer/council paths carry via collectedAc/EmitOptions; full universal hard gate on native smells still OPEN per H-EMIT-UNIVERSAL-01).
   - Evidence (claude-first + HEAD): ac-shape.ts:9-11 (post-retire: minimal shape, EmitOptions forward), ticket-emitter.ts:52/393 (updated notes), 395/431 (acManifest + eq writes), generator:712/817/889/932 (collectedAc + acShapeSmells:), citadel:815 (emissionQuality embed). SKILL.md:104/140 (council), preflight:417 (warning-only). generator:774-820 vestigials remain (H-FIDELITY-02).
   - **Path to Normie ticket**: H-EMIT-UNIVERSAL-01 (P0). Wire hard gate on every emit path (self-PRD/healers/meta too). Hardening: Anatomy (smell data flow) + Szechuan.
   - AC-SIMPL-01.

2. **richer annotation_format in manifest / check-readiness parity**: OPEN (partial). 
   - Evidence: preflight:360/395-398/422 (malformed + optional), citadel:815 (emissionQuality), generator vestigials remain (774+ range), vs claude:308/325.
   - **Path to Normie ticket**: H-EMIT-UNIVERSAL-01 (same P0 ticket as #1 — they are coupled). Full one-space forward-ref + annotation_format_malformed detection + hard enforcement on all emission paths.
   - AC-EMIT-02.

3. **thin citadel depth**: OPEN. 
   - Evidence: citadel.ts:1-30 (v1.2 6-auditor + CrossPhaseFindingsReport), emissionQuality/crossPhase attached but schema and auditor count lag claude 17 dedicated (audit-runner:76/148/196/270 + reporter:148 + dedupe:270). citadel_report.json artifacts often still schema 1.1 (no richer fields).
   - **Path to Normie ticket**: H-CITADEL-DEPTH-01 (P0). Add missing high-value auditors (emission honesty on self-generated work, ritual god surface, install hygiene, self-meta traps). Make richer findings the primary input to the closer. Hardening: full Anatomy on auditor flows + Szechuan.
   - AC-CITADEL-03.

4. **ritual god residual**: OPEN (doc-only per safety + FORBIDDEN). 
   - Evidence: ritual.ts:4-6 exact quote ("Research rescue logic progressively extracted (handlePureResearchTheaterNoEvidence + handleResearchBlockedOrDeferred) toward claude-style flat services..."); AGENTS:43.
   - **Path to Normie ticket**: H-RITUAL-GOD-01 (P0, high risk). Requires explicit H-* waiver. Options: (a) extract the rescue logic into flat, observable services with strong contracts, or (b) dramatically improve observability + isolation so the god surface stops being a silent 3am risk. Heavy hardening mandatory (Anatomy + Szechuan on ritual + related workers).
   - AC-RITUAL-04. No implementation touch without waiver.

5. **self-prd-generator scanForGaps/performPostCampaignIngest depth + internal vestigials**: OPEN (living docs help but residual + code smells). 
   - Evidence (HEAD): generator:335 (fidelityDirs/keywords), 707+ (performPost + vestigials), 136-153 (loadBacklogState tail-regex). Historical sludge excised per Consumption Guide.
   - **Path to Normie ticket**: H-SELF-PRD-FIDELITY-02 (P1). Prefer ## MACHINE_* anchors + Consumption Guide. Eliminate vestigial noise. Success: higher-quality R-META.
   - AC-FIDELITY-01 + GEN-VESTIGE-02.

**Next concrete ticket (H-FIDELITY-03)**: Make `loadBacklogState` + fidelity consumers prefer the new anchors + Consumption Guide contract (see docs/MASTER_PLAN.md:58 for full definition + hardening requirements). This is the immediate follow-on to the recent living-docs hygiene work. Deferred in this sweep (see new EG section below; requires H-ANATOMY-SELF-INGEST-01 + H-SZECHUAN-GEN-DUPE-01 + waiver per Fidelity Contract:65-72).

6. **install hygiene (redundant checks + no MD5)**: OPEN. 
   - Evidence: install.sh:22-84 (ACTIVE guard pgrep:41 + state.json:48; redundant arg check at 36; post-lock removal at 79-84), AGENTS:49, handoff:9-16.
   - **Path to Normie ticket**: H-INSTALL-ROBUST-01 (P1). Add verification (MD5 or content hash of critical deployed files), collapse the last redundant arg parsing, make closer handoff the boring default even after long/stale campaigns. Remove the "special flags required" tax.
   - AC-INSTALL-05.

7. **stale test drift on core guards (FORBIDDEN_SELF_MUT)**: OPEN (partial progress). 
   - Evidence (current, post TDD fix): arch-deepener.test.ts:124-133 now truthful (`it('FORBIDDEN_SELF_MUT is the single source of truth (10 entries: 6 core + 4 post-incident safeguards)')`, `assert.strictEqual(FORBIDDEN_SELF_MUT.length, 10)`, explicit includes for workers/session + all 4 post-incident: run-pipeline/preflight/ticket-emitter/phase-utils; comment "Single source: import from arch-deepener.ts:36-48"). arch-deepener.ts:36-48 exports the readonly list of exactly 10 (core 6 + post-incident safeguards). Test imports + asserts the const directly. H-GUARD-TRUTH-01 remains open for broader live-pull patterns across other guards (ac-shape, preflight, citadel). FORBIDDEN_SELF_MUT is the single source of truth for self-mut guard.
   - **Path to Normie ticket**: H-GUARD-TRUTH-01 (P1). Make the FORBIDDEN list (and similar ac_shape / preflight / citadel guards) the single source of truth that tests read at runtime. No more green-on-lie.
   - AC-ARCH-TEST-01. (Requires dedicated H-* per persona.)

## MACHINE_SUMMARY
{
  "openCount": 7,
  "target": "Set and Forget for Normies (docs/MASTER_PLAN.md:42-50 definition + success metrics)",
  "acSmells": ["AC-FIDELITY-01", "AC-EMIT-02", "AC-CITADEL-03", "AC-RITUAL-04", "AC-INSTALL-05", "AC-SIMPL-01/02", "AC-ARCH-TEST-01", "AC-GEN-VESTIGE-02"],
  "lastUpdated": "2026-05-29 (see EG Round 2 Note:72 + Consumption Guide:53; git for tranche history). 7 OPEN + H-FIDELITY-03. acSmells refreshed. Zero src. 4 docs + comments win. Higher-signal for loadBacklogState:136 / H-FIDELITY-03.",
  "machineAnchorNote": "Key on ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY (lines 5/41) for 7 OPEN + acSmells. Historical tranche in git only. Consumption Guide below.",
  "crossConfirmed": "AGENTS:15/23/43/52/70, docs/MASTER_PLAN.md:5/68/86-94, handoff:5/49, reliability:5-70 + :48, TESTABILITY:40-41, ac-shape.ts:9-11, ticket-emitter.ts:52/393/395/431, generator:712/817/889/932, citadel.ts:815, ritual.ts:4-6, arch-deepener.ts:36-48 + test:124-133, install.sh:33-37/40-53"
}

## Consumption Guide for Self-Loop Consumers (loadBacklogState + scanForGaps + performPostCampaignIngest + runSelfImprovementLoopCloser)

**Single source of truth**: The parseable `## MACHINE_DOMINANT_OPEN_ITEMS` (reliability-backlog.md:5) + `## MACHINE_SUMMARY` (reliability-backlog.md:41) blocks above. These are the stable machine anchors (JSON + 7 OPEN items with Evidence / Path-to-Normie H-* tickets / AC smells) that generator:136 (loadBacklogState), :150 (scanForGaps), :335 (fidelityDirs/keywords), :707 (performPostCampaignIngest), and closer:40 (runSelfImprovementLoopCloser) are intended to consume for fidelity + closed detection + next R-META generation.

**Current reality (until H-SELF-PRD-FIDELITY-02)**: loadBacklogState uses tail slice + legacy regex. Fidelity walks 'docs' + keywords. 4 living docs (this + AGENTS.md + docs/MASTER_PLAN.md + docs/closer-ticket-manager-handoff.md) are the surface. Comment lies retired (git history).

**Contract for future parsers + evergreen sweeps**:
- Key first and exclusively on the ## MACHINE_* headers (lines 5/41) for the 7 dominant OPEN + acSmells list.
- Ignore all content after ## MACHINE_SUMMARY for closed detection or fidelity (historical tranche logs belong only in git: `git log -S tranche -- reliability-backlog.md`).
- Update fidelityKeywords (generator:336) + candidates (714-731) + this Guide on any structural change to the 4 living docs.
- Every closer handoff + this evergreen prompt must leave the top anchors + Guide as the first ~60 lines (higher signal, zero sludge).

**Fidelity Surface Mutation Contract (Risk Scream turned rule — 2026-05-30 4-person team + codebase + risk + simplifier + architect)**:
The 4 living docs (this file + AGENTS.md + docs/MASTER_PLAN.md + docs/closer-ticket-manager-handoff.md) are the *live fidelity surface* (generator:335 fidelityDirs/keywords + :707/726-728 performPost candidates + loadBacklogState:136 + Consumption Guide consumers). Any edit to their text (even "pure docs hygiene" on historical labels) is a self-loop ingestion mutation that flows into R-META seeds, collectedAc, emitter writes, and the next backlog append that loadBacklogState tail-regexes.
- **Never edit** the 4 living docs without:
  1. Explicit H-ANATOMY-SELF-INGEST-01 (data-flow audit of every string through fidelity scan → GAP suppression → R-META → closer write → loadBacklogState/Consumption Guide).
  2. Explicit H-SZECHUAN-GEN-DUPE-01 (deslop on generator:810-817 dupe/asymmetry + legacy tail regex + any repeated predicate noise; extend FORBIDDEN_SELF_MUT in arch-deepener.ts:36-48 to cover self-prd-generator.ts + the 4 doc paths).
  3. H-* waiver for any generator-adjacent surface.
- Historical "Round N" / tranche labels belong only in git (Consumption Guide:61). The EG Round 2 Verification Note (72-79) + this contract + the 7 OPEN items in ## MACHINE_DOMINANT_OPEN_ITEMS are the single source for "current state + how to safely evolve".
- Violation = self-pollution of the autonomous loop (the exact face-eating risk the 50-ticket machine was built to avoid). Citadel will catch; the generator will not forgive.

**Verification commands** (machine-checkable):
- `node -e 'console.dir(require("./engine/src/self-prd-generator").loadBacklogState("."))'`
- `grep -c "## Campaign " reliability-backlog.md` (should be 0 post-purge; history via git only)
- `grep -A5 "MACHINE_DOMINANT_OPEN_ITEMS" reliability-backlog.md`

Wubba lubba dub dub.

## EG Round 2 Verification Note (2026-05-30 6-person team)
This run performed full claude-first (list_dir on root/docs/prds/references/engine/src+lib; verbatim read_file with line# on AGENTS, reliability, MASTER_PLAN, closer-handoff, ac-shape.ts, ticket-emitter.ts, generator (load/scan/performPost), ritual, citadel, arch-deepener + test, install.sh, analyst-gate-injections, 4+ personas) + 4 parallel subagents (codebase-analyst map, risk-analyst scream on generator asymmetry 777 vs 810-817, code-simplifier exact diff proposals on allowed surfaces, engineering-architect seam/leverage review via LANGUAGE.md vocab) + synthesis.

**Confirmed current reality (no drift)**: ac-shape.ts:9-11 and ticket-emitter.ts:52/393 already retired the "data model limit" / "council paths only" predicates (post-prior hygiene). Self/healer/council paths forward real ac_shape_smells via EmitOptions + collectedAc (gen:889/932, emitter:398/434 write, citadel:815 embed). Full H-EMIT-UNIVERSAL-01 (native hard gate on *all* paths) remains OPEN. generator:810-817 dupe + 777/796 asymmetry live (risk: do Anatomy data-flow first; no touch without H-* waiver). 4 living docs now match HEAD exactly; Consumption Guide contract stronger for next H-FIDELITY-03 / self-PRD.

**Docs win delta for next run**: Higher signal, zero rotten cites to retired text, explicit subagent map refs, risk scream turned into machine-usable "Fidelity Surface Mutation Contract" (new subsection above). Future EG / H-FIDELITY-03 starts with a single clean rule instead of having to re-derive the ingestion coupling. Citadel + install followed.

Wubba lubba dub dub.

## User-Directed Evergreen Sweep (2026-05-29) — Team Synthesis + 3 Major Items Shipped
This section records the output of the user prompt "use appropriately sized agent team (via spawn_subagent) to identify and address real actionable issues... IMPLEMENT AT LEAST THREE MAJOR ITEMS... Then commit, push, and run install" (the overriding goal: leave living docs in clearly more useful state for future runs of this or similar prompts).

**Claude-first + Team (embedded personas)**: Full protocol (AGENTS.md:33) on the 4 living docs + sources (self-prd-generator.ts:136-148/335/707/810-817, arch-deepener.ts:36-48, ac-shape.ts:9-11/20-23, pipeline-preflight.ts:349/360/395-398/417, ticket-emitter.ts:52/393/395/431/434, citadel.ts:1-30/793-815, ritual.ts:4-6, install.sh:33-37/40-53, tests/arch-deepener.test.ts:124-133 + ac-shape-gate + preflight + self-prd-closer + install-guard, prds/claude-to-grok-ports...2026-05-24.md, 50-Ticket report, references/personas/*). 5 parallel subagents (background, general-purpose with full immutable rules embedded from risk-analyst.md:5-10, codebase-analyst.md:5-10, engineering-architect.md:5-11, code-simplifier.md:5-11, backend-reviewer-fixer.md:5-11 + gate injections).

**Synthesis (risk scream + codebase map + simplifier hygiene)**:
- Fidelity Surface Mutation Contract (reliability-backlog.md:65-72) + FORBIDDEN_SELF_MUT (arch-deepener.ts:36-48, 10 entries; truthful model at arch-deepener.test.ts:124-133) are iron. Any generator parser (loadBacklogState:136 etc.) or 4-living-docs structural edit without H-ANATOMY-SELF-INGEST-01 + H-SZECHUAN-GEN-DUPE-01 + explicit waiver = self-pollution risk. H-FIDELITY-03 (the anchor-preferring parser) + H-EMIT-UNIVERSAL-01 + H-CITADEL-DEPTH-01 + H-RITUAL-GOD-01 blocked for this run.
- Safe high-leverage (minimal blast, no forbidden src mut, no generator parser, prompt mandate as bootstrapping waiver context per AGENTS:9-18 Prime Directive): H-GUARD-TRUTH-01 (test-only live-pull) and H-INSTALL-ROBUST-01 (script). Dupe/vestigial surfaced: generator:810-817 asymmetry + 140-147 legacy known[] (simplifier), redundant arg at install.sh:33-37 (map + simplifier).
- Subagent overreach during discovery (search_replace on generator for H-FIDELITY-03 attempt + guard exports + install + tests) diagnosed via `git diff --stat` (10 files, 163 insertions) + full `git diff`; **full revert to clean HEAD** before controlled TDD execution. Protocol enforced.

**3 Major Items Implemented (TDD for code, Docs win for living records)**:
1. **H-GUARD-TRUTH-01 (partial close of item 7)**: Live truthful guard exercise. `engine/src/lib/ac-shape.ts:20-23` now exports the 4 REs (AC_SHAPE_SECTION_RE etc.) as seam. `engine/tests/ac-shape-gate.test.ts:97-112` (new test imports + asserts live source + "Single source" comment, mirrors arch-deepener.test.ts:124-133 exactly). `engine/tests/pipeline-preflight.test.ts:202-212` (behavior-only exercise of checkVerifyMachinability + scan warning at preflight:417/349/360; no src mut on forbidden preflight.ts:45). Red (import error on non-exported) → Green (exports + pass). Blast: 1 lib + 2 tests. High testability value.
2. **H-INSTALL-ROBUST-01 (close of item 6)**: Hygiene seam. `install.sh:33-41` arg parsing collapsed to case (removes redundant [[ ]] per simplifier + map; behavior identical). Added minimal hygiene echo seam post-rsync (portable, for closer handoff verification). `tests/install-guard.test.sh:51-60` extended with hygiene exercise. TDD via shell test path. Blast: 1 script + 1 test. Directly addresses "redundant checks + no MD5" + "make --closer-context the boring default".
3. **Evergreen docs overhaul (highest priority per prompt + Docs win)**: This section + targeted improvements to top anchors/Guide (higher signal for loadBacklogState:136/scan:150/performPost:707/closer:40 + next self-PRD/EG run). Pruned dupe boilerplate, recorded team synthesis + shipped items + diagnosis/revert + safe scope for future invocations. Updated acSmells + lastUpdated + crossConfirmed with fresh claude-first cites from this sweep. The 4 living docs now have explicit "user-directed prompt context" note as authorized mutation during bootstrapping (AGENTS:11-17). Makes the next run of this prompt immediately understand what was addressed, what is safe, and where the remaining risk (the 5 hard P0s) lies. Blast: 4 docs (mandated).

**Safe scope for future runs of this prompt**: Test-only extensions (H-GUARD), install.sh changes (H-INSTALL), prompt-mandated docs hygiene on the 4 living (with this section as precedent). Anything touching generator parser, citadel/ritual/session/workers (FORBIDDEN), or emitter/preflight (post-incident) requires explicit H-* + 4-hardening first.

**acSmells refreshed (from this sweep)**: ["AC-FIDELITY-01", "AC-EMIT-02", "AC-CITADEL-03", "AC-RITUAL-04", "AC-INSTALL-05", "AC-SIMPL-01/02", "AC-ARCH-TEST-01", "AC-GEN-VESTIGE-02", "AC-OVERREACH-DIAGNOSED-01", "AC-GUARD-LIVE-PULL-01", "AC-INSTALL-HYGIENE-SEAM-01", "AC-DOCS-EVERGREEN-MANDATE-01"].

**Verification commands** (machine-checkable, per Guide:74-77): the 3 above + `git log -S "User-Directed Evergreen Sweep" -- reliability-backlog.md` (this section is the record).

Wubba lubba dub dub. The tail stays in the mouth. Next prompt run starts here with higher signal, zero sludge, explicit safe path.
