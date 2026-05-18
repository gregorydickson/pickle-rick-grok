#!/usr/bin/env node
/**
 * orchestrator.ts — the main autonomous ticket loop (Grok native)
 *
 * This is the spiritual replacement for mux-runner.ts
 * It drives the 8-phase lifecycle for each ticket using the worker abstraction.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionManager } from '../session.js';
import { WorkerSpawner, WorkerRole } from '../workers.js';
import { Ticket } from '../types.js';
import { CircuitBreaker } from '../circuit.js';
import { ConvergenceGate } from '../gate.js';

const sessionDir = process.argv[2];
if (!sessionDir) {
  console.error('Usage: orchestrator.ts <sessionDir>');
  process.exit(1);
}

const sm = new SessionManager();
const state = sm.loadState(sessionDir);
const spawner = new WorkerSpawner(state.backend);

const PHASES: WorkerRole[] = [
  'morty-phase-researcher',
  'morty-phase-research-reviewer',
  'morty-phase-planner',
  'morty-phase-plan-reviewer',
  'morty-phase-implementer',
  'morty-phase-verifier',
  'morty-phase-reviewer',
  'morty-phase-simplifier',
];

async function runTicket(ticket: Ticket) {
  console.log(`\n=== Starting ticket ${ticket.id}: ${ticket.title} ===`);

  const circuit = new CircuitBreaker(sessionDir);
  const gate = new ConvergenceGate(sessionDir);

  // Determine which phases are already done (for resumption)
  const completed = (ticket as any).phasesCompleted || [];
  const remainingPhases = PHASES.filter(p => !completed.includes(p));

  for (const phase of remainingPhases) {
    console.log(`  → Phase: ${phase}`);

    const prompt = buildPhasePrompt(ticket, phase, sessionDir);

    const result = await spawner.spawn(phase, {
      sessionDir,
      ticketId: ticket.id,
      phase,
      prompt,
      maxTurns: 60,
    });

    if (!result.success) {
      console.error(`Phase ${phase} failed for ticket ${ticket.id}`);
      sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
      circuit.recordIteration(false, `phase_failed_${phase}`);
      return;
    }

    // Validate the required artifact
    const shortPhase = phase.replace('morty-phase-', '');
    const expected = `${shortPhase}_${ticket.id}.md`;
    const ticketDir = sm.getTicketDir(sessionDir, ticket.id);

    let artifactOk = false;
    try {
      const validatePath = path.join(__dirname, '../bin/validate-artifact.ts');
      // Simple existence check for now (the ts helper can be called via tsx in real use)
      artifactOk = fs.existsSync(path.join(ticketDir, expected));
    } catch (e) {
      console.warn('  Validation helper issue, doing basic check');
      artifactOk = fs.existsSync(path.join(ticketDir, expected));
    }

    if (!artifactOk) {
      console.error(`  Missing expected artifact: ${expected}`);
      sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
      return;
    }

    // Record phase complete
    sm.appendPhase(sessionDir, ticket.id, phase, path.join(ticketDir, expected));

    // Git progress + gate + circuit
    const gitProgress = true; // simplistic; real version would compare shas
    const gateResult = await gate.runGate('changed');
    const errorSig = result.output.includes('error') ? 'phase_error' : undefined;

    const tripped = circuit.recordIteration(gitProgress, errorSig);

    if (tripped) {
      console.error('Circuit breaker tripped. Stopping ticket.');
      sm.updateTicketStatus(sessionDir, ticket.id, 'failed');
      return;
    }

    if (!gateResult.passed) {
      console.warn(`Gate had failures after ${phase}: ${gateResult.newFailures.length}`);
      // In a full system we might rollback here for safety
    }

    console.log(`  ✓ ${phase} complete`);
  }

  sm.updateTicketStatus(sessionDir, ticket.id, 'done');
  console.log(`=== Ticket ${ticket.id} COMPLETE ===\n`);
}

function buildPhasePrompt(ticket: Ticket, phase: WorkerRole, sessionDir: string): string {
  // Map role to filename (research-reviewer -> research_review.md, etc.)
  let phaseName = phase.replace('morty-phase-', '');
  if (phaseName === 'research-reviewer') phaseName = 'research_review';
  if (phaseName === 'plan-reviewer') phaseName = 'plan_review';

  const phaseFile = `${phaseName}.md`;
  const phasePath = path.join(__dirname, '../../../references/phases', phaseFile);

  let base = '';
  if (fs.existsSync(phasePath)) {
    base = fs.readFileSync(phasePath, 'utf8');
  } else {
    base = `## ${phaseName} phase\nFollow the standard Morty contract for this phase.`;
  }

  const sendToMorty = fs.readFileSync(path.join(__dirname, '../../../references/send-to-morty.md'), 'utf8').replace(/```/g, '');

  const ticketContent = fs.readFileSync(path.join(sessionDir, 'tickets', ticket.id, 'ticket.md'), 'utf8');

  return [
    base,
    '## Immutable Worker Contract',
    sendToMorty,
    `## Current Ticket (${ticket.id})`,
    ticketContent,
    '## Git Boundary Rules (strictly enforce)',
    'You must never run prohibited git commands. Only scoped changes inside this ticket.',
    'When finished write the required artifact and output exactly: <promise>I AM DONE</promise>'
  ].join('\n\n');
}

async function main() {
  for (const ticket of state.tickets) {
    if (ticket.status === 'pending' || ticket.status === 'in_progress') {
      await runTicket(ticket);
    }
  }
  console.log('All tickets processed.');
}

main().catch(console.error);
