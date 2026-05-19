# Internal: Pipeline Meta-Readiness & Execution Improvements (Post R-META-DEEPEN-001)

**Date**: 2026-05-19  
**Trigger**: R-META-DEEPEN-001 campaign (10 tickets) only fully completed 1 ticket. Research honesty was punished as failure.  
**Goal**: Raise completion rate and signal quality on meta/hardening PRDs while preserving the headless `grok -p` + ritual execution contract.

This document is the approved design synthesized from the Codebase Analyst, Risk Analyst, and Engineering Architect council.

## Top 3 Improvements (P0)

### 1. Machine-Actionable Research Signals (Blocked / Deferred + Readiness Assessment)

### 2. Dependency Graph + Topological Execution

### 3. Preflight + Emission-Time Readiness Scanning for Meta PRDs

(Full details in the lead Architect output attached to this session context.)

## Rollout Order
1. Types + session readiness storage
2. Ritual + phase prompt contracts
3. Orchestrator topo + ready queue
4. Preflight + emitter + self-prd
5. Closer / post-phase / metrics polish

All changes are infra-only. Real code changes still require full 8-phase Morty ritual under headless execution.

## Success Criteria (machine-checkable)
- Research artifacts from blocked tickets are preserved with structured Readiness Assessment.
- Orchestrator respects declared dependencies and does not run dependents before prereqs.
- Preflight on a meta PRD targeting skeletal code surfaces amber/red readiness with suggested prereqs.
- Next self-PRD generator ingests research blockers from non-done tickets.
- All existing tests remain green + new coverage for the new paths.
