# Reliability Backlog — Living Record of Current Trap Doors & Dominant Fidelity Debt (post-tranche10 + tranche11 4-person agent team audit 2026-05-28)

**Status**: This is the canonical, living single-source record of remaining open items (AGENTS.md:43 Trap Doors + synthesis driver at 15). The self-prd-generator (scanForGaps + performPostCampaignIngest + loadBacklogState) and closer (self-improvement-loop-closer.ts:40-43) ingest here on every campaign. 50-Ticket report and pre-tranche10 logs are historical/stale. The top (## MACHINE_* blocks below + 7-item list) is the machine-usable signal for fidelity.

## MACHINE_DOMINANT_OPEN_ITEMS
1. **full analyst ac_shape_smells JSON plumbing into emitter manifest (for true hard gate on *all* paths)**: OPEN (data model limit blocks universal). 
   - Evidence (fresh claude-first this sweep + prior): ac-shape.ts:9-13 ("Emitter currently passes empty ac_shape_smells (data model limit — real analyst smells not yet plumbed into TicketSpec[])"), ticket-emitter.ts:52/398 (EmitOptions + acManifest council-only), SKILL.md:104/140 (council parse only), pipeline-preflight.ts:417 (only warning). generator:774-820 + 784/805/815-828 (vestigial blocks + ifs live per grep/read despite tranche9/10 claims).
   - **Path to Normie ticket**: H-EMIT-UNIVERSAL-01 (P0). Extend TicketSpec + EmitOptions to carry real ac_shape_smells from all paths (self-PRD, healers, meta). Wire through emitter on every emit. Hard gate must fire on bad ACs even for generated tickets. Hardening required: Anatomy (full smell data flow) + Szechuan.
   - AC-SIMPL-01.

2. **richer annotation_format in manifest / check-readiness parity**: OPEN (partial). 
   - Evidence: preflight:360/395-398/422 (malformed collection + richer return optional), citadel:793/815, generator:774-820 (still vestigial blocks), vs claude check-readiness:308/325.
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
   - Evidence (this sweep + prior): generator:335 (fidelityDirs/keywords), 707/714/725/739 (performPost + richer blocks with vestigials at 784/805/815-828/890/933 per greps confirmed live), 136-153 (loadBacklogState shallow tail-regex). Dupe Machine summaries + historical sludge still present pre-this-fix.
   - **Path to Normie ticket**: H-SELF-PRD-FIDELITY-02 (P1). Use the new stable ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY anchors (now real parseable blocks). Add small typed parser adapter (lib/backlog-ingest.ts pattern). Eliminate remaining duplicate ifs / ||[] / debt-note noise. Success: measurably higher-quality R-META output with less self-pollution.
   - AC-FIDELITY-01 + GEN-VESTIGE-02.

**Next concrete ticket (H-FIDELITY-03)**: Make `loadBacklogState` + fidelity consumers prefer the new anchors + Consumption Guide contract (see docs/MASTER_PLAN.md:58 for full definition + hardening requirements). This is the immediate follow-on to the recent living-docs hygiene work.

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
  "lastUpdated": "2026-05-29 (EG-2026-05-29-02 fresh claude-first + 2-persona team: codebase-analyst 019e6fde-1296..., risk-analyst 019e6fe0-6cfd... + lead; all embedded immutable rules + ac_shape gate + full protocol: list_dir + verbatim read_file LINE# + grep on 4 living docs + arch-deepener:36-48 + test:124-133 + generator fidelity paths). Actions this run: final trailing blanks after Wubba:70 trimmed (reliability now ends cleanly ~71 lines, zero sludge per own Consumption Guide:63); MACHINE_SUMMARY:48/50 accuracy fixed for EG-2026-05-29-02 (lastUpdated, crossConfirmed 'test:124' → 'test:124-133', line count claims, removed outdated 'flagged' language); targeted stale 'test:124 drift' / 'length===6' / 'arch-deepener.test guard drift' phrases cleaned in AGENTS historical tranche bullets (77/79/95) + main Trap Doors para at 53 (per fresh grep/reads; no wall rewrite, no decision records touched). Fresh ac smells from this round (trailing_whitespace_bloat_final [CLOSED], machine_summary_inaccuracy [CLOSED], stale_evidence_in_machine_record [CLOSED], trap_doors_wall_duplication + fidelity_surface_self_mod_adjacency [flagged with hardening required]). 7 OPEN + H-FIDELITY-03 (next concrete, correctly deferred per screams) structure unchanged. Zero src (FORBIDDEN arch-deepener:36-48 + risk screams + Prime Directive respected). Install + citadel followed. 'Docs win.' Clearly higher signal for next self-PRD/evergreen/closer.",
  "machineAnchorNote": "Key on these ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY headers for stable consumption by generator/closer/loadBacklogState/scanForGaps. See H-SELF-PRD-FIDELITY-02. Prior historical tranche logs in git only (git log -S tranche -- reliability-backlog.md). Consumption Guide immediately below documents the contract.",
  "crossConfirmed": "AGENTS:15/23/43/52 (post-scrub), docs/MASTER_PLAN.md (Roadmap + new manifest), handoff:49, TESTABILITY:40-41, ac-shape.ts:9-13, ritual.ts:4-6, citadel.ts:1-30/792, generator:335/707, arch-deepener.ts:36-48 + test:124-133, install.sh:33-37/40-53"
}

## Consumption Guide for Self-Loop Consumers (loadBacklogState + scanForGaps + performPostCampaignIngest + runSelfImprovementLoopCloser)

**Single source of truth**: The parseable `## MACHINE_DOMINANT_OPEN_ITEMS` (reliability-backlog.md:5) + `## MACHINE_SUMMARY` (reliability-backlog.md:41) blocks above. These are the stable machine anchors (JSON + 7 OPEN items with Evidence / Path-to-Normie H-* tickets / AC smells) that generator:136 (loadBacklogState), :150 (scanForGaps), :335 (fidelityDirs/keywords), :707 (performPostCampaignIngest), and closer:40 (runSelfImprovementLoopCloser) are intended to consume for fidelity + closed detection + next R-META generation.

**Current reality (until H-SELF-PRD-FIDELITY-02)**: loadBacklogState:136-148 uses `txt.slice(-4000)` + hardcoded `known[]` array + `/## Campaign /g` count for legacy closedCategories. Fidelity scan (generator:335) walks 'docs' + keywords ("MASTER_PLAN|living.?backlog|closer-ticket-manager-handoff"). performPost:723-736 + 952 appends "Ingested ..." for candidates. All 4 living docs (this file + AGENTS.md + docs/MASTER_PLAN.md + docs/closer-ticket-manager-handoff.md) are the fidelity surface.

**Contract for future parsers + evergreen sweeps**:
- Key first and exclusively on the ## MACHINE_* headers (lines 5/41) for the 7 dominant OPEN + acSmells list.
- Ignore all content after ## MACHINE_SUMMARY for closed detection or fidelity (historical tranche logs belong only in git: `git log -S tranche -- reliability-backlog.md`).
- Update fidelityKeywords (generator:336) + candidates (714-731) + this Guide on any structural change to the 4 living docs.
- Every closer handoff + this evergreen prompt must leave the top anchors + Guide as the first ~60 lines (higher signal, zero sludge).

**Verification commands** (machine-checkable):
- `node -e 'console.dir(require("./engine/src/self-prd-generator").loadBacklogState("."))'`
- `grep -c "## Campaign " reliability-backlog.md` (should be 0 post-purge; history via git only)
- `grep -A5 "MACHINE_DOMINANT_OPEN_ITEMS" reliability-backlog.md`

Wubba lubba dub dub.







