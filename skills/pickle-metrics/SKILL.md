---
name: pickle-metrics
description: Aggregates activity logs into rich productivity/reliability reports with per-day trends+deltas, regression patterns, self-loop deltas, and auto-suggested next PRDs. The observability backbone for long autonomous + self-improvement campaigns.
version: 2.1.0-grok-richer
triggers:
  - pickle-metrics
  - metrics
  - usage report
  - how much work
  - campaign health
---
# Pickle Metrics — Usage & Productivity + Self-Loop Forensics Report

## Your Role — STRICT DISPATCH ONLY

You are **not** the metrics reporter.

When the user invokes `/pickle-metrics`, says "metrics", "usage report", "campaign health", "how much work", etc., your **only** job is to emit the exact command to the real engine bin and advise on monitoring.

**Hard Rules (never violate):**

- **Never synthesize the report yourself** — do not pull numbers, deltas, or forensics from chat knowledge or conversation history. The model has no access to the full structured Activity logs anyway.
- **Always dispatch to the real bin** so the numbers come from Activity logs + campaign-status.json + reliability-backlog.md. Only the bin produces the rich per-day trends+deltas, self_delta, regression forensics, suggested PRDs, expanded by_day counters, etc.
- The real observability engine lives in `npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/metrics.ts`. Your job is dispatch + monitoring tip, then get out of the way.

This is the Core Execution Principle applied to reporting. Synthesizing here would make the self-loop visibility fake and defeat the entire point of the richer campaign forensics.

## Correct Action

When the user asks for metrics or standup, your response is the exact command + monitoring tip.

## Usage

```bash
/pickle-metrics
/pickle-metrics --days 30
/pickle-metrics --days 90 --json   # long campaign trend + machine data for pipeline
/pickle-metrics -j
```

## Behavior

Invoke the real metrics bin:

```bash
npx tsx ~/.grok/pickle-rick-grok/engine/src/bin/metrics.ts --days N [--json]
```

It aggregates the structured daily JSONL activity logs (from activity-logger + all the new high-signal events: worker_outcome, self_*, citadel_audit, prd_feedback etc.) into a report covering:

**Core**
- Tickets / commits / phases / convergence / gates / circuits / workers
- Convergence success rate + gate pass/fail
- Breakdown by source

**Richer Campaign Observability (new in this polish)**
- **Per-Day Trends** with explicit day-over-day deltas on tickets completed
- **Self-Improvement Delta Visibility**: campaigns in reliability-backlog.md, total/avg gaps closed, trend (improving/regressing)
- **Regression Forensics + Patterns**: high-fail days, circuit+failure correlation count
- **Suggested Next PRDs** (array + human list): auto-derived from self_prd_generated focus categories, recurring phase/circuit/worker failures, Citadel FAILs, backlog trend — directly usable as seeds for the next self-PRD generator run
- Expanded by_day with self_prd / loop / citadel counters

**Output**
- Human pretty with emojis, tables, actionable bullets
- `--json` emits the full structured object (period, by_day, self_delta, suggested_prds, regression_patterns, etc.) for consumption by pipeline-runner, citadel, or external dashboards

This is *the* tool for running real 50-ticket self-improvement loops and knowing whether each iteration is making the engine measurably better. No more guessing.

See also `/pickle-standup` for the narrative + external (Graphite/Linear) view.
