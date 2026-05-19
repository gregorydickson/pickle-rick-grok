/**
 * phase-utils.ts — shared phase name mapping and ticket phase list
 *
 * Eliminates duplication between orchestrator (headless) and any future
 * interactive manager / CLI / skill code that needs to know the canonical
 * 8-phase Morty ticket lifecycle and how to map role names to prompt files.
 *
 * Used by:
 *   - bin/orchestrator.ts
 *   - (future) interactive ticket manager, resumption logic, etc.
 *
 * This lives in lib/ so drivers, bins, and external consumers all share one source.
 * Adding a new phase? Change here once.
 *
 * Also: tiny shared fs helpers (safeRead) — single source now used by citadel, self-prd-generator, etc. (dupe excised).
 *
 * TURN BUDGETS: phase-aware max-turns for grok -p workers.
 * Single source of truth for safe, high defaults on heavy phases (researcher/planner) that
 * receive 6-12kB+ prompts (full ticket.md + send-to-morty contract + phase md + git rules)
 * and perform dozens of tool calls (ls, read, grep, think) before emitting artifact + <promise>I AM DONE</promise>.
 * Side roles (deepen-changer, microverse-changer) continue to use WorkerSpawner's 80 fallback.
 * This unblocks reliable 50-ticket overnight self-runs (R-META researcher phases) without per-campaign hacks.
 */

import type { WorkerRole } from '../workers.js';
import * as fs from 'fs';

export const TICKET_PHASES: readonly WorkerRole[] = [
  'morty-phase-researcher',
  'morty-phase-research-reviewer',
  'morty-phase-planner',
  'morty-phase-plan-reviewer',
  'morty-phase-implementer',
  'morty-phase-verifier',
  'morty-phase-reviewer',
  'morty-phase-simplifier',
];

/**
 * Phase-aware turn budgets (max-turns passed to grok --prompt-file ... --max-turns N).
 *
 * Rationale (production dogfood, 2026-05-19):
 * - researcher: 180 — P0/R-META tickets produce the largest prompts (~6KB/100+ lines). Exhaustive
 *   exploration requires many file reads + synthesis before research_*.md + promise. 60 was the
 *   Jerry under-estimate that caused reliable exhaustion once --prompt-file delivered faithfully.
 * - planner: 150 — depends on prior research; still tool-heavy for concrete steps/risks/contracts.
 * - *-reviewer: 95-100 — critique/read-heavy, fewer writes.
 * - implementer: 120 — actual code + test changes (can be multi-file).
 * - verifier / reviewer / simplifier: 80-90 — focused, lower creation load.
 *
 * These are safe high-water defaults, not infinite. Prevents runaways while enabling "fire mux-runner
 * for 50 R-META tickets and walk away". Future self-PRDs can target this table (see activity logs for
 * promptLen vs success vs effective maxTurns correlation).
 *
 * Override at runtime via RunOrchestratorOptions.maxTurns (global) or .phaseMaxTurns (per-role).
 */
export const DEFAULT_PHASE_TURN_BUDGETS: Record<WorkerRole, number> = {
  'morty-phase-researcher': 180,
  'morty-phase-research-reviewer': 100,
  'morty-phase-planner': 150,
  'morty-phase-plan-reviewer': 100,
  'morty-phase-implementer': 120,
  'morty-phase-verifier': 90,
  'morty-phase-reviewer': 80,
  'morty-phase-simplifier': 80,
};

export function getDefaultPhaseTurnBudget(phase: WorkerRole): number {
  return DEFAULT_PHASE_TURN_BUDGETS[phase] ?? 80;
}

/**
 * Resolve the effective --max-turns for a given Morty phase role.
 * Precedence: explicit global maxTurns > per-phase override > table default.
 * Lives here (with the phase list) so self-improvement loops have one place to mutate/audit.
 */
export function resolvePhaseTurnBudget(
  phase: WorkerRole,
  options?: {
    maxTurns?: number;
    phaseMaxTurns?: Partial<Record<WorkerRole, number>>;
  }
): number {
  if (options?.maxTurns != null) return options.maxTurns;
  const perPhase = options?.phaseMaxTurns?.[phase];
  if (perPhase != null) return perPhase;
  return getDefaultPhaseTurnBudget(phase);
}

/**
 * Map a full WorkerRole (e.g. 'morty-phase-research-reviewer')
 * to the corresponding prompt filename stem (e.g. 'research_review').
 * Keeps the special hyphen->underscore rules in ONE place.
 */
export function getPhaseFileName(phase: string): string {
  let phaseName = phase.replace('morty-phase-', '');
  if (phaseName === 'research-reviewer') phaseName = 'research_review';
  if (phaseName === 'plan-reviewer') phaseName = 'plan_review';
  return phaseName;
}

/**
 * Convenience: given a phase role, return the full expected artifact filename
 * used by the post-return ritual (e.g. 'research_001.md').
 */
export function getExpectedArtifactName(phase: string, ticketId: string): string {
  const stem = getPhaseFileName(phase);
  return `${stem}_${ticketId}.md`;
}

/** Shared atomic-safe read (prevents boilerplate try/catch everywhere). */
export function safeRead(p: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

// === DEPENDENCY GRAPH (Pipeline Meta-Readiness P0: topo execution, blocked/deferred support) ===

/** Lightweight ref for pure dep-graph functions (no full Ticket import needed). */
export interface TicketRef {
  id: string;
  dependencies?: string[];
  status?: string;
}

/**
 * Detects one or more cycles in the declared ticket dependency graph.
 * Returns [] for a clean DAG. Each cycle is a closed path of ids.
 * Only intra-list deps are considered.
 */
export function detectCycles(tickets: TicketRef[]): string[][] {
  const byId = new Map<string, TicketRef>(tickets.map(t => [t.id, t]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (cycles.length > 0) return;
    if (visiting.has(node)) {
      const idx = path.indexOf(node);
      if (idx >= 0) cycles.push([...path.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;

    visiting.add(node);
    path.push(node);
    const t = byId.get(node);
    for (const d of t?.dependencies || []) {
      if (byId.has(d)) dfs(d, path);
    }
    path.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const t of tickets) {
    if (!visited.has(t.id) && cycles.length === 0) {
      dfs(t.id, []);
    }
  }
  return cycles;
}

/**
 * Returns tickets in topological order (all prereqs appear before dependents).
 * Throws on cycle with a clear message. External (undeclared) deps treated as satisfied.
 */
export function topologicalSort(tickets: TicketRef[]): TicketRef[] {
  const cycles = detectCycles(tickets);
  if (cycles.length > 0) {
    throw new Error(`Cyclic ticket dependencies detected: ${cycles[0].join(' → ')}`);
  }

  const byId = new Map<string, TicketRef>(tickets.map(t => [t.id, t]));
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // prereq -> dependents

  tickets.forEach(t => {
    indegree.set(t.id, 0);
    adj.set(t.id, []);
  });

  tickets.forEach(t => {
    for (const d of t.dependencies || []) {
      if (byId.has(d)) {
        adj.get(d)!.push(t.id);
        indegree.set(t.id, (indegree.get(t.id) || 0) + 1);
      }
    }
  });

  const queue: string[] = [];
  for (const [id, deg] of indegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);
    for (const v of adj.get(u) || []) {
      const deg = (indegree.get(v) || 0) - 1;
      indegree.set(v, deg);
      if (deg === 0) queue.push(v);
    }
  }

  if (order.length !== tickets.length) {
    // Fallback safety (shouldn't happen after cycle check)
    return [...tickets];
  }
  return order.map(id => byId.get(id)!);
}

/**
 * Pure: tickets whose dependencies are satisfied (or external) and are themselves runnable.
 * Excludes done/failed/blocked/deferred. Seed doneIds with already-completed for multi-pass ready queue.
 */
export function getReadyTickets(
  tickets: TicketRef[],
  doneIds: Set<string> = new Set()
): TicketRef[] {
  const done = new Set(doneIds);
  tickets.forEach(t => { if (t.status === 'done') done.add(t.id); });

  const inSet = new Set(tickets.map(t => t.id));
  const blockedStatuses = ['done', 'failed', 'blocked', 'deferred'];

  return tickets.filter(t => {
    const st = (t.status || 'pending') as string;
    if (blockedStatuses.includes(st)) return false;
    const deps = t.dependencies || [];
    return deps.every(d => !inSet.has(d) || done.has(d));
  });
}
