---
name: anatomy-park
description: >
  Deep subsystem review (Anatomy Park). Auto-discovers subsystems, round-robins through them,
  runs the 3-phase protocol (Review → Fix → Verify with hard revert on regression), catalogs
  trap doors into AGENTS.md / CLAUDE.md. Built on the Microverse convergence engine.
version: 2.0.0-grok
triggers:
  - anatomy-park
  - anatomy park
  - deep review
  - subsystem surgery
references:
  - path: ../../references/persona.md
    conditional: true
---
# Anatomy Park — Grok Native

*"Welcome to Anatomy Park. It's like the codebase, but inside the codebase. Way more dangerous."*

## What it does

1. Discovers immediate subdirectories that look like real subsystems (≥3 source files, not >80% tests, not node_modules etc.).
2. For each subsystem in round-robin:
   - **Review** (read-only subagent): trace data flows, look at git history for churn hotspots, rate severity, propose minimal fixes + candidate trap doors.
   - **Fix** (implementer subagent): the smallest change that addresses the highest-severity finding.
   - **Verify** (verifier subagent): re-trace the affected paths + consumers, run relevant tests, full gate. **Any regression → instant git restore of the exact paths changed this iteration.**
3. After N clean passes on a subsystem, move to the next.
4. Trap doors are written (idempotently) under `## Trap Doors` in the subsystem's nearest rules file.

## Grok Advantages

- Each of the three phases can be a purpose-built subagent with `capability_mode: "read-only"` for Review/Verify and `"execute"` for Fix.
- `isolation: "worktree"` means the Fix phase can experiment violently without touching the main tree until verify passes.
- The convergence gate (the one from microverse) runs after every 3-phase cycle.

## Flags (same spirit as original)

`--dry-run` → Review only, no edits, full report.
`--scope branch|paths:src/services` → limit the subsystems considered.
`--stall-limit 3` → how many non-improving rotations before we give up on a subsystem.
`--max-iterations 100`

## Implementation Note (for the engine)

The actual rotation state lives in `anatomy-park.json` (see `engine/src/anatomy.ts`). The 3-phase prompts live in `references/anatomy/`. The Microverse driver is reused with `convergence_file: anatomy-park.json` so the stall/measurement/gate logic is identical.

This is the same surgical discipline as the Claude version, executed with Grok-native primitives and far less ceremony.
