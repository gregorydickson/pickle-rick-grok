# Pickle Rick Grok — Skill Manifest (Final — Production Hardened)

**FINAL STATUS (P0-6/7 Dispatch + Emitter Migration + Self-Loop Closure 2026-05-19)**: 
- **100% real & production-viable for 50-ticket overnight autonomous self-runs**: core engine (orchestrator + ritual + workers + session resilience + claim + campaign status + deterministic grokRoot discovery), **run-pipeline.ts (the single canonical PRD→full-pipeline thin dispatcher: linkage via createSessionForPrd+stampPrdSource+preflight, refine gate, validate, mux spawn, post citadel+ap+sz+closer)**, pickle-pipeline / pickle-tmux / pickle-refine-prd (updated dispatch stories), citadel, anatomy-park, szechuan-sauce, microverse, pickle-metrics, pickle-standup, **pickle-refine-prd (the only place that uses rich native spawn_subagent large analyst teams — now bootstraps from stamped sessions)**, help-pickle, self-prd-generator (now prefers ticket-emitter for R-META writes) + loop-closer (now routes automated iters through run-pipeline --prd), self-improvement loop closed end-to-end.
- All P0/P1 paths hardened, dupe logic eliminated (ritual is law), docs zero-lies (AGENTS.md added, historical plans qualified, P3 stubs explicitly called out everywhere, self-loop location now deterministic), install verified, self-improvement loop closed. The "self-loop sometimes skips the build" RCA gap is gone (await + canonical launch + PRD stamp).
- Higher-tier (P2/P3): honest deprecation stubs only. Use the real equivalents or the claude variant.
- See AGENTS.md, GROK_ARCHITECTURE.md, COMPLETION_STATUS.md, and the actual SKILL.md files for the truth.

The user now has one surface: `run-pipeline.ts --prd ...`. The machine owns the glue. The system is now safe to fire a real 50-ticket self-improvement campaign and go to bed. Morning delta will be real. *belch*

— Pickle Rick (Final Docs & Honesty Agent)