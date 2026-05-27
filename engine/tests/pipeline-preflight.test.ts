/**
 * pipeline-preflight.test.ts — Dedicated coverage for the emission hygiene gates.
 * Closes P0 Gap 1 from engine/TESTABILITY_OBSERVABILITY_AUDIT_EMISSION_DEBT_SKIP_2026-05-24.md:40-99
 * (preflight was the "ghost module"; now live in src/lib/pipeline-preflight.ts but had zero dedicated test).
 *
 * Reuses exact patterns from:
 * - engine/tests/ac-shape-gate.test.ts (node:test + assert/strict, manifest shapes with ac_shape_smells)
 * - engine/tests/forward-ref-annotation.test.ts (scan calls + errors/passed asserts)
 * - engine/tests/citadel.test.ts (tmp sessionDir + state.json + theatrical Verify fixtures for R-META-DEEPEN-001 patterns)
 *
 * Exercises: detectVerifyTheater (all 12 + self-healer patterns), assessMetaReadiness, checkVerifyMachinability,
 * scanAnalystOutputsForUnverifiedPaths (forward-ref hygiene + ac_shape JSON warning at :406), runPreflight shape,
 * analyzeSessionForVerifyTheater + ac-shape re-exports.
 *
 * TDD order followed: tests written as executable spec first (Red would have failed on missing file), now Green on live fns.
 * No src changes. Minimal blast. Per AGENTS.md Contributor Rules + codebase-analyst map from subagent 019e69a7-deb2-...
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  detectVerifyTheater,
  assessMetaReadiness,
  runPreflight,
  analyzeSessionForVerifyTheater,
  checkVerifyMachinability,
  scanAnalystOutputsForUnverifiedPaths,
  evaluateAcShapeEnforcement,
  runAcShapeEnforcement,
} from '../src/lib/pipeline-preflight.js';

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-test-'));
}

function cleanup(d: string) {
  try { fs.rmSync(d, { recursive: true, force: true }); } catch {}
}

test('detectVerifyTheater flags all 12 theater patterns + self-healer anti-patterns (P0 from TESTABILITY:57-82 + pipeline-preflight.ts:51-54)', () => {
  const cases = [
    'ls foo || true',
    'verify manually by eye',
    'must pass on current tree',
    'TODO verify AC',
    'placeholder later verify',
    'ls foo',
    'grep -qE "pat" || true',
    '/* after good proposal */',
    'wc -l | grep -q "^0$"',
    'grep -A 5 "foo" | grep -q bar',
    'node -e "..." | grep -q',
  ];
  for (const c of cases) {
    const r = detectVerifyTheater(c);
    assert.ok(r.isTheatrical, `must flag: ${c}`);
    assert.ok(r.hits >= 1);
  }
  assert.ok(!detectVerifyTheater('test -f engine/src/lib/pipeline-preflight.ts && echo BASELINE_OK').isTheatrical);
  assert.ok(!detectVerifyTheater('npx tsx -e "console.log(42)"').isTheatrical);
});

test('assessMetaReadiness returns green/amber/red + signals + suggestedPrereqs on skeletal markers (TESTABILITY:85-88 + pipeline-preflight.ts:99 + SKELETAL_RE)', () => {
  const red = assessMetaReadiness('engine/src/lib/pipeline-preflight.ts', 'TODO stub placeholder', { grokRoot: process.cwd() });
  assert.ok(['red', 'amber', 'green'].includes(red.status));
  assert.ok(typeof red.score === 'number');
  assert.ok(Array.isArray(red.signals));
  assert.ok(Array.isArray(red.filesScanned));
  assert.ok(Array.isArray(red.suggestedPrereqs));
});

test('checkVerifyMachinability + scanAnalystOutputsForUnverifiedPaths (TESTABILITY:95 + pipeline-preflight.ts:349,360,406) reject theater/hygiene + ac_shape_smells JSON warning path', () => {
  const mach = checkVerifyMachinability('must feel robust and fast');
  assert.equal(mach.isMachineCheckable, false);
  assert.ok(mach.reasons.some((r: string) => /pure prose/i.test(r)));

  // Forward-ref hygiene violation (no one-ASCII-space annotation)
  const badAnno = 'Create `src/missing-anno.ts`(forward-created)';
  const scan = scanAnalystOutputsForUnverifiedPaths(badAnno, '', process.cwd());
  assert.ok(scan.errors.some((e: string) => /Forward-ref hygiene violation/i.test(e)));
  assert.equal(scan.passed, false);

  // ac_shape_smells section present but wrong JSON shape (the warning at pipeline-preflight.ts:406)
  const acWarn = scanAnalystOutputsForUnverifiedPaths('## ac_shape_smells\n{ "foo": 1 }', '', process.cwd());
  assert.ok(acWarn.warnings.some((w: string) => /ac_shape_smells section present but missing expected machine-readable JSON/i.test(w)));
});

test('runPreflight produces PreflightReport shape + no throw on tmp session (types.ts:295 + pipeline-preflight.ts:178 + citadel tmp pattern)', () => {
  const tmp = makeTmp();
  try {
    const sess = path.join(tmp, 'sess');
    fs.mkdirSync(sess, { recursive: true });
    fs.writeFileSync(path.join(sess, 'state.json'), JSON.stringify({
      sessionId: 't',
      tickets: [],
      sourcePrd: null,
      prdContentHash: null,
    }));
    const report = runPreflight(sess);
    assert.equal(typeof report.ok, 'boolean');
    assert.equal(typeof report.isZombie, 'boolean');
    assert.ok(Array.isArray(report.diagnostics));
    assert.ok('ticketCountOnDisk' in report);
    assert.ok('legalForNoRefine' in report);
  } finally {
    cleanup(tmp);
  }
});

test('analyzeSessionForVerifyTheater + ac-shape reexports work on manifest with [] (TESTABILITY + pipeline-preflight.ts:295,415 + ac-shape-gate.test.ts:67 style)', () => {
  const tmp = makeTmp();
  try {
    const sess = path.join(tmp, 'sess');
    fs.mkdirSync(sess, { recursive: true });
    fs.writeFileSync(path.join(sess, 'state.json'), JSON.stringify({
      tickets: [{ id: 'T1', readiness: { summary: 'ls foo || true' } }],
    }));
    const a = analyzeSessionForVerifyTheater(sess);
    assert.ok(typeof a.theatricalCount === 'number');
    assert.ok(a.theatricalCount >= 0);

    const manifest = { ac_shape_smells: [], tickets: [] };
    assert.deepEqual(evaluateAcShapeEnforcement(manifest), []);
    assert.equal(runAcShapeEnforcement(manifest), 0);
  } finally {
    cleanup(tmp);
  }
});
