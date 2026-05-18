---
name: citadel
description: Run the Citadel conformance audit against the PRD and final diff. The "spec is the review" gate before deeper cleanup.
version: 2.0.0-grok
triggers:
  - citadel
  - conformance audit
  - prd audit
---
# Citadel — PRD Conformance Auditor (Grok Slim)

Invokes `engine/src/citadel.ts` (or the full version) against the current branch diff and the PRD.

Checks:
- Every acceptance criterion has a corresponding verification that was actually executed
- No interface contracts were violated or silently changed
- Trap doors documented during the work are present
- Diff hygiene (no massive unrelated changes, etc.)

Produces `citadel_report.json` with severity-scored findings.

Can be run standalone or as part of `/pickle-pipeline`.

In the full pipeline it is the first post-build gate.
