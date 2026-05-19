/**
 * Ticket Emitter — the single canonical seam for turning structured ticket specs
 * (from /pickle-refine-prd analyst council or self-prd-generator) into real
 * session-owned ticket.md files + state registration + Activity events.
 *
 * This is the reusable library piece that replaces every ad-hoc "write a temp script
 * that builds markdown and calls persistTicket" pattern.
 *
 * Goal: the chat-based refine manager (the *only* place allowed rich native spawn_subagent)
 * can collect specs in memory from the analysts and call one function. No /tmp hacks.
 *
 * Self-prd-generator should migrate to this over time for consistency.
 */

import * as path from 'path';
import { SessionManager } from '../session.js';
import { Activity } from '../activity-logger.js';
import { assessMetaReadiness } from './pipeline-preflight.js';
import type { ReadinessAssessment } from '../types.js';

export interface TicketSpec {
  id: string;
  title: string;
  justification: string;
  acceptanceCriteria: Array<{
    id: string;
    criterion: string;
    verify: string;
  }>;
  contracts?: string;
  scope: string;                    // multi-line string, one path per line or bullet
  nonGoals?: string;
  hardeningTickets?: string;        // text describing attached H- tickets
  category?: string;
  severity?: 'P0' | 'P1' | 'P2' | 'H-anatomy' | 'H-szechuan';
  sourcePrd?: string;
  generatedBy?: string;             // "refine-prd council" | "self-prd-generator" | ...
  readiness?: ReadinessAssessment;  // attached by emitter via preflight probe at emission time
}

export interface EmitOptions {
  updateStateToImplementing?: boolean;
  emitActivity?: boolean;
  generatedBy?: string;
  grokRoot?: string;
}

/**
 * Generate the exact markdown that matches references/refine/ticket-template.md
 * (and the shape expected by orchestrator, ritual, Morty workers, etc.).
 * This is the single source of truth for ticket formatting.
 */
export function generateTicketMarkdown(spec: TicketSpec, opts: { generatedBy?: string; grokRoot?: string; date?: string } = {}): string {
  const today = opts.date || new Date().toISOString().slice(0, 10);
  const by = opts.generatedBy || spec.generatedBy || 'refine-prd / self-prd';
  const root = opts.grokRoot || process.cwd();

  const acRows = spec.acceptanceCriteria
    .map(ac => `| ${ac.id} | ${ac.criterion} | \`${ac.verify.replace(/`/g, '')}\` |`)
    .join('\n');

  const hardening = spec.hardeningTickets
    ? `## Hardening Tickets Attached (if any)\n${spec.hardeningTickets}\n`
    : '## Hardening Tickets Attached (if any)\nSee parent PRD / refine summary for H- tickets executed after this set.\n';

  return `# ${spec.id} — ${spec.title}

**Generated**: ${today} via ${by}
**Category**: ${spec.category || 'refine'} | **Severity**: ${spec.severity || 'P0'}
**Source PRD**: ${spec.sourcePrd || 'unknown'}
**Working Dir**: ${root}

## Justification
${spec.justification}

This ticket was carved out of a refined PRD (or self-PRD) by the council / generator. It is intentionally atomic: one focused change that a single Morty implementer can finish in one sitting.

## Acceptance Criteria (machine-checkable)
| ID | Criterion | Verify |
|----|-----------|--------|
${acRows}

## Contracts & Invariants
${spec.contracts || 'Follow the 8-phase ritual. All changes must pass ConvergenceGate + exact Verify commands.'}

## Scope (Morty may ONLY touch these paths)
${spec.scope}

- No other files. Violating scope fails the ConvergenceGate in the ritual.

${(spec as any).readiness ? `
## Preflight Readiness (skeletal scan at emission via pipeline-preflight probe)
**Status**: ${((spec as any).readiness.status || 'n/a').toUpperCase()} | Score: ${((spec as any).readiness.score) ?? 'n/a'}
Files scanned: ${((spec as any).readiness.filesScanned || []).join(', ') || 'n/a'}
Hits: ${((spec as any).readiness.signals || []).reduce((n: number, s: any) => n + (s.hits || 0), 0)}
${((spec as any).readiness.suggestedPrereqs || []).length ? '**Suggested prereqs**: ' + ((spec as any).readiness.suggestedPrereqs || []).join(' | ') : ''}
` : ''}

## Non-Goals
${spec.nonGoals || 'Nothing outside the listed Scope and ACs.'}

## 8-Phase Notes for the Morty Team
- **Researcher**: locate the exact functions/files named in Verify + Scope. Document data flows and existing patterns.
- **Planner**: one crisp plan + minimal diff sketch. Every hunk must be traceable to an AC.
- **Implementer**: make the change + write conformance_${spec.id}.md citing the exact Verify commands and their output.
- **Verifier**: literally run every Verify command in the table. Fail the ticket if any red.
- **Reviewer / Simplifier**: shave any accidental bloat. The change should make the *next* self-PRD generator or citadel run happier, not sadder.

${hardening}

When all 8 phases have emitted <promise>I AM DONE</promise> and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table is shit, the Morties will produce shit. Garbage in, garbage in the reliability-backlog. Do better."
Wubba lubba dub dub.
`;
}

/**
 * The canonical emission function.
 * Persists every spec as a real ticket under the session, updates state,
 * optionally flips step to 'implementing' and fires Activity events.
 *
 * This is what /pickle-refine-prd and future self-prd paths should call.
 * No more hand-rolled temp scripts in the chat.
 */
export async function emitRefinedTickets(
  sessionDir: string,
  specs: TicketSpec[],
  opts: EmitOptions = {}
): Promise<{ created: string[]; count: number; hardeningCount: number }> {
  const sm = new SessionManager();
  const created: string[] = [];
  let hardeningCount = 0;

  for (const spec of specs) {
    // Run preflight readiness probe at emission (cheap skeletal scan on scope/Verify mentioned files)
    let readiness: ReadinessAssessment | undefined;
    try {
      const verifyJoined = (spec.acceptanceCriteria || []).map((ac: any) => (ac.verify || ac.criterion || '')).join('\n');
      readiness = assessMetaReadiness(spec.scope || '', verifyJoined, { grokRoot: opts.grokRoot });
    } catch (e: any) {
      // probe must never break emission; non-fatal (Jerry-safe)
      console.warn('[ticket-emitter] readiness probe failed (non-fatal):', e?.message || e);
    }

    const enrichedSpec = readiness ? ({ ...spec, readiness } as TicketSpec) : spec;
    const md = generateTicketMarkdown(enrichedSpec, {
      generatedBy: opts.generatedBy || 'refine-prd council',
      grokRoot: opts.grokRoot
    });

    const isHardening = (spec.id || '').toUpperCase().startsWith('H-') ||
                        (spec.category || '').toLowerCase().includes('h-');

    if (isHardening) hardeningCount++;

    const meta = {
      title: spec.title,
      status: 'pending' as const,
      phasesCompleted: [] as string[],
      category: spec.category,
      severity: spec.severity,
      sourcePrd: spec.sourcePrd,
      justification: spec.justification,
      isHardening,
      readiness,
      ... (spec as any)
    };

    const ticketPath = await sm.persistTicket(sessionDir, spec.id, md, meta);
    created.push(ticketPath);
  }

  // State update (same pattern the old manager scripts did)
  if (opts.updateStateToImplementing !== false) {
    const state = sm.loadState(sessionDir);
    state.step = 'implementing';
    if (specs.length > 0) {
      state.currentTicketId = specs[0].id;
    }
    sm.writeState(sessionDir, state);
  }

  // Activity (best-effort, same as before)
  if (opts.emitActivity !== false) {
    try {
      const sessId = path.basename(sessionDir);
      Activity.refinementCompleted(sessId, specs.length, hardeningCount);
      if (hardeningCount > 0) {
        Activity.hardeningTicketsTriggered(sessId, hardeningCount);
      }
    } catch (e) {
      // non-fatal in the same way the old paths tolerated it
      console.warn('[ticket-emitter] Activity emit non-fatal:', (e as any)?.message || e);
    }
  }

  return {
    created,
    count: specs.length,
    hardeningCount
  };
}

/**
 * Convenience for the common refine-prd case (in-place PRD + many tickets).
 * Just a thin wrapper that sets the right generatedBy label.
 */
export async function emitRefineCouncilTickets(
  sessionDir: string,
  specs: TicketSpec[],
  opts: Omit<EmitOptions, 'generatedBy'> = {}
) {
  return emitRefinedTickets(sessionDir, specs, {
    ...opts,
    generatedBy: 'pickle-refine-prd (Requirements + Codebase + Risk council, 2 rounds)'
  });
}
