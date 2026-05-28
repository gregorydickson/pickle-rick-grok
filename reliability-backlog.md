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

7. **stale test drift on core guards (FORBIDDEN_SELF_MUT)**: OPEN. 
   - Evidence (fresh): arch-deepener.test.ts:124-127 (assert length===6 + "exactly the 6 core drivers") vs arch-deepener.ts:36-48 (now 10 entries post-incident: ritual, preflight, ticket-emitter, phase-utils, run-pipeline etc.). FORBIDDEN_SELF_MUT is single source of truth for self-mut guard.
   - **Path to Normie ticket**: H-GUARD-TRUTH-01 (P1). Make the FORBIDDEN list (and similar ac_shape / preflight / citadel guards) the single source of truth that tests read at runtime. No more green-on-lie.
   - AC-ARCH-TEST-01. (Requires dedicated H-* per persona.)

## MACHINE_SUMMARY
{
  "openCount": 7,
  "target": "Set and Forget for Normies (docs/MASTER_PLAN.md:42-50 definition + success metrics)",
  "acSmells": ["AC-FIDELITY-01", "AC-EMIT-02", "AC-CITADEL-03", "AC-RITUAL-04", "AC-INSTALL-05", "AC-SIMPL-01/02", "AC-ARCH-TEST-01", "AC-GEN-VESTIGE-02"],
  "lastUpdated": "2026-05-28 (post 4-person evergreen backlog sweep team: codebase-analyst 019e6f09-d714-7913-9395-a60a2230a98b, risk-analyst 019e6f0d-5186-78e2-b92e-d40e77b1751f, code-simplifier 019e6f10-f0ed-73b1-97a6-b2a1e45e2f82, engineering-architect 019e6f14-4994-7661-a5af-56dfb04130d0; all executed full claude-first protocol (list_dir + verbatim read_file LINE# + grep) + embedded immutable rules from references/personas/ + ac_shape_smells gate per analyst-gate-injections.md:11-83; fresh verified cites confirming 7 OPEN live + ~82 LOC dupe/historical sludge at reliability:51-132; purge + Consumption Guide added for higher signal)",
  "machineAnchorNote": "Key on these ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY headers for stable consumption by generator/closer/loadBacklogState/scanForGaps. See H-SELF-PRD-FIDELITY-02. Prior historical tranche logs in git only (git log -S tranche -- reliability-backlog.md). Consumption Guide immediately below documents the contract.",
  "crossConfirmed": "AGENTS:15/23/43/52 (post-scrub), docs/MASTER_PLAN.md (Roadmap + new manifest), handoff:49, TESTABILITY:40-41, ac-shape.ts:9-13, ritual.ts:4-6, citadel.ts:1-30/792, generator:335/707, arch-deepener.ts:36-48 + test:124, install.sh:33-37/40-53"
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

Historical tranche execution logs (prior "Fix shipped (per map... 9-step TDD... agent IDs 019e6a... modeled 1:1" narratives) live **only** in git. "Docs win." The self-prd-generator/closer now see higher-signal input with real anchors first.

Wubba lubba dub dub.














 2. Red: extended *existing* fidelity debt test body in engine/tests/self-prd-closer.test.ts:167 — seed real `docs/MASTER_PLAN.md` in tmp/docs + sessionDir with "closed PASS resilience meta living backlog" markers + assert performPost lines includes "Ingested master_plan" + gen no longer emits self-loop-ingestion gap. Run → RED. 3. Green: minimal additive to generator.ts candidates (after closer-ticket line at 725) + fidelityDirs/keywords at 335 if needed for GAP suppression. Run → GREEN. 4. Refactor: zero. 5. Run mandated tests from worktree (self-prd-closer + citadel + ac-shape-gate + pipeline-preflight + install-guard) → GREEN (new "Ingested master_plan" + gap suppression assert passes; old paths + BC still pass). 6. Docs (Contributor Rules): create `docs/MASTER_PLAN.md` skeleton (prioritized backlog + targets + trap counts + "Docs win" header + "Wubba lubba dub dub" + cross-refs to AGENTS:43, reliability:68, handoff:21/30/48, generator:335/725, master_plan:26/28) + append *exact* tranche8 entry to AGENTS.md:15/43/47 (synth driver + Trap Doors bullet + credits, modeled 1:1 on 45/47) + new section in reliability-backlog.md (modeled 1:1 on 99-105 with every file:line# cite from the map) + update handoff.md:30/48 cross-ref (add to "Still dominant open" list). 7. Citadel spirit (source only, from worktree). 8. `bash <worktree>/install.sh --closer-context --no-confirm` from worktree. 9. Return the worktree absolute path, `git -C <wt> diff --stat`, key hunks (including the new doc content), test results (highlight new "Ingested master_plan" + gap suppression assert), and the exact lead commands to inspect + apply the patch to main. Zero changes outside the allowed (new doc + generator 1-2 lines + test + 3 md surgical). Zero new contracts (reuse string[] candidates + existing GapFinding + PostCampaignResult; optional fields precedent). Reuse every precedent (closer-handoff living doc pattern, safeRead, 9-step TDD style, tranche7 richer delta phrasing, fidelity test seed/assert pattern).








- Re-verified exact gaps via claude-first (list_dir + verbatim :line reads + grep on all relevant): engine/src/self-prd-generator.ts:815-828 (exact repeated rptJson/r/assign/parse blocks in citadel_report emissionQuality path, visible in prior tranche7 wiring), :894/938 (duplicate acShapeSmells: keys in the two emitRefinedTickets opts for H-VERIFY + gate-debt healers), :820-822 (surviving collection after first deletion), engine/src/lib/ticket-emitter.ts:431-437 (emission_quality write + ac_shape hygiene), AGENTS.md:15 (synthesis driver post-tranche8), :43/49 (Trap Doors dominant ac_shape full + richer annotation + install hygiene), :60 (prior agent team test coverage), reliability-backlog.md:1-17 (tranche7/8 model), docs/MASTER_PLAN.md:34 (still dominant open), engine/TESTABILITY...:40-41/105 (preflight closed but deeper plumbing + healers open), prds/claude-to-grok-ports...2026-05-24.md:86 (P0 richer emission), self-prd-closer.test.ts:237 (richer emission test body), pipeline-preflight.test.ts (ac_shape warning cases).
- **Fix shipped (direct main checkout, no worktree per policy)**: 1. Direct main checkout edits only. 2. Red: existing self-prd-closer.test.ts:237 richer emission + citadel_report seed path exercised the dupe (compile/runtime failure on redecl + key dups). 3. Green: minimal pure deletes in engine/src/self-prd-generator.ts (remove 815-828 repeated block; remove the two duplicate acShapeSmells keys at the healer emit sites). Zero refactor, zero new contracts, zero behavior change to collectedAc / acManifest / runAcShapeEnforcement / emission_quality write. 4. Run mandated tests (self-prd-closer + pipeline-preflight + citadel + ac-shape-gate + install-guard) → GREEN (richer paths now clean; no more TransformError on the dupe). 5. Docs (Contributor Rules + "Docs win"): Append exact tranche9 entry to AGENTS.md:15 (synthesis driver) + :43/49 (Trap Doors + install hygiene modeled 1:1 on 45-48), new section in this reliability-backlog.md, update docs/MASTER_PLAN.md:34 + docs/closer-ticket-manager-handoff.md:49 + TESTABILITY:40-41 with :line cites + agent credits (019e6e94... + 019e6e97...). 6. Citadel spirit + direct main only. 7. `bash install.sh --closer-context --no-confirm`. 8. Commit/push/install. Zero changes outside allowed (generator + 4 docs + test comments). Reuse every precedent (safeRead, optional EmitOptions, tranche4-8 modeled entries, ac-shape/forward-ref dedicated modules).
- Updated AGENTS.md + this file + MASTER_PLAN + handoff + TESTABILITY per Contributor Rules.





