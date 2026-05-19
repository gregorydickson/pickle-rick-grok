---
name: szechuan-sauce
description: Iterative code deslopping using the shared convergence engine (dispatch only). **FULLY EXPANDED** real driver — every principle from the sauce catalogs lives in the SzechuanDriver scanner (all 30+). Dispatches the engine; never improvise the principle-scan loop. Part of pipeline. Confidence-filtered, full project walk.
version: 3.1.0-dispatch-hardened
triggers:
  - szechuan-sauce
  - deslop
  - clean the code
  - remove slop
  - apply the sauce
references:
  - path: ../../references/spawn-subagent-contract.md
  - path: ../../engine/references/szechuan-sauce-principles-grok.md
---
# Szechuan Sauce — Code Quality Convergence Driver (Dispatch-Only)

**Honest status (post-audit hardening, FULL EXPANDED)**: The real `SzechuanDriver` (complete 30+ principles from both sauce catalogs, confidence filter, financial elevation, full-repo scan including .md, runConvergence with state/violationsHistory) lives in `engine/src/szechuan.ts`. Invoked by `bin/pipeline.ts`, self-improvement, and `bin/szechuan.ts` (init). No LLM principle-by-principle loop.

## Your Role — STRICT DISPATCH ONLY

You are **not** the principle scanner or deslop loop.

When the user invokes `/szechuan-sauce`, "szechuan", "deslop", "clean the code", "apply the sauce", or "remove slop", your **only** job is to dispatch the real driver and monitor. Do not research/fix/verify violations yourself.

**Hard Rules (non-negotiable, per audit):**

- **Never drive the principle-scan / convergence loop yourself with `spawn_subagent`.** Dispatch to the engine. "Research = highest-P violation, Fix = atomic change, Verify = gate + re-scan" is internal driver logic executed by headless `SzechuanDriver.runConvergence` + ritual + gate — not something you implement step-by-step in chat with workers.
- The 30+ principles (KISS, DRY, SRP, FAIL_FAST, MONETARY_PRECISION, AUDIT_TRAIL, YAGNI, Law of Demeter, all of them + financial) are baked into the TS scanner. You do not enumerate or apply them manually.
- Violating this is the classic "LLM will improvise the whole loop" risk the audit targeted.

## Dispatch Commands (Best Available)

**Preferred (runs as part of the post-build convergence chain inside pipeline):**

```bash
/pickle-pipeline --no-refine --target . 
# full meta self-dogfood (includes szechuan deslop of the loop itself):
/pickle-pipeline --self-improvement --target .
```

**For szechuan-focused / standalone deslop** (after build or on existing tree):

The `bin/szechuan.ts` supports init for a session. Full convergence execution currently routes through the pipeline or self-improvement wrapper (which wires SzechuanDriver correctly with targetRoot, domain, Activity, etc.).

Standalone use currently routes through the full pipeline or a thin wrapper — here is the incantation:

```bash
# Init a szechuan session (loads full principle catalog):
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/szechuan.ts init \
  <SESSION_ROOT> "." --domain base

# Full run is driven via:
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/pipeline.ts \
  <SESSION_ROOT> --no-refine --target <target-root>
# (this always includes the SzechuanDriver.runConvergence step)
```

**Always** use `background: true` when calling the long-running pipeline / szechuan convergence commands.

## Monitoring & After It Runs

Live tail:

```bash
tail -f <SESSION_ROOT>/logs/*.log
cat <SESSION_ROOT>/szechuan*.json  # or state files written by driver
```

After:

```bash
/pickle-metrics --days 7 --json
/pickle-standup --days 7
cat reliability-backlog.md   # after --self-improvement runs (szechuan feeds it)
```

The driver emits `convergenceIteration` Activity for szechuan and persists rich violation history. You dispatch, watch, and consume the delta via metrics/standup.

See `engine/src/szechuan.ts` (the full rule set lives there) + `pipeline.ts`. The sauce is applied by the machine. Belch.

**No "interactive also works" path for the principle loop** — all real execution is detached.
