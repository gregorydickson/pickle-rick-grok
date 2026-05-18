# Pickle Rick Grok — Skill Manifest (Proposed Surface)

This is the complete command surface from `pickle-rick-claude/.claude/commands/` mapped to Grok skills, with priority and notes.

**Legend**
- **P0** — Core value, must exist for "it feels like Pickle Rick"
- **P1** — High usage, needed for full workflow
- **P2** — Power-user / specialist
- **P3** — Nice-to-have, can live in the claude variant longer

---

## Tier 0 — The Absolute Minimum (get these working first)

| Claude Command       | Grok Skill              | Priority | Notes |
|----------------------|-------------------------|----------|-------|
| `/pickle-prd`        | `pickle-prd`            | P0       | Already sketched. Interactive drafter. |
| `/pickle-refine-prd` | `pickle-refine-prd`     | P0       | 3-analyst parallel refinement + ticket decomposition + hardening tickets. |
| `/pickle`            | `pickle-rick` (interactive) | P0   | Live manager that spawns subagents directly. |
| `/pickle-tmux`       | `pickle-tmux` (or just `pickle-rick --detached`) | P0 | Detached runner using the shared mux-runner + background task. |
| `/pickle-status`     | `pickle-status`         | P0       | Read session state, show current ticket/phase. |
| `/pickle-metrics`    | `pickle-metrics`        | P0       | Reuses the existing metrics reporter. |
| `/help-pickle`       | `help-pickle`           | P0       | Self-documenting command surface. |

---

## Tier 1 — Full Build + Polish Loop

| Claude Command         | Grok Skill             | Priority | Notes |
|------------------------|------------------------|----------|-------|
| `/pickle-pipeline`     | `pickle-pipeline`      | P1       | Chains: (optional refine) → build → citadel → anatomy-park → szechuan-sauce. |
| `/citadel`             | `citadel`              | P1       | The deep conformance auditor. Reuses the entire `services/citadel/` suite. |
| `/szechuan-sauce`      | `szechuan-sauce`       | P1       | Principle-driven deslop with convergence gate. |
| `/anatomy-park`        | `anatomy-park`         | P1       | Data-flow + trap-door cataloguing. |
| `/pickle-microverse`   | `pickle-microverse`    | P1       | Metric convergence loop (numeric or LLM judge). |
| `/cronenberg`          | `cronenberg`           | P1       | The meta-router that picks the right metaphor. Deterministic, no LLM judgment inside the matrix. |
| `/pickle-retry`        | `pickle-retry`         | P1       | Restart a single failed ticket without losing the rest of the session. |

---

## Tier 2 — Review & Batch

| Claude Command          | Grok Skill               | Priority | Notes |
|-------------------------|--------------------------|----------|-------|
| `/meeseeks`             | `meeseeks`               | P2       | Relentless review-and-fix loop until clean. |
| `/council-of-ricks`     | `council-of-ricks`       | P2       | Graphite stack reviewer with parallel subagent fan-out + auto-publish. |
| `/add-to-pickle-jar`    | `add-to-pickle-jar`      | P2       | Queue for overnight batch. |
| `/pickle-jar-open`      | `pickle-jar-open`        | P2       | Execute the queued night-shift work. |
| `/pickle-standup`       | `pickle-standup`         | P2       | Formatted activity summary. |
| `/project-mayhem`       | `project-mayhem`         | P2       | Chaos engineering (mutation, dep downgrade). |

---

## Tier 3 — Advanced / Specialist

| Claude Command            | Grok Skill                 | Priority | Notes |
|---------------------------|----------------------------|----------|-------|
| `/portal-gun`             | `portal-gun`               | P3       | Gene transfusion across codebases. High complexity, huge leverage when it works. |
| `/plumbus`                | `plumbus`                  | P3       | DAG shaping + 6-frame generative audit for attractor pipelines. |
| `/pickle-dot`             | `pickle-dot`               | P3       | Generate `.dot` for the attractor from a PRD. |
| `/pickle-dot-patterns`    | `pickle-dot-patterns`      | P3       | Reference for the pattern language. |
| `/attract`                | `attract`                  | P3       | Submit a `.dot` pipeline to the attractor server. |
| `/pickle-debate`          | `pickle-debate`            | P3       | Multi-persona debate harness. |
| `/pickle-zellij`          | `pickle-zellij`            | P3       | Zellij layout variant of tmux (power users). |
| `/meeseeks-zellij`        | `meeseeks-zellij`          | P3       | Same for Meeseeks. |
| `/disable-pickle` / `/enable-pickle` | persona toggle     | P3       | Opt out of Rick voice without uninstalling. |
| `/eat-pickle`             | `eat-pickle`               | P3       | Emergency stop / session killer. |
| `/codex-rescue`           | `codex-rescue` (internal)  | P3       | Internal delegation to Codex when the main host is stuck. |
| `/send-to-morty*`         | internal only            | —        | Never user-facing; the worker prompt contracts live as references. |

---

## Implementation Order Recommendation

1. **P0 core** (2-3 weeks) → users can already do "write PRD → refine → build with subagents"
2. **P1 polish loop + citadel** (3-4 weeks) → the "ship it clean" story
3. **P2 review & batch** (2 weeks) → council + meeseeks + jar give the night-shift superpower
4. **P3 advanced** (as needed) → portal-gun and plumbus are extremely high-ROI but narrow-audience

**Total for "this is better than the Claude version for Grok users"**: ~3 months of focused work if the shared engine is treated as a black box with a stable adapter interface.

---

*This manifest is derived purely from reading the command files in the claude source (never modified).*
