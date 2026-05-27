# Reliability Backlog (Living Single-Source Record of Open Fidelity Debt)

**Status (2026-05-27 backlog-sweep)**: Slim living record. SWARM7 staleness (AGENTS.md:52) + verbose 9-step tranche prose duplication closed. Single source of truth for the machine (self-prd-generator.ts:335/707+ loadBacklogState + performPostCampaignIngest + scanForGaps + closer). "Docs win" (AGENTS:28). History preserved in git + prior subagent maps (019e6b15-df66... codebase, 019e6b18-00fb... simplifier, 019e6b19-9d3b... risk).

Wubba lubba dub dub.

## Dominant Open Items (verbatim from AGENTS:15/43 + MASTER_PLAN:34 + TESTABILITY:41 + closer-handoff:49 + citadel_report.json:1-39 thin 1.1)
- full analyst ac_shape_smells JSON plumbing into emitter manifest (for true hard gate on *all* paths; currently only council/refine via optional EmitOptions.acShapeSmells + partial collectedAc; see ac-shape.ts:9-12 "not yet plumbed", ticket-emitter.ts:52/395/431, pipeline-preflight.ts:36/346/417 (warning only), generator:820 (post-fix collected))
- richer annotation_format_malformed detection + full parity in manifest / check-readiness / preflight scan (forward-ref-annotation.ts:9-11)
- thin citadel depth (v1.2 6-auditor + emissionQuality/crossPhase attach at citadel.ts:793/815 vs claude 17 dedicated + full audit-runner/reporter; current root citadel_report.json schemaVersion "1.1" lacks the fields)
- ritual god residual (ritual.ts:4-6 header comment; research rescue extracted but doc-only per safety rules; skip sites at 313+/323+; TESTABILITY:105+ prior dupe/racy isHardening vs locked session.ts:232)
- generator fidelity ingest dupes (now fixed in this sweep: self-prd-generator.ts:815-828 const redecl paste + 900/944 acShapeSmells key dupes in emit options; was live TransformError breaking self-prd-closer.test.ts + richer ac_shape signal)
- install hygiene parity (AGENTS:49: exact current pgrep/3-root ACTIVE/flock/stealStaleLock/closer-context vs aspirational MD5/schema/tree verif; no overclaim)
- szechuan bare catches, aux bin type debt, preflight edge cases on meta PRDs (AGENTS:43)
- preflight audit remaining deeper richer annotation (TESTABILITY:41 note post the dedicated test tranche)

## Required Hardening Tickets (per risk-analyst 019e6b19-9d3b... immutable rules 5-6 + all 3 analysts)
- Anatomy: data flows for self-prd-generator fidelity paths + performPostCampaignIngest + loadBacklogState + scanForGaps post this slim + dupe fix (verify -4000 tail regexes still match 'self-loop-ingestion'+'ingested'+'closed' from short ledger; richer collectedAc / emissionQuality paths 773+ still feed ac_shape_smells to backlog/emitters; cross-check vs citadel_report + MASTER_PLAN seeds). Exact: self-prd-generator.ts:136-148/335-368/707-840 (post-fix), self-prd-closer.test.ts:167-325, docs/MASTER_PLAN.md, reliability-backlog.md (this slim).
- Szechuan: doc bloat + dupe prose removal (old verbose 9-step in reliability + AGENTS:44-48); confirm no citation drift or new slop. Surfaces: AGENTS.md:40-61, reliability-backlog.md (full), docs/MASTER_PLAN.md:1-38, docs/closer-ticket-manager-handoff.md:40-51.
- Anatomy + Szechuan pair (generator dupe hygiene): data-flow + deslop on any residual emissionQuality/citadel_report parse patterns in self-prd-generator fidelity ingest (the P0 surfaced by the full analyst team during this sweep; prevents richer ac_shape_smells starvation in 50+ tix self-runs).

## Closed This Sweep (2026-05-27, worktree + team)
- SWARM7 reliability-backlog.md staleness + tranche prose bloat (AGENTS:52). Slimmed to this short ledger (single source). Verbose 9-step execution logs deduped to git history + terse pointers (see simplifier 019e6b18... + risk 019e6b19... + codebase 019e6b15...).
- Live dupe bug in generator fidelity (const redecl + key dups) that was breaking the exact tests exercising the richer emission / ac_shape plumbing the system depends on. Minimal deletes in worktree (3 hunks). Tests now green. Recorded here for the machine.

Tranche7 (richer emissionQuality citadel_report ingest) + tranche8 (living MASTER_PLAN + gap suppression) remain closed. Full prior 9-step TDD/worktree details + agent credits (019e6a33... tranche7, 019e6a47... tranche8) in git history.

## Ingest Trigger Examples (guarantees loadBacklogState tail match + continued GAP-SELF-LOOP-INGESTION suppression)
- Ingested MASTER_PLAN.md (tranche8 fidelity + generator:725/729-736)
- Richer emissionQuality from citadel_report.json (tranche7 unified report signal; ac_shape_smells + annotation_format_malformed)
- self-loop-ingestion: closed (tranche8 + 2026-05-27 dupe fix + slim sweep)

**Next self-PRD targets**: the opens above + the 3 hardening tickets. Citadel will catch any drift.

Wubba lubba dub dub.
