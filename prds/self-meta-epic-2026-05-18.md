# Self-Improvement Meta-Loop Productionization PRD (Grok-Native, Self-Generated)

**Author**: Self-PRD Generator (Grok engine scan @ 2026-05-18)
**Status**: Draft — auto-decomposable (tickets/ will be written if session passed)
**Target**: pickle-rick-grok/engine + ritual + citadel + pipeline + self-*
**Generated from**: /Users/gregorydickson/loanlight/pickle-rick/pickle-rick-grok + 3 *remaining* gaps (P0:2 P1:1) after 1 prior self-campaigns
**Backlog campaigns**: 1 (last closed 0)

## Introduction
The system now generates its own high-quality 50-ticket PRDs focused *only on what the reliability-backlog says is still open*. Ritual, persistence (atomic claim/lease), citadel depth. Run pipeline --self-improvement, ingest, repeat. Delta shrinks. Victory when P0=0.
The auto-decompose in this generator turns seeds into executable ticket.md so the meta loop needs ZERO /pickle-refine-prd step.

## Problem Statement
Previous scans emitted the same gaps. Now backlog-aware: only remaining ritual-coverage, persistence (crash-safe 50-tix), citadel-depth (self-auditing) are targeted. No human glue. The meta phases in pipeline + closer are the production surface. Self-tickets are now first-class citizens with ACs that the 8-phase ritual can chew on.

## Requirements (machine ACs, remaining only)
| Priority | Requirement | Verification |
|----------|-------------|--------------|
| P0 | engine/src/session.ts has weak signal coverage — risk of orp... | node -e 'process.kill(process.pid,"SIGTERM")' && test -f state.json && cat state.json... |
| P1 | orchestrator does not yet tag or specially handle self-gener... | self-generated tickets run cleanly through ritual + 8 phases |
| P0 | orchestrator routes only 2 paths through ManagerRitual — inc... | grep -c "ManagerRitual" engine/src/bin/orchestrator.ts && node -e "require('./ritual'... |
| P0 | Meta-phases fully wired + emit Activity (self_prd_generated, loop_closed, post_campaign_ingest) | standup/metrics show iteration delta + closed count rising |
| P0 | PRD generator + closer use correct grokRoot (not sessionDir) | discover + calls succeed, backlog updated on every --self run |
| P0 | 50-ticket self-campaigns are crash-resumable via ritual+claim | kill -9 mid-run, resume, no lost phases, state intact |
| P1 | Citadel deep-audits ritual, persistence, meta changes | citadel_report includes ritual/persist findings on self PRD changes |
| P2 | Victory lap: 0 P0 remaining after N iterations | re-run generator emits "VICTORY LAP PRD" |

## Contracts
- generateSelfPrd(target, opts) → focuses on !closedCategories from backlog; if opts.sessionDirToPopulate, writes real tickets/
- performPostCampaignIngest + closer always append + Activity.postCampaignIngest
- pipeline --self-improvement passes explicit --target root to meta calls
- autoDecompose produces tickets that satisfy the exact 8-phase ritual contract (promise tokens, artifact validation, scope)

## Victory Condition
Re-run after campaign. PRD will contain strictly fewer P0s or victory declaration.

**Rick: "The pickle that measures its own digestion. Now with numbers. And it poops finished tickets."**
