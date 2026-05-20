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

**Honest status (defaults hardened post r-meta-deepen)**: The canonical surface is now:
`npx tsx engine/src/bin/run-pipeline.ts --prd <prd.md> --target . [--self-improvement] [--background]`
- `--fresh` is the default (new clean session every time you point at a PRD).
- Refine gate is the default (you run /pickle-refine-prd on the printed SESSION_ROOT, then execute with the bare session dir or `--resume-linked --no-refine`).
It owns everything downstream exactly as before.

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
- `--fresh` is the default for any `--prd` invocation (old linked sessions are left for forensics). Use `--resume-linked` (or pass the bare session dir) when you want a prior campaign's tickets.

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

**When refinement is required (raw PRD or first run — the normal case):**
1. Fire the bin with the PRD (plain, no --no-refine). It creates a **fresh** stamped session (the default) and prints SESSION_ROOT.
2. Run `/pickle-refine-prd` — it auto-detects the stamp and emits the real ticket.md files + seal.
3. After `<promise>REFINEMENT_COMPLETE</promise>`, execute with the bare session dir (cleanest and recommended):
   `npx tsx engine/src/bin/run-pipeline.ts <SESSION_ROOT> --self-improvement --background`
   Or use `--resume-linked --no-refine` if you insist on the prd form.

**Self-improvement / meta dogfood (the 50-ticket overnight):**
```bash
npx tsx engine/src/bin/run-pipeline.ts --prd prds/self-meta-....md --self-improvement --background
# (first run creates fresh + tells you to /pickle-refine-prd; after that use the printed SESSION_ROOT or --resume-linked)
```
(The self-prd-generator emits ready-to-run commands; plain invocation is now the norm.)

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

- `--prd <path>` (the trigger — fresh session + refine gate are the defaults)
- `--resume-linked` (opt into previous stamped session for this PRD instead of fresh)
- `--no-refine` (only after the council has run and materialized tickets + seal)
- `--self-improvement` (full meta: build + citadel + anatomy + szechuan + closer/ingest)
- `--target /path`, `--background`, `--recover-failed`, `--backend codex` (as before)

## What Success Looks Like

You (the skill) stay in the conversation only long enough to:
- Emit `npx tsx engine/src/bin/run-pipeline.ts --prd <prd> [--self-improvement] [--background]` (fresh + refine gate are automatic).
- If it printed the refine guidance + SESSION_ROOT: tell the user to run `/pickle-refine-prd`, then execute with the bare SESSION_ROOT (or the prd form + --resume-linked --no-refine).
- If background: tell them how to watch campaign-status + logs.
- Then you are done. The engine owns the rest.

No manual setup.ts. No hand-rolled mux calls in the happy path. The machine owns the PRD provenance and linkage — zero zombie sessions.

**This is the "one command, walk away, morning delta" button.**

See `/help-pickle` for the current command surface. Higher-tier stubs (`council-of-ricks`, `portal-gun`, etc.) correctly 404 or redirect. Meeseeks has been fully removed (Szechuan + Anatomy cover relentless review/deslop).
