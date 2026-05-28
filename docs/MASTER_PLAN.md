# MASTER_PLAN (Living Backlog + Trap Doors)

**Status**: Living doc. Now dynamically ingested by self-loop (performPostCampaignIngest + scanForGaps fidelity path). Replaces stub-only + shallow depth. "Docs win".
**Owner**: Final Self-Improvement Loop Closer + self-prd-generator
**Last Updated**: 2026-05-27 (tranche8 creation + ingestion)

## The Living Contract (Prioritized Backlog + Targets + Trap Counts)

Per AGENTS.md:43 (Trap Doors dominant fidelity): Emission plumbing + self-prd-generator scanForGaps/performPostCampaignIngest depth vs claude dynamic + **living MASTER_PLAN updates** remain dominant. (CLOSED tranche8 via this doc + generator:335/725 + test:167.)

- Ingest (MASTER_PLAN updates, close findings, renumber Active Queue, add trap-door counts).
- `bash install.sh --closer-context --no-confirm` (escape hatch per handoff).
- Version bump, parity, citadel validation.
- Commit "Closed: #NN via R-XXX-CLOSER".

**Prioritized targets** (from synth driver + reliability:68): full ac_shape_smells JSON + richer annotation_format, living MASTER_PLAN depth (now CLOSED), thin citadel depth. Trap counts tracked in citadel_report + backlog.

**Cross-refs (exact, no invention)**:
- AGENTS.md:43 (debt list + tranche bullets), :15 (synth driver), :47 (tranche7 model)
- reliability-backlog.md:68 (still dominant open pre-tranche8)
- docs/closer-ticket-manager-handoff.md:21/30/48 (Ingest MASTER_PLAN; Still dominant open list)
- engine/src/self-prd-generator.ts:335 (fidelityDirs/keywords), :725 (candidates)
- master_plan.md:26/28 (now deprecated stub; "Docs win" + explicit pointer to this living docs/MASTER_PLAN.md as the generator/closer ingested source per tranche8 + risk scrub 2026-05-28)
- prds/claude-to-grok-ports...2026-05-24.md:66 (MASTER_PLAN curation)

## What "Living" Means
- Single source for prioritized backlog, targets, trap counts.
- Updated by closer tickets as part of handoff.
- Self-loop (generator + closer) sees honest content on every run (no test-stub).
- Part of Contributor Rules + "Docs win" (AGENTS:23/28).

## Current Status (Post-Tranche8)
- Debt closed for living MASTER_PLAN updates depth: real doc at docs/MASTER_PLAN.md now ingested (Ingested MASTER_PLAN.md + gap suppression in gen).
- Still dominant open (AGENTS:43 + tranche11 4-person team 2026-05-28): full ac_shape_smells JSON plumbing + richer annotation_format in manifest, thin citadel depth, ritual god residual, self-prd depth, install hygiene (no MD5). See reliability-backlog.md:5-20 (crisp machine-usable Current Dominant + Machine Summary post-tranche10 + team audit; the canonical single-source the generator/closer load).

Wubba lubba dub dub.

**Risk/scope scrub 2026-05-28 (this run)**: Clawed stale :N cites across 5+ files (AGENTS long-lines, reliability:7-17, handoff:30-49, TESTABILITY:40), master_plan dupe noise (root now explicitly deprecated stub pointing here; generator fidelityKeywords handles both but humans+scans win from clarity), vestigial code smells in generator (still has duplicate if(acCount) at 784/805 + ||[] despite tranche10 claims — see git grep verify), stale arch-deepener.test.ts:124-127 (asserts FORBIDDEN length==6 but arch-deepener.ts:36-48 has 10 entries post-incident; test lies, green on drift). Install.sh:33-37 redundant --closer parse. All per claude-first (list+read+grep+git ls/grep on HEAD). No src mut (screamed on generator/ritual/citadel per FORBIDDEN arch-deepener:36-48 + persona). 1 SKILL dedupe + 4 report hygiene fixes landed direct main. Higher signal for next self-PRD/closer. See reliability-backlog new section + AGENTS tranche12.

**Docs win. Citadel will catch any drift.**