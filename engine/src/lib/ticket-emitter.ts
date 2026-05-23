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
import { assessMetaReadiness, computeTicketManifestHash, detectVerifyTheater } from './pipeline-preflight.js';
import type { ReadinessAssessment } from '../types.js';
import * as fs from 'fs';

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
- **Researcher** (MANDATORY THEATER AUDIT): First action — extract every \`Verify\` backtick from this ticket + parent PRD. Test each string against the exact forbidden patterns (see full list in research.md + pipeline-preflight.ts:detectVerifyTheater). If ANY theatrical/non-runnable/"after fix"/human-observe/|| true / "feed good" / bare ls / TODO-in-Verify pattern, or if the BASELINE form does not run deterministically on the *current* tree: **check immediately for EMISSION_THEATER DEBT WAIVER block below or \`theaterWaiverSibling\` in this ticket's metadata/hardening**. If waiver present: mark **Status: amber** (debt from producer; sibling H-VERIFY-EMIT-* auto-scheduled in same batch per "never stop + progress then fix"), document the exact hits + baselines in research_*.md, then proceed with normal deep research/plan/impl so the campaign never halts. Else (no waiver): mark **Status: blocked**, Reason: "EMISSION_THEATER risk — theatrical Verify in ACs (would have killed researcher/planner)", Suggested Prerequisites: "H-VERIFY hardening + re-refine". Surface in research artifact for Citadel/ritual. Do not proceed to plan only on unwaived poison.
- **Planner**: Refuse any ticket whose research Readiness is blocked on EMISSION_THEATER or whose Verifies fail the theater list. One crisp plan only on clean runnable Verifies. Waived debt tickets (amber + sibling present) are allowed to plan/impl.
- **Implementer**: make the change + write implement_${spec.id}.md citing the exact Verify commands and their output.
- **Verifier**: literally run every Verify command in the table. Fail the ticket if any red. **Additionally: if any Verify string matches the theatrical patterns list, immediately fail the phase and write "INVALID SPEC — EMISSION_THEATER: <exact match>" in verify_*.md before running.**
- **Reviewer / Simplifier + Research/Plan Reviewers**: Explicitly re-audit all Verifies in the ticket + artifacts for theater patterns. Any survivor → demand re-research or blocked status + EMISSION_THEATER signal (unless the explicit debt waiver block is present, in which case amber + healer is the contract).

${hardening}

${(spec as any).theaterWaiverSibling ? `
## EMISSION_THEATER DEBT WAIVER (autonomous "never stop + progress then fix" policy)
This ticket was emitted with theatrical Verify strings (or red preflight) by the producer (refine council manager or self-prd-generator).

A sibling healer ticket **${(spec as any).theaterWaiverSibling}** was auto-created in the exact same emission batch (see state + tickets/ dir).

**Researcher / Planner / Implementer / Verifier**: Treat this ticket as **amber** (forced by emitter). Perform your normal work + capture literal BASELINE evidence. The sibling H-VERIFY owns:
- Rewriting the bad AC Verify columns in this ticket.md (using the exact evidence you capture in research_*.md)
- Hardening the producer (SKILL.md synthesis step + ticket-emitter gate + pipeline-preflight assess) so theatrical Verifies / noisy reds can never be emitted again for council paths.

Do **not** hard-block. The campaign must continue. This is the explicit "never stop" contract. See research.md WAIVER section for full auditor rules.
` : ''}

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
      readiness = assessMetaReadiness(spec.scope || '', verifyJoined, { ...(opts.grokRoot !== undefined ? { grokRoot: opts.grokRoot } : {}) });

      // HARD GATE + "never stop" autonomous healer (progress then fix)
      // Theatrical Verifies from the producer (refine council / self-prd-generator) now auto-emit a sibling H-VERIFY healer
      // in the same batch instead of hard-stopping the campaign. The original ticket is marked amber + waived.
      const theater = detectVerifyTheater(verifyJoined);
      const isMetaSelf = (opts.generatedBy || '').toLowerCase().includes('self') ||
                         (spec as any).isSelfMeta ||
                         (spec.sourcePrd === 'self-generated');
      const isAlreadyHealing = (spec.id || '').toUpperCase().startsWith('H-VERIFY') ||
                               (spec.category || '').toLowerCase().includes('h-verify');

      // Unconditional "never stop" for council: any theatrical or red at emission from producer gets sibling healer + amber debt ticket.
      // Meta/self still hard-fail (must not emit poison). Healer creation + waiver field makes researcher proceed amber.
      if (theater.isTheatrical || (readiness?.status === 'red' && !isAlreadyHealing)) {
        const msg = `[ticket-emitter] HARD EMISSION GATE for ${spec.id}: theatrical=${theater.isTheatrical} readiness=${readiness?.status} (meta/self=${isMetaSelf}). Reasons: ${[...(readiness?.signals || []), ...theater.reasons].map(r => (r as any).example || r).join(' | ')}`;

        if (isMetaSelf && !isAlreadyHealing) {
          throw new Error(msg + ' — self/meta paths must never emit theatrical Verifies');
        } else if (!isAlreadyHealing) {
          // Council / normal path (or any non-healing): auto sibling H-VERIFY healer + amber waiver. Campaign MUST continue.
          console.error(msg + ' (council/normal path — auto-emitting sibling H-VERIFY healer + amber waiver per never-stop policy)');

          // Mark original for amber + debt waiver (consumed by research.md waiver + generateTicketMarkdown injection)
          (spec as any).theaterWaiverSibling = `H-VERIFY-EMIT-${spec.id}`;
          // Force amber on debt ticket so Preflight section + researcher see "proceed with healer" not loud red block
          const debtReadiness = readiness
            ? { ...readiness, status: 'amber' as const, score: 55, summary: (readiness.summary || '').replace(/RED|red/i, 'AMBER (EMISSION_THEATER_DEBT_WAIVER)') }
            : { status: 'amber' as const, score: 50, signals: [{ pattern: 'EMISSION_THEATER_DEBT', hits: theater.reasons.length }], suggestedPrereqs: [`Sibling H-VERIFY-EMIT-${spec.id}`], filesScanned: [], summary: 'AMBER (EMISSION_THEATER_DEBT_WAIVER)' };
          (spec as any).readiness = debtReadiness;
          if (!(spec as any).hardeningTickets) (spec as any).hardeningTickets = '';
          (spec as any).hardeningTickets += `\n- Auto sibling: ${(spec as any).theaterWaiverSibling} (rewrites bad Verifies + hardens refine manager / emitter + preflight)`;
        }

        // Auto-emit the sibling healer in the same batch (simple "progress + heal" mechanism) — now fires for red too
        if ((spec as any).theaterWaiverSibling && !isAlreadyHealing) {
          const hId = (spec as any).theaterWaiverSibling;
          const healer: TicketSpec = {
            id: hId,
            title: `H-VERIFY: heal EMISSION_THEATER debt in ${spec.id} + harden refine manager / emitter`,
            justification: `Auto-generated sibling by ticket-emitter because the producer (refine council or self-prd-generator) emitted theatrical Verifies or red readiness for ${spec.id}. Per autonomous "never stop, progress then fix" policy, the main ticket proceeds amber while this H-VERIFY rewrites the bad ACs and hardens the synthesis step in skills/pickle-refine-prd/SKILL.md + ticket-emitter.ts + pipeline-preflight.ts so this class of debt can never be emitted again.`,
            acceptanceCriteria: [
              { id: 'AC1', criterion: `The debt ticket ${spec.id} no longer contains theatrical || true / | cat / non-deterministic Verify strings`, verify: `grep -E '\\|\\| true| \\| cat |/tmp/test-.*-session' tickets/${spec.id}/ticket.md | wc -l | grep -q '^0$'` },
              { id: 'AC2', criterion: 'skills/pickle-refine-prd/SKILL.md Step 3/4 synthesis now runs detectVerifyTheater + literal BASELINE execution on every Verify before calling emitRefineCouncilTickets', verify: `grep -A 20 'for every verify in the TicketSpec' skills/pickle-refine-prd/SKILL.md | grep -q 'detectVerifyTheater\|BASELINE'` },
              { id: 'AC3', criterion: 'ticket-emitter forces healer sibling + amber for ANY theatrical/red from council (not just direct theater or meta)', verify: `grep -A 5 'council/normal path' engine/src/lib/ticket-emitter.ts | grep -q 'theaterWaiverSibling'` },
            ],
            scope: `skills/pickle-refine-prd/SKILL.md\nengine/src/lib/ticket-emitter.ts\nreferences/phases/research.md\nreferences/refine/refine-contract.md\nengine/src/lib/pipeline-preflight.ts\ntickets/${spec.id}/ticket.md`,
            nonGoals: 'Do not change the hard block for clean non-debt tickets.',
            category: 'h-verify',
            severity: 'P0',
            sourcePrd: spec.sourcePrd,
            hardeningTickets: `Cleans emission debt for ${spec.id} and prevents future producer slop from stopping autonomous campaigns.`,
          };
          // We will push this healer after the current loop iteration by mutating a side array (see below)
          (spec as any).__healerToEmit = healer;
        }
      }
    } catch (e: any) {
      // probe must never break emission; non-fatal (Jerry-safe) — except the new hard gate above
      if ((e as any)?.message?.includes('HARD EMISSION GATE')) throw e;
      console.warn('[ticket-emitter] readiness probe failed (non-fatal):', e?.message || e);
    }

    const enrichedSpec = readiness ? ({ ...spec, readiness } as TicketSpec) : spec;
    const md = generateTicketMarkdown(enrichedSpec, {
      generatedBy: opts.generatedBy || 'refine-prd council',
      ...(opts.grokRoot !== undefined ? { grokRoot: opts.grokRoot } : {})
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

    // Emit the auto-generated sibling healer in the same batch (simple progress + heal)
    const healer = (spec as any).__healerToEmit;
    if (healer) {
      const hVerifyJoined = (healer.acceptanceCriteria || []).map((ac: any) => (ac.verify || ac.criterion || '')).join('\n');
      const hReadiness = assessMetaReadiness(healer.scope || '', hVerifyJoined, { ...(opts.grokRoot !== undefined ? { grokRoot: opts.grokRoot } : {}) });

      const hMd = generateTicketMarkdown(healer, {
        generatedBy: (opts.generatedBy || 'refine-prd council') + ' + auto emission healer',
        ...(opts.grokRoot !== undefined ? { grokRoot: opts.grokRoot } : {})
      });

      const hMeta = {
        title: healer.title,
        status: 'pending' as const,
        phasesCompleted: [] as string[],
        category: healer.category,
        severity: healer.severity,
        sourcePrd: healer.sourcePrd,
        justification: healer.justification,
        isHardening: true,
        readiness: hReadiness,
        ...healer,
      };

      const hPath = await sm.persistTicket(sessionDir, healer.id, hMd, hMeta);
      created.push(hPath);
      hardeningCount++;
      console.log(`[ticket-emitter] Auto-emitted sibling healer ${healer.id} for debt ticket ${spec.id}`);
    }
  }

  // === Post-incident P0 provenance seal + light Verify smoke (prevents re-use of flawed tickets) ===
  try {
    // Use *full* ticket set from state (post all persistTicket/addTicket) so seal covers accumulated tickets from partial/incremental/direct emits.
    // sm.getManifestPrdPath (via session owner) ensures the extra is *always* the real stamped PRD from state (survives 'self-generated', partial refine, re-dispatch).
    const stateForSeal = sm.loadState(sessionDir);
    const ids = Array.from(new Set((stateForSeal.tickets || []).map((t: any) => t.id).filter(Boolean))).sort();
    const prdForManifest = sm.getManifestPrdPath(sessionDir, (specs[0] as any)?.sourcePrd || '');
    const manifestHash = computeTicketManifestHash(ids, prdForManifest);
    // Single owner stamp: writes seal into state (no sidecar, no clobber, no regex)
    await sm.stampPrdProvenance(sessionDir, prdForManifest || process.cwd(), { ticketManifestHash: manifestHash });

    // Light smoke that would have caught the RCA quoting / init+length / non-deterministic Verifys
    for (const p of created) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.length < 280 || !c.includes('| Verify |')) {
        console.warn(`[ticket-emitter] POST-EMIT SMOKE: ${path.basename(p)} has weak Verify table (possible quoting/init/length bug from refine).`);
      }
    }
  } catch (e: any) {
    console.warn('[ticket-emitter] manifest/seal smoke non-fatal:', e?.message || e);
  }

  // State update (same pattern the old manager scripts did)
  if (opts.updateStateToImplementing !== false) {
    const state = sm.loadState(sessionDir);
    state.step = 'implementing';
    if (specs.length > 0) {
      state.currentTicketId = specs[0]!.id; // safe: length check above
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
