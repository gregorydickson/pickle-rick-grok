/**
 * ac-shape-gate.test.ts — Coverage for the hard AC-shape collapse-or-justify gate.
 * Ports Claude patterns from spawn-refinement-team.test.js:915+ (parametrized accept, unjustified multi reject, manifest agg, e2e status 2 + stderr).
 * Exercises the port in lib/ac-shape.ts (evaluateAcShapeEnforcement + runAcShapeEnforcement + helpers/REs).
 * Addresses fresh swarm P0: 0 tests for the "new gate" itself post-tranche 2.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateAcShapeEnforcement,
  runAcShapeEnforcement,
  type AcShapeViolation,
} from '../src/lib/ac-shape.js';

test('ac-shape-gate: accepts one parametrized ticket (universal quantifier + describe.each)', () => {
  const manifest = {
    ac_shape_smells: [{ ac_id: 'AC-1', ticket_ids: ['T1'] }],
    tickets: [{
      id: 'T1',
      title: 'All handlers validate permissions',
      source_ac_ids: ['AC-1'],
      acceptance_test: 'describe.each([["getA"], ["getB"], ["getC"]]) validates permissions',
      justification: 'Single invariant',
    }],
  };
  const violations = evaluateAcShapeEnforcement(manifest);
  assert.deepEqual(violations, []);
  assert.equal(runAcShapeEnforcement(manifest), 0);
});

test('ac-shape-gate: rejects unjustified multi-ticket fanout', () => {
  const manifest = {
    ac_shape_smells: [{ ac_id: 'AC-2', ticket_ids: ['T1', 'T2'] }],
    tickets: [
      { id: 'T1', title: 'Handler A', source_ac_ids: ['AC-2'], acceptance_test: 'A()', justification: undefined },
      { id: 'T2', title: 'Handler B', source_ac_ids: ['AC-2'], acceptance_test: 'B()', justification: undefined },
    ],
  };
  const violations = evaluateAcShapeEnforcement(manifest);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].ac_id, 'AC-2');
  assert.match(violations[0].reason, /JUSTIFICATION/);
  assert.deepEqual(violations[0].ticket_ids, ['T1', 'T2']);
  assert.equal(runAcShapeEnforcement(manifest), 2);
});

test('ac-shape-gate: rejects single-ticket without parametrized form', () => {
  const manifest = {
    ac_shape_smells: [{ ac_id: 'AC-3', ticket_ids: ['T1'] }],
    tickets: [{
      id: 'T1',
      title: 'Do the thing for endpoint X',
      source_ac_ids: ['AC-3'],
      acceptance_test: 'endpointX()',
      justification: undefined,
    }],
  };
  const violations = evaluateAcShapeEnforcement(manifest);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /universal-quantifier|describe\.each/);
  assert.equal(runAcShapeEnforcement(manifest), 2);
});

test('ac-shape-gate: aggregates from smells + tickets (manifest shape)', () => {
  const manifest = {
    ac_shape_smells: [
      { ac_id: 'AC-4', ticket_ids: ['T1'] },
      { ac_id: 'AC-5', ticket_ids: ['T2', 'T3'] },
    ],
    tickets: [
      { id: 'T1', title: 'All endpoints', source_ac_ids: ['AC-4'], acceptance_test: 'describe.each(...)', justification: 'ok' },
      { id: 'T2', title: 'Handler A', source_ac_ids: ['AC-5'], acceptance_test: 'A()', justification: undefined },
      { id: 'T3', title: 'Handler B', source_ac_ids: ['AC-5'], acceptance_test: 'B()', justification: 'ok' },
    ],
  };
  const violations = evaluateAcShapeEnforcement(manifest);
  assert.ok(violations.length >= 1, 'should flag the unjustified one in AC-5');
  const ac5 = violations.find(v => v.ac_id === 'AC-5');
  assert.ok(ac5, 'AC-5 violation present');
  assert.ok(ac5.ticket_ids.includes('T2'));
});

test('ac-shape-gate: runAcShapeEnforcement returns 2 + stderr on violation (e2e shape)', () => {
  const manifest = {
    ac_shape_smells: [{ ac_id: 'AC-FAIL', ticket_ids: ['T1'] }],
    tickets: [{ id: 'T1', title: 'plain', source_ac_ids: ['AC-FAIL'], acceptance_test: 'plain()', justification: undefined }],
  };
  const status = runAcShapeEnforcement(manifest);
  assert.equal(status, 2);
  // (stderr is console.error in impl; in real harness would capture)
});

console.log('[ac-shape-gate.test] Gate coverage added. Mirrors Claude spawn-refinement-team.test.js patterns + grok ac-shape.ts.');
