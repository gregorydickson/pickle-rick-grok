# MASTER_PLAN (Living Backlog + Trap Doors)

**Status**: Living doc. Now dynamically ingested by self-loop (performPostCampaignIngest + scanForGaps fidelity path). Replaces stub-only + shallow depth. "Docs win".
**Owner**: Final Self-Improvement Loop Closer + self-prd-generator
**Last Updated**: 2026-05-29 (reliability:48 lastUpdated normalized — narrative excised to git only per Guide:61; H-FIDELITY-03 deferred. 7 OPEN live. Zero src. "Docs win." See reliability:5-70.)

## The Living Contract (Prioritized Backlog + Targets + Trap Counts)

Per AGENTS.md:43 (Trap Doors dominant fidelity): Emission plumbing + self-prd-generator scanForGaps/performPostCampaignIngest depth vs claude dynamic + **living MASTER_PLAN updates** remain dominant. (CLOSED tranche8 via this doc + generator:335/725 + test:167.)

- Ingest (MASTER_PLAN updates, close findings, renumber Active Queue, add trap-door counts).
- `bash install.sh --closer-context --no-confirm` (escape hatch per handoff).
- Version bump, parity, citadel validation.
- Commit "Closed: #NN via R-XXX-CLOSER".

**Prioritized targets** (from synth driver + reliability:68): full ac_shape_smells JSON + richer annotation_format, living MASTER_PLAN depth (now CLOSED), thin citadel depth. Trap counts tracked in citadel_report + backlog.

**Cross-refs (exact, no invention)**:
- AGENTS.md:43 (debt list + tranche bullets), :7 (Prime Directive: Bootstrapping Mode vs Production Autonomous Use — this is the fundamental distinction during our current work building pickle-rick-grok itself), :15 (synth driver), :47 (tranche7 model)
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
- Still dominant open (AGENTS:43 + 2026-05-28 evergreen sweeps): the 7 items in reliability-backlog.md:5-41 (## MACHINE_DOMINANT_OPEN_ITEMS + Consumption Guide contract; canonical for loadBacklogState:136/scanForGaps:150/performPost:707/closer:40). Full ac_shape_smells plumbing, richer annotation, thin citadel, ritual god (doc-only), self-prd vestigials, install hygiene, test guard drift remain. See reliability:5-70 + this Roadmap. (Living Interface Manifest below; history in git only.) 

Wubba lubba dub dub.

**Risk/scope scrub 2026-05-28 (this run)**: Clawed stale :N cites across files (AGENTS, reliability, handoff, TESTABILITY), master_plan dupe noise (root deprecated stub pointing here; fidelityKeywords handles both but clarity wins for humans+scans), vestigial smells + arch-deepener.test drift + install redundant parse now tracked. All per claude-first (list+read+grep+git ls/grep on HEAD). No src mut (screamed on generator/ritual/citadel per FORBIDDEN + persona). Higher signal for next self-PRD/closer. See reliability-backlog + AGENTS.

## Roadmap: Set and Forget for Normies (Target Definition + Prioritized Work)

**Definition of Done for "Set and Forget for Normies"** (the point where a competent engineer can point this system at a new repo + rough intent and walk away for a 20-100 ticket campaign with high confidence):
- Emission quality is high enough on *every* path (rich refine, self-PRD, healer tickets, meta tickets) that theatrical Verifies and annotation failures rarely block forward progress.
- The self-improvement loop (generator + closer) produces follow-on work that is *higher* fidelity than the previous generation with minimal human curation.
- 50+ ticket overnights complete with high % success, reliable resumption, and post-phases (Citadel + Anatomy + Szechuan) that surface real, actionable delta instead of noise.
- Install + closer handoff is robust and low-surprise (no special incantations required in headless contexts).
- Core guards and tests stay truthful (no green-on-lie on FORBIDDEN surfaces, ac_shape behavior, etc.).
- A new or external project can run multiple autonomous cycles with only occasional "closer handoff" style intervention.

This is the explicit usability target that turns the system from "advanced dogfood for its builders" into something a normie team can trust overnight.

**Bootstrapping Strategy (Current Phase Focus)**: Per the Prime Directive (AGENTS.md:9-18), the current work is *building* pickle-rick-grok itself — rich chat agent teams (this evergreen process, engineering personas, spawn_subagent) are the correct high-leverage tool right now. The finished system's job is the opposite (headless autonomous dev on external repos). 

Three horizons:
- **Current**: Make the self-improvement loop (generator + closer) the primary developer. H-FIDELITY-03 (loadBacklogState + fidelity consumers actually using the ## MACHINE_* anchors + Consumption Guide contract in reliability-backlog.md) + repeated clean-context evergreen hygiene sweeps are the mechanism. Raise the fidelity floor first so hard P0 work (H-EMIT-UNIVERSAL-01 etc.) has a trustworthy engine to drive it.
- **Early External Dogfood**: Prove low-friction autonomous runs on real external codebases (some closer handoff OK).
- **Normie Threshold**: The 6 criteria at :42-50 with "set and forget" for competent engineers.

H-FIDELITY-03 is the highest-leverage safe next concrete ticket. Hard emission/ritual/citadel items stay on the full H-* + 4-hardening + waiver path.

**P0 — Non-negotiable for the target (must be closed before claiming normie readiness)**
- **H-EMIT-UNIVERSAL-01**: Full analyst ac_shape_smells + richer annotation_format hard gate on *all* emission paths (self-PRD, healers, meta, not just council). Remove the "data model limit" in ac-shape.ts:9-13 and ticket-emitter. Success: every emitted ticket carries real smells when analysts produced them; hard enforcement fires on bad ACs even for generated healers. Hardening: Anatomy (data flow of smells from SKILL → emitter → generator → verifier) + Szechuan on any remaining "council only" branches.
- **H-CITADEL-DEPTH-01**: Grow Citadel from v1.2 thin 6-auditor (+CrossPhase) toward Claude parity (more auditors for emission honesty, ritual god detection, self-meta traps, install hygiene). Produce richer findings that the closer actually consumes. Success: citadel_report.json + CrossPhaseFindingsReport contain high-signal, deduped items that drive real next tickets with low noise. Hardening: full Anatomy on auditor data flows + Szechuan on auditor bloat.
- **H-RITUAL-GOD-01** (careful): Address the ritual god residual (ritual.ts:4-6) safely. Either (a) explicit H-* waiver + heavy hardening or (b) better isolation + observability so the "research rescue logic" surface stops being a silent risk. Success: no more "doc-only per safety" asterisk on the single biggest runtime coordinator. (Risk scream required.)

**P1 — High leverage for normie experience**
- **H-SELF-PRD-FIDELITY-02**: Eliminate remaining vestigials and shallow ingest in self-prd-generator (scanForGaps/performPost 335/707+, loadBacklogState tail regex). Use the new stable ## MACHINE_* anchors in reliability-backlog.md. Add typed parser (see engineering-architect recommendation). Success: generator produces measurably higher-quality R-META tickets; fewer "docs lie to the machine" cases. Hardening: Anatomy on ingest paths + Szechuan on vestigial debt notes.
- **H-FIDELITY-03 (next concrete ticket)**: Make `loadBacklogState` (self-prd-generator.ts:136-148) + dependent fidelity consumers (`scanForGaps`, `performPostCampaignIngest` callsites) actually prefer the structured `## MACHINE_DOMINANT_OPEN_ITEMS` + `## MACHINE_SUMMARY` + Consumption Guide contract in `reliability-backlog.md:5-70` instead of legacy `slice(-4000)` + hardcoded `known[]` + `/## Campaign /g` logic. Add machine-checkable verification that `loadBacklogState` returns clean results based on the new anchors with 0 reliance on historical tail content. This is the highest-leverage safe next step toward the self-loop seeing the improved living record. Hardening: Anatomy on the exact fidelity data-flow paths + Szechuan on any new complexity introduced in the parser. (See AGENTS.md for decision record.)
- **H-INSTALL-ROBUST-01**: Finish install hygiene (MD5 or equivalent verification, remove last redundant arg parsing at install.sh:36, better non-tty + stale session messaging). Make `--closer-context --no-confirm` the boring default path for the machine. Success: closer handoff "just works" even after long campaigns or SIGKILLs.
- **H-GUARD-TRUTH-01**: Fix stale test drift (arch-deepener.test.ts:124 vs arch-deepener.ts:36-48 FORBIDDEN list, plus any similar green-on-lie in ac-shape-gate, preflight, citadel tests). Add living assertions that pull the real lists from source. Success: tests fail when guards drift.

**P2 — Polish that removes the last "you have to be one of the builders" tax**
- Deeper symbol audit + activity event schema enforcement on self-generated tickets.
- Better observability for "why did this ticket get skipped / healed / blocked" during long runs.
- Packaging / one-command "give me a fresh normie workspace" experience.
- More prescriptive ticket template evolution for generated (non-refine) work.

**Success Metrics (machine-verifiable where possible)**
- % of emitted tickets that pass full ac_shape + annotation_format + machinability gates on first try (target: >95% even on self-PRD paths).
- Overnight completion rate on 30-50 ticket meta campaigns with <5% human intervention after launch.
- Closer + self-prd delta quality (measured by next-cycle emission smell count and manual review of 1-2 cycles).
- "New engineer + fresh clone + one PRD" time-to-first-successful-overnight (target: <4 hours of setup, then hands-off).

Every ticket carved from this roadmap **must** follow the prescriptive template (references/refine/ticket-template.md), carry 4 hardening tickets when non-trivial, and update this file + reliability-backlog.md + AGENTS.md as part of the closer handoff.

## Living Interface Manifest (for generator/closer fidelity + evergreen sweeps)

The 4 living docs are the canonical fidelity surface (generator:335 fidelityDirs=['docs'], fidelityKeywords + candidates:714-731, loadBacklogState:136, performPost:707, closer:40):
- reliability-backlog.md:5-70 (## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY + Consumption Guide — the single source for the 7 OPEN + parser contract)
- docs/MASTER_PLAN.md:40-74 (Roadmap: Set and Forget for Normies + P0/P1 H-* + success metrics + this manifest)
- docs/closer-ticket-manager-handoff.md (bypass contract + closer expectations + ingestion cross-refs)
- AGENTS.md:15/23/43 (synthesis driver + Trap Doors + Contributor Rules + claude-first mandate)

Consumers MUST key on the MACHINE_ anchors + Guide (not tail regex or ad-hoc lists). Update keywords/candidates + this manifest on structural changes. History in git only. "Docs win."

**Docs win. Citadel will catch any drift.**

Wubba lubba dub dub.