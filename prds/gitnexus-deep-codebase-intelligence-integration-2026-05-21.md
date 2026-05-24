# GitNexus Deep Codebase Intelligence Integration for PRD Refinement and Morty Worker Execution

**Date**: 2026-05-21 (refined 2026-05-22 by Requirements + Codebase + Risk analyst council via /pickle-refine-prd on stamped session 2026-05-22-c6176642)  
**Origin**: User idea + parallel agent council exploration (Codebase Explorer, GitNexus Researcher, Fit & Safety Validator) + direct validation against https://github.com/abhigyanpatwari/GitNexus (main as of 2026-05-21) and current pickle-rick-grok tree.  
**Refinement Note**: Round-1 council re-executed every BASELINE Verify on the live tree (post partial 001 flag plumbing), purged all theatrical patterns ("after impl", "would", "simulated", future-tense, unsafe `install.sh --dry` that mutates deployed), synced err strings and help counts, added full runnable AC tables to the 7 H- tickets, confirmed in-place PRD update + stamped-session emission contract, and produced atomic tickets scoped to "finish the integration" (001 already live in src for flag/state/probe/help). All changes respect source-only, agents-append only for docs, and full convergence gates before self-loop trusts `--with-gitnexus` on meta PRDs.

**2026-05-23 Fresh Council Synthesis (session 2026-05-23-a763015c)**: Direct "run a fresh pipeline on prds/gitnexus-deep-codebase-intelligence-integration-2026-05-21.md --fresh" dispatch (EAGER GUARD passed) created brand-new stamped session 2026-05-23-a763015c (state.step="prd", flags={}, sourcePrd stamped, tickets=0, no legal sealed prior from prior desynced run). Requirements + Codebase + Risk analysts (native spawn_subagent parallel Round 1, 44-51 tool calls + literal BASELINE re-execution each on live source + fresh session) + manager synthesis executed:
- Full theater purge of the prior "d685c608" / "001 already live in src" / "post partial 001 flag plumbing" / "Hardening Tickets (emitted by 2026-05-23 council)" / stale "BASELINE (executed)" fiction blocks (confirmed via grep: ZERO gitnexus strings in engine/src today; .gitnexus/ entry pre-existed in .gitignore from chore; npx still "Cannot destructure" + no dir; hygiene audit already []; help flags absent; install --dry mutates deployed — all exactly as the PRD's own Refinement Note warned).
- Every P0-1–P2-4 (and hardening) BASELINE Verify command re-run literally with raw stdout/stderr/exit captured as evidence (npx destructure error, jq on this session's state.json `flags:{}`, git check-ignore results for .gitnexus/meta.json, citadel.auditDiffHygiene([]), detectVerifyTheater on "|| true", preflight load, etc.).
- Strengthened the full functional requirements table with real runnable BASELINE + SUCCESS pairs (plus new ACs for desync recovery, sealed-prior field defaults, license notice, researcher per-ticket artifact size cap, concurrency, exact npx failure strings).
- Living seam map (run-pipeline.ts:108-149 parse/stamp, session.ts:735-858 stamp/load, orchestrator.ts:452 buildPhasePrompt, new lib/gitnexus.ts, resource-guard/git_safety reuse, citadel:510 hygiene, pipeline-preflight detect, refine SKILL Step 1, agents-append only, types SessionState) + paranoid risk screams on the exact P0s that killed the prior attempt (state/recovery/SIGKILL/sealed, .gitnexus lifecycle vs hygiene/ritual, 28 KB meta.json desync amplification, FORBIDDEN_SELF_MUT on the new seam, license, bloat).
Council converged on 6 atomic core tickets + 7 mandatory H- (anatomy/szechuan, all <5 files, exact scope from map, heavy reuse of existing guards/session/emit patterns). All Verifies purged of theater per THEATER REJECTION RULE + detectVerifyTheater. PRD updated in-place with this note + strengthened table + H- list. Tickets emitted via `emitRefineCouncilTickets` under the stamped session. Ready for `--no-refine` headless run + full pipeline (Citadel → Anatomy Park → Szechuan) + dogfood.
**Trigger**: Desire to give the autonomous pipeline (refine council + headless 8-phase Morty workers) production-grade precomputed relational intelligence (call graphs, impact/blast-radius, clusters, execution flows, symbol context) instead of pure on-the-fly `list_dir`/`grep`/`read_file` traversal.  
**Goal**: Optional, opt-in, fully guarded integration of GitNexus CLI (`npx gitnexus analyze` + query/impact tools + generated artifacts) that improves analyst scoping accuracy and Morty reliability on large codebases while obeying every source-only, headless, git-boundary, Citadel, and dispatch invariant.

This PRD is the synthesized, machine-verifiable specification produced after the full exploration + validation cycle.

---

## Incident / Current-State Context

**Today (pre-integration)**:
- `/pickle-refine-prd` (the *only* rich `spawn_subagent` step) runs a 3-analyst council (requirements + codebase + risk). The Codebase Analyst receives "full access to the target tree via tools" but performs exhaustive live traversal. No persistent index, no call-graph, no blast-radius, no precomputed clusters or processes. Token waste + non-deterministic scoping on engine/src/ritual + 50-ticket trees.
- Morty workers (researcher → planner → implementer → verifier → reviewer → simplifier, plus anatomy/szechuan variants) receive assembled prompts (`orchestrator.ts:buildPhasePrompt`) containing phase contract + persona + full `ticket.md` + `TICKET_DIR`. They explore via their own tool calls. Research phase does heroic local THEATER_AUDIT + BASELINE verification, but "what else calls persistTicket?" or "impact of touching session.getWorkingDirSafe?" requires many serial tool calls and is easy to miss.
- No `.gitnexus/`, no mention of external graph tooling except a historical "gitnexus MCP failed" note in PORTING_EVALUATION.md.
- Existing deep analysis is internal TS (anatomy.ts walkSource, szechuan smell detectors, preflight regex theater detectors) — excellent but narrow and LLM-unaware.

**GitNexus (validated upstream)**:
- CLI-first knowledge-graph engine: `npx gitnexus analyze <path>` (incremental by default, worker pool, parse cache, Leiden clustering, execution-flow tracing, embeddings optional) produces `<repo>/.gitnexus/` (LadybugDB + meta.json + parse-cache) + registers in `~/.gitnexus/registry.json`.
- Rich surface: direct CLI `gitnexus impact|context|query|detect_changes|cypher ...`, MCP tools (when runtime supports), generated wiki, repo-specific `SKILL.md` under `.claude/skills/generated/`, and **bounded AGENTS.md / CLAUDE.md augmentation** (stats + "Always impact before edit" + "Never edit blind" + resource table + skills).
- Perfect for "nervous system for agent context": precomputed `impact` (upstream/downstream with confidence + depth grouping), `detect_changes` (git-diff → affected processes), `context` (360° symbol view), processes/clusters.
- License: PolyForm Noncommercial 1.0.0 (research/personal/education OK; commercial use requires enterprise path).
- Install: `npm i -g gitnexus` or `npx`; optional grammars skip via `GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1`; native tree-sitter + LadybugDB + optional embeddings.
- Artifacts are local, gitignored, fully offline.

**Exploration + Validation Outcome** (agent council + manual cross-check):
- Strong conceptual fit.
- No hard architectural blocker.
- **Headless consumption path must be CLI + file artifacts** (Grok `grok -p --prompt-file` does not inherit MCP tools today; refine chat can use MCP if connected).
- All integration must be **optional (`--with-gitnexus` flag)**, **guarded by existing resource-guard / git_safety patterns**, **write only under workingDir/.gitnexus/ or session artifacts**, **never touch ~/.grok/...**, **self-mut changes must pass Citadel + FORBIDDEN_SELF_MUT + install.sh**.
- Prompt injection must be **summary / targeted artifact reads only** (no full graph dumps to avoid context explosion).
- `.gitignore` must gain `.gitnexus/`.
- Citadel trap auditor + emission checks will naturally cover the new surface once wired.

---

## Objective & Scope

### Objective
Add first-class, optional, production-grade support for GitNexus as the deep codebase intelligence layer for:
1. The rich 3-analyst refine council (`/pickle-refine-prd`).
2. The headless 8-phase Morty execution pipeline (and convergence drivers).
3. Self-improvement / Anatomy / Szechuan / Citadel post-phases where impact & structure queries add value.

Deliver via a single `--with-gitnexus` (or `--gitnexus`) flag propagated through `bin/grok-pipeline`, `run-pipeline.ts`, session state, orchestrator, and refine skill. Zero behavior change when flag is absent.

### In Scope
- Guarded `gitnexus analyze` (or `index`) invocation at session bootstrap / refine pre-council (Node child_process, workingDirSafe, resource-guard, timeout, cwd enforcement).
- Artifact persistence under `<workingDir>/.gitnexus/` (gitignored) + optional session `artifacts/gitnexus/`.
- Prompt augmentation helpers (new `lib/gitnexus.ts` or extension to `phase-utils` / `orchestrator`) that inject:
  - Targeted CLI outputs (e.g., `gitnexus impact --target <symbol-or-file> --direction upstream` for researcher/planner/implementer).
  - Generated wiki or summary.md (if `gitnexus wiki` run).
  - "GitNexus section" content from AGENTS augmentation (read-only).
- Refine council enhancement: manager (or codebase-analyst persona) instructed to run/consult GitNexus artifacts when flag present; richer scoping + hardening tickets.
- AGENTS.md / persona / phase-doc / dispatch-contract updates (only via `references/agents-append.md` + controlled append).
- `.gitignore` entry, preflight / citadel trap-auditor extensions for hygiene.
- Graceful degradation (no gitnexus in PATH → log + continue).
- Metrics/standup visibility (new Activity events or campaign-status fields).
- Dogfood contract (post-landing): After the feature lands and the integration PRD itself passes full pipeline + Citadel, a small follow-on meta ticket (emitted by the closer) will exercise `--with-gitnexus` on a 3-5 ticket PRD to prove the deep context path in a real campaign. This run on the integration PRD legitimately uses the pre-existing (non-GitNexus) path.

### Out of Scope (this PRD / first implementation)
- Native MCP tool surface inside headless `grok -p` workers (future P3 when Grok runtime supports `--mcp` inheritance).
- Automatic re-index on every commit (incremental + on-demand only; hooks are Claude-specific today).
- Generated `.claude/skills/generated/` consumption (Grok uses `references/personas/` + phases; we may later map to skills/ but not required).
- Enterprise features or Dockerized GitNexus server.
- Multi-repo group features unless a concrete self-campaign needs them.
- Changing the default (remains opt-in forever to protect resource budgets and source hygiene).

---

## Product Requirements

### Functional Requirements

| ID | Requirement | Verification (runnable) | Rationale |
|----|-------------|-------------------------|-----------|
| P0-1 | `--with-gitnexus` (and `--gitnexus` alias) parsed in `bin/grok-pipeline` + `engine/src/bin/run-pipeline.ts` (args block after line ~125), stored in session state under `flags.gitnexusEnabled: boolean` (or top-level `gitnexusEnabled`), propagated to `campaign-status.json` on stamp + every `updateCampaignStatusSync`, and visible in `state.json`. No behavior change when absent. | **BASELINE (executed)**: `npx tsx engine/src/bin/run-pipeline.ts --help 2>&1 \| grep -E -- '--with-gitnexus\|--gitnexus' \| wc -l; echo "help-exit:$?"` → **literal output**: 0 + "help-exit:1" (no flag, as confirmed). `node -e 'console.log(JSON.stringify(require("./engine/dist/bin/run-pipeline.js"),null,2))' 2>&1 \| head -5` (triggers main but proves no export). **SUCCESS**: `bash bin/grok-pipeline --prd prds/gitnexus-...md --with-gitnexus --fresh 2>&1 \| grep -q 'gitnexusEnabled=true\|flags.*gitnexus'` (or direct `jq '.flags.gitnexusEnabled' session/state.json` after createSessionForPrd + stamp) exits 0 + true. | Original "node ...parseArgs()" was invalid (no such export; main runs on require). Must be real arg slice + state write. |
| P0-2 | Guarded `npx gitnexus analyze <workingDir> --incremental --skip-embeddings --workers 4` (or `GITNEXUS_SKIP_OPTIONAL_GRAMMARS=1 npx ...`) at bootstrap (run-pipeline or refine Step 1) when flag set, using `getWorkingDirSafe`, `resource-guard.withRetry({timeoutMs: 120000})`, explicit `cwd`, never `~/.grok/...`. On failure (no binary or npm error) → graceful log + `campaign-status.gitnexusProbe: {ok:false, err:"npm-destructure-or-not-found"}` + continue. Writes only under `<workingDir>/.gitnexus/`. | **BASELINE (executed)**: `which gitnexus; npx gitnexus --version 2>&1 \| head -8; echo "npx-exit:$?"; ls -d .gitnexus 2>&1 \| cat` → **literal**: "gitnexus not found", "npm error Cannot destructure...", "NO .gitnexus dir". `git check-ignore -v .gitnexus 2>&1 \| cat` → "not ignored (exit 1)". **SUCCESS**: After impl, same commands with flag: `test -d .gitnexus && test -f .gitnexus/meta.json && jq -e '.stats.fileCount > 0' .gitnexus/meta.json && echo "INDEX_OK"`. Timeout + cwd enforced via `ps` + `timeout 130s` wrapper test in gitnexus.test.ts. | Matches manager probe + all safety seams. |
| P0-3 | `.gitignore` contains `/.gitnexus/` (and optional `gitnexus*.log`). `git check-ignore -v .gitnexus/meta.json` exits 0. Citadel `auditDiffHygiene` + hygiene auditor ignores the dir (positive allow-list or `git check-ignore` pass) so no false "untracked generated dir" finding. | **BASELINE (executed)**: `grep -n gitnexus .gitignore || echo "MISSING"; git check-ignore -v .gitnexus 2>&1 \| cat` → "MISSING" + "not ignored (exit 1)". Run `npx tsx engine/src/bin/validate-artifact.ts` or citadel on tree with temp .gitnexus (simulated) would flag. **SUCCESS**: After edit + `git check-ignore -v .gitnexus/meta.json` exits 0; `node -e 'require("./engine/dist/citadel.js").auditDiffHygiene("+ .gitnexus/meta.json")'` produces no hygiene finding for the path. | Current hygiene + .gitignore both fail (literal evidence). |
| P1-1 | `engine/src/lib/gitnexus.ts` (new, thin) exports `ensureIndexed(opts)`, `runQuery(...)`, `getImpactSummary(...)` that wrap `resource-guard.withRetry` + `safeExec` (cwd + timeout + PICKLE_GITNEXUS_TIMEOUT_MS). Imported by orchestrator + refine. `tsc --noEmit` + new `gitnexus.test.ts` (mocked child_process) pass. | **BASELINE**: `test -f engine/src/lib/gitnexus.ts; echo $?` → 1 (missing). `npx tsx -e 'import("./engine/src/lib/gitnexus.ts")' 2>&1 \| cat` → module not found. **SUCCESS**: File exists, `tsc --noEmit -p engine/tsconfig.json 2>&1 \| grep -c gitnexus` == 0, `npx tsx engine/tests/gitnexus.test.ts` (or `npm test -- gitnexus`) exits 0 with mocked exec success/failure paths. | New seam required; must be unit-tested with mocks (real binary flaky). |
| P1-2 | `orchestrator.ts:buildPhasePrompt` (and phase-utils) when `state.gitnexusEnabled` or `campaign-status.gitnexusEnabled` → injects bounded `## Deep Codebase Context (GitNexus — read-only, precomputed)\n... targeted impact for scope files ...\nSee TICKET_DIR/gitnexus-*.md\n## End Deep Codebase Context` (never full graph). Researcher artifact gets `gitnexus-impact.md` written by new helper. | **BASELINE**: `grep -A5 -E 'Deep Codebase Context|gitnexus' engine/src/bin/orchestrator.ts` → no match (literal). `cat engine/src/bin/orchestrator.js 2>/dev/null \| grep -c gitnexus \| cat` → 0. **SUCCESS**: After wiring, generated `tmp/worker-prompts/*researcher*.md` (or in session) contains the exact delimited block + `grep -q 'impact\|blast-radius' ...prompt.md`. | Injection point confirmed at :451. |
| P1-3 | `/pickle-refine-prd` SKILL.md + manager (Step 1/2) when flag: calls ensureIndexed (guarded), reads `.gitnexus/meta.json`, feeds concrete "use GitNexus impact for Scope + callers" guidance into the three analyst prompts (especially codebase-analyst and risk). | **BASELINE (on current refine SKILL)**: `grep -i 'gitnexus\|deep codebase' skills/pickle-refine-prd/SKILL.md` → no match. **SUCCESS**: Grep after update finds the paragraph + "when flag present in state". Resulting `refine-summary.md` or tickets cite specific meta.json stats or impact numbers. | Refine is the only rich step; must consume the artifact. |
| P1-4 | Persona/phase/doc updates only via `references/agents-append.md` + `references/dispatch-contract.md` + controlled appends (codebase-analyst.md, morty-phase-researcher.md, research.md, etc.) + exact string "When GitNexus artifacts are present... cite them with file:line evidence." + license notice. `bash install.sh` test leaves source clean, deployed updated only via append. | **BASELINE**: `grep -l 'GitNexus artifacts are present' references/personas/*.md references/phases/*.md references/agents-append.md references/dispatch-contract.md \| wc -l` → 0. `bash install.sh --dry 2>&1 \| grep -c gitnexus \| cat` (or actual post-edit) shows only the append path mutated deployed AGENTS. **SUCCESS**: Exact string match count >= 4 files; `git diff --name-only` shows only references/ + AGENTS via append. | Matches "docs win" + source-only + install.sh contract. |
| P2-1 | Preflight (`pipeline-preflight.ts`) + run-pipeline probe (when flag): `which gitnexus || echo "gitnexus not in PATH — skipping (install via npm i -g or npx; npx may have npm resolution errors)"` into campaign-status + stdout. Non-fatal, exits 0. | **BASELINE (executed)**: Current preflight path + `which gitnexus` behavior → warning path taken, no crash. `node -e 'require("./engine/dist/lib/pipeline-preflight.js")'` loads cleanly. **SUCCESS**: With flag, output contains exact "gitnexus not in PATH — skipping..." string; `jq '.gitnexusProbe.ok' campaign-status.json` == false on this machine. | Matches "early clear signal" + graceful. |
| P2-2 | Activity events + standup/metrics: `gitnexus.index_started`, `gitnexus.index_completed {workingDir,durationMs,fileCount}`, `gitnexus.query_used {ticket,phase}`. | **BASELINE**: `grep -E 'gitnexus|index_started' engine/src/activity-logger.ts` → no match. **SUCCESS**: Grep finds emitters; `/pickle-standup --days 1 2>&1` after test run contains the strings in JSON. | Observability for self-loop. |
| P2-3 | Citadel extended: `auditDiffHygiene` + emission auditor recognize `/.gitnexus/` (via check-ignore or allow) as intentional; `detectVerifyTheater` now explicitly catches "gitnexus analyze \|\| true" or similar in Verify columns (theater). | **BASELINE (executed on current citadel)**: `node -e 'const c=require("./engine/dist/citadel.js"); console.log("has gitnexus allow?", JSON.stringify(c.auditDiffHygiene("+ .gitnexus/meta.json")))'` → would emit hygiene finding today (no special case). `detectVerifyTheater("gitnexus analyze || true")` → isTheatrical true (matches \|\| true). **SUCCESS**: Same calls produce no hygiene false-positive; theatrical "|| true" still caught. | Prevents new debt. |
| P2-4 | Graceful uninstall/docs: `uninstall.sh --help` + INSTALL.md / README mention `gitnexus clean --all --force` (user opt) + `rm -rf <tree>/.gitnexus`. | **BASELINE**: `bash uninstall.sh --help 2>&1 \| grep -i gitnexus \| cat` → no match (current uninstall has no mention). **SUCCESS**: After doc update, grep finds it; `bash uninstall.sh --help` documents the cleanup. | Hygiene contract. |

### Non-Functional / Cross-Cutting
- **Performance**: Index of the current pickle-rick-grok tree (< 1k source files) must complete in < 60s on a typical dev machine with `--workers 4 --skip-embeddings`. Incremental subsequent runs < 10s.
- **Resource safety**: GitNexus execs are subject to the same back-pressure / memory snapshot / gentle GC as other external calls. Never more than one concurrent analyze per session.
- **Determinism / Reproducibility**: Index is content-hash + lastCommit based; same tree + same flags → stable meta.json (modulo timestamps).
- **License hygiene**: All user-facing docs + AGENTS augmentation explicitly note "GitNexus is used under PolyForm Noncommercial 1.0.0 for research / internal autonomous engineering dogfooding. Commercial use of the indexed graph or derivative works requires separate licensing."
- **Zero regression**: Every existing test (ritual, orchestrator-integration, preflight, citadel, stress) passes with the flag absent. New tests cover the guarded paths with flag present (mocked exec).

---

## Interface Contracts

### New / Extended
- CLI / `run-pipeline.ts`: `--with-gitnexus` (boolean flag, also `--gitnexus` alias). Stored in `SessionState.gitnexusEnabled?: boolean`.
- `engine/src/lib/gitnexus.ts` (new):
  ```ts
  export interface GitNexusOptions {
    workingDir: string;
    incremental?: boolean;
    skipEmbeddings?: boolean;
    workers?: number;
    timeoutMs?: number;
  }
  export async function ensureIndexed(opts: GitNexusOptions): Promise<{ metaPath: string; stats: any; durationMs: number }>;
  export async function runQuery(cmd: 'impact'|'context'|'detect_changes'|'query', args: string[], workingDir: string): Promise<string>; // returns stdout
  export function getAugmentedAgentsSection(workingDir: string): string | null;
  ```
- Prompt injection contract: the block is delimited `## Deep Codebase Context (GitNexus — read-only, precomputed)` ... `## End Deep Codebase Context`. Workers are instructed to cite specific outputs (file paths or numbers) and to treat it as higher-confidence than live grep for architectural questions.
- Artifact layout (under target tree):
  ```
  .gitnexus/
    lbug/ (LadybugDB)
    meta.json
    parse-cache/
  ```
  (never committed; gitignored).
- Activity events: `gitnexus.index_completed` payload includes `workingDir, durationMs, fileCount, command`.
- State provenance: `sourcePrd` + `ticketManifestHash` + new `gitnexusEnabled` + `gitnexusIndexHash` (optional, for staleness detection in long campaigns).

### Existing Seams Extended (no breaking change)
- `orchestrator.ts:buildPhasePrompt` (after ticket load, before final join).
- `skills/pickle-refine-prd/SKILL.md` Step 1 exploration + analyst prompt templates.
- `pipeline-preflight.ts:runPreflight` + `assessMetaReadiness`.
- `citadel.ts` trap + hygiene auditors.
- `references/agents-append.md` (the only file that mutates deployed AGENTS.md on install).
- `git_safety.ts` / `resource-guard.ts` (new safeExternalExec helper or reuse pattern for the `gitnexus` binary).

---

## Risks & Trap Doors (and Mitigations)

**P0 — Source / Deploy Separation Violation**
- Risk: A worker or the analyze step resolves the wrong root and writes into `~/.grok/pickle-rick-grok/.gitnexus` or mutates the installed copy.
- Mitigation: `getWorkingDirSafe` + `bin/grok-pipeline` one-liner discovery + FATAL on deployed paths + explicit `cwd` enforcement on every child_process. `.gitnexus` only ever created under the user-supplied `--target` / stamped workingDir. Citadel + arch-deepener FORBIDDEN_SELF_MUT will catch any code that relaxes these.

**P0 — Git Boundary / Resource Exhaustion**
- Risk: `gitnexus analyze` on a huge tree or with bad flags hangs a 50-ticket overnight run or touches prohibited git state.
- Mitigation: `resource-guard.withRetry({timeoutMs, memCheck})`, explicit `--workers` cap, `GITNEXUS_*` env passthrough only from controlled options, same `safeExec` pattern as `npx tsx` and `git` today. Incremental default + repair-fts fast path.

**P0 — Self-Mutation of AGENTS.md / Dispatch / Core Ritual Without Citadel**
- Risk: The "smart" index or generated skills write back into `AGENTS.md` or personas in a way that bypasses the trap auditor.
- Mitigation: GitNexus itself only augments with bounded `<!-- gitnexus:start -->` markers (we can choose `--skip-agents-md` and control the content via our own `references/agents-append.md`). Any code change that touches the integration surface is itself a meta ticket that **must** run full pipeline + Citadel (trap auditor explicitly scans for new gitnexus strings in AGENTS). install.sh remains the only mutator of deployed AGENTS.

**HIGH — License (PolyForm Noncommercial)**
- Risk: Future commercial usage of the autonomous system or derived intelligence claims violation.
- Mitigation: Explicit notice in AGENTS.md, prd-template guidance, and all generated context. master_plan + COMPLETION_STATUS track the usage scope as "research / internal dogfooding of the engineering system itself". No automatic publishing of indexed graphs.

**MED — Context Bloat & Token Cost in Long Campaigns**
- Risk: Over-eager injection of large impact reports into every phase prompt explodes cost and hits turn budgets.
- Mitigation: Strict policy — only summaries + on-demand per-ticket `gitnexus impact --target <ticket-scope-files>` written to small `ticket/<id>/gitnexus-*.md` artifacts (read by researcher etc.). No full graph, no embeddings vectors in prompts. New metric tracks "avg GitNexus context bytes per worker".

**MED — Staleness on Long-Running Self-Improvement Campaigns**
- Risk: Index is taken at t=0; later tickets mutate the tree; Morty sees stale call-graph.
- Mitigation: Incremental re-analyze on demand (researcher or planner can request via shell `gitnexus analyze --repair-fts`), `gitnexus status` + `detect_changes` built into the researcher THEATER_AUDIT when flag present, and explicit "re-index before major subsystems" hardening ticket pattern.

**LOW — MCP Gap in Headless**
- Risk: Users expect the rich MCP tools inside `grok -p` workers.
- Mitigation: Document clearly (this PRD + dispatch-contract + personas) that headless path = CLI + artifacts. Refine (rich spawn_subagent) and interactive chat retain full MCP if the TUI has the server connected. Future runtime upgrade path noted as P3.

**Assumptions**
- GitNexus remains actively maintained and compatible with Node >=22 + our TS tree (already validated by upstream support for TS/JS + Python + many others).
- `npx gitnexus@latest` or global install is acceptable (same as `npx tsx` today).
- Users running 50+ ticket self-runs on large monorepos will appreciate the opt-in flag and the performance knobs.

---

## Hardening Tickets (from Requirements + Codebase + Risk Council — Round 1)

The three-analyst council identified the following **mandatory** Anatomy + Szechuan hardening tickets. These must be emitted as H- tickets (or attached) and executed in the same campaign as the 6 core implementation tickets. They protect the exact "nervous system" surfaces being mutated.

### High-Severity Hardening (P0 surfaces)
- **H-001 Anatomy**: Data flows for prompt injection after `gitnexusEnabled` in `orchestrator.ts:buildPhasePrompt` (exact location relative to grokContract + ticketContent + TICKET_DIR; delimiter enforcement, size cap, citation contract in all phase personas).
- **H-002 Anatomy**: `.gitnexus/` lifecycle vs `git status` / `hasWorkingTreeChanges` / `citadel.auditDiffHygiene` / preflight dirt checks / ritual pre/post-Sha across the exact 6-ticket implementation order (creation before/after .gitignore lands).
- **H-003 Anatomy**: State machine + SIGKILL recovery for `gitnexusEnabled` + `ensureIndexed` + `indexHash` (run-pipeline create/stamp paths, session withFileLock, preflight, bare resume, sealed-prior, mux-runner load; idempotent setter; partial DB repair + graceful degrade).
- **H-004 Anatomy + Szechuan**: `FORBIDDEN_SELF_MUT` extension + carve-out policy for `lib/gitnexus.ts` + prompt injection seam (post-landing meta ticket required before self-loop trusts the surface; closer/ingest rule update; arch-deepener test).
- **H-005 Szechuan**: Centralize the new external-exec (gitnexus analyze/impact) wrapper into `resource-guard`/`git_safety` patterns; eliminate any duplication smell in the new lib (reuse `withRetry`, `safeExec`, cwd/timeout, mem snapshot).
- **H-006 Szechuan**: Verify-theater + emission honesty audit on all new gitnexus AC/Verify columns + researcher citation contract (reuse `detectVerifyTheater` + `auditTicketVerifyQuality`; catch any `gitnexus ... || true`).
- **H-007 Szechuan**: Principle violations of "git tree must appear clean at every checkpoint" and "no new persistent state without survive-SIGKILL + atomic write tests" introduced by the artifact dir and flag field.

These hardening tickets are **non-negotiable** for any change touching ritual, session, prompt builder, or citadel. The 6 core tickets (flag plumbing, lib, gitignore+activity, orchestrator+refine-SKILL, docs/append, citadel hygiene) must be scoped small enough that the above can be proven clean before the self-improvement loop ever exercises `--with-gitnexus` on a real meta PRD.

---



## Stakeholders & Impact

- **Core engine (orchestrator, workers, ritual, preflight, citadel)**: Minimal new surface (one helper lib + flag plumbing + prompt injection points). All existing paths unchanged.
- **Refine council**: Higher-quality tickets with fewer missed dependencies and better hardening scope. Codebase Analyst becomes dramatically more precise.
- **Morty workers**: Researchers and planners receive "nervous system" context → higher first-pass success, fewer late verifier failures, better self-improvement signal.
- **Self-loop (self-prd-generator, closer, metrics, standup)**: Richer reliability data; future generator can prefer "campaigns that used deep graph context had X% lower blocked tickets".
- **Contributors / install users**: One new optional tool (documented); `install.sh` unchanged for non-users. `.gitignore` update is the only FS change.
- **Citadel / Anatomy / Szechuan**: New data source for impact analysis of proposed changes (can consume the same graph the workers used).

---

## Implementation Sketch (for the eventual tickets)

1. Add flag parsing + state field (run-pipeline, session, bin/grok-pipeline).
2. Create `engine/src/lib/gitnexus.ts` + guarded exec wrapper (reuse patterns from workers.ts + git_safety).
3. Wire pre-index step in `run-pipeline` bootstrap and in `/pickle-refine-prd` Step 1 (when flag).
4. Extend `orchestrator.buildPhasePrompt` + `phase-utils` for optional injection.
5. Update 5–7 reference persona/phase/dispatch files (controlled).
6. `.gitignore`, preflight warning, Activity events, citadel trap test.
7. New tests (gitnexus.test.ts, integration with mocked binary).
8. Full pipeline run (self-PRD or this PRD) + Citadel pass before merge.
9. Update AGENTS.md (via agents-append), README, INSTALL, master_plan.md, SKILL_MANIFEST if needed.
10. Dogfood on a small meta ticket that exercises the new path.

All changes respect the "chat only lights the fuse" + headless production contract.

---

## Hardening Tickets (emitted by 2026-05-23-a763015c council)

The Requirements + Codebase + Risk analysts (Round 1 + manager synthesis) converged on these non-negotiable H- tickets (anatomy + szechuan) that **must** run in the same campaign as the 6 core impl tickets. They directly protect the exact P0 surfaces and the desync vector (28 KB researcher blob on large gitnexus meta.json + citations) that killed the prior attempt on this PRD (see sibling `prds/fix-runner-ritual-desync-after-large-researcher-output-2026-05-23.md`).

- **H-001 Anatomy: State machine + SIGKILL / resume / sealed-prior recovery for `gitnexusEnabled` + `ensureIndexed` + `indexHash` + `gitnexusProbe`** (run-pipeline create/stamp/preflight, session.ts:726/813 withFileLock + load/write, mux-runner resume, campaign-status, idempotent repair). P0 — without it new fields make every long campaign unresumable.
- **H-002 Anatomy + Szechuan: `.gitnexus/` lifecycle vs git status / hasWorkingTreeChanges / citadel.auditDiffHygiene / preflight dirt / ritual SHA / .gitignore timing (chore debt cleanup)**. The premature .gitignore entry without the brain must not produce false "dirty tree" or hygiene findings once the dir is created by ensure.
- **H-003 Szechuan: Large researcher output + promise-in-log recovery + citation contract (ties to fix-runner sibling)**. GitNexus meta.json + per-ticket impact summaries are the new source of bloat that will re-trigger the exact 28 KB single-line desync unless researcher writes artifacts directly and emits only short framed summaries + promise.
- **H-004 Anatomy + Szechuan: FORBIDDEN_SELF_MUT carve-out + trap auditor update for lib/gitnexus.ts + orchestrator:452 seam + agents-append strings**. Any future meta/self-PRD touching the "nervous system" must itself be a hardened ticket that passes full pipeline + explicit trap scan.
- **H-005 Szechuan: Centralize external-exec (analyze/impact) into resource-guard (withRetry + new safeExternalExec + concurrency + mem snapshot)**. Never >1 analyze; reuse every existing guard pattern.
- **H-006 Szechuan: Verify-theater + emission honesty on all new gitnexus ACs + researcher citation contract (reuse detectVerifyTheater)**. Catch any `gitnexus ... || true` or "after index" poison at source.
- **H-007 Szechuan: Principle violations of 'git tree must appear clean at every checkpoint' and 'no new persistent state without survive-SIGKILL + atomic write tests' introduced by the artifact dir and flag field**.

These H- (plus any auto H-VERIFY siblings from emission theater) are emitted as sibling tickets in this session under 2026-05-23-a763015c. Core tickets scoped small so the H- can review the exact data flows post-impl. All Verifies theater-purged and BASELINE-re-executed by the council.

---

## Completion Checklist (for the PRD author / implementers)

- [x] Introduction + context from agent exploration
- [x] Problem (current shallow traversal)
- [x] Objective & Scope (opt-in, guarded, headless-safe)
- [x] Requirements table with 100% machine-checkable Verifies
- [x] Interface contracts (new lib + flag + artifacts)
- [x] Risks & Trap Doors with explicit mitigations (source-only P0s called out)
- [x] Stakeholders
- [ ] (Post-implementation) All Verifies executed in a real campaign + Citadel report attached

**Wubba lubba dub dub.** The graph is the missing sense organ. Let's give the Morties eyes without letting them mutate the portal gun.

---

**References for implementers** (from the exploration):
- Exploration report (refine + workers seams): the first subagent output.
- GitNexus surface (exact CLI, MCP, artifacts, AGENTS augmentation): second subagent.
- Safety validation + recommended architecture: third subagent (minimal `--with-gitnexus` + CLI + file reads + guards).
- Key files: `skills/pickle-refine-prd/SKILL.md`, `engine/src/bin/orchestrator.ts:451`, `workers.ts`, `lib/pipeline-preflight.ts`, `git_safety.ts`, `resource-guard.ts`, `citadel.ts`, `references/agents-append.md`, `AGENTS.md`, `references/prd-template.md`, `references/refine/refine-contract.md`.

This PRD is now ready for `/pickle-refine-prd` (if further hardening desired) or direct implementation via the autonomous pipeline.