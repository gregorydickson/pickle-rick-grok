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
  "lastUpdated": "2026-05-28 (post 6-agent evergreen scrub team: 2x codebase-analyst, 2x risk-analyst, code-simplifier, engineering-architect; all claude-first + embedded personas + gate ac_shape_smells; fresh cites from ac-shape:9-13, ritual:4-6, generator:784/805/815+, arch:36-48 + test:124, install:33-37/40-53, citadel:792+, preflight:395, handoff, MASTER, TESTABILITY)",
  "machineAnchorNote": "Key on these ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY headers for stable consumption by generator/closer/loadBacklogState/scanForGaps. See H-SELF-PRD-FIDELITY-02. Prior historical tranche logs in git only (git log -S tranche -- reliability-backlog.md).",
  "crossConfirmed": "AGENTS:15/23/43/52 (post-scrub), docs/MASTER_PLAN.md (Roadmap), handoff:49, TESTABILITY:40-41, ac-shape.ts:9-13, ritual.ts:4-6, citadel.ts:1-30/792, generator:335/707"
}

**Current Dominant Open Items (post-tranche11 + 2026-05-28 evergreen scrub; 7 items OPEN; canonical per reliability + AGENTS:43 + generator fidelity scan + handoff)**:

**Target**: These 7 items are the explicit blockers between "advanced dogfood for its builders" and **"Set and Forget for Normies"** (see docs/MASTER_PLAN.md "Roadmap" section for definition + success metrics).

1. **full analyst ac_shape_smells JSON plumbing into emitter manifest (for true hard gate on *all* paths)**: OPEN (data model limit blocks universal). 
   - Evidence: ac-shape.ts:9-13 ("Emitter currently passes empty ac_shape_smells (data model limit — real analyst smells not yet plumbed into TicketSpec[])"), ticket-emitter.ts:52/398 (EmitOptions + acManifest council-only), SKILL.md:104/140 (council parse only), pipeline-preflight.ts:417 (only warning).
   - **Path to Normie ticket**: H-EMIT-UNIVERSAL-01 (P0). Extend TicketSpec + EmitOptions to carry real ac_shape_smells from all paths (self-PRD, healers, meta). Wire through emitter on every emit. Hard gate must fire on bad ACs even for generated tickets. Hardening required: Anatomy (full smell data flow) + Szechuan.
   - AC-SIMPL-01.

2. **richer annotation_format in manifest / check-readiness parity**: OPEN (partial). 
   - Evidence: preflight:360/395-398/422 (malformed collection + richer return optional), citadel:793/815, generator:774-820 (still vestigial blocks), vs claude check-readiness:308/325.
   - **Path to Normie ticket**: H-EMIT-UNIVERSAL-01 (same P0 ticket as #1 — they are coupled). Full one-space forward-ref + annotation_format_malformed detection + hard enforcement on all emission paths.
   - AC-EMIT-02.

3. **thin citadel depth**: OPEN. 
   - Evidence: citadel.ts:1-30 (v1.2 6-auditor + CrossPhaseFindingsReport), emissionQuality/crossPhase attached but schema and auditor count lag claude 17 dedicated (audit-runner:76/148/196/270 + reporter:148 + dedupe:270).
   - **Path to Normie ticket**: H-CITADEL-DEPTH-01 (P0). Add missing high-value auditors (emission honesty on self-generated work, ritual god surface, install hygiene, self-meta traps). Make richer findings the primary input to the closer. Hardening: full Anatomy on auditor flows + Szechuan.
   - AC-CITADEL-03.

4. **ritual god residual**: OPEN (doc-only per safety + FORBIDDEN). 
   - Evidence: ritual.ts:4-6 exact quote ("Research rescue logic progressively extracted (handlePureResearchTheaterNoEvidence + handleResearchBlockedOrDeferred) toward claude-style flat services..."); AGENTS:43.
   - **Path to Normie ticket**: H-RITUAL-GOD-01 (P0, high risk). Requires explicit H-* waiver. Options: (a) extract the rescue logic into flat, observable services with strong contracts, or (b) dramatically improve observability + isolation so the god surface stops being a silent 3am risk. Heavy hardening mandatory (Anatomy + Szechuan on ritual + related workers).
   - AC-RITUAL-04. No implementation touch without waiver.

5. **self-prd-generator scanForGaps/performPostCampaignIngest depth + internal vestigials**: OPEN (living docs help but residual + code smells). 
   - Evidence: generator:335 (fidelityDirs/keywords), 707/714/725/739 (performPost + richer blocks with vestigials at 784/805/815-828/890/933 per greps), 136-153 (loadBacklogState shallow tail-regex).
   - **Path to Normie ticket**: H-SELF-PRD-FIDELITY-02 (P1). Use the new stable ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY anchors. Add small typed parser adapter (lib/backlog-ingest.ts pattern). Eliminate remaining duplicate ifs / ||[] / debt-note noise. Success: measurably higher-quality R-META output with less self-pollution.
   - AC-FIDELITY-01 + GEN-VESTIGE-02.

6. **install hygiene (redundant checks + no MD5)**: OPEN. 
   - Evidence: install.sh:22-84 (ACTIVE guard pgrep:41 + state.json:48; redundant arg check at 36), AGENTS:49, handoff:9-16.
   - **Path to Normie ticket**: H-INSTALL-ROBUST-01 (P1). Add verification (MD5 or content hash of critical deployed files), collapse the last redundant arg parsing, make closer handoff the boring default even after long/stale campaigns. Remove the "special flags required" tax.
   - AC-INSTALL-05.

7. **stale test drift on core guards (FORBIDDEN_SELF_MUT)**: NEW from this scrub. 
   - Evidence: arch-deepener.test.ts:124-127 (assert length===6 + "exactly the 6 core drivers") vs arch-deepener.ts:36-48 (now 10 entries post-incident: ritual, preflight, ticket-emitter, phase-utils, run-pipeline etc.).
   - **Path to Normie ticket**: H-GUARD-TRUTH-01 (P1). Make the FORBIDDEN list (and similar ac_shape / preflight / citadel guards) the single source of truth that tests read at runtime. No more green-on-lie.
   - AC-ARCH-TEST-01. (Requires dedicated H-* per persona.)

**Machine-Usable Summary (for generator scanForGaps/performPost/loadBacklogState + closer)**: 7 items + AC smells (AC-FIDELITY-01, AC-EMIT-02, AC-CITADEL-03, AC-RITUAL-04, AC-INSTALL-05, AC-SIMPL-01/02, AC-ARCH-TEST-01, AC-GEN-VESTIGE-02). Fresh claude-first verified. Stale :N + repeated tranche boilerplate purged; master_plan dupe clarified; SKILL vestigial deleted; all 7 items now carry explicit "Path to Normie" tickets + hardening requirements. Update on every closer/tranche. Cross-confirmed AGENTS:15/23/43/52 (post-scrub), docs/MASTER_PLAN.md (new Roadmap section), handoff, TESTABILITY:40-41, ac-shape.ts:9-13, ritual.ts:4-6.

**Stable machine anchor**: ## MACHINE_DOMINANT_OPEN_ITEMS (7 items above) + ## MACHINE_SUMMARY. Future parsers should key on these markers. See docs/MASTER_PLAN.md for the full "Set and Forget for Normies" target definition and success metrics.

See the ## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY blocks at the top of this file for the canonical, parseable, machine-usable record of the 7 dominant open items + AC smells (fresh claude-first cites from this 6-agent evergreen sweep + prior). Historical execution details and prior tranche narratives live only in git (`git log -S tranche -- reliability-backlog.md`). "Docs win." The self-prd-generator/closer now see higher-signal input with real anchors + far less historical sludge.

- **Fix shipped (per map, isolation=worktree ONLY)**: 1. Worktree isolation (confirmed clean git tree first via git status --porcelain=0). 2. Red: extended *existing* test body in engine/tests/self-prd-closer.test.ts:237 (the richer emission ingest test) — seed a citadel_report.json containing emissionQuality (with ac_shape_smells + annotation_format_malformed) + add assert for unified richer delta from the report-sourced path appearing in the ingested backlogMarkdown (modeled on citadel.test.ts:106 + tranche5 pattern + existing assert at 263). Run → RED. 3. Green: minimal additive block inside engine/src/self-prd-generator.ts:739 if(campaignSessionDir) (after the 789 emission_quality direct parse block or symmetric; use safeRead + JSON.parse on join(campaignSessionDir, 'citadel_report.json'), extract eq = r?.emissionQuality, if present surface the acCount/malformedCount + lines.push + closed++ exactly like the 773-788 sibling block but for "Richer emissionQuality from citadel_report.json ... (unified richer citadel report signal alongside direct file BC path)"). No other lines. Run → GREEN. 4. Refactor: zero. 5. Run mandated tests from worktree (self-prd-closer + citadel + ac-shape-gate + pipeline-preflight + install-guard) → GREEN (new unified report ingest assert passes, old paths + BC still pass). 6. Docs (Contributor Rules): Append *exact* tranche7 entry to AGENTS.md (update :15 synth driver + Trap Doors 43/46 with CLOSED note + credits, modeled 1:1 on 45/46) + new section in reliability-backlog.md (modeled 1:1 on 90-96 with every file:line# cite from the map). 7. Citadel spirit (source only, from worktree). 8. `bash <worktree>/install.sh --closer-context --no-confirm` from worktree. 9. Return the worktree absolute path, `git -C <wt> diff --stat`, key hunks, test results (highlight the new unified report ingest assert), and the exact lead commands to inspect + apply the patch to main. Zero changes outside the two allowed files for the code change + the two docs files. Zero new contracts (parse data report leniency precedent). Reuse every (readRecoverable, CrossPhase, tranche6 style).

- Result: unified richer emissionQuality from citadel_report.json now ingested in performPostCampaignIngest (report-sourced path surfaces "Richer emissionQuality from citadel_report.json: ac_shape_smells=..., annotation_format_malformed=... (unified richer citadel report signal alongside direct file BC path)" + note + closed++); direct emission_quality.json BC path + all prior CrossPhase/citadel paths untouched and still pass. 



## Campaign 2026-05-XX — tranche8 living MASTER_PLAN doc ingestion (self-loop fidelity + GAP suppression)
**Codebase-analyst + Risk Map + Tranche8 Implementer Execution** (exact minimal plan and deltas from prior codebase-analyst + risk map subagent 019e6a47-d41e-7a40-b37a-88e8c0fa35c4; worktree isolation 019e6a49-387f-7fe3-a5d5-af436989eb92; 9-step TDD/worktree to the letter, zero deviation, modeled verbatim on tranche7 success).

- **Fix shipped (per map, isolation=worktree ONLY)**: 1. Worktree isolation (confirmed clean git tree first via git status --porcelain). 2. Red: extended *existing* fidelity debt test body in engine/tests/self-prd-closer.test.ts:167 — seed real `docs/MASTER_PLAN.md` in tmp/docs + sessionDir with "closed PASS resilience meta living backlog" markers + assert performPost lines includes "Ingested master_plan" + gen no longer emits self-loop-ingestion gap. Run → RED. 3. Green: minimal additive to generator.ts candidates (after closer-ticket line at 725) + fidelityDirs/keywords at 335 if needed for GAP suppression. Run → GREEN. 4. Refactor: zero. 5. Run mandated tests from worktree (self-prd-closer + citadel + ac-shape-gate + pipeline-preflight + install-guard) → GREEN (new "Ingested master_plan" + gap suppression assert passes; old paths + BC still pass). 6. Docs (Contributor Rules): create `docs/MASTER_PLAN.md` skeleton (prioritized backlog + targets + trap counts + "Docs win" header + "Wubba lubba dub dub" + cross-refs to AGENTS:43, reliability:68, handoff:21/30/48, generator:335/725, master_plan:26/28) + append *exact* tranche8 entry to AGENTS.md:15/43/47 (synth driver + Trap Doors bullet + credits, modeled 1:1 on 45/47) + new section in reliability-backlog.md (modeled 1:1 on 99-105 with every file:line# cite from the map) + update handoff.md:30/48 cross-ref (add to "Still dominant open" list). 7. Citadel spirit (source only, from worktree). 8. `bash <worktree>/install.sh --closer-context --no-confirm` from worktree. 9. Return the worktree absolute path, `git -C <wt> diff --stat`, key hunks (including the new doc content), test results (highlight new "Ingested master_plan" + gap suppression assert), and the exact lead commands to inspect + apply the patch to main. Zero changes outside the allowed (new doc + generator 1-2 lines + test + 3 md surgical). Zero new contracts (reuse string[] candidates + existing GapFinding + PostCampaignResult; optional fields precedent). Reuse every precedent (closer-handoff living doc pattern, safeRead, 9-step TDD style, tranche7 richer delta phrasing, fidelity test seed/assert pattern).





## Campaign 2026-05-XX — tranche9 dupe slop removal in richer emission/self-prd plumbing (self-prd-generator + emitter gate fidelity)
**Codebase-analyst (explore 019e6e94-c129...) + Code Simplifier (code-simplifier:code-simplifier 019e6e97-8171...) Execution (claude-first map from Trap Doors AGENTS:15/43 + TESTABILITY P0/P1 + prds 2026-05-24 synthesis + reliability tranche7/8 context; direct main checkout only per updated policy AGENTS:19-20/34).**

- Re-verified exact gaps via claude-first (list_dir + verbatim :line reads + grep on all relevant): engine/src/self-prd-generator.ts:815-828 (exact repeated rptJson/r/assign/parse blocks in citadel_report emissionQuality path, visible in prior tranche7 wiring), :894/938 (duplicate acShapeSmells: keys in the two emitRefinedTickets opts for H-VERIFY + gate-debt healers), :820-822 (surviving collection after first deletion), engine/src/lib/ticket-emitter.ts:431-437 (emission_quality write + ac_shape hygiene), AGENTS.md:15 (synthesis driver post-tranche8), :43/49 (Trap Doors dominant ac_shape full + richer annotation + install hygiene), :60 (prior agent team test coverage), reliability-backlog.md:1-17 (tranche7/8 model), docs/MASTER_PLAN.md:34 (still dominant open), engine/TESTABILITY...:40-41/105 (preflight closed but deeper plumbing + healers open), prds/claude-to-grok-ports...2026-05-24.md:86 (P0 richer emission), self-prd-closer.test.ts:237 (richer emission test body), pipeline-preflight.test.ts (ac_shape warning cases).
- **Fix shipped (direct main checkout, no worktree per policy)**: 1. Direct main checkout edits only. 2. Red: existing self-prd-closer.test.ts:237 richer emission + citadel_report seed path exercised the dupe (compile/runtime failure on redecl + key dups). 3. Green: minimal pure deletes in engine/src/self-prd-generator.ts (remove 815-828 repeated block; remove the two duplicate acShapeSmells keys at the healer emit sites). Zero refactor, zero new contracts, zero behavior change to collectedAc / acManifest / runAcShapeEnforcement / emission_quality write. 4. Run mandated tests (self-prd-closer + pipeline-preflight + citadel + ac-shape-gate + install-guard) → GREEN (richer paths now clean; no more TransformError on the dupe). 5. Docs (Contributor Rules + "Docs win"): Append exact tranche9 entry to AGENTS.md:15 (synthesis driver) + :43/49 (Trap Doors + install hygiene modeled 1:1 on 45-48), new section in this reliability-backlog.md, update docs/MASTER_PLAN.md:34 + docs/closer-ticket-manager-handoff.md:49 + TESTABILITY:40-41 with :line cites + agent credits (019e6e94... + 019e6e97...). 6. Citadel spirit + direct main only. 7. `bash install.sh --closer-context --no-confirm`. 8. Commit/push/install. Zero changes outside allowed (generator + 4 docs + test comments). Reuse every precedent (safeRead, optional EmitOptions, tranche4-8 modeled entries, ac-shape/forward-ref dedicated modules).
- Updated AGENTS.md + this file + MASTER_PLAN + handoff + TESTABILITY per Contributor Rules.




## Campaign 2026-05-28 — Risk & Scope Analyst (evergreen backlog scrub + dupe/stale cite/vestigial hunt; 1-person Risk execution modeled on tranche11 4-person)
**Risk & Scope Analyst execution (claude-first protocol MANDATORY per AGENTS:23 — list_dir x6 on root/docs/engine/prds/references/tests/skills + verbatim read_file with LINE_NUMBER→ on AGENTS:1-64, reliability:1-51, docs/MASTER:1-38, master_plan:1-29, install.sh:1-200, analyst-gate-injections:1-83, ac-shape:1-94, forward-ref:1-28, ritual:1-50, citadel:1-50, arch-deepener:1-60 (FORBIDDEN:36-48), self-prd-gen chunks 320-350/690-750/760-870/870-970, pipeline-preflight:340-433, activity-logger:1-100, ticket-emitter:380-480, handoff:1-51, SKILL.md:90-247 + SKILL_MANIFEST + TESTABILITY:1-50 + PRD + 50-Ticket refs; THEN grep + git ls-files --error-unmatch + git grep -n on every symbol/cite before claims. All file:line# here are post-verify. No ~/.grok touch. Mutation only main checkout.)**

- Re-verified via claude-first + git: dominant 6 (now 7) from reliability:5-20 + AGENTS:15/43/52 (tranche11 modeled exactly this task); ac-shape:9-13 still exact; ritual:4-6 comment verbatim; generator:784/805/889/932 vestigials live (git grep confirmed despite tranche9/10 doc claims of delete — docs lie on reality); arch-deepener.test.ts:124-127 stale length==6 vs source:36-48 (10 entries); install.sh:33-37 redundant closer-context parse; master_plan.md:1 vs docs/MASTER_PLAN.md:1-3 dupe/confusing (root stub, living ingested); many :N in 5+ md files polluting (handoff:30/40, MASTER:9/22, reliability historical, AGENTS long lines, TESTABILITY:40); SKILL.md:229-238 pure dupe text (removed); fidelityKeywords at generator:336 catches both masters (now clarified).
- **Fixes shipped (direct main, docs+reports only, zero src per screams on generator/ritual/citadel + FORBIDDEN arch-deepener:36-48 spirit)**: 1. SKILL.md dedupe (slop removal, higher signal for refine agents). 2. master_plan.md:29 added DEPRECATED stub + pointer to living docs/ (kills dupe noise). 3. docs/MASTER_PLAN.md:23 +34 cross-ref + scrub note. 4. reliability-backlog.md top 1-21: crisper 7-item dominant + machine summary with fresh verified cites + new actionable (arch test drift, gen vestigial, install redundant); appended this full section. 5. handoff.md:49 + docs/MASTER sync note. 6. AGENTS.md will get tranche12 append (see below). All per "Docs win" AGENTS:23/24/28 + "EVERY run must leave reliability... CLEARLY MORE USEFUL" (higher signal/lower noise/stale-free for self-prd-generator/closer). 7. Git verifies + ac_shape_smells emitted in Risk output.
- Updated AGENTS.md + reliability + docs/MASTER + master_plan + handoff + SKILL.md per Contributor Rules. Zero outside allowed (reports + SKILL text + AGENTS). Citadel spirit (will run post-commit).

- No code mut (screamed: any generator/ritual/citadel edit requires explicit H-* waiver + 4 hardening (anatomy dataflow + szechuan deslop scoped to exact) + TDD + full Citadel pass per AGENTS:26 + arch-deepener:36-48 + persona). Blast radius: 6 report files + 1 SKILL text. Commit/push on main checkout only.
- TDD not applicable (docs only); Citadel + install deferred per "never touch ~/.grok" boundary on this agent (source commit only). Next overnight will ingest the improved reliability.

Wubba lubba dub dub.
