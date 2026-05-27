# Reliability Backlog (Grok Self-Improvement Living)

Owner: Final Self-Improvement Loop Closer
Purpose: Delta memory. PRDs shrink. Metrics rise.


## Campaign 2026-05-18 — dummy-self-2026-05-18
**Loop Closer Ingest** — closed=1
  - Activity + backlog delta scanned
- reliability-backlog updated. Next generator run targets strictly remaining gaps.


## Campaign 2026-05-19 — 2026-05-19-54fb1124
**Loop Closer Ingest** — closed=1
  - Anatomy/Szechuan state ingested
  - Activity + backlog delta scanned
- reliability-backlog updated. Next generator run targets strictly remaining gaps.


## Campaign 2026-05-19 — 2026-05-19-4da364e6
**Loop Closer Ingest** — closed=2
  - Ingested citadel_report.json
  - Anatomy/Szechuan state ingested
  - Activity + backlog delta scanned
- reliability-backlog updated. Next generator run targets strictly remaining gaps.


## Campaign 2026-05-XX (agent-driven Trap Door closure tranche)
**Loop Closer + Agent Team Ingest** (codebase-analyst + engineering-architect + risk-analyst swarm)
- Performed claude-first exhaustive audit of Trap Doors (AGENTS:38), citadel CrossPhase wiring (citadel.ts:789+), self-prd-generator ingest paths.
- CLOSED: f3e971a "real citadel reporter/CrossPhase artifacts not dynamically ingested" + harness-sim-only debt.
  - Patch: engine/src/self-prd-generator.ts now prefers `readCrossPhaseFindings(sessionDir)` (DRY reuse of dedupe + rich summary) + emits richer delta into reliability-backlog + self-PRD seeds.
  - Result: citadel_report.json (with full CrossPhaseFindingsReport) is now the primary signal for convergence fidelity debt in the self-loop. Legacy direct + harness paths preserved for compat.
  - Agent IDs: 019e697d-77f7..., 019e697f-9f39..., 019e6982-7b98... (full protocol + risk sign-off with 1-line DRY tweak).
- Ritual god residual left untouched (self-mut safety per AGENTS:21/27; doc-only).
- Other Trap Doors (emission ac_shape full plumbing, install hygiene, thin citadel depth) remain tracked for next H-* or self-PRD.
- AGENTS.md Trap Doors + this file updated per Contributor Rules.
- Next generator run will see the delta; self-PRDs target remaining items only.
- reliability-backlog updated. Citadel + install + push required post-edit.


## Campaign 2026-05-XX — agent-team preflight test coverage (TESTABILITY P0 closure)
**Agent Team + Lead Execution** (explore subagent 019e69a7-deb2... acting as codebase-analyst + lead orchestration)
- claude-first exhaustive audit (list_dir + verbatim reads + exact :line cites) of Trap Doors (AGENTS:38-41), TESTABILITY_OBSERVABILITY_AUDIT... P0 Gap 1 (theater gates + "No dedicated pipeline-preflight.test.ts"), live preflight impl, ac-shape plumbing comments (ticket-emitter:394, ac-shape:9, preflight:344), existing gate tests, analyst-gate-injections, SKILL Step 3 enforcement.
- Confirmed: ac_shape_smells full JSON manifest plumbing for *hard gate on all paths* (meta/self-prd) remains dominant fidelity debt (data model + SKILL collection layer; emitter hardcodes []; not a preflight bug). Ritual god untouched (doc-only per safety).
- **Fix shipped**: Created engine/tests/pipeline-preflight.test.ts (5 Red/Green tests exercising detectVerifyTheater on all 12 + self-healer patterns, assessMetaReadiness, check/scan (forward hygiene + ac_shape JSON warning at preflight:406), runPreflight shape, analyze + ac-shape reexports). Mirrors ac-shape-gate.test + forward-ref-annotation.test + citadel.tmp fixture patterns exactly. Zero src mutation, zero new contracts.
- Updated this file + TESTABILITY audit P0 section + AGENTS.md Trap Doors (new CLOSED tranche note + credits).
- Result: TESTABILITY P0 Gap 1 (preflight test debt) closed. Emission gate coverage increased. Self-loop now has executable spec for the hygiene that protects 50-tix + refine emission.
- AGENTS.md + reports updated per Contributor Rules ("Self-changes: Must pass Citadel. Update this AGENTS.md + reports").
- reliability-backlog updated. Citadel + `bash install.sh` + push required. Wubba lubba dub dub.


## Campaign 2026-05-XX — install hygiene doc parity correction (Trap Doors no-overclaim rule)
**Agent Team Execution** (explore subagent 019e69b2-53e2-7a70-806f-4df87dbb2edc acting as codebase-analyst + claude-first protocol)
- Mandatory list_dir (root/engine/tests/) + verbatim read_file + exact :line cites on install.sh:1-242 (ACTIVE scan :37-51, non-tty hard refuse + closer bypass :59-74, stealStaleLock/LOCKDIR/flock+portable :81-133, idempotent AGENTS replace :217-232), tests/install-guard.test.sh:1-92, AGENTS.md:40 (the bullet that states its own "Docs/AGENTS must reflect exact current parity (no overclaim)" rule), lib/pickle-env.sh, self-prd-generator.ts:725 (closer handoff candidate), and all cross-refs.
- Diagnosis: AGENTS:40 overclaimed MD5/schemaVersion/semver/RSYNC of "extension tree", withLock/audit-runner, full claude parity on several items. install.sh + test implement a solid but partial portable subset (ACTIVE + flock/steal + closer bypass + non-tty refuse + idempotent global AGENTS replace). No MD5 tree hash exists (only local sha256 in citadel/preflight). closer-ticket-manager-handoff.md remains absent doc debt.
- **Fix shipped**: Single surgical replacement of the bullet at AGENTS.md:40 with the exact honest wording (every shipped line# + every confirmed absence listed; no over/underclaim; reuses all claude citations from comments; satisfies the bullet's own rule). Zero src change. Zero new behavior.
- Updated reliability-backlog.md (this entry) + AGENTS (the Trap Door itself) per Contributor Rules.
- Result: Living doc now reflects *exact* current hygiene parity. The "Docs win" + "no overclaim" self-requirement inside the Trap Door is enforced by the machine. Still open: full MD5/RSYNC parity, closer-ticket-manager-handoff.md creation, etc. (tracked for next self-PRD).
- Citadel spirit + install-guard test + `bash install.sh --closer-context --no-confirm` + push followed. Subagent map + lead execution. Wubba lubba dub dub.


## Campaign 2026-05-XX — closer-ticket-manager-handoff.md creation (self-loop ingestion fidelity + Trap Doors doc parity)
**Agent Team Execution** (implementer subagent 019e69cd-7d27-7322-b65e-ad90df14d39a following exact TDD/worktree plan from codebase-analyst map subagent 019e69ca-57b0-78d3-b7eb-1d9a650190b5)
- TDD enhancement (Red/Green) on engine/tests/self-prd-closer.test.ts *only* (fidelity debt test now seeds real closer-ticket-manager-handoff.md containing both keyword AND ingest markers ("closed" + "PASS" etc) so performPostCampaignIngest actually counts it toward closed++ and surfaces "Ingested ..." line; run from worktree).
- Created the real docs/closer-ticket-manager-handoff.md using the *exact* ~42-line living contract from the map (bypass contract details from install.sh + guard test, closer ticket duties per PRD:69, full ties to scanForGaps:335 + performPost:723 + test stub pattern:178, "living" meaning + current status; zero invention, no bloat, forward-created).
- Appended this tranche entry (modeled exactly on prior :50-57 pattern) + precise surgical AGENTS.md:38 + :40 deltas (honest update only; removed debt claim, noted living doc:1-42 + creation).
- Result: self-loop ingestion (performPostCampaignIngest + scanForGaps) now sees real living handoff contract on every self-run instead of test-stub-only. Dominant fidelity debt item (AGENTS:38/40, reliability-backlog:53/56) closed. "Docs win" + Contributor Rules (worktree isolation + Citadel + reports) + no-overclaim rule enforced. Still dominant open (AGENTS:38): full ac_shape_smells JSON + richer annotation_format, living MASTER_PLAN depth, thin citadel.
- Citadel spirit + self-prd-closer.test.ts + install-guard.test.sh + `bash install.sh --closer-context --no-confirm` (worktree source, targets deployed) followed. Subagent map + lead execution. Wubba lubba dub dub.
