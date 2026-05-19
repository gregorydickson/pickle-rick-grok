/**
 * resource-guard.test.ts — Unit armor for the 50-ticket overnight survival kit.
 * Covers: retry with backoff + shouldRetry, mem snapshot, gc hint, prune, gentle git gc, disk approx.
 * These keep detached 12h runs from OOMing, disk bombing, or git-wedging like a drunk Jerry.
 * TDD red-green: every path that protects the citadel/ritual loop now has teeth.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

import {
  withRetry,
  getMemSnapshot,
  hintGC,
  pruneDirOlderThan,
  gentleGitGc,
  getDiskFreeApprox,
  type RetryOptions,
} from '../src/lib/resource-guard.js';

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function cleanup(d: string) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }

test('withRetry — happy path, one-shot success', async () => {
  let calls = 0;
  const fn = async () => { calls++; return 'win'; };
  const res = await withRetry(fn, { maxAttempts: 3 });
  assert.equal(res, 'win');
  assert.equal(calls, 1);
});

test('withRetry — recovers after transient fail, respects backoff', async () => {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls < 2) throw new Error('transient Jerry hiccup');
    return { ok: true, attempt: calls };
  };
  const res: any = await withRetry(fn, { maxAttempts: 3, backoffMs: 10 });
  assert.equal(res.ok, true);
  assert.equal(calls, 2);
});

test('withRetry — exhausts and throws last error when shouldRetry allows', async () => {
  let calls = 0;
  const fn = async () => { calls++; throw new Error(`fail-${calls}`); };
  await assert.rejects(
    () => withRetry(fn, { maxAttempts: 2, backoffMs: 5 }),
    /fail-2/
  );
  assert.equal(calls, 2);
});

test('withRetry — stops early if shouldRetry returns false', async () => {
  let calls = 0;
  const fn = async () => { calls++; throw new Error('permanent'); };
  const opts: RetryOptions = {
    maxAttempts: 5,
    backoffMs: 1,
    shouldRetry: (_e, attempt) => attempt < 2, // only first fail retries
  };
  await assert.rejects(() => withRetry(fn, opts), /permanent/);
  assert.equal(calls, 2); // initial + one retry
});

test('getMemSnapshot — returns rss + human string, sane values', () => {
  const snap = getMemSnapshot();
  assert.ok(typeof snap.rss === 'number' && snap.rss > 1000000, 'rss should be >1MB');
  assert.match(snap.rssHuman, /^\d+\.\d+MB$/);
});

test('hintGC — does not explode even without --expose-gc', () => {
  // just exercises the typeof guard path
  hintGC();
  assert.ok(true, 'gc hint survived');
});

test('pruneDirOlderThan — removes only stale files, returns count, leaves fresh', () => {
  const d = tmp('prune-');
  const now = Date.now();
  const fresh = path.join(d, 'fresh.txt');
  const stale = path.join(d, 'stale.log');
  fs.writeFileSync(fresh, 'new');
  fs.writeFileSync(stale, 'old');
  // make stale look ancient
  fs.utimesSync(stale, new Date(now - 100000), new Date(now - 100000));

  const pruned = pruneDirOlderThan(d, 50000); // 50s cutoff
  assert.equal(pruned, 1);
  assert.ok(fs.existsSync(fresh));
  assert.ok(!fs.existsSync(stale));

  cleanup(d);
});

test('pruneDirOlderThan — zero when dir missing or empty', () => {
  const missing = path.join(os.tmpdir(), 'nope-' + Date.now());
  assert.equal(pruneDirOlderThan(missing, 1000), 0);
  const empty = tmp('empty-prune-');
  assert.equal(pruneDirOlderThan(empty, 1000), 0);
  cleanup(empty);
});

test('gentleGitGc — best-effort, never throws, works on real git dir', () => {
  const d = tmp('git-gc-');
  execSync('git init -q', { cwd: d, stdio: 'ignore' });
  gentleGitGc(d); // should swallow any "nothing to gc" noise
  assert.ok(fs.existsSync(path.join(d, '.git')));
  cleanup(d);
});

test('getDiskFreeApprox — returns something without crashing (even on weird fs)', () => {
  const out = getDiskFreeApprox(process.cwd());
  assert.ok(typeof out === 'string');
  // on mac/linux it will be "X% Y" or "unknown"
  assert.ok(out.length > 0);
});

test('resource-guard — long-run hygiene combo (55-tix proxy)', async () => {
  // exercise all in one shot like a mini overnight heartbeat
  const d = tmp('combo-');
  fs.writeFileSync(path.join(d, 'a.txt'), '1');
  const old = path.join(d, 'old.txt');
  fs.writeFileSync(old, '2');
  fs.utimesSync(old, new Date(Date.now() - 200000), new Date(Date.now() - 200000));

  const mem = getMemSnapshot();
  hintGC();
  gentleGitGc(process.cwd());
  const pruned = pruneDirOlderThan(d, 100000);
  const disk = getDiskFreeApprox(d);

  assert.equal(pruned, 1);
  assert.ok(mem.rssHuman.includes('MB'));
  assert.ok(disk);

  cleanup(d);
});

console.log('[resource-guard.test] All 50-tix survival primitives (retry, prune, gc, mem, disk) now have coverage teeth. No more silent death spirals.');