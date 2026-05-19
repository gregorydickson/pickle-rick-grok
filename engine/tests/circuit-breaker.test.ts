/**
 * Unit tests for CircuitBreaker
 * Covers: tripping on consecutiveNoProgress >= max, errorCount >=4 for repeated sig,
 * persistence (load on new instance), reason, reset, record returns tripped.
 * Would catch: non-persistent trips, wrong threshold, repeated error not counting.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { CircuitBreaker } from '../src/circuit.js';

function makeSessionDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pickle-circuit-'));
  return d;
}

function cleanup(dir: string) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

test('CircuitBreaker - loads default on first ctor, persists to circuit.json on first record', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 5);
  assert.equal(cb.isTripped(), false);

  cb.recordIteration(true); // triggers save

  const circuitFile = path.join(dir, 'circuit.json');
  assert.ok(fs.existsSync(circuitFile));

  const saved = JSON.parse(fs.readFileSync(circuitFile, 'utf8'));
  assert.equal(saved.consecutiveNoProgress, 0);
  assert.equal(saved.tripped, false);

  cleanup(dir);
});

test('CircuitBreaker - noProgress increments and trips at threshold (default 5)', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 3); // low for test

  let tripped = false;
  for (let i = 0; i < 3; i++) {
    tripped = cb.recordIteration(false);
  }
  assert.equal(tripped, true);
  assert.equal(cb.isTripped(), true);

  const state = JSON.parse(fs.readFileSync(path.join(dir, 'circuit.json'), 'utf8'));
  assert.equal(state.consecutiveNoProgress, 3);
  assert.ok(state.reason?.includes('no git progress'));

  cleanup(dir);
});

test('CircuitBreaker - progress resets consecutiveNoProgress counter', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 3);
  cb.recordIteration(false);
  cb.recordIteration(false);
  cb.recordIteration(true); // reset
  const tripped = cb.recordIteration(false);
  assert.equal(tripped, false);
  assert.equal(cb.isTripped(), false);

  cleanup(dir);
});

test('CircuitBreaker - repeated identical errorSignature increments count and trips at 4', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 99); // high progress limit

  cb.recordIteration(true, 'phase_failed_planner');
  cb.recordIteration(true, 'phase_failed_planner');
  cb.recordIteration(true, 'phase_failed_planner');
  const tripped = cb.recordIteration(true, 'phase_failed_planner');

  assert.equal(tripped, true);
  assert.equal(cb.isTripped(), true);

  const s = JSON.parse(fs.readFileSync(path.join(dir, 'circuit.json'), 'utf8'));
  assert.equal(s.errorCount, 4);
  assert.ok(s.reason?.includes('repeated errors'));

  cleanup(dir);
});

test('CircuitBreaker - different errorSignature resets count to 1', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 99);
  cb.recordIteration(true, 'errA');
  cb.recordIteration(true, 'errA');
  cb.recordIteration(true, 'errB'); // new -> count=1
  assert.equal(cb.isTripped(), false); // not yet 4

  // continue same errB to trip
  cb.recordIteration(true, 'errB');
  cb.recordIteration(true, 'errB');
  cb.recordIteration(true, 'errB');
  assert.equal(cb.isTripped(), true);

  cleanup(dir);
});

test('CircuitBreaker - persistence: new instance after trip sees tripped=true', () => {
  const dir = makeSessionDir();
  let cb = new CircuitBreaker(dir, 2);
  cb.recordIteration(false);
  cb.recordIteration(false);
  assert.equal(cb.isTripped(), true);

  // fresh ctor reloads
  cb = new CircuitBreaker(dir, 2);
  assert.equal(cb.isTripped(), true);

  cleanup(dir);
});

test('CircuitBreaker - reset clears state and file', () => {
  const dir = makeSessionDir();
  const cb = new CircuitBreaker(dir, 2);
  cb.recordIteration(false);
  cb.recordIteration(false);
  cb.reset();

  assert.equal(cb.isTripped(), false);
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'circuit.json'), 'utf8'));
  assert.equal(s.consecutiveNoProgress, 0);
  assert.equal(s.errorCount, 0);
  assert.equal(s.tripped, false);

  cleanup(dir);
});
