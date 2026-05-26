/**
 * ac-shape.ts — dedicated module for the hard AC-shape collapse-or-justify gate.
 * Functional port of evaluateAcShapeEnforcement + runAcShapeEnforcement + helpers/REs from
 * ../pickle-rick-claude/extension/src/bin/spawn-refinement-team.ts:1410 (per 2026-05-24 PRD P0 + agents
 * 019e5a97-c9cd..., 019e64d4-7ee4..., 019e64d4-b072... etc. with verbatim claude cross-checks first).
 *
 * Extracted from pipeline-preflight.ts to stop bloat (simplifier + overcomplexity agents).
 *
 * Honest note: evaluate/run take a minimal {ac_shape_smells?, tickets?} shape. Emitter currently passes
 * empty ac_shape_smells (data model limit — real analyst smells not yet plumbed into TicketSpec[]).
 * Full hard exit(2) enforcement + rich manifest lives in SKILL manager (pickle-refine-prd Step 3/4, post-synthesis
 * before emitRefineCouncilTickets; no amber on council/meta). This module provides the reusable logic.
 * See pipeline-preflight re-exports, ticket-emitter.ts:392, AGENTS.md Trap Doors, and ac-shape-gate.test.ts.
 */

export interface AcShapeViolation {
  ac_id: string;
  reason: string;
  ticket_ids: string[];
}

const AC_SHAPE_SECTION_RE = /^##+\s+ac_shape_smells\s*$/im;
const UNIVERSAL_QUANTIFIER_RE = /\b(?:all|every|for any|each)\b/i;
const JUSTIFICATION_RE = /\/\/\s*JUSTIFICATION:/i;
const DESCRIBE_EACH_RE = /describe\.each\s*\(\s*\[/s;

function hasJustificationBlock(ticket: any): boolean {
  return ticket.justification !== undefined && JUSTIFICATION_RE.test(ticket.justification);
}

function isParametrizedTicket(ticket: any): boolean {
  const title = ticket.title || '';
  const acc = ticket.acceptance_test || (ticket.acceptanceCriteria && ticket.acceptanceCriteria[0] && ticket.acceptanceCriteria[0].verify) || '';
  return UNIVERSAL_QUANTIFIER_RE.test(title) && DESCRIBE_EACH_RE.test(acc);
}

function ticketsForSmell(smell: any, tickets: any[]): any[] {
  const explicitIds = new Set((smell.ticket_ids ?? []).filter((id: string) => id && id.trim() !== ''));
  return tickets.filter((ticket: any) => {
    if (explicitIds.size > 0 && explicitIds.has(ticket.id)) return true;
    const sources = ticket.source_ac_ids || [];
    return sources.includes(smell.ac_id);
  });
}

export function evaluateAcShapeEnforcement(manifest: { ac_shape_smells?: any[]; tickets?: any[] }): AcShapeViolation[] {
  const violations: AcShapeViolation[] = [];
  const smells = manifest.ac_shape_smells || [];
  const tickets = manifest.tickets || [];
  for (const smell of smells) {
    const matchingTickets = ticketsForSmell(smell, tickets);
    if (matchingTickets.length === 0) {
      violations.push({
        ac_id: smell.ac_id,
        reason: 'tagged as an AC-shape smell but no matching ticket entries were emitted',
        ticket_ids: [],
      });
      continue;
    }
    if (matchingTickets.length === 1) {
      const [ticket] = matchingTickets;
      if (!isParametrizedTicket(ticket)) {
        violations.push({
          ac_id: smell.ac_id,
          reason: 'single-ticket collapse lacks a universal-quantifier title or describe.each([...]) acceptance test',
          ticket_ids: [ticket.id],
        });
      }
      continue;
    }
    const unjustified = matchingTickets.filter((t: any) => !hasJustificationBlock(t));
    if (unjustified.length > 0) {
      violations.push({
        ac_id: smell.ac_id,
        reason: 'multi-ticket decomposition lacks // JUSTIFICATION: blocks on every matching ticket',
        ticket_ids: unjustified.map((t: any) => t.id),
      });
    }
  }
  return violations;
}

export function runAcShapeEnforcement(manifest: { ac_shape_smells?: any[]; tickets?: any[] }): number {
  const violations = evaluateAcShapeEnforcement(manifest);
  if (violations.length === 0) return 0;
  console.error('[pickle-rick] AC-shape collapse-or-justify gate failed.');
  console.error('[pickle-rick] Rewrite each AC as one invariant-shaped acceptance criterion, or add // JUSTIFICATION: blocks to every intentionally split ticket.');
  for (const v of violations) {
    const tks = v.ticket_ids.length > 0 ? ` tickets=${v.ticket_ids.join(',')}` : '';
    console.error(`[pickle-rick] ${v.ac_id}: ${v.reason}${tks}`);
  }
  return 2;
}
