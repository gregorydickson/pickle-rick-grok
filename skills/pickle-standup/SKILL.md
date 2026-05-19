---
name: pickle-standup
description: Generate a daily or weekly standup-style summary of autonomous work done by Pickle Rick Grok. Now with first-class per-day deltas, regression forensics, auto-suggested next PRDs, and self-improvement loop delta visibility.
version: 2.1.0-grok-richer
triggers:
  - pickle-standup
  - standup
  - what did I ship
  - daily report
---
# Pickle Standup — Daily/Weekly Summary (Richer Campaign Observability)

## Your Role — STRICT DISPATCH ONLY

You are **not** the standup reporter.

When the user invokes `/pickle-standup`, says "standup", "daily report", "what did I ship", etc., your **only** job is to emit the exact command to the real engine bin and advise on monitoring.

**Hard Rules (never violate):**

- **Never synthesize the report yourself** — do not pull tickets, deltas, forensics, or suggested PRDs from chat knowledge or conversation history. The model has no access to the full structured Activity logs, campaign-status.json, or parsed reliability-backlog.md anyway.
- **Always dispatch to the real bin** so the numbers come from Activity logs + campaign-status.json + reliability-backlog.md. Only the bin produces the rich per-day trends+deltas, regression forensics, Suggested Next PRDs, Self-Improvement Loop + Delta Visibility, Graphite/Linear integration, etc.
- The real observability engine lives in `npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/standup.ts`. Your job is dispatch + monitoring tip, then get out of the way.

This is the Core Execution Principle applied to reporting. Synthesizing here would make the self-loop visibility fake and defeat the entire point of the richer campaign forensics.

## Correct Action

When the user asks for metrics or standup, your response is the exact command + monitoring tip.

## Usage

```bash
/pickle-standup
/pickle-standup --days 7
/pickle-standup --days 30   # long campaign pattern spotting
```

## Behavior

Invoke the real standup bin:

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/standup.ts --days N
```

The standup now produces a structured, high-signal report that includes:

- Tickets completed / failed + commits + phases
- Convergence behavior + success/regression counts
- **Per-Day Trends table with day-over-day deltas** (spot productivity swings instantly)
- **Regression Forensics** section (high failure, circuit trips, worker fails, Citadel FAIL correlation)
- **Suggested Next PRDs** — auto-derived from recent self_prd_generated categories, failure reasons, citadel audits, backlog trends (perfect for feeding the next self-improvement loop)
- **Self-Improvement Loop + Delta Visibility** — Self-PRD counts, loops closed, meta phases, post-campaign ingests, meta tickets, + parsed reliability-backlog.md (campaign count, total gaps closed, recent trend delta)
- Graphite stack status (if `gt` CLI available)
- Recent Linear ticket activity (if Linear CLI available)
- Graceful degradation when external CLIs absent

This makes standup first-class for spotting patterns across multi-day autonomous self-improvement runs. You see exactly where the pickle is improving (or not), what the next PRD seeds should be, and the real delta from the meta loop closer.

Run it after every pipeline --self-improvement or overnight campaign. Pair with `/pickle-metrics --days N --json` for machine ingestion.
