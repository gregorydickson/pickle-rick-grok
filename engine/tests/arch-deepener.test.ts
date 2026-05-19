import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureDeepener, DeepeningOpportunity } from '../src/arch-deepener.js';

const CANONICAL_TERMS = [
  'Module', 'Interface', 'Depth', 'Seam', 'Leverage', 'Locality',
  'Deletion Test', 'Adapter', 'Trap Door', 'ConvergenceLoop', 'ManagerRitual'
];

function findRealGrokRoot(start: string): string {
  let cur = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(cur, 'engine/src/arch-deepener.ts'))) return cur;
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  if (path.basename(start) === 'engine') return path.dirname(start);
  return start;
}

function fileExistsUnderRoot(relPath: string, root: string): boolean {
  const grokRoot = findRealGrokRoot(root);
  const p1 = path.isAbsolute(relPath) ? relPath : path.join(grokRoot, relPath);
  if (fs.existsSync(p1)) return true;
  // also try treating relPath as already rooted from engine subdir run
  const p2 = path.join(root, relPath.replace(/^engine\//, ''));
  return fs.existsSync(p2);
}

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

  it('should produce real DeepeningOpportunity objects by scanning the actual tree (not hardcoded placeholders)', async () => {
    const driver = new ArchitectureDeepener('/tmp/fake-session-3');
    const state = driver.init(['engine/src']);

    const result = await driver.runDeepening(state);

    assert.ok(result.opportunitiesFound > 0, 'Scanner must discover at least one real opportunity');

    const opps: DeepeningOpportunity[] = state.opportunities;
    assert.ok(opps.length > 0);

    // Every opportunity must reference at least one file that actually exists on disk
    const cwd = process.cwd();
    for (const opp of opps) {
      assert.ok(Array.isArray(opp.files) && opp.files.length > 0, `Opportunity ${opp.id} must list files`);
      const hasRealFile = opp.files.some(f => fileExistsUnderRoot(f, cwd));
      assert.ok(hasRealFile, `Opportunity ${opp.id} must reference at least one real file under ${cwd}`);
    }

    // At least one opportunity must be classified using the LANGUAGE vocabulary
    const anyUsesVocab = opps.some(opp =>
      CANONICAL_TERMS.some(term =>
        (opp.proposedSeam + ' ' + opp.expectedLeverage + ' ' + opp.expectedLocality + ' ' + opp.deletionTestImpact)
          .includes(term)
      )
    );
    assert.ok(anyUsesVocab, 'Opportunities must use terms from LANGUAGE.md (Seam, Leverage, Locality, Deletion Test, etc.)');

    // Must contain at least one explicit reference to the Deletion Test concept
    const mentionsDeletionTest = opps.some(opp =>
      opp.deletionTestImpact.toLowerCase().includes('deletion') ||
      opp.deletionTestImpact.includes('Deletion Test')
    );
    assert.ok(mentionsDeletionTest, 'At least one opportunity must articulate impact via the Deletion Test');

    // No opportunity should be the old placeholder id
    const hasNoPlaceholder = opps.every(opp => opp.id !== 'example-1');
    assert.ok(hasNoPlaceholder, 'Scanner must replace placeholder examples with real discovered opportunities');
  });

  it('should classify at least one module using Depth + Leverage + Locality + Deletion Test language', async () => {
    const driver = new ArchitectureDeepener('/tmp/fake-session-4');
    const state = driver.init(['engine/src']);

    await driver.runDeepening(state);

    const opp = state.opportunities.find(o => o.currentDepth === 'deep' || o.currentDepth === 'shallow');
    assert.ok(opp, 'Scanner must classify at least one module as shallow/medium/deep');

    // These fields must be substantive justifications, not generic
    assert.ok(opp!.expectedLeverage.length > 25, 'Leverage justification must be specific');
    assert.ok(opp!.expectedLocality.length > 25, 'Locality justification must be specific');
    assert.ok(opp!.deletionTestImpact.length > 25, 'Deletion Test rationale must be specific');
  });
});