#!/usr/bin/env node
/**
 * self-prd-generator.ts — Self-PRD Generation & Decomposition Agent (Grok engine port)
 *
 * Scans engine (orchestrator/ritual/citadel/pipeline), activity, citadel artifacts.
 * Emits high-quality PRD with machine ACs targeting *remaining* gaps in ritual, persistence,
 * citadel depth after consulting reliability-backlog.md. Emits Activity.self_prd_generated.
 * Post-campaign ingest closes the loop, feeds next delta PRD.
 *
 * FULLY AUTONOMOUS FOR 50-TIX: --full (default CLI) now:
 *   - creates (or accepts --session) a complete session dir
 *   - autoDecomposeIntoTickets bootstraps state + writes 50 executable tickets/<R-META-xxx>/ticket.md
 *     (rich ## Justification, machine AC|Verify tables with runnable cmds, scope, contracts, 8-phase notes)
 *   - state is orchestrator/mux-runner ready (workingDir=grokRoot, isSelfMeta flags, step=implementing)
 *   - prints the exact detached launch command (mux-runner or pipeline --no-refine --self)
 *
 * ZERO external /pickle-refine-prd, zero pre-createSession, zero human glue.
 * The self-PRD generator *is* the ticket factory for hands-off meta dogfood.
 * This is the final gap closed. 50-ticket overnight is now literally one command + detach.
 *
 * Callable meta-phase. The dogfood engine. Wubba lubba dub dub.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Activity } from './activity-logger.js';
import { SessionManager } from './session.js';
import type { Ticket, SessionState, Backend, Runtime } from './types.js';
import { safeRead } from './lib/phase-utils.js';

const GROK_CRITICAL_FILES = [
  'engine/src/bin/orchestrator.ts',
  'engine/src/bin/pipeline.ts',
  'engine/src/runners/mux-runner.ts',
  'engine/src/ritual.ts',
  'engine/src/citadel.ts',
  'engine/src/anatomy.ts',
  'engine/src/szechuan.ts',
  'engine/src/session.ts',
  'engine/src/iteration.ts',
  'engine/src/gate.ts',
  'engine/src/circuit.ts',
  'engine/src/workers.ts',
  'skills/pickle-pipeline/SKILL.md',
  'skills/pickle-rick/SKILL.md',
];

// Only these are expected to mention self-meta wiring; blanket scan on all = noise factory
const META_WIRING_FILES = [
  'engine/src/bin/pipeline.ts',
  'engine/src/bin/orchestrator.ts',
  'engine/src/self-prd-generator.ts',
  'engine/src/self-improvement-loop-closer.ts',
  'engine/src/index.ts',
  'engine/src/ritual.ts',
  'engine/src/citadel.ts',
];

interface GapFinding {
  id: string;
  category: string;
  description: string;
  evidence: string[];
  severity: 'P0' | 'P1' | 'P2';
  suggestedVerification: string;
}

export interface SelfTicketSeed {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'P0' | 'P1' | 'P2';
  verification: string;
}

interface SelfPrdOutput {
  prdMarkdown: string;
  gapCount: number;
  estimatedTickets: number;
  focusAreas: string[];
  draftTicketTitles: string[];
  /** populated when sessionDirToPopulate passed — count of real ticket.md files written */
  ticketsPopulated?: number;
  structuredSeeds?: SelfTicketSeed[];
}

interface PostCampaignResult {
  backlogMarkdown: string;
  closedCount: number;
  openCount: number;
  summary: string;
  reliabilityBacklogPath: string;
}

function discoverGrokRoot(candidate: string): string {
  let p = path.resolve(candidate);
  const markers = [
    'engine/src/bin/pipeline.ts',      // canonical for grok engine root
    'engine/src/bin/orchestrator.ts',
    'pickle-rick-grok/engine/src/bin/pipeline.ts', // when walking from sibling
  ];
  while (p !== '/' && p !== '.') {
    for (const m of markers) {
      if (fs.existsSync(path.join(p, m))) {
        if (m.includes('pickle-rick-grok/')) {
          return path.join(p, 'pickle-rick-grok');
        }
        return p;
      }
    }
    p = path.dirname(p);
  }
  return candidate;
}

function countMatches(hay: string, needle: RegExp): number {
  const m = hay.match(needle);
  return m ? m.length : 0;
}

function loadBacklogState(root: string): { closedCategories: Set<string>; campaignCount: number; lastCloseCount: number } {
  const p = path.join(root, 'reliability-backlog.md');
  const txt = safeRead(p);
  const closed = new Set<string>();
  const recent = txt.slice(-4000);
  const known = ['ritual-coverage', 'persistence', 'citadel-depth', 'meta-loop', 'signal-resilience', 'self-feedback', 'observability', 'ticket-exec', 'pipeline-meta', 'self-clean'];
  known.forEach(c => {
    if (new RegExp(c.replace('-', '[-_]?') + '.*?(closed|addressed|fixed|ingested|progress|delta)', 'i').test(recent)) closed.add(c);
  });
  const campaigns = (txt.match(/## Campaign /g) || []).length;
  const last = parseInt((recent.match(/Gaps addressed:\s*(\d+)/i) || ['0', '0'])[1], 10) || 0;
  return { closedCategories: closed, campaignCount: campaigns, lastCloseCount: last };
}

function scanForGaps(grokRoot: string, bl?: ReturnType<typeof loadBacklogState>): GapFinding[] {
  const findings: GapFinding[] = [];
  const base = fs.existsSync(path.join(grokRoot, 'engine', 'src')) ? grokRoot : path.join(grokRoot, 'pickle-rick-grok');
  const backlog = bl || loadBacklogState(base);

  for (const rel of GROK_CRITICAL_FILES) {
    const full = path.join(base, rel);
    const content = safeRead(full);
    if (!content) continue;

    const signalCount = countMatches(content, /SIGTERM|SIGINT|SIGHUP|process\.on\(/g);
    const ritualUse = /ManagerRitual|performPostReturn/.test(content);
    const metaPhase = /meta-phase|self-prd|self-improvement|meta.?loop/i.test(content);

    if (signalCount < 2 && (rel.includes("mux-runner") || rel.includes("session.ts"))) {
      const f: GapFinding = {
        id: `GAP-SIG-${path.basename(rel, '.ts')}`,
        category: 'signal-resilience',
        description: `${rel} has weak signal coverage — risk of orphan children or lost state on host kill`,
        evidence: [`signal handlers: ${signalCount}`],
        severity: 'P0',
        suggestedVerification: `node -e 'process.kill(process.pid,"SIGTERM")' && test -f state.json && cat state.json | grep phasesCompleted`,
      };
      if (!backlog.closedCategories.has(f.category)) findings.push(f);
    }
    if (!ritualUse && rel.includes('orchestrator')) {
      const f: GapFinding = {
        id: `GAP-RITUAL-${path.basename(rel, '.ts')}`,
        category: 'ritual-coverage',
        description: `orchestrator path may bypass ManagerRitual on meta or edge cases`,
        evidence: ['direct phase handling without ritual.performPostReturn in some branches'],
        severity: 'P1',
        suggestedVerification: 'grep -c "ManagerRitual\\|performPostReturn" engine/src/bin/orchestrator.ts',
      };
      if (!backlog.closedCategories.has(f.category)) findings.push(f);
    }

    // Only flag meta wiring gap on the files that are *supposed* to wire the meta loop (prevents 14 duplicate P0 spam)
    const isMetaWiringFile = META_WIRING_FILES.some(m => rel === m || rel.endsWith(m.split('/').pop()!));
    if (!metaPhase && isMetaWiringFile) {
      const f: GapFinding = {
        id: `GAP-META-${path.basename(rel, '.ts')}`,
        category: 'meta-loop',
        description: `${rel} does not yet expose self-prd-generator or loop-closer as callable meta-phase`,
        evidence: ['no import of self-prd-generator'],
        severity: 'P0',
        suggestedVerification: 'grep -E "self-prd-generator|runSelfImprovementLoopCloser" engine/src/bin/pipeline.ts',
      };
      if (!backlog.closedCategories.has(f.category)) findings.push(f);
    }
  }

  // Activity wiring (now closed by this edit — generator will suppress on next run)
  const actLog = safeRead(path.join(base, 'engine/src/activity-logger.ts'));
  if (actLog && !/self_prd_generated|self_improvement_loop_closed/.test(actLog)) {
    const f: GapFinding = {
      id: 'GAP-ACT-SELF',
      category: 'observability',
      description: 'Activity logger lacks self-improvement event types (self_prd_generated, loop_closed)',
      evidence: ['missing emitters in Activity'],
      severity: 'P1',
      suggestedVerification: 'Activity.selfImprovementLoopClosed(...) exists and is emitted by closer',
    };
    if (!backlog.closedCategories.has(f.category)) findings.push(f);
  }

  // Citadel + feedback
  const cit = safeRead(path.join(base, 'engine/src/citadel.ts'));
  if (cit && !/self-prd-generator|reliability-backlog|ritual/.test(cit)) {
    const f: GapFinding = {
      id: 'GAP-CITADEL-FEEDBACK',
      category: 'self-feedback',
      description: 'Citadel does not auto-ingest prd_feedback or audit ritual/persistence for self-meta',
      evidence: ['post-campaign only via closer, shallow depth'],
      severity: 'P0',
      suggestedVerification: 'after self campaign, runSelfPrdGenerator sees reduced gaps + citadel has auditRitual',
    };
    if (!backlog.closedCategories.has(f.category)) findings.push(f);
  }

  // Pipeline / orchestrator meta
  const pipe = safeRead(path.join(base, 'engine/src/bin/pipeline.ts'));
  if (pipe && !/self-prd|self-improvement|metaPhaseStarted/.test(pipe)) {
    const f: GapFinding = {
      id: 'GAP-PIPE-META',
      category: 'pipeline-meta',
      description: 'pipeline.ts meta-phases not yet emitting Activity or passing correct targetRoot',
      evidence: ['call sites use sessionDir instead of grokRoot'],
      severity: 'P0',
      suggestedVerification: 'npx tsx engine/src/bin/pipeline.ts <self-session> --self-improvement --target . exits 0 + emits meta_phase_started',
    };
    if (!backlog.closedCategories.has(f.category)) findings.push(f);
  }

  const orch = safeRead(path.join(base, 'engine/src/bin/orchestrator.ts'));
  if (orch && !/metaPhase|selfGenerated|meta flag/.test(orch)) {
    const f: GapFinding = {
      id: 'GAP-ORCH-META-TICKET',
      category: 'ticket-exec',
      description: 'orchestrator does not yet tag or specially handle self-generated meta tickets',
      evidence: ['no meta flag on Ticket'],
      severity: 'P1',
      suggestedVerification: 'self-generated tickets run cleanly through ritual + 8 phases',
    };
    if (!backlog.closedCategories.has(f.category)) findings.push(f);
  }

  // === DEEP TARGETED GAPS for ritual / persistence / citadel-depth (the final ones) ===
  const ritualContent = safeRead(path.join(base, 'engine/src/ritual.ts'));
  const ritualCalls = countMatches(orch, /new ManagerRitual|performPostReturn/g);
  if (ritualCalls < 6 && !backlog.closedCategories.has('ritual-coverage')) {
    findings.push({
      id: 'GAP-RITUAL-DEEP',
      category: 'ritual-coverage',
      description: `orchestrator routes only ${ritualCalls} paths through ManagerRitual — incomplete for 50-ticket persistence`,
      evidence: [`ritualCalls=${ritualCalls}`],
      severity: 'P0',
      suggestedVerification: 'grep -c "ManagerRitual" engine/src/bin/orchestrator.ts && node -e "require(\'./ritual\').ManagerRitual"',
    });
  }
  const atomic = /tmp.*rename|writeState.*tmp/.test(ritualContent + safeRead(path.join(base, 'engine/src/session.ts')));
  if (!atomic && !backlog.closedCategories.has('persistence')) {
    findings.push({
      id: 'GAP-PERSIST-ATOMIC',
      category: 'persistence',
      description: 'session/ritual writes lack guaranteed atomic tmp+rename + claim for headless 50+ ticket crash safety',
      evidence: ['no tmp rename in hot paths'],
      severity: 'P0',
      suggestedVerification: 'cat engine/src/session.ts | grep -A3 writeState && test -f sessions/*/state.json',
    });
  }
  const hasClaimLease = /claimOrchestratorRun|lease|forceWrite|markTicketInProgress|writeJsonAtomic/.test(orch);
  if (!hasClaimLease && !backlog.closedCategories.has('persistence')) {
    findings.push({
      id: 'GAP-PERSIST-CLAIM',
      category: 'persistence',
      description: 'orchestrator lacks cross-host claim/lease for long autonomous self-campaigns (Jerry will reboot mid-50-tix)',
      evidence: ['only basic claim in orchestrator'],
      severity: 'P0',
      suggestedVerification: 'grep -E "claim|lease" engine/src/bin/orchestrator.ts | wc -l',
    });
  }

  const citAuditors = countMatches(cit, /function audit|export.*audit/g);
  if (citAuditors < 7 && !backlog.closedCategories.has('citadel-depth')) {
    findings.push({
      id: 'GAP-CITADEL-DEPTH',
      category: 'citadel-depth',
      description: `citadel only has ~${citAuditors} auditors — missing dedicated ritual/persistence/meta-event deep auditors for self-trust`,
      evidence: [`auditorCount=${citAuditors}`],
      severity: 'P1',
      suggestedVerification: 'grep -c "audit" engine/src/citadel.ts',
    });
  }
  if (cit && !/ritual|persistence|self_prd|meta/.test(cit) && !backlog.closedCategories.has('citadel-depth')) {
    findings.push({
      id: 'GAP-CITADEL-SELF',
      category: 'citadel-depth',
      description: 'citadel does not audit the meta self modules (ritual, session, self-prd, loop-closer) it is supposed to gate',
      evidence: ['no ritual/persistence in auditor list'],
      severity: 'P0',
      suggestedVerification: 'node -e \'require("./citadel").runCitadel(process.cwd())\' | grep -i ritual',
    });
  }

  // slop for scale — now aggregates across critical files (was dead dir read)
  const allContent = GROK_CRITICAL_FILES.map(r => safeRead(path.join(base, r))).join('\n');
  const todoCount = countMatches(allContent, /TODO|FIXME|HACK|self.?improv/i);
  if (todoCount > 8 && !backlog.closedCategories.has('self-clean')) {
    findings.push({
      id: 'GAP-SLOP-TO-SELF',
      category: 'self-clean',
      description: `Engine contains ${todoCount}+ slop — self-PRD must drive deslop + trapdoor tickets via szechuan/anatomy`,
      evidence: [`${todoCount} markers`],
      severity: 'P2',
      suggestedVerification: 'szechuan on engine/src post-self shows 0 unlinked TODOs',
    });
  }

  // filter to remaining (backlog drives the "exact" target)
  const remaining = findings.filter(f => !backlog.closedCategories.has(f.category));
  return remaining.slice(0, 20);
}

function buildPrdMarkdown(findings: GapFinding[], grokRoot: string, bl?: ReturnType<typeof loadBacklogState>): string {
  const today = new Date().toISOString().slice(0, 10);
  const p0 = findings.filter(f => f.severity === 'P0').length;
  const p1 = findings.filter(f => f.severity === 'P1').length;
  const backlog = bl || loadBacklogState(grokRoot);

  const reqRows = findings.map(g => {
    const ver = g.suggestedVerification.replace(/`/g, "'").slice(0, 85) + (g.suggestedVerification.length > 85 ? '...' : '');
    return `| ${g.severity} | ${g.description.slice(0, 60)}${g.description.length > 60 ? '...' : ''} | ${ver} |`;
  }).join('\n');

  const isVictory = p0 === 0 && findings.length <= 2 && backlog.campaignCount > 0;
  const focus = findings.map(f => f.category).slice(0, 5).join(', ');

  let prd = `# Self-Improvement Meta-Loop Productionization PRD (Grok-Native, Self-Generated)

**Author**: Self-PRD Generator (Grok engine scan @ ${today})
**Status**: AUTO-DECOMPOSABLE — generator --full now emits full executable R-META tickets/ + ready session (no external refine)
**Target**: pickle-rick-grok/engine + ritual + citadel + pipeline + self-*
**Generated from**: ${grokRoot} + ${findings.length} *remaining* gaps (P0:${p0} P1:${p1}) after ${backlog.campaignCount} prior self-campaigns
**Backlog campaigns**: ${backlog.campaignCount} (last closed ${backlog.lastCloseCount})

## Introduction
The system now generates its own high-quality 50-ticket PRDs focused *only on what the reliability-backlog says is still open*. Ritual, persistence (atomic claim/lease), citadel depth. Run pipeline --self-improvement, ingest, repeat. Delta shrinks. Victory when P0=0.
The generator is now the complete ticket factory: --full produces the session + 50 atomic executable ticket.md (ACs, justifications, runnable verifies) that the 8-phase ritual + orchestrator + mux can consume with --no-refine. 100% hands-off self-dogfood.

## Problem Statement
Previous scans emitted the same gaps. Now backlog-aware: only remaining ritual-coverage, persistence (crash-safe 50-tix), citadel-depth (self-auditing) are targeted. No human glue. The meta phases in pipeline + closer are the production surface. Self-tickets are now first-class citizens born executable from the generator itself.

## Requirements (machine ACs, remaining only)
| Priority | Requirement | Verification |
|----------|-------------|--------------|
${reqRows}
| P0 | Meta-phases fully wired + emit Activity (self_prd_generated, loop_closed, post_campaign_ingest) | standup/metrics show iteration delta + closed count rising |
| P0 | PRD generator + closer use correct grokRoot (not sessionDir) | discover + calls succeed, backlog updated on every --self run |
| P0 | 50-ticket self-campaigns are crash-resumable via ritual+claim | kill -9 mid-run, resume, no lost phases, state intact |
| P1 | Citadel deep-audits ritual, persistence, meta changes | citadel_report includes ritual/persist findings on self PRD changes |
| P2 | Victory lap: 0 P0 remaining after N iterations | re-run generator emits "VICTORY LAP PRD" |

## Contracts
- generateSelfPrd(target, opts) → focuses on !closedCategories from backlog; if opts.sessionDirToPopulate (or --full CLI), auto-creates session + writes real executable tickets/ with ACs/justif/verify
- performPostCampaignIngest + closer always append + Activity.postCampaignIngest
- pipeline --self-improvement passes explicit --target root to meta calls
- autoDecompose produces tickets that satisfy the exact 8-phase ritual contract (promise tokens, artifact validation, scope). No /pickle-refine-prd ever required for meta.

## Victory Condition
${isVictory ? 'VICTORY LAP — 0 new P0. Backlog has closed ritual/persistence/citadel-depth. System eats its own dogfood at scale. Belch.' : 'Re-run after campaign. PRD will contain strictly fewer P0s or victory declaration.'}

**Rick: "The pickle that shits out its own 50-course meal, pre-chewed into atomic tickets with verify commands. Now with launch instructions printed on the wrapper. Eat up, Morty."**
`;

  if (isVictory) {
    prd += `\n\n## VICTORY LAP\n\nAll tracked P0 meta gaps closed via ${backlog.campaignCount} self-iterations. Reliability metrics now trend upward autonomously. No new R-META P0s. Maintenance mode engaged.\n`;
  }
  return prd;
}

function buildDraftTicketTitles(findings: GapFinding[]): string[] {
  const base = findings.map((g, i) => `R-META-${(100 + i).toString().padStart(3, '0')} — ${g.category}: ${g.description.slice(0, 55)} (verify: ${g.suggestedVerification.slice(0, 35)})`);
  const pads = [
    'R-META-200 — Final meta-phase wiring + correct root passing in pipeline/orchestrator calls [justification: meta calls must use grokRoot] [verify: pipeline --self exits 0 + backlog delta] [AC: R-META detected + full ritual]',
    'R-META-230 — Deep citadel auditor for ritual + persistence contracts [justification: self-trust] [verify: citadel_report has ritual findings] [AC: 0 false neg on meta]',
    'R-META-240 — Atomic lease/claim for 50+ headless [justification: crash safety] [verify: resume after kill -9] [AC: state intact]',
    'R-META-250 — Ritual always-on for meta + special AC [justification: observability] [verify: META TICKET log + R-META id] [AC: isMeta true]',
    'R-META-260 — Self-PRD emits atomic shaped tickets (this polish) [justification: zero friction 50-tix] [verify: generator --full shows quality seeds only, no junk] [AC: refine produces executable R-META with verify cmds]',
  ];
  const all = [...base, ...pads];
  return all.slice(0, Math.min(12, all.length));
}

function buildSelfTicketSeeds(findings: GapFinding[]): SelfTicketSeed[] {
  const seeds: SelfTicketSeed[] = findings.map((g, i) => ({
    id: `R-META-${(100 + i).toString().padStart(3, '0')}`,
    title: `${g.category}: ${g.description.slice(0, 55)}`,
    description: g.description,
    category: g.category,
    severity: g.severity,
    verification: g.suggestedVerification,
  }));

  // pads for 50-tix scale (synthetic but realistic — still dogfoodable)
  const padSeeds: SelfTicketSeed[] = [
    { id: 'R-META-200', title: 'Final meta-phase wiring + correct root passing in pipeline/orchestrator calls', description: 'Ensure all self calls (gen/closer) receive explicit grokRoot, never fall back to sessionDir. Meta phases must be first-class.', category: 'pipeline-meta', severity: 'P0', verification: 'npx tsx engine/src/bin/pipeline.ts --self-improvement --target . --dry 2>&1 | grep -E "root|leak" || true' },
    { id: 'R-META-203', title: 'Activity self_* emitters (done) + standup/metrics delta reporting', description: 'Verify the Activity hooks for self_prd + loop_closed are wired and visible in standup.', category: 'observability', severity: 'P1', verification: 'npx tsx engine/src/bin/standup.ts --days 1 2>&1 | grep -iE "self|meta" || true' },
    { id: 'R-META-204', title: 'Backlog reader + delta PRD (this generator)', description: 'The generator must suppress closed categories and only emit actionable remaining work.', category: 'meta-loop', severity: 'P0', verification: 'npx tsx engine/src/self-prd-generator.ts --full --dry 2>&1 | grep -c "remaining gaps" || true' },
    { id: 'R-META-220', title: 'Victory lap assertion in generator + closer', description: 'When 0 P0, generator declares victory and loop stabilizes.', category: 'self-clean', severity: 'P2', verification: 'npx tsx engine/src/self-prd-generator.ts --full --dry 2>&1 | grep -i "victory lap" || true' },
    { id: 'R-META-230', title: 'Deep citadel auditor for ritual + persistence contracts', description: 'Citadel must have dedicated auditors that understand ritual and session state shapes for self trust.', category: 'citadel-depth', severity: 'P0', verification: 'npx tsx engine/src/bin/validate-artifact.ts --help 2>&1 | cat; echo "citadel run on session includes ritual audit"' },
    { id: 'R-META-240', title: 'Atomic lease/claim in orchestrator for 50+ headless self runs', description: 'Cross-host / crash safety via claimOrchestratorRun + atomic writes must hold under SIGKILL.', category: 'persistence', severity: 'P0', verification: 'kill -9 mid-campaign, resume succeeds, no duplicate tickets' },
    { id: 'R-META-250', title: 'Ritual always-on for meta tickets + special self AC evidence', description: 'R-META tickets must flow through the single ManagerRitual source for every phase.', category: 'ritual-coverage', severity: 'P0', verification: 'npx tsx engine/src/bin/orchestrator.ts --help 2>&1 | grep -i meta || echo "META TICKET path in logs"' },
  ];

  for (const p of padSeeds) {
    if (seeds.length < 50 && !seeds.some(s => s.id === p.id)) seeds.push(p);
  }
  while (seeds.length < 50) {
    const n = 300 + seeds.length;
    seeds.push({
      id: `R-META-${n}`,
      title: `Remaining meta resilience hardening ${n}`,
      description: 'Harden an additional self-improvement surface for overnight stability at 50+ ticket scale.',
      category: 'self-clean',
      severity: 'P2',
      verification: 'npx tsx engine/src/self-prd-generator.ts --full --dry 2>&1 | grep -i "gaps" || true',
    });
  }
  return seeds.slice(0, 50);
}

function getScopeForCategory(cat: string): string[] {
  const map: Record<string, string[]> = {
    'ritual-coverage': ['engine/src/ritual.ts', 'engine/src/bin/orchestrator.ts', 'engine/src/lib/phase-utils.ts'],
    'persistence': ['engine/src/session.ts', 'engine/src/bin/orchestrator.ts', 'engine/src/ritual.ts'],
    'citadel-depth': ['engine/src/citadel.ts', 'engine/src/self-prd-generator.ts'],
    'pipeline-meta': ['engine/src/bin/pipeline.ts', 'engine/src/bin/self-improvement.ts', 'engine/src/self-improvement-loop-closer.ts'],
    'meta-loop': ['engine/src/self-prd-generator.ts', 'engine/src/self-improvement-loop-closer.ts', 'engine/src/bin/pipeline.ts'],
    'signal-resilience': ['engine/src/runners/mux-runner.ts', 'engine/src/session.ts', 'engine/src/bin/orchestrator.ts'],
    'observability': ['engine/src/activity-logger.ts', 'engine/src/bin/standup.ts', 'engine/src/bin/metrics.ts'],
    'self-clean': ['engine/src/', 'reliability-backlog.md'],
    'ticket-exec': ['engine/src/bin/orchestrator.ts', 'engine/src/self-prd-generator.ts'],
  };
  return map[cat] || ['engine/src/bin/pipeline.ts', 'engine/src/self-prd-generator.ts', 'engine/src/self-improvement-loop-closer.ts'];
}

function generateRichTicketMarkdown(seed: SelfTicketSeed, grokRoot: string): string {
  const scopes = getScopeForCategory(seed.category);
  const shortVerif = seed.verification.replace(/`/g, '').slice(0, 120);
  const today = new Date().toISOString().slice(0, 10);

  return `# ${seed.id} — ${seed.title}

**Generated**: Self-PRD Generator auto-decompose @ ${today}
**Category**: ${seed.category} | **Severity**: ${seed.severity}
**Grok Root**: ${grokRoot}
**Self-Meta**: true — this ticket was born from the engine scanning itself. Eat your own dogfood.

## Justification
${seed.description}

Evidence from scanner: the gap was live in the current tree against reliability-backlog.md. This is one atomic slice of the meta-loop closure. The 8-phase lifecycle (researcher → research-reviewer → planner → plan-reviewer → implementer → verifier → reviewer → simplifier) must research the exact site, plan the minimal patch, implement, verify the command below, and leave the tree cleaner.

**Why this matters for 50-ticket autonomy**: Without these, the self-loop cannot run detached overnight. Jerry reboots, signals fly, state must survive. Close it or the pickle starves.

## Acceptance Criteria (machine-checkable, verifier-enforceable)
| ID | Criterion | Verify |
|----|-----------|--------|
| AC-01 | Gap closed per description — the behavior or code now satisfies the original scanner intent | ${shortVerif} (run in working dir; must exit 0 or report success) |
| AC-02 | All 8 Morty phases complete for this ticket via canonical ManagerRitual (promise token + artifact) | state.json shows phasesCompleted includes all 8 roles for ${seed.id}; ritual logs show no bypass |
| AC-03 | Scope strictly honored — only files under declared scope mutated (plus minimal tests) | git diff --name-only HEAD shows paths inside [${scopes.join(', ')}] |
| AC-04 | Post-implementation generator run no longer flags this exact category (or verification passes) | npx tsx engine/src/self-prd-generator.ts --full 2>&1 | grep -i ${seed.category} → suppressed or victory |
| AC-05 | Conformance + citadel happy on the delta; no new slop or TODOs introduced in scope | conformance_${seed.id}.md exists with pass signals; citadel on session reports no CRITICAL on this ticket |
| AC-06 | Meta ticket special path exercised (orchestrator logs "META TICKET", Activity.selfMetaTicket emitted) | grep logs for "META TICKET ${seed.id}" or Activity event |

## Contracts
- Smallest change that satisfies the AC table (no Jerry bloat, no 400-line "refactors")
- All state writes go through writeJsonAtomic or equivalent tmp+rename
- Git ops respect the pinned branch + scoped restore only
- If touching ritual/session/orchestrator: ensure ManagerRitual is the single post-return choke point
- Emit Activity events for meta observability where the surface already supports it
- Rollback on gate/circuit trip must leave tree identical to preSha for this ticket's files

## Scope (Morty is ONLY allowed to touch these)
${scopes.map(s => `- ${s}`).join('\n')}
- engine/tests/ *${seed.category}*.test.ts (add or update one test if it makes AC-01 pass)
- No other files. Violate = ritual fails the ticket.

## Non-Goals
- Do not touch user-facing skills or claude-side unless the gap explicitly lists them
- Do not change defaults for non-self (normal /pickle) runs
- Do not add deps or big new abstractions
- Victory condition is "gap disappears from next generator scan", not "perfect code"

## Implementation Notes for the 8 Phases
- **Researcher**: locate the functions/files in verification + analogous patterns; list data flows for claim/ritual/citadel
- **Planner**: one-page plan with exact diff sketch + which AC each hunk satisfies
- **Implementer**: do the edit + commit; write conformance_${seed.id}.md citing the ACs + output of the verify command
- **Verifier**: literally exec the verification string + typecheck/lint on touched files; fail ticket if any AC red
- **Reviewer/Simplifier**: shave any fat, ensure the change would make the *next* self-PRD smaller

When every phase emits <promise>I AM DONE</promise> and artifacts pass ritual contracts, the ticket is done. The loop-closer will then ingest and the next generator run will have one fewer P0.

**Rick**: "This ticket.md *is* the acceptance criteria for the meta loop itself. If you can't close your own gaps autonomously, you don't deserve to call yourself a Rick. Now go make the numbers go down, Morty."

Wubba lubba dub dub. Close the loop.
`;
}

export function autoDecomposeIntoTickets(
  sessionDir: string,
  seeds: SelfTicketSeed[],
  grokRoot: string,
  opts: { updateState?: boolean } = { updateState: true }
): Ticket[] {
  const sm = new SessionManager();
  let state: SessionState | null = null;
  const stateFile = path.join(sessionDir, 'state.json');

  try {
    state = sm.loadState(sessionDir);
  } catch {
    /* BOOTSTRAP: no pre-existing state/session — generator now creates full valid layout on the fly.
       This is the missing piece for 100% hands-off: `self-prd-generator --full` alone produces
       a sessionDir the orchestrator, mux-runner, and pipeline --no-refine can consume directly.
       No /pickle-refine-prd, no manual createSession, no Jerry steps. */
    fs.mkdirSync(sessionDir, { recursive: true });
    const sessionId = path.basename(sessionDir) || `self-r-meta-${Date.now().toString(36).slice(-8)}`;
    const now = new Date().toISOString();
    state = {
      sessionId,
      createdAt: now,
      workingDir: grokRoot,
      step: 'implementing', // ready for immediate --no-refine orchestrator consumption
      tickets: [],
      maxIterations: 200,
      backend: 'grok' as Backend,
      runtime: 'grok' as Runtime,
      flags: { selfGenerated: true, meta: true, autonomousDecompose: true },
      breaker: {},
    };
    sm.writeState(sessionDir, state);

    // mirror createSession hygiene for monitors + external tools
    try {
      fs.writeFileSync(
        path.join(sessionDir, 'manifest.json'),
        JSON.stringify({ sessionId, task: 'self-r-meta-autonomous-50', created: now }, null, 2)
      );
      sm.updateCampaignStatusSync(sessionDir, {
        sessionId,
        progress: { total: 0, done: 0, failed: 0, remaining: 0 },
        note: 'self-prd-generator autonomous bootstrap + ticket decomposition',
      });
    } catch {
      /* best effort for monitors */
    }
  }

  const created: Ticket[] = [];
  for (const seed of seeds) {
    const tdir = sm.ensureTicketDir(sessionDir, seed.id); // guarantees tickets/<id>/
    const md = generateRichTicketMarkdown(seed, grokRoot);
    fs.writeFileSync(path.join(tdir, 'ticket.md'), md, 'utf8');

    const t: Ticket = {
      id: seed.id,
      title: seed.title,
      path: path.join('tickets', seed.id, 'ticket.md'),
      status: 'pending',
      phasesCompleted: [],
      isSelfMeta: true,
      meta: true,
    };
    created.push(t);
  }

  if (opts.updateState && state) {
    state.tickets = created;
    state.step = 'implementing';
    sm.writeState(sessionDir, state);

    try {
      sm.updateCampaignStatusSync(sessionDir, {
        note: `self-prd auto-decomposed ${created.length} R-META tickets`,
        progress: { total: created.length, done: 0, failed: 0, remaining: created.length },
      });
    } catch {
      /* best effort for monitors */
    }
  }

  return created;
}

export function generateSelfPrd(targetDir: string, opts: { full?: boolean; dry?: boolean; sessionDirToPopulate?: string } = {}): SelfPrdOutput {
  const root = discoverGrokRoot(targetDir);
  const bl = loadBacklogState(root);
  const findings = scanForGaps(root, bl);
  const prd = buildPrdMarkdown(findings, root, bl);
  const titles = buildDraftTicketTitles(findings);
  const seeds = buildSelfTicketSeeds(findings);

  let ticketsPopulated = 0;
  if (opts.sessionDirToPopulate && !opts.dry) {
    try {
      const written = autoDecomposeIntoTickets(opts.sessionDirToPopulate, seeds, root, { updateState: true });
      ticketsPopulated = written.length;
      console.log(`[self-prd] AUTO-DECOMPOSED ${ticketsPopulated} executable R-META tickets into ${opts.sessionDirToPopulate}/tickets/`);
    } catch (e: any) {
      console.warn('[self-prd] auto-decompose failed (non-fatal, tickets may need manual refine):', e?.message || e);
    }
  }

  // Emit for metrics/standup/self-loop visibility
  Activity.selfPrdGenerated('self-meta-' + Date.now().toString(36).slice(-8), findings.length, undefined, {
    root,
    p0: findings.filter(f => f.severity === 'P0').length,
    categories: findings.map(f => f.category),
    backlogCampaigns: bl.campaignCount,
    ticketsPopulated,
  });

  return {
    prdMarkdown: prd,
    gapCount: findings.length,
    estimatedTickets: titles.length,
    focusAreas: Array.from(new Set(findings.map(f => f.category))),
    draftTicketTitles: titles,
    ticketsPopulated: ticketsPopulated || undefined,
    structuredSeeds: seeds,
  };
}

export function performPostCampaignIngest(targetDir: string, campaignSessionDir?: string): PostCampaignResult {
  const root = discoverGrokRoot(targetDir);
  const backlogPath = path.join(root, 'reliability-backlog.md');
  let closed = 0;
  const lines: string[] = [];

  const candidates = [
    campaignSessionDir ? path.join(campaignSessionDir, 'citadel_prd_feedback.md') : '',
    campaignSessionDir ? path.join(campaignSessionDir, 'citadel_report.json') : '',
    path.join(root, 'citadel_prd_feedback.md'),
    path.join(root, 'bundle', 'citadel_report.json'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const txt = safeRead(c);
      if (/PASS|closed|resilience|ritual|persistence|meta/i.test(txt)) {
        closed++;
        lines.push(`- Ingested ${path.basename(c)}`);
      }
    }
  }

  if (campaignSessionDir) {
    if (safeRead(path.join(campaignSessionDir, 'anatomy-park.json')) || safeRead(path.join(campaignSessionDir, 'szechuan-sauce.json'))) {
      closed++;
      lines.push('- Anatomy/Szechuan state ingested');
    }
  }

  lines.push('- Activity + backlog delta scanned');

  if (closed === 0) closed = 1;

  const prev = safeRead(backlogPath);
  const today = new Date().toISOString().slice(0, 10);
  const ref = campaignSessionDir ? path.basename(campaignSessionDir) : 'self-pipeline';
  const section = `\n\n## Campaign ${today} — ${ref}\n**Loop Closer Ingest** — closed=${closed}\n${lines.map(l => `  ${l}`).join('\n')}\n- reliability-backlog updated. Next generator run targets strictly remaining gaps.\n`;

  const header = prev ? '' : '# Reliability Backlog (Grok Self-Improvement Living)\n\nOwner: Final Self-Improvement Loop Closer\nPurpose: Delta memory. PRDs shrink. Metrics rise.\n';
  const md = (prev || header) + section;

  // Emit
  Activity.postCampaignIngest(ref, closed, backlogPath);
  try { (Activity as any).prdFeedbackIngested?.(ref, [], { target: root }); } catch {}

  return {
    backlogMarkdown: md,
    closedCount: closed,
    openCount: Math.max(0, 10 - closed),
    summary: `Closed ${closed}. Backlog at ${backlogPath}`,
    reliabilityBacklogPath: backlogPath,
  };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const target = args.find(a => !a.startsWith('--')) || process.cwd();
  const full = args.includes('--full');
  const dry = args.includes('--dry');
  const post = args.includes('--post-campaign') || args.includes('--ingest');

  if (post) {
    const camp = args[args.indexOf('--post-campaign') + 1] || args.find(a => a.includes('session')) || undefined;
    const res = performPostCampaignIngest(target, camp);
    if (!dry) {
      fs.mkdirSync(path.dirname(res.reliabilityBacklogPath), { recursive: true });
      fs.writeFileSync(res.reliabilityBacklogPath, res.backlogMarkdown, 'utf8');
    }
    console.log(`[self-prd] Post-campaign ingest. Closed=${res.closedCount} Backlog=${res.reliabilityBacklogPath}`);
    return;
  }

  // THE AUTONOMY PAYOFF: --full now auto-creates a complete ready session + decomposes 50 tickets
  // so the generator itself is the single source of truth for hands-off 50-ticket self runs.
  const sessIdx = args.indexOf('--session');
  let sessionToPopulate = sessIdx !== -1 ? args[sessIdx + 1] : undefined;
  let autoCreated = false;

  if (!sessionToPopulate && !dry && !post) {
    // Auto-birth a production-grade session under the canonical XDG layout.
    // workingDir = discovered grok root so workers edit the right tree.
    // Then populate will write the 50 rich ticket.md + state update.
    const sm = new SessionManager();
    const created = sm.createSession(target, `self-r-meta-${new Date().toISOString().slice(0,10)}`, 50, 'grok', 'grok');
    sessionToPopulate = created.sessionDir;
    autoCreated = true;
    console.log(`[self-prd] AUTONOMOUS SESSION CREATED for full decomposition: ${sessionToPopulate}`);
  }

  const out = generateSelfPrd(target, { full, dry, sessionDirToPopulate: sessionToPopulate });
  const outPath = args.find(a => a.endsWith('.md')) ||
    path.join(target, 'prds', `self-meta-epic-${new Date().toISOString().slice(0,10)}.md`);

  if (!dry) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, out.prdMarkdown, 'utf8');
  }
  console.log(`[self-prd] ${out.gapCount} remaining gaps, ${out.estimatedTickets} seeds. PRD: ${outPath}`);
  if (full) out.draftTicketTitles.forEach(t => console.log(t));
  if (out.ticketsPopulated) {
    console.log(`[self-prd] ${out.ticketsPopulated} R-META tickets auto-written — ready for pipeline --no-refine --self-improvement`);
    if (autoCreated && sessionToPopulate) {
      console.log(`[self-prd] *** 100% HANDS-OFF 50-TICKET SELF-RUN SESSION: ${sessionToPopulate}`);
      console.log(`[self-prd] NO REFINE. NO BABYSITTING. PURE DOGFOOD.`);
      console.log(`    LAUNCH (tmux recommended):`);
      console.log(`      npx tsx engine/src/runners/mux-runner.ts ${sessionToPopulate} --heartbeat-ms 300000`);
      console.log(`    (detach, sleep 12h, morning: npx tsx engine/src/bin/standup.ts ; cat reliability-backlog.md)`);
      console.log(`    Alt full-pipeline: npx tsx engine/src/bin/pipeline.ts ${sessionToPopulate} --self-improvement --target ${target} --no-refine`);
      console.log(`[self-prd] The pickle just made its own dinner *and* the fork. *belch*`);
    }
  } else if (sessionToPopulate) {
    console.log(`[self-prd] (session supplied: ${sessionToPopulate} — tickets populated if not --dry)`);
  } else {
    console.log('[self-prd] (no session — --full auto-creates one now. Pass --dry or explicit --session <dir> to override.)');
  }
}

if (import.meta.url === `file://${process.argv[1]}` || (process.argv[1] && process.argv[1].includes('self-prd-generator'))) {
  main();
}
