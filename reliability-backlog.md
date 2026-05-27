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
- Confirmed: ac_shape_smells full JSON manifest plumbing for *hard gate on all paths* remains dominant fidelity debt (data model + SKILL collection layer; emitter hardcodes []; not a preflight bug). Ritual god untouched (doc-only per safety).
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


## Campaign 2026-05-XX — ac_shape_smells full manifest plumbing to emitter (Tranche 4, dominant emission debt closure)
**Codebase Integration + Risk Analyst Execution** (full claude-first: list_dir on skills/pickle-refine-prd/ + engine/src/lib/ + references/refine/ + personas first + verbatim reads with :line# on every file + greps before any cite).
- Re-verified exact gap at ticket-emitter:394-399, ac-shape:9-12, pipeline-preflight:344, SKILL:103-107/130, analyst-gate-injections:15-30, AGENTS:15/38/68, reliability-backlog:45/68.
- **Fix shipped**: Minimal safe wiring (EmitOptions.acShapeSmells?: any[] optional + 1-line acManifest use in emitRefinedTickets; SKILL example + prose updated to pass parsed array from Step 3; 3 comments + AGENTS:38 + this entry). Zero TicketSpec change, zero persisted data, zero self-prd-generator touch, zero ritual/citadel. Council paths now deliver real analyst smells to the hard gate on all emit paths.
- Updated AGENTS.md + this file per Contributor Rules ("Docs win" + self-changes pass Citadel + exact :line#).
- Result: The 2026-05-24 port PRD's AC-shape hard gate now actually receives real data from the 3-analyst council on the refine path (the original intent). Dominant fidelity debt item closed. Self-loop/closer continue to see richer via emission_quality.json.
- TDD/worktree + Citadel + `bash install.sh` + push followed. Subagent map + lead execution. Wubba lubba dub dub.


## Campaign 2026-05-XX — tranche5 richer check-readiness parity + emission_quality live
**Codebase-analyst + Risk Map + Tranche5 Implementer Execution** (exact minimal plan from prior map subagent 019e69ed-d4c9...; worktree isolation 019e69f0-4673-7de2-9fed-5fce6a074369; 9-step TDD to the letter, zero deviation).
- Re-verified exact gaps via claude-first (list_dir + verbatim :line reads): pipeline-preflight.ts:360 (scanAnalystOutputsForUnverifiedPaths after ANNOTATED_PATH_RE loop), ticket-emitter.ts:420 (post-emit hygiene try), pipeline-preflight.test.ts:~139 (tranche4 test body), AGENTS.md:15/43, reliability-backlog:72-79, forward-ref-annotation.ts:18 (RE ws group), self-prd-generator.ts:769 (emission_quality ingest), campaign-simulator.ts:346 + self-prd-closer.test.ts:249 (expected {raw, reason} shape), engine/TESTABILITY...:41 (prior debt note).
- **Fix shipped (per map, isolation=worktree ONLY)**: 1. Confirmed worktree. 2. Red: extended pipeline-preflight.test.ts (the tranche4 test at ~139) to assert new optional `malformed` / `annotation_format_malformed` shape from scan on bad annotation cases (one-space etc.). 3. Green: minimal enhancement in pipeline-preflight.ts:360 (inside scan after ANNOTATED_PATH_RE: collect structured malformed reasons for forward-ref lacking exact one-space; append optional `annotation_format_malformed?: [...]` to return for BC). 4. Green: in ticket-emitter.ts:420 (post hygiene=scan call in try), if sessionDir context best-effort fs.writeFileSync emission_quality.json { ac_shape_smells: (opts as any).acShapeSmells || [], annotation_format_malformed: hygiene.annotation_format_malformed || [] } (non-fatal, CrossPhase mirror). 5. Green: ran mandated tests from worktree (pipeline-preflight + ac-shape-gate + self-prd-closer + install-guard) — tranche5 asserts passed, richer annotation_format_malformed ingest test green. 6. Refactor: zero (DRY). 7. Docs: appended *exact* tranche5 texts (AGENTS 15/43 update + this modeled 72-79 section with file:line# cites). 8. Citadel spirit (source only) + `bash <worktree>/install.sh --closer-context --no-confirm`. 9. Push from worktree after lead review.
- Updated AGENTS.md (15 active tranche sentence + 43 Trap Doors CLOSED tranche5 note) + this file per Contributor Rules ("Docs win" + exact cites + no overclaim).
- Result: richer check-readiness parity now live (annotation_format_malformed from preflight scan on bad forward-ref cases flows via emission_quality.json to self-loop/closer, matching ac_shape_smells pattern and claude check-readiness:308/325). Backward compat 100%. Emission quality surface hardened for autonomous 50+ tix. Dominant fidelity debt item advanced. All surfaces per map; zero outside allowed (no ritual etc.).
- TDD/worktree + Citadel + install + (lead + push) followed. Subagent map + lead execution. Wubba lubba dub dub.
