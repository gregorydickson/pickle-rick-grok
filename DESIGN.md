# Pickle Rick Grok — Clean Reimplementation Design

**Version**: 2.0 (Grok-native, no legacy hook debt)  
**Date**: 2026-05  
**Status**: Core loop production-complete (P3 polish done)

**HONEST NOTE (P3 update 2026-05-18)**: Large parts of this document (Python class diagrams, workers.py references, older architecture drawings) were written during the port planning phase. The actual implementation is in TypeScript under `engine/src/`.

**Current real state (after P3)**:
- ConvergenceLoop, orchestrator 8-phase, gate, circuit, ritual (single source, no dupes), activity-logger (rich events including new prd/refine/hardening/worker), workers (evented) — all real.
- Citadel: real 5-auditor v1.1 core + basic trap/self-meta scan (deeper 11-auditor v1.3 with full self-meta/ritual coverage is honest P2 future work; current version is production-viable and not a stub).
- Anatomy + Szechuan: full real drivers wired into pipeline.
- Full end-to-end `/pickle-pipeline` real and verified in install smoke.
- Higher-tier: explicit stubs with deprecation notes.
- All docs (README, GROK_ARCHITECTURE, help-pickle, skill files, manifest) updated for honesty.
- The authoritative sources for "what works for real autonomous self-dev" are: `skills/help-pickle/SKILL.md`, `GROK_ARCHITECTURE.md`, `SKILL_MANIFEST.md` (with port status), and the engine/ + skills/ directories themselves.

This file is retained only for historical design rationale.

## 1. Goals

- Full reimplementation of the autonomous engineering system from pickle-rick-claude.
- pickle-rick-skills is considered out of date; we start fresh with lessons learned.
- Native to Grok Build: leverage `spawn_subagent`, `fork_context`, `isolation:worktree`, background tasks, headless `grok -p`, skills.
- Dramatically simpler operational model (no Stop hooks, no settings.json mutation, no 6-pane tmux required).


---
**Final Docs & Honesty (2026-05-18)**: AGENTS.md created at grok root (closing proposed structure gap); all historical docs cross-referenced to current truth (COMPLETION, SKILL_MANIFEST, AGENTS, 50-tix report). P3 stubs + self-loop viability language kept brutally accurate across the tree. No remaining doc drift.
