---
name: citadel
description: Run the Citadel conformance audit (dispatch only). Real 5-auditor v1.1 core + trap/self-meta scan in the engine (deeper 11-auditor P2). The "spec is the review" hard gate before Anatomy/Szechuan. Part of pipeline post-build. Never improvise the auditor loop.
version: 2.3.0-dispatch-hardened
triggers:
  - citadel
  - conformance audit
  - prd audit
  - citadel v1.3
---
# Citadel — PRD Conformance Auditor (Dispatch-Only, Grok Native)

**Honest status (post-audit hardening)**: The real `runCitadel` (and supporting audits) lives in `engine/src/citadel.ts`. Shipping core is the 5-auditor v1.1 + trap/self-meta cross-ref scan (per AGENTS.md contract). Deeper 11-auditor / v1.3 expansion is P2 tracked work, not the current runtime surface. Always runs as hard gate in pipeline/self-improvement.

## Your Role — STRICT DISPATCH ONLY

You are **not** the auditor.

When the user invokes `/citadel`, "conformance audit", "prd audit", "citadel v1.3", etc., your **only** job is to dispatch the real conformance engine and point at the outputs. Do not implement or simulate any of the auditor checks yourself.

**Hard Rules (non-negotiable, per audit and Core Execution Principle):**

- **Never drive the auditor loop yourself with `spawn_subagent`.** Dispatch to the engine. The list of checks (AC coverage, interface drift, trap/self-meta cross-refs, diff hygiene, ritual invariants, divergence, etc.) are implemented inside `runCitadel(...)` + called from `pipeline.ts`. You do not enumerate auditors, collect evidence, or write `citadel_report.json` by hand or via ad-hoc subagents.
- Pointing at "direct `runCitadel(sessionDir)`" or "validate-artifact" as a user-facing standalone incantation was the code smell — now fixed. All real use goes through the documented dispatch paths.
- The gate treats FAIL (including self-meta orphans) as hard exit. The machine enforces it.

## Dispatch Commands (Best Available)

**Preferred (always runs Citadel as the first post-build gate before Anatomy + Szechuan):**

```bash
/pickle-pipeline --no-refine --target . 
# (citadel runs automatically; FAIL aborts the rest)
```

For full self-improvement (citadel + everything + meta ingest):

```bash
/pickle-pipeline --self-improvement --target .
```

**Standalone citadel audit** (no dedicated `bin/citadel.ts` top-level CLI yet — `runCitadel` is a library export called by pipeline and self-improvement):

Standalone use currently routes through the full pipeline or a thin wrapper — here is the incantation:

```bash
# Create session (the function uses it to locate PRD + working dir):
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/setup.ts \
  --task "citadel conformance gate on current tree" --runtime grok

# Run the pipeline post-phase (executes runCitadel(target) as first step):
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/pipeline.ts \
  <SESSION_ROOT> --no-refine --target <target-root>
```

Direct function calls from chat (e.g. `runCitadel`) are not supported dispatch — use the above.

**Always** launch with `background: true` for the pipeline invocation on long/self-improvement runs.

## Monitoring & After It Runs

Live:

```bash
tail -f <SESSION_ROOT>/logs/*.log
cat <SESSION_ROOT>/campaign-status.json
```

After (the report is the source of truth):

```bash
cat <SESSION_ROOT>/citadel_report.json
cat citadel_prd_feedback.md   # (written to cwd or session as appropriate)
ls citadel_report.schema.json

/pickle-metrics --days 7
/pickle-standup --days 7
```

Citadel writes `citadel_audit` Activity events and the machine-readable report. Use the report to feed `/pickle-refine-prd` or the self-PRD generator.

See `engine/src/citadel.ts` and `pipeline.ts:44` (the call site). The 5-auditor core + self-meta teeth are what actually guard the 50-ticket loop today.

**Rick**: "The gate that watches the gate. Don't touch the code — the code touches you."

**No interactive "you run the auditors" mode.** All enforcement is detached and logged.
