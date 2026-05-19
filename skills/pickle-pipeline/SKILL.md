---
name: pickle-pipeline
description: >
  The full autonomous pipeline: (optional refine) → main build (pickle-tmux equivalent) →
  Citadel conformance audit → Anatomy Park deep review → Szechuan Sauce deslop.
  One command. One background-capable session. Grok native.
version: 3.0.0-grok-p0-dispatch
triggers:
  - pickle-pipeline
  - full pipeline
  - build then review then deslop
  - ship it clean
references:
  - path: /Users/gregorydickson/.grok/pickle-rick-grok/references/persona.md
    conditional: true
---
# Pickle Pipeline — The Whole Damn Thing (Grok Edition) — REAL

**Honest status (P0-6/7 dispatch complete)**: The user-facing surface is now a single thin canonical:
`npx tsx engine/src/bin/run-pipeline.ts --prd <prd.md> --target . [--self-improvement] [--background] [--no-refine]`
It owns PRD→session linkage (via SessionManager.createSessionForPrd + stampPrdSource + preflight), the needsRefine gate, ticket validation, mux-runner launch, and post-phases (Citadel → Anatomy Park → Szechuan + closer/ingest for self).

Everything downstream is real and wired:
- Refine (large analyst team via `/pickle-refine-prd` only — now bootstraps from the stamped session)
- Build via `mux-runner.ts` + full `orchestrator` / `WorkerSpawner` / `ritual` / `gate` / `circuit`
- **Real Citadel** (5-auditor v1.1 + trap/self-meta; 11-auditor deeper is tracked P2)
- **Real AnatomyParkDriver** + **Real SzechuanDriver** (full principle set)
- Self-improvement meta loop (generator + closer + reliability-backlog ingestion)

## Your Role — STRICT DISPATCH ONLY

You are **not** the meta-orchestrator that executes phases.

When the user invokes `/pickle-pipeline`, says "run the full pipeline", "build then review then deslop", "ship it clean", or similar, your **only** job is to get the real detached engine running and stay out of the execution path.

**Hard Rules (these are non-negotiable):**

- **Never** perform research/plan/implement/review/verify/simplify work yourself with `spawn_subagent`.
- The **only** step in the entire system allowed to use rich native `spawn_subagent` large teams is `/pickle-refine-prd` (the Requirements + Codebase + Risk analyst council). This is the deliberate architectural split.
- All ticket execution, hardening, Citadel, Anatomy Park, Szechuan, and self-improvement campaigns **must** run through the headless detached path (`grok -p` workers under `mux-runner` / `orchestrator` + ritual + gates). This is the Core Execution Principle documented in AGENTS.md.
- `/pickle-rick` (the old interactive manager loop) is deprecated and removed for exactly this reason.

Violating these rules turns reliable 50-ticket autonomous runs into fragile chat sessions.

## Correct Sequence When Invoked (THE CANONICAL PATH)

When the user says "run a pipeline on prds/xxx.md", "full pipeline on this PRD", "run the whole thing", "build then review then deslop", or `/pickle-pipeline <prd>`, your **only job** is to dispatch to the thin machine-owned entrypoint. It owns everything:

```bash
npx tsx engine/src/bin/run-pipeline.ts --prd <path/to/the-prd.md> --target . [--self-improvement] [--background] [--no-refine] [--fresh] [--recover-failed]
```

**What the bin does (you never do this yourself):**
- Resolves PRD, finds or creates a linked session (via `createSessionForPrd` + `stampPrdSource` for provenance).
- Runs `preflightPipeline` (artifact checks, needsRefine detection, zombie detection, env).
- If needsRefine and no `--no-refine`: prints exact guidance + SESSION_ROOT + "run /pickle-refine-prd (it auto-detects the stamp from campaign-status / .prd-source.json). Re-invoke this exact command with --no-refine after <promise>REFINEMENT_COMPLETE</promise>". Emits Activity.awaitingRefineForPrd. Exits 0 cleanly.
- Validates every ticket.md exists vs state (hard P0 guard with recovery text).
- Launches mux-runner (detached if --background, with PICKLE_FORCE_HEADLESS).
- If --self-improvement (or meta tickets): after build, runs Citadel (5-auditor) → Anatomy Park (3-phase) → Szechuan (full) → loop-closer + post-campaign ingest.

**When refinement is required (raw PRD or first run):**
1. Fire the bin with the PRD (no --no-refine). It creates the stamped session for you.
2. It will tell you the SESSION_ROOT and to invoke `/pickle-refine-prd`.
3. The refine skill (see its updated Step 0) bootstraps from the *already-stamped* session in campaign-status (machine-owned linkage — no more manual setup.ts + zombie risk).
4. After the council finishes and you see `<promise>REFINEMENT_COMPLETE</promise>`, **re-invoke the identical run-pipeline command + --no-refine**. The preflight now passes, tickets are materialized, build proceeds, then post phases.

**Self-improvement / meta dogfood (the 50-ticket overnight):**
```bash
npx tsx engine/src/bin/run-pipeline.ts --prd prds/self-meta-epic-YYYY-MM-DD.md --self-improvement --no-refine --target . --background
```
(The self-prd-generator now also emits via the ticket-emitter and recommends exactly this command.)

**When you already have a session or tickets (power user / resume / debug / old sessions):**
- Bare session still works for back-compat: `npx tsx engine/src/bin/run-pipeline.ts <SESSION_ROOT> --no-refine --recover-failed`
- Legacy manual path (setup.ts → /pickle-refine-prd → mux-runner.ts <SESSION> or old pipeline.ts) is documented only for forensics and deep debugging. The machine now owns the PRD→session glue via preflight + stamp so you never create orphans again.

This is the one surface. No more five-step dance.

## Monitoring & Observability (tell the user)

The bin always prints `SESSION_ROOT=...` and `PRD_LINKED=...` (plus preflight summary).

```bash
# Live view (works for background and fg)
cat <SESSION_ROOT>/campaign-status.json
tail -f <SESSION_ROOT>/logs/*.log

# After it finishes (or during)
/pickle-metrics --days 7
/pickle-standup --days 7
cat reliability-backlog.md          # after a self-improvement run
```

## Flags You Should Surface

- `--prd <path>` (the trigger — this is the new primary)
- `--no-refine` (required after REFINEMENT_COMPLETE or for self-PRDs that auto-emit tickets)
- `--self-improvement` (full meta dogfood: generator → tickets via emitter → build → citadel+ap+sz+closer+ingest)
- `--target /path` (workingDir for new sessions and post-phase drivers)
- `--background` / `--bg` (fire mux-runner detached; pair with tmux for real fire-and-forget)
- `--fresh` (new session even if prior link exists)
- `--recover-failed` (reset failed → pending before start)
- `--backend codex` (passed through to workers)

## What Success Looks Like

You (the skill) stay in the conversation only long enough to:
- Emit the single `npx tsx engine/src/bin/run-pipeline.ts --prd ...` command (with the flags the user asked for).
- If it printed the refine guidance: tell the user to run `/pickle-refine-prd` (the stamped session is already there), then re-paste the exact same run-pipeline command + `--no-refine`.
- If background: tell them the pid / how to watch campaign-status + tmux attach.
- Then you are done. The engine owns the rest (preflight, build, gates, post phases, self-loop).

No manual setup.ts. No hand-rolled mux calls in the happy path. The machine owns the PRD provenance and linkage — zero zombie sessions.

**This is the "one command, walk away, morning delta" button.**

See `/help-pickle` for the current command surface. Higher-tier stubs (`council-of-ricks`, `portal-gun`, etc.) correctly 404 or redirect. Meeseeks has been fully removed (Szechuan + Anatomy cover relentless review/deslop).
