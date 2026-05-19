---
name: citadel
description: Run the Citadel conformance audit against the PRD and final diff. The "spec is the review" gate before deeper cleanup. Now v1.3 — 11 auditors, self-meta cross-ref teeth for 50-ticket autonomous runs.
version: 2.2.0-grok-deep-v13
triggers:
  - citadel
  - conformance audit
  - prd audit
  - citadel v1.3
---
# Citadel — PRD Conformance Auditor (Grok — Deep Real v1.3)

**Status: 11-auditor hardened gate (P4+).** Invokes `engine/src/citadel.ts` (expanded from original 15-auditor system). Post-build trust for self-modifying 50-ticket campaigns.

The original had 15 auditors; Grok now has the full hardened set with self-reflection:

1. **Strong AC Coverage** — multi-signal (AC-ID + anchors + symbols + GWT + hunk) → `acCoverage[]` (FULL/IMPL_ONLY/...) + per-AC evidence for next PRD.
2. **AC Shape Heuristics (NEW)** — universal quantifiers, GWT completeness, decision/intent markers. Feeds richer recommendations.
3. **Real Interface Contract + Consumer Drift** — added/removed exports + import-site consumers across repo + test/contract checks.
4. **Trap Door Coverage + Self-Meta Cross-Refs (EXPANDED)** — scans AGENTS/CLAUDE/HARDENING/* for ENFORCE/trap, flags orphans, **requires explicit cross-refs when citadel/ritual/self-prd/pipeline/orchestrator mutate**.
5. **Endpoint/State/Auth + Conformance (ADDITIONAL)** — routes/auth/states + sensitive mutators (writeJson/claim/ritual) demand siblings + bin/activity contract checks.
6. **State Transition + Rule Invariants (NEW)** — deeper machine coverage + PRD "always/invariant" vs guard evidence in ritual/citadel.
7. **Divergence Reconciliation (NEW)** — "contradicts PRD" / "diverges" without "intentional/by design" marker. Self-PRD loop poison.
8. **Diff Hygiene + Migration (ENHANCED)** — bloat, spam, no-test, lock/schema, **package.json without changelog**, **self-citadel mutation without auditor proof**, tsconfig, secret slop.
9. **Ritual/Persist + Self-Meta Modules (DEEP)** — ManagerRitual, atomic/claim, meta wiring + cross-ref enforcement.
10-11. Integrated self-audit + trap-self-meta for the gate guarding itself.

**Outputs (machine + PRD ready, fatter for self-loop)**:
- `citadel_report.json` (schema 1.3) — now includes acShapeIssues, divergenceFlags, selfMetaRefsChecked
- `citadel_report.schema.json`
- `citadel_prd_feedback.md` — AC scorecard + **AC Shape**, **Self-Meta Cross-Ref section**, Divergence, actionable recs ready for /pickle-refine-prd + self-PRD generator.
- Activity `citadel_audit` event (richer payload).

**Wired with teeth**: `/pickle-pipeline` (and self-improvement) treats Citadel FAIL (incl. self-meta orphans or self-audit CRITICAL) as hard gate — exitCode 1, forces remediation. Standalone: `npx tsx engine/src/bin/validate-artifact.ts` or direct `runCitadel(sessionDir)`.

Run via `/citadel` (or pipeline --self-improvement). The report + feedback are now the canonical truth for autonomous 50-ticket self-mod trust. Change the auditor? It will call you out in the next PRD.

**Rick**: "Eleven auditors. One of them watches the others. Sleep tight, Morty."
