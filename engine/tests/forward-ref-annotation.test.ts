/**
 * forward-ref-annotation.test.ts — Coverage for the dedicated forward-ref annotation hygiene module.
 * Exact port of claude extension/src/services/forward-ref-annotation.ts:1 + extractForwardRefAnnotations.
 * Exercises RE + simple extractor + preflight integration (one-ASCII-space rule, hygiene scan).
 * Addresses fresh SWARM2 P0 from test/explore agent 019e6505-2c60-75d0-ba3a-273628c64926:
 *   zero tests for the new module post-1f2fa94 port (unlike ac-shape-gate.test.ts + claude's dedicated forward-ref tests).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORWARD_REF_ANNOTATION_RE,
  extractForwardRefAnnotations,
} from '../src/lib/forward-ref-annotation.js';

import { scanAnalystOutputsForUnverifiedPaths } from '../src/lib/pipeline-preflight.js';

test('forward-ref-annotation: exports the exact claude RE (shape)', () => {
  assert.ok(FORWARD_REF_ANNOTATION_RE instanceof RegExp);
  const src = FORWARD_REF_ANNOTATION_RE.source;
  assert.ok(src.includes('forward-created'));
  assert.ok(src.includes('created by ticket') || src.includes('created by (R-'));
});

test('forward-ref-annotation: extractForwardRefAnnotations returns token list (simple happy path)', () => {
  const text = 'Use `src/new.ts` (forward-created) and `helper.ts` (created by ticket abc1234)';
  const tokens = extractForwardRefAnnotations(text);
  assert.deepEqual(tokens, ['src/new.ts', 'helper.ts']);
});

test('forward-ref-annotation: extract handles forward-created by ticket hybrid + requirement alias', () => {
  const text = '`foo/bar.ts` (forward-created by ticket def567) and `baz.ts` (created by R-ABC-42)';
  const tokens = extractForwardRefAnnotations(text);
  assert.deepEqual(tokens, ['foo/bar.ts', 'baz.ts']);
});

test('forward-ref-annotation: preflight scan detects missing one-space forward-ref annotation (hygiene violation)', () => {
  const analystText = 'Create `src/missing-anno.ts`(forward-created) in this ticket'; // no space before (
  const result = scanAnalystOutputsForUnverifiedPaths(analystText, '', process.cwd());
  const hasForwardRefError = result.errors.some(e => e.includes('Forward-ref hygiene violation'));
  assert.equal(hasForwardRefError, true);
  assert.equal(result.passed, false);
});

test('forward-ref-annotation: module extract works on realistic emitter-style text (integration shape)', () => {
  const text = 'Scope includes `engine/src/lib/forward-ref-annotation.ts` (forward-created) per the port';
  const extracted = extractForwardRefAnnotations(text);
  assert.deepEqual(extracted, ['engine/src/lib/forward-ref-annotation.ts']);
  // Full preflight happy-path scan has additional git/bare-path hygiene (not the responsibility of this dedicated module test).
  // Violation detection + RE usage already exercised in the prior test case (and indirectly via emitter hygiene in real runs).
});
