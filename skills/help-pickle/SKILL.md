---
name: help-pickle
description: List all available Pickle Rick commands/skills and their purpose. Use when the user asks "what can pickle do", "help with pickle", or "list pickle commands".
version: 2.1.0-grok-richer-reports
triggers:
  - help-pickle
  - pickle help
  - what can pickle do
---
# Help Pickle — Command Reference (Grok Native)

**Real, installed skills in this Grok port (after `bash install.sh`):**

## Core Workflow (P0)
- `/pickle-prd` — Draft a machine-verifiable PRD with verification column + contracts
- `/pickle-refine-prd` — **Large native agent team** (Requirements + Codebase + Risk analysts, multi-cycle cross-critique via spawn_subagent). THE ONLY step allowed to use rich parallel teams instead of headless `grok -p`. Produces prd_refined.md + atomic tickets.
- `/pickle-tmux` — **Primary execution path** — Detached/background long-running mode via orchestrator + headless `grok -p` workers + full ritual/gate/circuit safety. This is the only supported way to run the 8-phase lifecycle at scale.
- `/pickle-pipeline` — Full chain (optional refine + tmux-style build + citadel + anatomy + szechuan) in one command. Use this for real campaigns.

## Full / Multi-Phase (real drivers)
- `/pickle-pipeline` — Chains (optional refine) → build (orchestrator) → **real** citadel (5-auditor v1.1 core + trap/self-meta scan; deeper 11-auditor is P2) → **real** anatomy-park (3-phase driver) → **real** szechuan-sauce (convergence). High-signal events logged. --self-improvement for full meta dogfood.

## Convergence / Polish (real)
- `/microverse` — Metric or LLM-judge optimization loop (uses ConvergenceLoop + subagents)
- `/anatomy-park` — Deep subsystem data-flow review + 3-phase (Review/Fix/Verify) + trap doors (full driver in engine)
- `/szechuan-sauce` — Principle-driven code deslopping (KISS/DRY/security...) until zero violations or stall
- `/citadel` — PRD conformance + contract drift + trap door + diff hygiene + endpoint drift audit (real 5-auditor v1.1 core + basic self-meta/trap scan; deeper 11-auditor v1.3 is tracked P2 future work). Writes citadel_report.json + schema.

## Reporting (first-class observability for autonomous + self-improvement)
- `/pickle-metrics` — Rich usage/productivity + self-loop forensics from activity logs (per-day deltas, regression patterns, self_delta, auto suggested next PRDs, worker_outcome, citadel, all meta events). --json for pipelines.
- `/pickle-standup` — Narrative daily/weekly autonomous work summary with per-day+delta table, expanded forensics, Suggested Next PRDs section, Self-Improvement Loop + Delta Visibility, Graphite/Linear CLI integration with fallback.

## Meta
- `/pickle-self-prd` or `npm run self-improve [--gen-only] [--iterations 2] [--target .]` or npx tsx engine/src/self-prd-generator.ts (note: generator lives in src/) — Self-PRD generator + meta-loop closer. Generates own 50-ticket improvement PRD, runs full pipeline on it (orchestrator+ritual+citadel+anatomy+szechuan), auto-ingests post-campaign feedback into reliability-backlog.md for the next autonomous iteration. The true dogfood entry point. --self-improvement flag on pipeline also works.
- `/help-pickle` — This list

**Higher-tier / P2-P3 skills — honest deprecation stubs (NOT PORTED to Grok engine yet)**:
- `/council-of-ricks` — Parallel external-signal reviewer (Graphite + Linear fan-out). Stub only. Real impl in Claude variant. Use `/pickle-standup --external` instead for now.
- `/meeseeks` — Relentless review-fix-until-clean loop. Stub. Pipeline + szechuan + anatomy cover the spirit.
- `/portal-gun` — Gene/codebase transfusion across repos. P3 stub. Not needed for core autonomous self-dev.
- `/plumbus` — Attractor DAG 6-frame audit. P3 stub. Esoteric, low priority.
- Also not ported: `/pickle-status`, `/eat-pickle`, `/pickle-retry`, `/cronenberg`, `/project-mayhem`, zellij variants, etc.

All real commands here are native Grok skills backed by the TypeScript engine in `~/.grok/pickle-rick-grok/engine/`.

The old Claude hook hell is gone. This is cleaner, and the core autonomous loop (PRD → refine → build → citadel+anatomy+szechuan) + full self-meta loop is fully functional for real self-modifying development.

The richer metrics + standup make long campaigns and self-improvement iterations *visible* — you can finally see the delta.

Ask me about any of the **real** ones above for details (or read their SKILL.md directly after install). Higher-tier ones will 404 or show the deprecation note — that's intentional honesty.


**Final Docs Polish note**: See new project `AGENTS.md` (at grok root after install) for the full honesty contract, P3 stub table, trap doors, and 50-ticket self-loop rules. The discover root fix ensures backlog always lands in the correct tree.
