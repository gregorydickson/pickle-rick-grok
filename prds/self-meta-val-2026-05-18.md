# Self-Improvement Meta-Loop Productionization PRD (Grok-Native, Self-Generated)

**Author**: Self-PRD Generator (Grok engine scan @ 2026-05-18)
**Status**: Draft — ready for /pickle-refine-prd
**Target**: pickle-rick-grok/engine + ritual + citadel + pipeline + self-*
**Generated from**: /Users/gregorydickson/loanlight/pickle-rick + 19 *remaining* gaps (P0:17 P1:2) after 0 prior self-campaigns
**Backlog campaigns**: 0 (last closed 0)

## Introduction
The system now generates its own high-quality 50-ticket PRDs focused *only on what the reliability-backlog says is still open*. Ritual, persistence (atomic claim/lease), citadel depth. Run pipeline --self-improvement, ingest, repeat. Delta shrinks. Victory when P0=0.

## Problem Statement
Previous scans emitted the same gaps. Now backlog-aware: only remaining ritual-coverage, persistence (crash-safe 50-tix), citadel-depth (self-auditing) are targeted. No human glue. The meta phases in pipeline + closer are the production surface.

## Requirements (machine ACs, remaining only)
| Priority | Requirement | Verification |
|----------|-------------|--------------|
| P0 | engine/src/bin/orchestrator.ts does not yet expose self-prd-... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/bin/pipeline.ts has weak signal coverage — risk o... | node -e 'process.kill(process.pid,"SIGTERM")' && test -f state.json && cat state.json... |
| P0 | engine/src/runners/mux-runner.ts does not yet expose self-pr... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/ritual.ts does not yet expose self-prd-generator ... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/citadel.ts does not yet expose self-prd-generator... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/anatomy.ts does not yet expose self-prd-generator... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/szechuan.ts does not yet expose self-prd-generato... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/session.ts does not yet expose self-prd-generator... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/iteration.ts does not yet expose self-prd-generat... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/gate.ts does not yet expose self-prd-generator or... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/circuit.ts does not yet expose self-prd-generator... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | engine/src/workers.ts does not yet expose self-prd-generator... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | skills/pickle-pipeline/SKILL.md has weak signal coverage — r... | node -e 'process.kill(process.pid,"SIGTERM")' && test -f state.json && cat state.json... |
| P0 | skills/pickle-pipeline/SKILL.md does not yet expose self-prd... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | skills/pickle-rick/SKILL.md does not yet expose self-prd-gen... | grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts |
| P0 | Citadel does not auto-ingest prd_feedback or audit ritual/pe... | after self campaign, runSelfPrdGenerator sees reduced gaps + citadel has auditRitual |
| P1 | orchestrator does not yet tag or specially handle self-gener... | self-generated tickets run cleanly through ritual + 8 phases |
| P1 | citadel has only 15 auditors; needs ritual + self-prd + pers... | grep -c "audit" engine/src/citadel.ts |
| P0 | citadel does not audit the meta self modules (ritual, sessio... | node -e 'require("./citadel").runCitadel(process.cwd())' | grep -i ritual |
| P0 | Meta-phases fully wired + emit Activity (self_prd_generated, loop_closed, post_campaign_ingest) | standup/metrics show iteration delta + closed count rising |
| P0 | PRD generator + closer use correct grokRoot (not sessionDir) | discover + calls succeed, backlog updated on every --self run |
| P0 | 50-ticket self-campaigns are crash-resumable via ritual+claim | kill -9 mid-run, resume, no lost phases, state intact |
| P1 | Citadel deep-audits ritual, persistence, meta changes | citadel_report includes ritual/persist findings on self PRD changes |
| P2 | Victory lap: 0 P0 remaining after N iterations | re-run generator emits "VICTORY LAP PRD" |

## Contracts
- generateSelfPrd(target, opts) → focuses on !closedCategories from backlog
- performPostCampaignIngest + closer always append + Activity.postCampaignIngest
- pipeline --self-improvement passes explicit --target root to meta calls

## Victory Condition
Re-run after campaign. PRD will contain strictly fewer P0s or victory declaration.

**Rick: "The pickle that measures its own digestion. Now with numbers."**
