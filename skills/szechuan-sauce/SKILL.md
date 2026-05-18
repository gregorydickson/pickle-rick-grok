---
name: szechuan-sauce
description: Iterative code deslopping using the shared convergence engine. KISS, DRY, security, cognitive load, etc. Runs until zero violations or stall limit.
version: 2.0.0-grok
triggers:
  - szechuan-sauce
  - deslop
  - clean the code
  - remove slop
---
# Szechuan Sauce — Code Quality Convergence (Grok)

Same microverse engine as Anatomy Park and Microverse, but the "measurement" is a principle violation scanner + fixer.

Each iteration:
- Research phase finds the highest-priority violation in the scoped files
- Fix phase makes one atomic, minimal change
- Verify phase runs the gate + re-scans

Stops only when the violation count is zero (or stall limit reached).

This is the "make the code worthy of the sauce" tool.
