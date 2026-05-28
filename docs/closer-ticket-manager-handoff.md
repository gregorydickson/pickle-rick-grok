# Closer Ticket Manager Handoff (Living Contract)

**Status**: Created to close dominant fidelity debt (AGENTS.md:38/40, reliability-backlog.md:53/56). Replaces test-stub-only pattern.
**Owner**: Final Self-Improvement Loop Closer + self-prd-generator
**Last Updated**: 2026-05-28 (this run: user-directed plans update with bootstrapping strategy + final real post-Guide purge in reliability (now pristine + Bootstrapping Phase Note with three horizons); H-FIDELITY-03 + Prime Directive operationalized in the ingested record for clean-context agent team execution. Cross-refs synced. "Docs win.")

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

Per AGENTS.md:25-32 (Contributor Rules): Self-changes **must** pass Citadel. Update this AGENTS.md + reports. Mutating work uses worktree isolation. Global updates run `bash install.sh` after.

## Ties to Self-Loop Machinery (Exact Current Reality)

- engine/src/self-prd-generator.ts:335-336: fidelityDirs includes 'docs'; fidelityKeywords matches "closer-ticket-manager-handoff" + (tranche8) "MASTER_PLAN|living.?backlog". If found in real docs/ and !backlog.closedCategories.has('self-loop-ingestion') → GAP-SELF-LOOP-INGESTION (P0) at 358-364.
- engine/src/self-prd-generator.ts:723-728: listed in performPostCampaignIngest candidates (tranche8: + MASTER_PLAN root + camp variants). If exists + /PASS|closed|resilience|ritual|persistence|meta/i.test → closed++ + "Ingested ..." line (729-736).
- engine/src/self-improvement-loop-closer.ts:25,40: imports + calls performPostCampaignIngest (runSelfImprovementLoopCloser).
- engine/src/lib/post-campaign.ts:60- (runPostCampaignPhases runs citadel/anatomy/szechuan best-effort polish per types.ts:78-106 before closer release).
- engine/tests/self-prd-closer.test.ts:176-178: test *creates stub* in tmp/docs/ precisely to exercise the self-loop ingestion gap path and prove generator surfaces it (167-198 full test). Tranche8 extends with real MASTER_PLAN seed + Ingested + gap suppression assert.

## What "Living" Means for the Handoff

- Single source of truth for the bypass + closer expectations.
- Updated whenever install.sh bypass, generator candidates/regex, closer flow, or AGENTS Contributor Rules change.
- All cross-refs use exact line# (AGENTS:23/52 (post-scrub), reliability-backlog:5-21 (post-scrub 7-item), install.sh:26/63, generator candidates/keywords + performPost, PRD:69, test:178).
- Once real (not stub), scanForGaps + performPostCampaignIngest see honest docs/ content on every self-run.
- Part of "Docs win" (AGENTS:23) + Trap Door hygiene ("Docs/AGENTS must reflect exact current parity (no overclaim)", AGENTS:40).
- Closer tickets must keep it in sync as part of handoff.

## Current Status (Post-Creation + Tranche8)

- Debt closed for this item: real living doc now at docs/closer-ticket-manager-handoff.md.
- Tranche8: living MASTER_PLAN depth (AGENTS:43) closed via ingestion (generator candidates + fidelity + "Ingested master_plan" + gen gap suppression).
- Still dominant open (AGENTS:43 + 2026-05-28 evergreen sweeps): the 7 items in reliability-backlog.md:5-41 (## MACHINE_DOMINANT_OPEN_ITEMS + Consumption Guide; canonical machine-usable single-source for generator:136/150/335/707, closer:40, loadBacklogState etc.). MASTER_PLAN living resolved tranche8; root master_plan deprecated stub (pointer to docs/); dupe/historical sludge purged. See reliability:5-70 + this doc for bypass contract. 

Wubba lubba dub dub.