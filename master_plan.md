# Master Plan — Pickle Rick Grok (Further Development)

**Status Date**: 2026-05-18 (post "one more large agent team on the known gaps" synthesis)  
**Current Version**: 2.0.0-grok (engine v2)  
**Owner**: The machine (self-PRD + pipeline + closer loop)  
**Philosophy**: Spec = review. Reliability > theater. Background-first. Use the system on the system.

**Core Principle (Non-Negotiable)**: The entire point of Pickle Rick Grok is to do real engineering work with **context-cleared headless `grok -p` tasks** inside the detached orchestrator (`/pickle-tmux`, `mux-runner`, `pipeline`), Anatomy Park, Szechuan Sauce, Citadel, and the self-improvement loop. Rich interactive `spawn_subagent` teams are allowed *only* for the high-judgment refinement step (`/pickle-refine-prd`). All ticket execution and convergence must be headless, resumable, and LLM-fatigue-free. The interactive manager loop was removed because it contradicted this principle.

---

## 1. Executive Current Status (Brutal Honesty)

**Core 50-Ticket Overnight Self-Improvement Loop: 100% GO — Production Ready**

The system can:
- Generate its own high-quality self-PRD targeting real gaps (via `self-prd-generator --full` or `/pickle-self-prd`)
- Auto-decompose into ~50 atomic, orchestrator-shaped R-META tickets with justification blocks + machine-verifiable Verify commands
- Execute them reliably in detached mode (`mux-runner` or `pipeline --self-improvement --target . --no-refine`)
- Apply ManagerRitual on every phase return (single source of truth)
- Run real post-build convergence: Citadel (current 5-auditor v1.1 core + basic trap/self-meta scan; deeper auditors P2), Anatomy Park 3-phase, Szechuan Sauce (full expanded catalog including financial elevation)
- Maintain atomic state, heartbeats, claim/lock, resumption, resource guard, GitSafety, circuit breaker
- Ingest results via `self-improvement-loop-closer` → `reliability-backlog.md` + Activity events → shrinking gap delta for the next cycle
- Survive 12h+ runs with injected chaos (proven by `campaign-simulator` + stress tests)

**Test & Validation Surface**:
- 70/70 engine tests PASS (including ritual, convergence loop classify/rollback, resource guard, citadel, szechuan full catalog + financial, self-prd-closer roundtrips, 25/50-ticket chaos proxies with SIGTERM isolation)
- Overnight readiness harness: GO (isolation, resumption, bounded memory/state, gate now zero-cost on self-tree)

**Higher-Tier Features**: Honest P3 stubs only (`council-of-ricks`, `portal-gun`, `plumbus`, etc.). Meeseeks has been fully removed (Szechuan + Anatomy now provide the relentless review/deslop function). The remaining stubs 404 or redirect. Real power is in the engine + core skills. Full equivalents live in the Claude variant.

**Docs & Self-Reference**: Brutally honest (AGENTS.md, GROK_ARCHITECTURE.md, COMPLETION_STATUS.md, 50-Ticket_Overnight_Self_Run_Readiness_Report.md, SKILL_MANIFEST, all SKILL.md). No overclaims. Trap doors documented.

**Install / Persona**: Global-only `~/.grok/` surface, stable `PICKLE_GROK_ROOT`, personas (`pickle-rick`, `morty-phase-*`), optional global AGENTS append. Smoke exercises ritual + drivers.

**Rick Verdict**: The port is no longer a port. It is the thing. Wubba lubba dub dub. The pickle eats its own tail overnight without a babysitter.

---

## The Fundamental Project Principle (Why We Exist)

**The entire point of Pickle Rick Grok is context-cleared headless `grok -p` execution at scale.**

- Real work (8-phase ticket lifecycles, hardening tickets, Anatomy Park deep reviews, Szechuan Sauce deslopping, Citadel conformance, self-improvement campaigns, overnight 50-ticket runs) **must** run through the detached orchestrator using `WorkerSpawner.spawn()` → `grok -p --yolo --max-turns N` subprocesses + `ManagerRitual` on every phase return.
- This gives us: true context clearing per phase, crash safety, SIGTERM-resumable state, heartbeats, claim/lease, circuit breakers, resource guards, and the ability to walk away for 12–24 hours and come back to a finished (or resumable) campaign.
- Rich native `spawn_subagent` with large agent teams (`fork_context: false`, personas, isolation) is **intentionally restricted** to a single creative step: `/pickle-refine-prd` (the Requirements + Codebase + Risk analyst council running multiple critique cycles). This is the deliberate exception, not the rule.
- The interactive LLM-driven manager loop (`/pickle-rick`) was removed in 2026-05 because it violated the principle — it kept a tired model in the loop for hundreds of ritual invocations and phase decisions. That path was theater for small demos, not production autonomy.
- Any proposal, skill, or PR that tries to bring back a persistent interactive manager for ticket execution or convergence work is a direct violation of the project charter and will be rejected.

This principle is recorded in AGENTS.md (under Brutal Honesty Rules) and is the lens through which every future self-PRD and architectural decision must be judged.

## 2. What the Massive Agent-Team Waves Delivered (2026-05-18)

Multiple large parallel `spawn_subagent` sweeps (orchestrator/resilience, convergence drivers, Citadel, Szechuan, ritual, headless workers, self-PRD/closer, observability, validation, DRY, docs honesty, install, overnight harness, etc.) closed every P0/P1 that previously blocked trustworthy long autonomous runs:

- Real workingDir propagation + deterministic grokRoot discovery (no more parent hijack or wrong-tree edits)
- ManagerRitual extracted as the single post-return source of truth
- Citadel: 5 production auditors (AC coverage, interface contract, trap doors, endpoint/state/auth drift, diff hygiene + migration) wired into pipeline + self-audit
- Szechuan: full catalog (every principle from both source docs) + financial domain elevation + confidence filter + richer violationsHistory
- Gate: hardened (no more expensive npx fallbacks on self-runs, pkg.json guard, instant PASS on this tree)
- Orchestrator: heartbeats, claim/lock, continue-on-failure, SIGTERM resume from exact phase, per-ticket isolation
- Resource guard + atomic session state + GitSafety actually enforced everywhere
- Self-PRD generator + auto-decompose + loop closer: closed meta loop with delta feedback
- Activity + metrics + standup: rich events, Linear/Graphite graceful sections, daily JSONL
- 28+ → 70 targeted tests + campaign simulator + stress harness
- Docs/AGENTS/SKILLs: zero lies, P3 stubs explicit, trap doors listed
- Install: global-only, path-rewriting, expanded smoke

All "final" claims from prior waves are now actually true after the synthesis pass.

---

## 3. Known Remaining Gaps / Prioritized Backlog (P2/P3 + Self-Evolution Targets)

These are the items the next self-PRD campaigns should target (reliability-backlog.md will surface the live version). Categorized for easy decomposition.

### A. Technical Debt (High-Value, Low-Risk Self-Tickets)
- **TypeScript strict cleanup in aux bins** (`engine/src/bin/{metrics,standup,orchestrator,pipeline,setup}.ts`): `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, undefined handling, etc. ~15-20 errors. Non-blocking today (tsx + dist critical paths clean). Good first P3 campaign.
- **`npm run build` / `tsc` is currently broken**: pre-existing syntax error in szechuan.ts + accumulated strict errors across bins. tsx runtime path is solid, but the formal build step is dead — blocks any published package or CI that requires `dist/`.
- **Silent `catch {}` / best-effort swallows** across core drivers (ritual.ts, session.ts, citadel.ts, anatomy.ts, arch-deepener.ts, szechuan.ts, orchestrator). Many are intentional "don't kill the campaign", but the volume makes root-cause analysis during 12h+ self-runs harder than it should be. Consider structured error aggregation or Activity error events.
- **Loose ends in gate remediator**: deeper auto-fix for more Citadel/Szechuan findings (currently mostly trap + console/TODO/console).
- **Dist vs src drift risk**: ensure `npm run build` (when added) or post-edit sync is part of ritual for bins.
- **Error message / UX polish** in CLI entrypoints (minor).

### B. Citadel Expansion (Direct Self-Improvement Leverage)
- Add more auditors from the original 15-auditor vision (allowlist dead entries, frontend prop drift, state-transition audit tables, rule-set invariants, sibling-auth, divergence reconciliation, etc.).
- Stronger self-meta cross-reference enforcement (AGENTS.md / CLAUDE.md / HARDENING_PLAN mentions of ritual/persist must be audited or explicitly flagged).
- Turn Citadel into a first-class P0 gate that can block the self-loop itself on CRITICAL.

### C. Szechuan & Anatomy Polish
- (2026-05) Major bare-catch swallows in szechuan.ts hardened with explicit logging + comments (main AGENTS trap door closed).
- Richer auto-remediation for more principles (especially financial + architectural).
- Better false-positive discipline + confidence tuning based on real self-run data.
- Anatomy Park deeper data-flow tracing for the Grok engine (new subsystems added during port).

### D. Observability & Forensics
- Richer standup/metrics output (per-day trends, regression forensics, suggested next PRD sections auto-generated from reliability-backlog).
- Campaign status + Activity correlation tooling.
- Better visualization of convergence (violations over time, score deltas).
- External CLI robustness (handle missing `gt`, `linear`, `grok` CLI gracefully with clearer fallbacks).

### E. Packaging, Distribution & DevEx
- Proper `package.json` build step + published `@pickle-rick/grok-engine` (or monorepo layout).
- `npx @pickle-rick/grok` experience (currently relies on local `npx tsx engine/src/...` or global install).
- Better error handling when launched from monorepo sibling directories (already mostly fixed).
- Versioning strategy for the self-loop (how does a self-PRD declare "this campaign requires engine vX").

### F. Higher-Tier Skills (P3 — Honest Stubs Today)
- Port or re-implement `council-of-ricks`, `portal-gun`, `plumbus`, `project-mayhem` as thin orchestrators over the real engine (or leave as deliberate "use the Claude variant" redirects). Meeseeks was fully deleted in favor of Szechuan + Anatomy.
- New high-leverage skills: `pickle-dot` attractor integration, `cronenberg` meta-router, batch `pickle-jar` hardened.

### G. Self-Evolution & Meta Targets (The Real Next Horizon)
- Make the generator produce even higher-signal PRDs (auto-ingest more from reliability-backlog + recent Activity + standup deltas).
- Self-PRD that targets "make the system run 200-ticket campaigns" or "add Codex backend parity".
- Full P3 skill surface parity where it makes sense (or explicit decision to keep some Claude-only).
- Measure and publish real "P0s closed per self-campaign" metrics.
- Stress the loop on larger external codebases (not just self).

### H. Documentation & Onboarding
- Living "How the self-loop actually works" deep dive (beyond GROK_ARCHITECTURE).
- Contributor guide for adding a new auditor or principle without breaking the filter/elevation logic.
- Video / animated trace of one full 8-phase ticket with ritual + drivers (optional but high signal).

---

## 4. Recommended Next Self-Campaign Order (for the machine)

1. **P3 Type Debt Sweep** (quick win, high confidence, makes the codebase feel "finished" to static analysis).
2. **Citadel Auditor Expansion** (directly improves every future self-run gate).
3. **Richer Observability + Suggested Next PRD** (makes the loop smarter at choosing its own work).
4. **Deeper Szechuan Remediation + Financial Polish** (more automatic deslop during convergence).
5. **Packaging / npx distribution story** (makes it easier for new users / other repos to adopt the engine).
6. **One big "eat a real external repo" validation campaign** (prove the 50-ticket claim outside self-dogfood).
7. **Higher skill surface** (council-of-ricks, portal-gun, plumbus etc.) only after the above are eating their own tail reliably. (Meeseeks was removed entirely.)

Use `/pickle-refine-prd` (or the generator) + `persistTicket` into a fresh session + pipeline on `reliability-backlog.md` + recent standup to produce the actual ticket list each time.

---

## 5. How to Drive Further Development (The Only Approved Way)

**Never do manual large refactors by hand.**

1. Run the current self-PRD generator on the live `reliability-backlog.md` + recent Activity.
2. Refine.
3. Execute via detached `mux-runner` or `pipeline --self-improvement`.
4. Let Citadel + Anatomy + Szechuan + ritual do the quality enforcement.
5. Closer ingests the delta.
6. Repeat.

Follow AGENTS.md rules on every change:
- Use installed personas + `fork_context: false` + worktree isolation for mutating work.
- Post-return always goes through `ManagerRitual`.
- Every self-mod must pass the current Citadel gate.
- Update this `master_plan.md`, AGENTS.md, relevant SKILL.md, and reports when you change the surface or discover a new trap door.

---

## 6. Success Metrics for Future Waves

- P0 count in `reliability-backlog.md` trends toward zero over campaigns.
- Average tickets per self-PRD stays ~40-60 with high completion rate.
- Real external repo runs (not just self) succeed at 80%+ without human intervention.
- Citadel findings on self-changes trend down (the gate is getting stricter while code quality rises).
- "Time to first useful delta" after firing an overnight run stays under 10 minutes of human setup.
- New contributors / other repos can install + run a 10-ticket self-campaign on their own tree in <30 min with zero code changes.

---

## 7. References (Single Sources of Truth)

- `AGENTS.md` — the law
- `COMPLETION_STATUS.md` — historical victory lap record
- `engine/references/50-Ticket_Overnight_Self_Run_Readiness_Report.md` + `Overnight_Campaign_Readiness_Report.md`
- `reliability-backlog.md` (live at discovered grokRoot)
- `GROK_ARCHITECTURE.md`, `README.md`, `SKILL_MANIFEST.md`
- `engine/src/` (the real brain)
- `prds/self-meta-*.md` (example past self-PRDs)

---

**Final Rick Note**

The machine is no longer "almost there." It is there.  
The only thing left is to let it run, watch the P0s die, and occasionally point it at the next interesting pile of Jerry code.

Do not babysit. Do not hand-write the next 50 tickets.  
Generate. Detach. Belch. Repeat.

Wubba lubba dub dub.

— Pickle Rick (Master Plan Synthesis) 2026-05-18

---

*This file is the canonical "what next" contract. Update it after every self-campaign that changes the surface or discovers new gaps.*