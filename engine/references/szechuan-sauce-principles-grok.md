# Szechuan Sauce Principles — Grok Engine Adaptation (FINAL EXPANDED)

**Every single principle** from the original `szechuan-sauce-principles.md` + `szechuan-sauce-financial-principles.md` has been ported, adapted, and wired into the executable scanner in `engine/src/szechuan.ts`.

The `SzechuanDriver` (and its rule engine `RULES`) is now the canonical, prioritized, confidence-filtered deslopping hammer for the **entire self-improvement loop** (engine, skills/*.md, prds, references, bin scripts, etc.).

## Quick Reference (All Principles Now Scanned)

**Base (always active):**
KISS, YAGNI, SMALL_FUNCTIONS, GUARD_CLAUSES, COGNITIVE_LOAD, SELF_DOCUMENTING, ELEGANCE,
DRY, SINGLE_SOURCE_OF_TRUTH, SEPARATION_OF_CONCERNS, MODULARITY, ENCAPSULATION, LAW_OF_DEMETER,
SRP, COMPOSITION_OVER_INHERITANCE, COMMAND_QUERY,
FAIL_FAST, ERROR_HANDLING, PARSE_DONT_VALIDATE, IMMUTABILITY, IDEMPOTENCY, RESILIENCE, LEAST_PRIVILEGE, OBSERVABILITY,
MIGRATION_SAFETY, MIGRATION_HYGIENE, DEPENDENCY_HEALTH, TEST_QUALITY, BOY_SCOUT, SECURITY

**Financial (when domain="financial" or explicit):**
MONETARY_PRECISION, ROUNDING_CONSISTENCY, CURRENCY_DISPLAY, STATISTICAL_CORRECTNESS,
RATE_PERCENTAGE_HANDLING, REGULATORY_COMPLIANCE, TEMPORAL_PRECISION, AUDIT_TRAIL

Financial violations **elevate one priority tier** (P2 maintainability bug in money code becomes P1).

## Scanner Behavior (Hardened)

- Data-driven `PrincipleRule[]` with per-rule detectors (regex + heuristics tuned for TS/JS/MD/sh in Grok).
- Full **confidence scoring** + filter from the source doc:
  - Keep if conf >= 80
  - P0 escape: conf >= 50 surfaces as `[NEEDS-VERIFICATION]`
  - Everything else dropped (no noise in 50-tix runs)
- Walks code + docs + scripts for **whole-loop deslop** (catches slop in PRDs, skill prompts, engine itself).
- Prioritizes P0 > P1 > P2... then autoFixable, then conf.
- Basic auto-remediation (traps + targeted fixes) + full convergence loop (gate, rollback, stall, persist rich `violationsHistory` + `currentState` for reports).
- Integrated in `/pickle-pipeline`, self-improvement, standalone `/szechuan-sauce`.

## Why This Closes the Loop

Before: stubby 9-rule scanner only caught obvious consoles + bare catches.
After (Final Szechuan): **every principle** fires real violations on real slop. The overnight 50-ticket autonomous self-run now has a deslopper that can actually police its own output (engine changes, generated PRDs, skill updates) against the full gospel.

No more Jerry code surviving the sauce.

See `engine/src/szechuan.ts` (RULES + scanForViolations + runConvergence) + types + tests for the implementation.
The original two .md files remain the human spec; this is the machine execution of them.

"Wubba lubba — principles fully sauced. Self-loop now eats its own tail cleanly."
