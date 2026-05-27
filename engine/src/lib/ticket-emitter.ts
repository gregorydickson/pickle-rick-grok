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
 *
 * P0 ports (Claude sibling shift-left at emission): always-attach proactive H-VERIFY emission-honesty hardening tickets,
 * stricter prescriptive ticket template (Verify form + Test Expectations + no-placeholders), comments ref
 * prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md .
 */

import * as path from 'path';
import { SessionManager } from '../session.js';
import { Activity } from '../activity-logger.js';
import { assessMetaReadiness, computeTicketManifestHash, detectVerifyTheater, scanAnalystOutputsForUnverifiedPaths, checkVerifyMachinability, runAcShapeEnforcement, evaluateAcShapeEnforcement } from './pipeline-preflight.js';
// Post-synthesis emission quality now unified in pipeline-preflight (no parallel gate module).
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
  acShapeSmells?: any[];   // tranche4 per analyst map 019e69dd-2f3a...: optional, council paths only (SKILL Step3/4 parsed real analyst ## ac_shape_smells JSON); absent => [] (no behavior change for self-prd, tests, meta)
}

 /**
 * Generate the exact markdown that matches references/refine/ticket-template.md
 * (and the shape expected by orchestrator, ritual, Morty workers, etc.).
 * This is the single source of truth for ticket formatting.
 *
 * Updated for emission quality (synthesis PRD 2026-05-24): prescriptive `— Verify: \`cmd\` — Type: ...` format,
 * explicit Test Expectations, forward-ref hygiene + annotation rules, "no unresolved placeholders" rule,
 * cross-refs to pre-emit gates (AC-shape, path/symbol, readiness-style), always-on proactive hardening quartet,
 * and improved runner skip semantics for research blocks.
 */
export function generateTicketMarkdown(spec: TicketSpec, opts: { generatedBy?: string; grokRoot?: string; date?: string } = {}): string {
  const today = opts.date || new Date().toISOString().slice(0, 10);
  const by = opts.generatedBy || spec.generatedBy || 'refine-prd / self-prd';
  const root = opts.grokRoot || process.cwd();

  // P0 prescriptive emission (Claude port per prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md):
  // Criterion embeds "— Verify: `cmd` — Type: ..." form. No placeholders survive.
  const acRows = spec.acceptanceCriteria
    .map(ac => {
      const v = (ac.verify || '').replace(/`/g, '');
      const typeHint = /\b(tsc --|node -e |node --test|npm test|grep |test -f |diff |ls |cat )\b/i.test(v) ? 'shell' : (v.includes('node') ? 'node' : 'shell');
      return `| ${ac.id} | ${ac.criterion} — Verify: \`${v}\` — Type: ${typeHint} | \`${v}\` |`;
    })
    .join('\n');

  const hardening = spec.hardeningTickets
    ? `## Hardening Tickets Attached (if any)\n${spec.hardeningTickets}\n`
    : '## Hardening Tickets Attached (if any)\nSee parent PRD / refine summary for H- tickets executed after this set.\n';

  return `# ${spec.id} — ${spec.title}

**Generated**: ${today} via ${by}
**Category**: ${spec.category || 'refine'} | **Severity**: ${spec.severity || 'P0'}
**Source PRD**: ${spec.sourcePrd || 'unknown'} — see synthesis PRD \`prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md\`
**Working Dir**: ${root}

## Justification
${spec.justification}

This ticket was carved out of a refined PRD (or self-PRD) by the council / generator. It is intentionally atomic: one focused change that a single Morty implementer can finish in one sitting.

## Acceptance Criteria (machine-checkable)
| ID | Criterion | Verify |
|----|-----------|--------|
${acRows}

**Prescriptive Verify format (Claude-style, enforced at emission + all gates)**: Every Verify cell value **MUST** follow exactly:
\`— Verify: \`concrete-runnable-command\` — Type: test|typecheck|lint|shell|grep|node|tsc|integration|fs|json|activity|...\`
- Command must be directly executable today (BASELINE form on current tree succeeds or fails deterministically; no \`|| echo\`, no "manually observe", no post-change assumptions).
- Type classifies the check for readiness gate, symbol audit, and verifier.
- All such commands were literally executed by the emitting manager/analyst as BASELINE before \`emitRefineCouncilTickets\` (or equivalent) was called.

## Test Expectations
| ID | Scenario | Given / Pre-State (on current tree) | Then / Expected Result | Verify Command |
|----|----------|-------------------------------------|------------------------|----------------|
See the AC Verifies above (and parent PRD). For non-trivial tickets the emitting analysts populate 3–6+ concrete rows at emission time (mapping 1:1 or better to the ACs + edge cases per updated \`references/refine/ticket-template.md\`). All entries machine-checkable; no prose-only expectations. (Injected by emitter from template; analysts supply via TicketSpec in rich refine.)

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

## Forward-Ref Hygiene + No-Placeholder Rule (pre-emit gates — non-negotiable)
**Path / symbol verification hygiene**: Every backticked path (\`src/foo.ts\`), symbol (\`barBaz\`), or command in Justification / AC table / Verifies / Scope / Contracts / Non-Goals **was pre-verified at HEAD** via \`git ls-files --error-unmatch\` or \`git grep -l\` (or equivalent) by the emitting analysts before inclusion. Stdlib, node:builtin, external packages, and pure prose never appear backticked.

**Forward-created annotation format (exact — outside backticks, single ASCII space separator)**:
- Existing on HEAD: \`engine/src/lib/ticket-emitter.ts\`
- Forward-created (new artifact introduced by work **in this ticket**): \`src/new-thing.ts\` (forward-created)
- Forward-created by this or sibling: \`helper.ts\` (created by ticket ${spec.id})
- Forward by prior/peer ticket: \`docs/report.md\` (introduced by ticket H-VERIFY-EMIT-042-abc) or \`(created by ticket R-7f3a2b1c)\`

Malformed annotation, unverified backtick, or phantom symbol → \`annotation_format\` or phantom finding in symbol audit / readiness gate. Blocks clean emission or triggers auto H-VERIFY healer sibling (never-stop policy).

**No unresolved placeholders survive emission rule**: The pre-emit gates (AC-shape smell detection, path/symbol hygiene, readiness-style machinability + contract gate using \`MACHINE_HINT_RE\` vs \`PURE_PROSE_RE\`, symbol audit) **guarantee** that no \`{{PLACEHOLDER}}\`, \`TODO\`, \`NYI\`, \`placeholder\`, \`later\`, \`TBD\`, "after the change", "once fixed", bare future-tense in AC/Verify/Scope/Contracts text reach the emitted \`ticket.md\`. All content is fully concrete the moment emission functions are called. Violations are rejected before the refine hands off to the autonomous runner.

See the synthesis PRD (sections 1–3) for the full AC_SHAPE_PROMPT_SECTION, PATH_VERIFICATION_PROMPT_SECTION, ACTIVITY_EVENT_SCHEMA_SECTION, \`runAcShapeEnforcement\`, \`evaluateSymbolAudit\`, \`check-readiness --machinability-only --contract-only\`, and the 4 always-emitted proactive hardening tickets.

## Non-Goals
${spec.nonGoals || 'Nothing outside the listed Scope and ACs.'}

## 8-Phase Notes for the Morty Team
- **Researcher** (MANDATORY THEATER AUDIT + NEW GATES AUDIT): First action — extract **only from the Acceptance Criteria table Verify/Verification column cells** (and Test Expectations table) every \`Verify\` backtick + the prescriptive \`— Verify: \`cmd\` — Type: ...\` forms from this ticket + parent PRD (ignore boilerplate, examples, contracts). Test each against forbidden patterns in research.md + \`engine/src/lib/pipeline-preflight.ts:detectVerifyTheater\`. Execute literal BASELINE on current tree for every one. 
  - Also audit for forward-ref hygiene violations (missing/malformed \`(forward-created)\` annotations on new paths) and unresolved placeholders.
  - If ANY theatrical/non-runnable, bad annotation, placeholder, or non-deterministic BASELINE: **check immediately for EMISSION_THEATER DEBT WAIVER block (or theaterWaiverSibling / auto sibling)**. 
  - If waiver: mark **Status: amber** (debt from producer; sibling H-VERIFY-EMIT-* auto-scheduled per "never stop + progress then fix"), document hits+baselines+annotation evidence, proceed. Else: **Status: blocked** with EMISSION_THEATER + "H-VERIFY + re-refine" prereq (except explicit hardening tickets). 
  - **New pre-emit context**: This ticket was only emitted after (or with healer for) the synthesis PRD gates: AC-shape smell detection (no uncollapsed enumeration without universal quantifier or JUSTIFICATION + test), path/symbol hygiene + forward-ref annotation enforcement, readiness-style machinability/contract gate. Improved runner skip behavior treats pure-research Verify blocks (DEFERRED / no evidence) as normal terminal state — \`skipped\` status makes them invisible to pending queue and filtered from \`EPIC_COMPLETED\` / phase completion (one bad early research ticket no longer freezes the campaign). Surface full evidence.
- **Planner**: Refuse any ticket whose research Readiness is blocked on EMISSION_THEATER / hygiene / placeholder or whose Verifies fail the theater list. One crisp plan only on clean runnable Verifies that passed pre-emit gates. Waived debt tickets (amber + sibling) are allowed to plan/impl.
- **Implementer**: make the change + write implement_${spec.id}.md citing the exact Verify commands, their BASELINE/SUCCESS outputs, and any forward-ref artifacts created.
- **Verifier**: literally run every Verify command in the AC + Test Expectations tables. Fail the ticket if any red. **Additionally: if any Verify string matches theatrical patterns, or any path lacks correct forward-ref annotation, or placeholders remain: immediately fail the phase and write "INVALID SPEC — EMISSION_THEATER: <exact match>" (or hygiene/placeholder detail) in verify_*.md before running.**
- **Reviewer / Simplifier + Research/Plan Reviewers**: Explicitly re-audit all Verifies, Test Expectations, forward-ref annotations, and absence of placeholders in the ticket + artifacts. Any survivor → demand re-research or blocked status + EMISSION_THEATER/hygiene signal (unless explicit debt waiver block present).

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

## Always-Emitted Proactive Hardening (synthesis PRD §3)
For any non-trivial refine (not pure 1-ticket case), emission produces the canonical 4 proactive hardening tickets (in addition to any theater-debt H-VERIFY healers):
1. Code quality review of the feature area (P0-P1 violations, review-fix loop on MODIFIED_FILES union).
2. Data flow integrity audit (3-phase trace + fix on AFFECTED_SUBSYSTEMS; trap doors on non-convergence).
3. Test quality review (AC mapping, assertion strength, isolation, transforms).
4. Cross-reference consistency audit (doc↔code, patterns, error codes, activity events, etc.).
These carry concrete derived Verify commands. They execute after main feature tickets. Manager/analysts ensure specs for them during synthesis.

When all 8 phases have emitted <promise>I AM DONE</promise> and the post-return ritual has accepted the artifacts + gates, this ticket is complete.

**Rick**: "This ticket.md *is* the spec for the worker. If your AC table + Test Expectations + forward-refs are shit, the Morties will produce shit and the autonomous loop starves. The new pre-emit gates + prescriptive template + always-on H- quartet are the shift-left that makes 50-ticket overnight runs actually reliable. Garbage in, reliability-backlog bloats. Do better."
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
          const healer: any = {
            id: hId,
            title: `H-VERIFY: heal EMISSION_THEATER debt in ${spec.id} + harden refine manager / emitter`,
            justification: `Auto-generated sibling by ticket-emitter because the producer (refine council or self-prd-generator) emitted theatrical Verifies or red readiness for ${spec.id}. Per autonomous "never stop, progress then fix" policy, the main ticket proceeds amber while this H-VERIFY rewrites the bad ACs and hardens the synthesis step in skills/pickle-refine-prd/SKILL.md + ticket-emitter.ts + pipeline-preflight.ts so this class of debt can never be emitted again.`,
            acceptanceCriteria: [
              { id: 'AC1', criterion: `The debt ticket ${spec.id} no longer contains theatrical || true / | cat / non-deterministic Verify strings`, verify: `node -e '
  const fs = require("fs");
  const content = fs.readFileSync("tickets/${spec.id}/ticket.md", "utf8");
  if (/\\|\\| true| \\| cat |\\/tmp\\/test-.*-session/.test(content)) process.exit(1);
  console.log("AC1 OK: debt ticket free of theatrical patterns");
'` },
              { id: 'AC2', criterion: 'skills/pickle-refine-prd/SKILL.md Step 3/4 synthesis now runs detectVerifyTheater + literal BASELINE execution on every Verify before calling emitRefineCouncilTickets', verify: `node -e '
  const fs=require("fs");
  const t=fs.readFileSync("skills/pickle-refine-prd/SKILL.md","utf8");
  if(!/for every verify in the TicketSpec[\\s\\S]{0,400}?(detectVerifyTheater|BASELINE)/.test(t)) process.exit(1);
  console.log("AC2 OK: SKILL synthesis runs detectVerifyTheater + BASELINE");
'` },
              { id: 'AC3', criterion: 'ticket-emitter forces healer sibling + amber for ANY theatrical/red from council (not just direct theater or meta)', verify: `node -e '
  const fs=require("fs");
  const t=fs.readFileSync("engine/src/lib/ticket-emitter.ts","utf8");
  if(!/council\\/normal path[\\s\\S]{0,200}?theaterWaiverSibling/.test(t)) process.exit(1);
  console.log("AC3 OK: emitter forces sibling + amber for council theatrical/red");
'` },
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

  // === P0: Always attach proactive verify-theater / emission-honesty hardening ticket(s) at emission (Claude port, synthesis PRD) ===
  // For council / non-trivial batches, ensure at least one focused H-VERIFY-EMISSION-HONESTY-* is present (in addition to any debt healers).
  // This is the "when we emit tickets we immediately schedule the theater / quality fixers" invariant.
  // Leverages the same persist + healer pattern. The 4 broader ones (code-qual etc.) are the manager's responsibility per SKILL Step 3; this one is the emitter's unconditional hygiene guarantee.
  try {
    const isCouncil = (opts.generatedBy || '').toLowerCase().includes('council') || (opts.generatedBy || '').toLowerCase().includes('refine-prd');
    const alreadyHasHonesty = created.some(p => /H-VERIFY-EMISSION|HONESTY-EMIT/i.test(p));
    if (isCouncil && specs.length > 0 && !alreadyHasHonesty) {
      const hId = `H-VERIFY-EMISSION-HONESTY-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
      const hSpec: any = {
        id: hId,
        title: 'H-VERIFY: proactive emission honesty + verify-theater hardening (always-on at refine emission)',
        justification: 'Auto-attached by ticket-emitter per P0 port of Claude "shift-left at emission" (prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md). Every council refine batch now bakes in a dedicated auditor for the new gates (AC-shape, path/forward-ref hygiene, prescriptive template compliance, no-placeholder rule, readiness gate). Prevents future emission theater from reaching autonomous runs.',
        acceptanceCriteria: [
          { id: 'AC1', criterion: 'preflight + hygiene scan on emitted batch has 0 blocking findings (machinability, forward-ref annotation format, path_not_found, ac_shape via runAcShapeEnforcement, verify_theater). The hard AC-shape gate (evaluateAcShapeEnforcement + run*) is now ported and wired (per 2026-05-24 PRD + swarm agents).', verify: `node -e '
  const p = require("./engine/src/lib/pipeline-preflight.js");
  const hygiene = p.scanAnalystOutputsForUnverifiedPaths("", "dummy");
  const mach = p.checkVerifyMachinability("node -e \\"console.log(42)\\"");
  const ac = p.runAcShapeEnforcement({ac_shape_smells: [], tickets: []});
  console.log("hygiene errors=" + (hygiene.errors||[]).length + " machinability=" + mach.isMachineCheckable + " ac_shape=" + ac);
  if ((hygiene.errors||[]).length !== 0 || ac !== 0) process.exit(1);
  console.log("AC1 OK (full gates including ac_shape enforcement active)");
'` },
          { id: 'AC2', criterion: 'All tickets in batch (including this one) use the prescriptive "— Verify: `cmd` — Type: ..." form + Test Expectations table with no placeholders', verify: `node -e '
  const fs=require("fs"),p=require("path"); let good=0;
  try {
    const dirs=fs.readdirSync("tickets").filter(d=>fs.statSync(p.join("tickets",d)).isDirectory());
    for(const d of dirs){ const f=p.join("tickets",d,"ticket.md"); if(fs.existsSync(f)){ const c=fs.readFileSync(f,"utf8"); if(/— Verify:/.test(c) && !/TODO|{{/.test(c)) good++; } }
  }catch(e){}
  if(good<1)process.exit(1); console.log("AC2 OK: "+good+" prescriptive tickets");
'` },
          { id: 'AC3', criterion: 'ticket-emitter.ts contains the always-attach proactive honesty block and generateTicketMarkdown emits the Test Expectations + forward-ref hygiene comments (ref the 2026-05-24 prd)', verify: `node -e '
  const fs=require("fs"); const t=fs.readFileSync("engine/src/lib/ticket-emitter.ts","utf8");
  if(!/P0: Always attach proactive verify-theater[\\s\\S]{0,300}?proactive/.test(t) || !/Test Expectations[\\s\\S]{0,100}?NO PLACEHOLDERS/.test(t)) process.exit(1);
  console.log("AC3 OK: emitter + markdown have honesty block + expectations hygiene");
'` },
        ],
        scope: `engine/src/lib/ticket-emitter.ts\nskills/pickle-refine-prd/SKILL.md\nengine/src/lib/pipeline-preflight.ts\nreferences/refine/ticket-template.md\nreferences/personas/*.md`,
        category: 'h-verify',
        severity: 'P0',
        sourcePrd: (specs[0] as any)?.sourcePrd,
        hardeningTickets: 'Hardens the emission path itself (the root cause of prior stalls).',
      };
      const hVerifyJoined = hSpec.acceptanceCriteria.map((a:any)=>a.verify).join('\n');
      // FIX: correct arg order (scope string first, then verifyContent). hSpec has .scope.
      const hRead = assessMetaReadiness((hSpec.scope || ''), hVerifyJoined, { ...(opts.grokRoot ? {grokRoot:opts.grokRoot} : {}) });
      const hMd = generateTicketMarkdown(hSpec, { generatedBy: (opts.generatedBy||'refine-prd council') + ' + auto proactive honesty', ...(opts.grokRoot?{grokRoot:opts.grokRoot}: {}) });

      // AC-shape hard gate call (evaluate/run from lib/ac-shape.ts; port of claude spawn-refinement-team:1410 per agents).
      // Forward-ref RE now in dedicated lib/forward-ref-annotation.ts (exact port of claude services/forward-ref-annotation.ts:1).
      // Tranche 4 complete: ac_shape_smells now plumbed for council paths via optional EmitOptions.acShapeSmells (passed from SKILL manager Step 3 parse of analyst ## ac_shape_smells JSON blocks + Step 4 handoff to emitRefineCouncilTickets). Absent/omitted => [] (tranche9: self-prd-generator + meta paths now forward real ac_shape_smells via collected; prior unchanged note retired). The hard gate (runAcShapeEnforcement) on *all* emit paths now receives real analyst data where the 3-council produces it. See exact map from subagent 019e69dd-2f3a..., SKILL.md Step 3/4, AGENTS.md:38 post-fix, reliability-backlog tranche4 entry. (Prior self-ack "data model limit" comment retired.)
      // Hygiene scan (machinability + forward-ref one-space + path_not_found) also runs here post-emit.
      try {
        const acManifest = { ac_shape_smells: (opts as any).acShapeSmells || [], tickets: specs };
        const acStatus = runAcShapeEnforcement(acManifest);
        if (acStatus !== 0) {
          console.error('[ticket-emitter] AC-shape hard gate fired (violations). H-VERIFY-EMISSION-HONESTY sibling will audit/repair. No amber for this class on council/meta paths.');
        }
      } catch (e: any) {
        console.error('[ticket-emitter] AC-shape gate error during emit (investigate):', e?.message || e);
      }
      const hMeta = { title: hSpec.title, status:'pending', phasesCompleted:[], category:hSpec.category, severity:hSpec.severity, sourcePrd:hSpec.sourcePrd, justification:hSpec.justification, isHardening:true, readiness:hRead, ...hSpec };
      const hPath = await sm.persistTicket(sessionDir, hSpec.id, hMd, hMeta);
      created.push(hPath);
      hardeningCount++;
      console.log(`[ticket-emitter] Auto-attached proactive emission-honesty hardening ticket ${hId}`);
    }
  } catch (e:any) {
    console.warn('[ticket-emitter] proactive honesty attach non-fatal:', e?.message||e);
  }

  // Post-synthesis emission quality hygiene (now unified in pipeline-preflight).
  // Uses the strengthened scanAnalystOutputsForUnverifiedPaths (git ls-files + exact forward-ref annotations)
  // + checkVerifyMachinability layered on detectVerifyTheater.
  // tranche5: after hygiene scan, best-effort write emission_quality.json (when sessionDir context) so richer ac_shape_smells + annotation_format_malformed reach self-prd/closer (CrossPhase precedent).
  // No separate report file (reuses existing preflight diagnostics + the auto-attached H-VERIFY-EMISSION-HONESTY ticket).
  try {
    const allText = specs.map(s => `${s.justification || ''} ${s.acceptanceCriteria.map(a => `${a.criterion} ${a.verify}`).join(' ')} ${s.scope || ''}`).join('\n');
    // FIX: use directly imported named functions (no "preflight." namespace; was ReferenceError before)
    const hygiene = scanAnalystOutputsForUnverifiedPaths('', allText, opts.grokRoot || process.cwd());
    const badMach = specs.flatMap(s => s.acceptanceCriteria.map(ac => ({ id: ac.id, m: checkVerifyMachinability(ac.verify || '') }))).filter(x => !x.m.isMachineCheckable);
    if (hygiene.errors.length || badMach.length) {
      console.error(`[ticket-emitter] emission quality: ${hygiene.errors.length} hygiene errors + ${badMach.length} low-machinability (see preflight + auto H-VERIFY-EMISSION-HONESTY ticket)`);
    }
    // tranche5 Green (exact at post-emit hygiene try block after hygiene=scan call, per map):
    // best-effort fs.writeFileSync of emission_quality.json (non-fatal). Mirrors CrossPhase in post-campaign/self-prd.
    try {
      if (sessionDir) {
        const eq = {
          ac_shape_smells: (opts as any).acShapeSmells || [],
          annotation_format_malformed: hygiene.annotation_format_malformed || []
        };
        fs.writeFileSync(path.join(sessionDir, 'emission_quality.json'), JSON.stringify(eq, null, 2));
      }
    } catch (e: any) {
      console.warn('[ticket-emitter] emission_quality.json write non-fatal (tranche5):', e?.message || e);
    }
  } catch (e: any) {
    console.warn('[ticket-emitter] post-emit hygiene scan non-fatal:', e?.message || e);
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
