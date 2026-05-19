import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ArchitectureDeepener } from '../src/arch-deepener.js';

describe('ArchitectureDeepener (deepening opportunities)', () => {
  it('should be importable and have the expected public API', () => {
    const driver = new ArchitectureDeepener('/tmp/fake-session');

    assert.strictEqual(typeof driver.init, 'function');
    assert.strictEqual(typeof driver.load, 'function');
    assert.strictEqual(typeof driver.runDeepening, 'function');
  });

  it('should return a valid initial state with target paths', () => {
    const driver = new ArchitectureDeepener('/tmp/fake-session-2');
    const state = driver.init(['engine/src', 'skills']);

    assert.ok(Array.isArray(state.targetPaths));
    assert.strictEqual(state.direction, 'lower');
    assert.ok(state.maxIterations > 0);
  });
});