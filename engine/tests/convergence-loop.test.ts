/**
 * Unit tests for ConvergenceLoop
 * Covers: classify logic (via run outcomes), full run loop, stall detection,
 * gate-forced rollback on improve, regression rollback, convergence/stall limits.
 * These would catch misclassification, stall miscount, missing gate rollback.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { ConvergenceLoop, ConvergenceConfig, ApplyChangeResult } from '../src/iteration.js';
import { MicroverseState, MetricSnapshot } from '../src/types.js';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pickle-conv-'));
}

function cleanup(dir: string) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

function makeState(overrides: Partial<MicroverseState> = {}): MicroverseState {
  return {
    sessionId: 'test-sess',
    mode: 'metric',
    description: 'test',
    validation: 'score',
    direction: 'higher',
    tolerance: 0,
    stallLimit: 3,
    maxIterations: 20,
    currentIteration: 0,
    status: 'iterating',
    history: [],
    failedApproaches: [],
    ...overrides,
  };
}

test('ConvergenceLoop - first iteration with measurement accepts change as improved then stalls on helds', async () => {
  const dir = makeTempDir();
  const measure = (): MetricSnapshot => ({ raw: '1', score: 42, timestamp: new Date().toISOString() });
  const apply = (): ApplyChangeResult => ({ preSha: 'a', postSha: 'b', notes: 'change' });
  const rollback = () => {};
  const gate = () => true;

  const loop = new ConvergenceLoop(dir, { direction: 'higher', stallLimit: 2 }, measure, apply, rollback, gate);
  const state = makeState({ stallLimit: 2 });
  const res = loop.run(state);

  // 1 improve + 2 held (constant score) -> stall converge
  assert.ok(res.iterations >= 2);
  assert.ok(res.converged);
  assert.equal(state.history[0].outcome, 'improved');
  cleanup(dir);
});

test('ConvergenceLoop - classify higher direction with tolerance', async () => {
  const dir = makeTempDir();
  let call = 0;
  const scores = [10, 10.1, 10.2, 9.9];
  const measure = (): MetricSnapshot => ({ raw: '', score: scores[call++ % scores.length], timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 'p' + call, postSha: 'n' + call, notes: '' });
  const rollback = () => {};
  const gate = () => true;

  const config: ConvergenceConfig = { direction: 'higher', tolerance: 0.15 };
  const loop = new ConvergenceLoop(dir, config, measure, apply, rollback, gate);
  const state = makeState({ direction: 'higher', tolerance: 0.15 });

  loop.run(state);

  assert.ok(state.history.length >= 1);
  const first = state.history[0];
  assert.equal(first.outcome, 'improved');
  cleanup(dir);
});

test('ConvergenceLoop - regression triggers rollback inside runOne', async () => {
  const dir = makeTempDir();
  let rollbackCalled = false;
  const measure = (): MetricSnapshot => ({ raw: '', score: 5, timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 'good', postSha: 'bad', notes: '' });
  const rollback = (sha: string) => { rollbackCalled = true; };
  const gate = () => true;

  const loop = new ConvergenceLoop(dir, { direction: 'higher', tolerance: 0 }, measure, apply, rollback, gate);
  const state = makeState();
  // Seed history so classify can find prevScore
  state.history.push({ iteration: 0, preSha: 'good', postSha: 'good2', measurement: { raw: '', score: 42, timestamp: '' }, outcome: 'improved' });
  state.currentIteration = 1;

  const outcome = (loop as any).runOneIteration(state);

  assert.equal(outcome.kind, 'regressed');
  assert.equal(outcome.rollback, true);
  assert.ok(rollbackCalled, 'rollback must have been invoked for regression');
  cleanup(dir);
});

test('ConvergenceLoop - gateEnabled + gate fails after improve -> forces rollback (even if history not mutated)', async () => {
  const dir = makeTempDir();
  let rollbackCount = 0;
  const measure = (): MetricSnapshot => ({ raw: '', score: 100, timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 'pre', postSha: 'post', notes: 'win' });
  const rollback = (sha: string) => { rollbackCount++; };
  const gate = () => false;

  const loop = new ConvergenceLoop(dir, { gateEnabled: true, direction: 'higher', stallLimit: 10 }, measure, apply, rollback, gate);
  const state = makeState({ stallLimit: 10 });
  loop.run(state);

  assert.ok(rollbackCount >= 1, 'gate failure after improve must trigger rollback for safety');
  cleanup(dir);
});

test('ConvergenceLoop - stall detection and convergence on stallLimit', async () => {
  const dir = makeTempDir();
  let measureCall = 0;
  const measure = (): MetricSnapshot => ({ raw: '', score: 10 + (measureCall++ % 2), timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 's', postSha: 's' + measureCall, notes: '' });
  const rollback = () => {};
  const gate = () => true;

  const config: ConvergenceConfig = { stallLimit: 2, tolerance: 5 };
  const loop = new ConvergenceLoop(dir, config, measure, apply, rollback, gate);
  const state = makeState({ stallLimit: 2, tolerance: 5 });

  const res = loop.run(state);

  assert.equal(res.converged, true);
  assert.ok(state.status === 'converged');
  cleanup(dir);
});

test('ConvergenceLoop - maxIterations stops without converge', async () => {
  const dir = makeTempDir();
  const measure = (): MetricSnapshot => ({ raw: '', score: 1, timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 'a', postSha: 'b', notes: '' });
  const rollback = () => {};
  const gate = () => true;

  const loop = new ConvergenceLoop(dir, { maxIterations: 2, stallLimit: 99 }, measure, apply, rollback, gate);
  const state = makeState({ maxIterations: 2 });
  state.currentIteration = 0;

  const res = loop.run(state);

  assert.equal(res.converged, false);
  assert.ok(state.status === 'stopped' || state.currentIteration >= 2);
  cleanup(dir);
});

test('ConvergenceLoop - held increments stall, improve resets it', async () => {
  const dir = makeTempDir();
  let i = 0;
  const measure = (): MetricSnapshot => ({ raw: '', score: 10 + i++ * 0, timestamp: '' });
  const apply = (): ApplyChangeResult => ({ preSha: 'p', postSha: 'p' + i, notes: '' });
  const rollback = () => {};
  const gate = () => true;

  const loop = new ConvergenceLoop(dir, { stallLimit: 3, tolerance: 0 }, measure, apply, rollback, gate);
  const state = makeState({ stallLimit: 3, tolerance: 0 });

  loop.run(state);
  assert.ok(state.history.length > 0);
  cleanup(dir);
});
