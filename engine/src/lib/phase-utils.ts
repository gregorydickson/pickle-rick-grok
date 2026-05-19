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
