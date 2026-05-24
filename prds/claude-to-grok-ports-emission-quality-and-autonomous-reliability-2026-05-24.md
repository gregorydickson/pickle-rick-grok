# Claude → Grok Ports: Emission Quality & Autonomous Lifecycle Reliability

**Date**: 2026-05-24  
**Origin**: Full agent team analysis of `../pickle-rick-claude/` (4 specialized subagents covering refine emission, theater prevention, runner resilience, and closer/self-improvement).  
**Context**: Post-mortem of the GitNexus fresh pipeline run (2026-05-23-a763015c) that stalled with 0/13 done after 12+ hours due to emission theater in Verifies escaping the rich refine council.

## The Core Problem We Hit (Grok Side)
- Rich refine council (`/pickle-refine-prd`) emitted tickets whose AC Verifies contained theatrical / fragile / non-deterministic patterns (`|| echo` fallbacks, `wc -l | grep -q '^[1-9]$'`, color-sensitive `node -e | grep`, etc.).
- The runtime researcher gate correctly flagged them as `EMISSION_THEATER` / blocked.
- Early P0 tickets blocked → the H- hardening tickets (including theater ones) were never reached.
- The production `mux-runner` pass could only partially advance before stalling.
- No strong pre-emit quality gates or proactive hardening in the emission step.
- Closer/self-loop did not strongly auto-generate theater-hardening work from the findings.

Result: "healthy" refusal to ship garbage, but not reliable autonomous completion of lifecycles.

## How the Claude Sibling Solves It (Key Architectural Differences)

The Claude version (`pickle-rick-claude`) largely **prevents** this class of problem through shift-left at emission time + defense-in-depth.

### 1. Rich Refinement is a Heavily Instrumented Planning Phase
- `spawn-refinement-team.ts` + `pickle-refine-prd.md` skill runs a 3-analyst council (requirements/codebase/risk-scope) in multiple cycles with cross-referencing.
- **Strong prompt engineering injected into every analyst** (these are the highest-leverage single changes):
  - `AC_SHAPE_PROMPT_SECTION`: Detects endpoint-enumeration smells (no universal quantifier + 3+ repeated-predicate bullets). Forces collapse to parametrized ticket (e.g. `describe.each`) **or** explicit `// JUSTIFICATION:` + acceptance test in the smell JSON.
  - `PATH_VERIFICATION_PROMPT_SECTION` (R-RTRC-1/7): Every backticked path/symbol in Files/Locations/ACs/Verifies **must** be verified with `git ls-files` / `git grep` at HEAD before inclusion. Stdlib/external never backticked. Forward-created artifacts **must** carry exact annotation **outside** the backticks with exactly one ASCII space: `(forward-created)`, `(created by ticket <8-12 char hash or R-...>)`, or `(introduced by ticket ...)`.
  - `ACTIVITY_EVENT_SCHEMA_SECTION`: Forces use of **exact** canonical event names from `types/activity-events.schema.json`. "Do NOT invent."
  - Ticket complexity classification.
- Analysts emit machine-readable `## ac_shape_smells` JSON + structured tickets in the manifest.
- Synthesis produces `refinement_manifest.json` with `tickets[]`, `ac_shape_smells[]`, `ticket_quality_warnings[]`.

### 2. Hard Static Quality Gates at Emission Time (Inside the Refine Flow)
Multiple enforcement steps run inside `spawn-refinement-team` main **before** the refine exits successfully and hands off to the autonomous runner:
- `runAcShapeEnforcement` + `evaluateAcShapeEnforcement`: Rejects smelly ACs without proper collapse or justification (exits 2).
- Symbol audit (`evaluateSymbolAudit` + `runSymbolAuditEnforcement`): Catches phantom activity events, exit codes, new files, helpers. Supports forward-ref annotations (R-SAOV-7). Writes `symbol_audit.md`.
- `check-readiness.js --machinability-only --contract-only` (the primary Verify theater detector):
  - `isMachineCheckable` using `MACHINE_HINT_RE` (exit codes, numbers, regex, JSON, `describe.each`, `node --test`, `tsc`, tables, `emits?`, `writes?`, etc.) vs `PURE_PROSE_RE` (vague "must feel fast/robust").
  - Strict path/symbol resolution + forward-ref annotation parsing (exact regex, malformed → `annotation_format` findings).
  - `findMachinabilityFindings`, contract refs, prd-map, etc.
  - Writes `readiness_*.md` or escalation report on blocking findings. Limited recycle (up to 3) + escalation.
- Other: stale anchor warnings, analyst path verification scanner (unverified paths → `ticket_quality_warnings`), `runAcPhaseGate` (post-refinement executable ACs), bundle preflight (manifest ticket count, composes, R-codes).
- Failures cause refine to exit non-zero with detailed reports. **No bad tickets reach the autonomous engine.**

### 3. Proactive Hardening Tickets Baked Into Emission
- In `pickle-refine-prd.md` Step 7e: **Every non-trivial refine always emits exactly 4 hardening tickets** (unless trivial 1-ticket case):
  1. Code quality review of the feature area (P0-P1 violations, review-fix loop on `MODIFIED_FILES` union).
  2. Data flow integrity audit (3-phase trace + fix on `AFFECTED_SUBSYSTEMS`; trap doors on non-convergence).
  3. Test quality review (AC mapping, assertion strength, isolation, transforms).
  4. Cross-reference consistency audit (doc↔code, patterns, error codes, etc.).
- These are generated with concrete derived Verify commands from the tech stack analysis in earlier steps.
- This is the **proactive** "when we emit tickets, we immediately schedule the theater / quality debt fixers."

### 4. Runner Design Treats Research Blocks as Normal Terminal State
- Researcher "block" (DEFERRED note + artifact) is a **normal terminal path** for that ticket.
- `isPendingMuxTicket` / `findNextPendingTicketId` use fresh frontmatter rescan every time. Status `skipped` (or equivalent) makes the ticket invisible to the pending queue.
- Auto-skip logic on research boundaries when there is no evidence (`applyAutoTicketCompletionValidation` → `markTicketSkipped` on verdicts like no-commit-since-current-set).
- `evaluateEpicCompletion` and pipeline progress explicitly filter out `skipped` tickets — they do **not** block `EPIC_COMPLETED` or phase completion.
- Fatal phase failure in pickle only on *zero commits since start* (research-only blocks are tolerated if other tickets produced work).
- Healing is explicit/manual: edit frontmatter `status: Todo`, optionally clear `current_ticket`, `setup --resume`. Strong contracts against parallel state mutation (`CLAUDE.md`).
- Result: one bad early research ticket does not freeze the entire campaign.

### 5. Self-Correction Loop on Emission Debt (No Automatic "Self-PRD Generator Inside Closer")
- **No exact equivalent** to a fully automatic R-META / self-PRD generator that detects theater clusters in the closer and spits out a new PRD.
- Instead, a robust observable + shippable loop:
  - Proactive 4 hardening tickets at every refine (above).
  - Post-build phases (anatomy-park, szechuan-sauce, citadel) + conformance + ticket audits surface findings (R- codes, many of which are exactly refine emission / verify quality / closer gate bugs).
  - These are curated into `MASTER_PLAN.md` (Open Findings table with R- codes, trap door counts, etc.).
  - Root-cause PRDs are written against the findings (many are meta and directly harden the refine skill, templates, spawn-refinement-team.ts, check-readiness, forward-ref hygiene, etc.).
  - Every such bundle PRD includes an **explicit closer ticket** (e.g. `R-XXX-CLOSER` or `B-XXX-CLOSER`).
  - The closer ticket does the "ingest": MASTER_PLAN updates (close findings, renumber Active Queue, add trap-door counts), `install.sh --closer-context`, version bump, parity checks, commit with clear "Closed: #NN via R-XXX".
- The loop is human-curated + phase-detected but very effective at feeding emission debt back into shipped improvements to the refine process itself. Dogfooding is aggressive (the refine skill updates its own templates/gates and must pass the new gates).

### 6. Other Supporting Discipline
- Very prescriptive ticket template (`linear_ticket_*.md` inside hash/ subdirs) mandating concrete `— Verify: `cmd` — Type: ...`, Test Expectations tables, Interface Contracts, Conformance Check, Exit State. Explicit "no placeholders survive".
- Strong `CLAUDE.md` / `AGENTS.md` invariants and trap-door lists (enforced by tests + audit scripts).
- `check-readiness` + symbol audit + forward-ref hygiene are first-class and block at the right time.

## Prioritized Porting Plan for Grok (pickle-rick-grok)

**P0 (directly prevents the stall we saw)**
- Add the Claude-style prompt sections (AC-shape, path/symbol verification with exact forward-ref annotation format + discipline, activity event schema) into the 3 analyst personas and the refine skill.
- Add post-synthesis enforcement in the refine manager flow (AC-shape + symbol audit + a lightweight readiness-style gate) before the session is sealed for the headless run.
- Make emission always produce a small set of proactive hardening tickets (at minimum one focused on verify-theater / emission honesty).

**P1 (runner + closer resilience)**
- Treat pure research-phase Verify blocks (no evidence) as normal terminal state for that ticket + strengthen auto-skip on lack of evidence at boundaries so one bad early ticket doesn't freeze the campaign.
- Make the closer + self-improvement machinery treat clusters of emission-theater findings as high-priority signals that generate or prioritize refine-hardening work (leverage the existing auto H-VERIFY sibling mechanism + closer findings).

**P2 (template + docs + dogfood)**
- Make the emission ticket template more prescriptive (concrete Verify form + Test Expectations table + no unresolved placeholders + forward-ref hygiene).
- Update `AGENTS.md`, refine `SKILL.md`, analyst personas, and add relevant tests/invariants.
- Dogfood on a meta or small PRD.

**Implementation Order Recommendation**
1. Prompt sections + AC-shape + path/symbol hygiene in the refine skill/analysts (biggest preventer).
2. Post-synthesis readiness-style gate (machinability + contract + path/forward-ref) wired before headless handoff.
3. Always-emit proactive hardening tickets in the emission step (leverage existing `emitRefineCouncilTickets`).
4. Runner skip/resilience tweaks for research Verify blocks.
5. Closer/self-loop strengthening for emission debt findings.
6. Template updates + docs + tests.
7. Full dogfood + Citadel.

This combination (stronger pre-emit gates + proactive hardening + runner that doesn't stall on research blocks + tighter closer feedback) should give us reliable autonomous completion while preserving the "never stop + auto-heal" ethos.

**Status**: Agent team analysis complete. Implementation tickets created below. Execute in order.
