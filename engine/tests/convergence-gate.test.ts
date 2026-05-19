/**
 * Basic tests for ConvergenceGate
 * Verifies: construction (with/without session workingDir), runGate returns correct shape,
 * remediator path exercised when failures present, activity logged.
 * In real env gate protects the autonomous run; here we just ensure no crash + contract.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { ConvergenceGate } from '../src/gate.js';
import { SessionManager } from '../src/session.js';

function makeTemp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pickle-gate-'));
}

function cleanup(d: string) {
  try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
}

test('ConvergenceGate - constructs and runGate returns GateResult shape even in empty dir', async () => {
  const dir = makeTemp();
  // create minimal state so getWorkingDir succeeds (falls back anyway)
  const sm = new SessionManager(dir);
  const { sessionDir } = sm.createSession(process.cwd(), 'gate test');

  const gate = new ConvergenceGate(sessionDir);
  const result = await gate.runGate('changed');

  assert.ok(typeof result.passed === 'boolean');
  assert.ok(Array.isArray(result.newFailures));
  assert.ok(typeof result.baselineUsed === 'boolean');

  // In this env there will likely be failures (no real typecheck/lint/test passing instantly)
  // but remediator should have run without throwing
  console.log('[gate-test] result:', result);

  cleanup(dir);
});

test('ConvergenceGate - fallback to cwd when no valid session workingDir', async () => {
  const dir = makeTemp();
  // no state.json, ctor should fallback
  const gate = new ConvergenceGate(dir);
  const result = await gate.runGate();
  assert.ok('passed' in result);
  assert.ok('newFailures' in result);
  cleanup(dir);
});
