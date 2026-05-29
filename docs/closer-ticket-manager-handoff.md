# Closer Ticket Manager Handoff (Living Contract)

**Status**: Created to close dominant fidelity debt (AGENTS.md:25/43/45, reliability-backlog.md:5/53). Replaces test-stub-only. 4 docs + comment hygiene synced.
**Owner**: Final Self-Improvement Loop Closer + self-prd-generator
**Last Updated**: 2026-05-29 (see EG Round 2 Note:72 + Consumption Guide:53 + git for history). 7 OPEN. Zero src. Docs win. See reliability:5-70.)

## The --closer-context / --no-confirm Bypass Contract

(See install.sh:28-35,59-75,201-233 + tests/install-guard.test.sh:35-41,70-84.)

- Flags (install.sh:31-35): `--closer-context` sets CLOSER_CONTEXT=1 + NO_CONFIRM=1; `--no-confirm` sets bypass.
- ACTIVE guard (install.sh:53-75): pgrep + state.json `"active":true` across roots. Hard non-tty refuse unless bypass.
- Explicit message (install.sh:62-64): "Use --closer-context --no-confirm for self-loop closer handoff (see closer-ticket-manager-handoff.md)."
- Bypass behavior (install.sh:72,201-202): skips interactive "Continue anyway?" prompt *and* global AGENTS append prompt ("closer/headless/non-tty context — skipping interactive AGENTS prompt; block already updated idempotently by prior logic or --force").
- Comment (install.sh:26): tracks claude patterns + this doc.

## What a Closer Ticket Is Expected To Do

Per prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md:69:

- Ingest (MASTER_PLAN updates, close findings, renumber Active Queue, add trap-door counts).
- `bash install.sh --closer-context --no-confirm` (the escape hatch).
- Version bump, parity checks, citadel_report validation.
- Commit with clear "Closed: #NN via R-XXX-CLOSER".

Per AGENTS.md:25-32/45 (Contributor Rules): Self-changes **must** pass Citadel. Update AGENTS + reports + 4 living docs. `bash install.sh` after.

## Ties to Self-Loop Machinery (Exact Current Reality)

- engine/src/self-prd-generator.ts:335-336: fidelityDirs 'docs'; keywords "closer-ticket-manager-handoff" + "MASTER_PLAN|living.?backlog". GAP-SELF-LOOP if missing in docs/. (358-364)
- engine/src/self-prd-generator.ts:707+: performPost candidates include this ( + MASTER variants). "Ingested ..." on match (729+).
- engine/src/self-improvement-loop-closer.ts:25,40: imports + calls performPostCampaignIngest (runSelfImprovementLoopCloser).
- engine/src/lib/post-campaign.ts:60- (runPostCampaignPhases runs citadel/anatomy/szechuan best-effort polish per types.ts:78-106 before closer release).
- engine/tests/self-prd-closer.test.ts:176-178: test *creates stub* in tmp/docs/ precisely to exercise the self-loop ingestion gap path and prove generator surfaces it (167-198 full test). Tranche8 extends with real MASTER_PLAN seed + Ingested + gap suppression assert.

## What "Living" Means for the Handoff

- Single source of truth for the bypass + closer expectations.
- Updated whenever install.sh bypass, generator candidates/regex, closer flow, or AGENTS Contributor Rules change.
- All cross-refs use exact HEAD line# (AGENTS:25/43/58/70, reliability-backlog:5-70 + :48, install.sh:26/63, generator:335/712/817/889/932 + performPost, PRD:69, test:178).
- Once real (not stub), scanForGaps + performPostCampaignIngest see honest docs/ content on every self-run.
- Part of "Docs win" (AGENTS:23/34) + Trap Door hygiene (exact parity, no overclaim; AGENTS:40). Hygiene sync applied.
- Closer tickets must keep it in sync as part of handoff.

## Current Status (Post-Creation + Tranche8)

- Debt closed for this item: real living doc now at docs/closer-ticket-manager-handoff.md.
- Tranche8: living MASTER_PLAN depth closed via ingestion.
- Still dominant open (AGENTS + sweeps): 7 items reliability-backlog.md:5-41 (## MACHINE_* + Guide; canonical for gen/closer). MASTER_PLAN resolved; stub deprecated; sludge per Guide. See reliability:5-70 + bypass. 

Wubba lubba dub dub.