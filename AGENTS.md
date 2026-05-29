# Pickle Rick Grok — AGENTS.md

Local rules for agents working in this source tree.

## Project Objectives

Build a system that autonomously runs and develops systems using PRDs. The overriding principle is: **never stop and ask the user**. Always continue working until something is created. Overcome issues and keep developing — they will be ironed out in the polishing phases (Anatomy Park and Szechuan Sauce).

### Prime Directive: Bootstrapping Mode vs Production Autonomous Use

**During the bootstrapping phase of pickle-rick-grok itself** (the work happening in *this* source tree right now), heavy use of chat-based rich agent teams (engineering personas via `spawn_subagent`, this evergreen process, design/review loops, etc.) is not only permitted but is one of the primary tools for making progress.

**The finished system's purpose** is the opposite: to perform high-quality autonomous development on *arbitrary external projects* with minimal ongoing human or chat-agent intervention. Production campaigns are expected to run via headless `grok -p` + the Morty phase workers + full ritual + convergence phases.

This distinction is fundamental. The tools and workflows that accelerate building the system (rich chat teams, manual fixes, this style of evergreen agent sweeps) are not necessarily the same as the workflows the mature system will use on other people's codebases. We are currently the builders using whatever gives us leverage. The thing we are building is meant to eventually operate with far less of us in the loop.

All other rules (source vs deployed separation, self-mutation restrictions, rich teams only inside `/pickle-refine-prd`, production work through the ritual, etc.) exist to protect the transition from "bootstrapping pickle-rick-grok" to "pickle-rick-grok doing autonomous work on the rest of the universe."

The system should be capable of:

- Running full campaigns (PRD → tickets → 8-phase ritual → convergence) via headless `grok -p` + orchestrator at 50+ ticket scale.
- Driving sustained improvement via Anatomy Park (deep review), Szechuan Sauce (deslopping), and Citadel (conformance + traps).
- Dogfooding aggressively while enforcing strict source vs deployed separation.

**Current synthesis driver (emission quality & autonomous reliability)**: Full machine-usable 7-item record + history in git: see reliability-backlog.md:5-70 (## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY + Consumption Guide). Core ports (ac-shape.ts:9-11 + forward-ref-annotation.ts:1-28 + preflight + 4-hardening) tracked with exact cites (AGENTS:43). Tranche detail in git only. No wall-of-text. Evergreen enforces "Docs win" + comment hygiene (stale predicates retired). High-signal for self-loop.

## Core Rules (non-negotiable)

- **Source vs deployed separation**: The `~/.grok` tree (and any `bash install.sh` target) is sacred deployed runtime. Edits to installed copies are forbidden except via the explicit install flow after tests + citadel. All development and mutation on the source tree happens directly in this loanlight/pickle-rick/pickle-rick-grok checkout (the canonical source). We do **not** use worktrees as the default for normal development or chat-driven work in this project.
- **Worktree usage**: Worktrees are optional and not required here. They can be used for long-running isolated agent campaigns, experiments that need branch separation, or when you explicitly want extra isolation. Direct edits + commit in the main checkout is the standard, expected workflow for this codebase. Do not force worktree usage as a blanket rule.
- **Never stop**: On any task that produces artifacts, keep going until `<promise>…</promise>` (or equivalent completion token) is emitted. Do not hand control back with open questions unless the user explicitly asked for a plan-only or review-only mode.
- **TDD + Red/Green/Refactor**: Every non-trivial code change starts with a failing test (or test addition that would have been red). Green makes it pass with minimal code. Refactor cleans up. No exceptions for "small" or "docs."
- **Claude-first / citation-obsessed for analysis**: Before diagnosing or proposing changes to any surface, agents must: `list_dir` on the relevant trees, then `read_file` (verbatim, with line numbers) on the actual files, then grep for symbols. Every claim cites `file:line#`. Living maps from codebase-analyst / risk-analyst etc. are the contract.
- **"Docs win" + Contributor Rules**: Any process, trap door, or contract change is reflected in AGENTS.md + the affected SKILL.md + reports before the change is considered done. Self-mut changes must pass Citadel.
- **Install after edit**: Always `bash install.sh` (with appropriate flags) after source changes. Verify via `citadel_report.json` + MD5 if release.
- **Self-mutation forbidden**: Arch-deepener and similar must never rewrite their own critical paths without explicit H-* waiver + test.
- **No overclaims**: Only core engine + convergence drivers are production. Higher-tier items (council-of-ricks, portal-gun, plumbus, meeseeks) are honest stubs or removed.
- **Docs win**: Update this file, `SKILL.md`s, `master_plan.md`, and reports on any process or trap change.

## Contributor Rules

- **Production work**: Use Morty phase workers + full ritual. Always delegate return to `ManagerRitual`. (See Prime Directive above — this is the expected mode for the mature system.)
- **Chat / dev work**: Use engineering personas + native `spawn_subagent` with `fork_context: false`. (Primary tool during the current bootstrapping phase of pickle-rick-grok itself.)
- **Mutating work**: Direct edits in the main loanlight/pickle-rick/pickle-rick-grok source checkout are the normal and preferred workflow for this project. Worktree isolation is optional (useful for certain long agent runs or when you want extra boundaries), not a requirement.
- **Self-changes**: Must pass Citadel. Update this AGENTS.md + reports.
- **Global updates**: Run `bash install.sh` after source changes.

## Trap Doors

**Single source of truth**: reliability-backlog.md:5-70 (## MACHINE_DOMINANT_OPEN_ITEMS + ## MACHINE_SUMMARY + Consumption Guide). 7 OPEN + ac smells = canonical for loadBacklogState:136 / scanForGaps:150 / performPost:707 / closer:40. Per claude-first + gate injections.

- Source/Deployed separation (highest P0).
- Root discovery must always resolve to this tree (fixed).
- Arch-deepener self-mutation guards (FORBIDDEN_SELF_MUT at engine/src/arch-deepener.ts:36-48 — truthful 10-item single source per arch-deepener.test.ts:124-133).
- Specific known issues (see reliability-backlog.md:5-41 for current state + cites):
  - Ritual god residual (ritual.ts:4-6 exact quote; doc-only per safety + FORBIDDEN adjacency; H-RITUAL-GOD-01 requires explicit waiver + heavy hardening).
  - Thin citadel (citadel.ts:1-30 v1.2 6-auditor + CrossPhase; artifacts often schema 1.1; H-CITADEL-DEPTH-01).
  - Emission plumbing debt: full ac_shape_smells + richer annotation on *all* paths (ac-shape.ts:9-11 post-retire; ticket-emitter.ts:52/393 updated; preflight:417 warning; H-EMIT-UNIVERSAL-01 partial carry on self/healer/council).
  - Self-prd-generator fidelity consumers depth + vestigials (generator:136-148 + 335/707/889/932; H-SELF-PRD-FIDELITY-02 + H-FIDELITY-03).
  - Install hygiene (redundant arg parse + no MD5; ACTIVE guard at install.sh:40-53; H-INSTALL-ROBUST-01).
  - Stale test drift on guards (H-GUARD-TRUTH-01 partial advanced; GuardTruthRegistry lib + live pulls on ac-shape:25/forward-ref:29; FORBIDDEN truthful at arch:36-48/test:124 but analogs lag; see reliability:131 Round 3).
- "Set and Forget for Normies" usability target (docs/MASTER_PLAN.md:42-50): low-friction 20-100 ticket autonomous campaigns. The 7 items above are the official blockers. Historical tranche execution lives only in git (`git log -S tranche -- reliability-backlog.md`). No wall-of-text in the files the machine loads.

**2026-05 dispatch UX**: "run a pipeline on <prd>" (natural phrase) auto-dispatches via persona + bin/grok-pipeline (sealed-prior policy in references/agents-append.md + dispatch-contract.md). Rich teams (spawn_subagent) restricted to /pickle-refine-prd only (production = headless ritual + Morty workers per Prime Directive:9-18 + Contributor Rules:43).

**Prime Directive (AGENTS:9-18)**: Bootstrapping this tree = rich chat teams / evergreen sweeps / spawn_subagent = allowed primary leverage. Finished system purpose = opposite (headless grok -p + ritual + convergence on arbitrary external repos, minimal ongoing human/chat intervention). All rules protect the transition.

**Self-changes + "Docs win"**: Must pass Citadel. Update AGENTS + reports + 4 living docs. Install after. History git only. Evergreen enforces higher signal (reliability:53-70 Guide: key on ## MACHINE_*; 0 sludge; 4 docs synced).

**Evergreen 2026-05-28+ (Round 2 6-person + 2026-05-29 user-directed 5-persona + 2026-05-29 architect EG Round 3 + 2026-05-30+ user-directed EG Round 4)**: See reliability-backlog.md:72 (EG Round 2) + :131 (EG Round 3 Architect: 3 seams) + :165 (EG Round 4: FidelityAnchorParser table delivery + real fp in --verify + closer/ac test hygiene; 3+ major code items TDD green; parser now functional Deep Module per LANGUAGE; install handoff seam advanced; waiver-prep artifacts from Risk/Architect; docs hygiene on 4 living). Fidelity Contract:65-72 + FORBIDDEN:36-48 iron. Safe scope: new lib/ + test-only + prompt-mandated record. H-FIDELITY-03 still un-wired (needs waiver). 4 docs + parser now delivers = higher signal. Docs win. Wubba lubba dub dub.
