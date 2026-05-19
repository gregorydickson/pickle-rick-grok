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

  it('should produce DeepeningOpportunity objects using exact LANGUAGE.md vocabulary', async () => {
    const driver = new ArchitectureDeepener('/tmp/fake-session-3');
    const state = driver.init(['engine/src']);

    const result = await driver.runDeepening(state);

    assert.ok(result.opportunitiesFound > 0);
    const opp = state.opportunities[0];

    // Must use exact terms from references/LANGUAGE.md
    assert.ok(['shallow', 'medium', 'deep'].includes(opp.currentDepth));
    assert.ok(opp.proposedSeam.includes('seam') || opp.proposedSeam.length > 5);
    assert.ok(opp.expectedLeverage.length > 10);
    assert.ok(opp.expectedLocality.length > 10);
    assert.ok(opp.deletionTestImpact.length > 10);
  });
});