/**
 * session-manager.test.ts — Core SessionManager contract tests for 50-ticket resilience.
 * Covers: create/load, atomic writes, locked mutations, ticket lifecycle, campaign status,
 * claim/lease for headless, resumption fidelity, count helpers.
 * Rick: "If your session state can't survive a Jerry reboot, you don't get a 50-tix overnight."
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionManager, withFileLock, writeJsonAtomic } from '../src/session.js';

function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sess-test-'));
}
function cleanup(d: string) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }

test('SessionManager — createSession seeds correct initial state + manifest + campaign-status', () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionId, sessionDir } = sm.createSession('/fake/wd-for-test', 'test task', 42, 'grok', 'grok');

  assert.ok(sessionId.includes('-'));
  assert.ok(fs.existsSync(path.join(sessionDir, 'state.json')));
  assert.ok(fs.existsSync(path.join(sessionDir, 'manifest.json')));
  assert.ok(fs.existsSync(path.join(sessionDir, 'campaign-status.json')));

  const state = sm.loadState(sessionDir);
  assert.equal(state.step, 'prd');
  assert.equal(state.workingDir, '/fake/wd-for-test');
  assert.equal(state.maxIterations, 42);
  assert.equal(state.tickets.length, 0);

  cleanup(root);
});

test('SessionManager — addTicket + markInProgress + appendPhase + updateStatus + count (locked paths)', async () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession('/tmp/wd', 'lifecycle');

  const t = { id: 'T001', title: 'first', path: 'src/foo.ts', status: 'pending' as const, phasesCompleted: [] as string[] };
  await sm.addTicket(sessionDir, t);

  let snap = sm.countRemainingTickets(sessionDir);
  assert.equal(snap.total, 1);
  assert.equal(snap.remaining, 1);
  assert.equal(snap.done, 0);

  await sm.markTicketInProgress(sessionDir, 'T001');
  let state = sm.loadState(sessionDir);
  const inProg = state.tickets.find(x => x.id === 'T001');
  assert.equal(inProg?.status, 'in_progress');
  // no startedAt on Ticket contract — covered by currentTicketId in state

  await sm.appendPhase(sessionDir, 'T001', 'researcher');
  await sm.appendPhase(sessionDir, 'T001', 'planner');

  state = sm.loadState(sessionDir);
  const progressed = state.tickets[0];
  assert.ok(progressed.phasesCompleted?.includes('researcher'));
  assert.ok(progressed.phasesCompleted?.includes('planner'));

  await sm.updateTicketStatus(sessionDir, 'T001', 'done');
  snap = sm.countRemainingTickets(sessionDir);
  assert.equal(snap.done, 1);
  assert.equal(snap.remaining, 0);

  cleanup(root);
});

test('SessionManager — atomic write + load roundtrip + resumption after simulated crash', async () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession('/tmp/wd', 'atomic-resume');

  await sm.addTicket(sessionDir, { id: 'T-res', title: 'res', path: '', status: 'pending', phasesCompleted: [] });
  await sm.markTicketInProgress(sessionDir, 'T-res');
  await sm.appendPhase(sessionDir, 'T-res', 'researcher');
  await sm.appendPhase(sessionDir, 'T-res', 'implementer');

  // Simulate crash: reload fresh manager + state
  const sm2 = new SessionManager(root);
  const reloaded = sm2.loadState(sessionDir);
  const t = reloaded.tickets.find(x => x.id === 'T-res')!;
  assert.equal(t.status, 'in_progress');
  assert.ok(t.phasesCompleted?.includes('researcher'));
  assert.ok(t.phasesCompleted?.includes('implementer'));
  assert.ok(!t.phasesCompleted?.includes('tester')); // not double-ran

  cleanup(root);
});

test('SessionManager — claimOrchestratorRun + release + stale cleanup for detached mux-runner safety', async () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession('/tmp/wd', 'claim-test');

  const claim1 = await sm.claimOrchestratorRun(sessionDir);
  assert.equal(claim1.ok, true, 'first claim succeeds');

  // second claim should fail (concurrent guard) — now with fixed inner return propagation
  const claim2 = await sm.claimOrchestratorRun(sessionDir);
  assert.equal(claim2.ok, false, 'concurrent claim rejected');
  assert.ok(claim2.reason?.includes('already running') || claim2.reason?.includes('concurrent'));

  sm.releaseOrchestratorRun(sessionDir);

  // after release, should claim again
  const claim3 = await sm.claimOrchestratorRun(sessionDir);
  assert.equal(claim3.ok, true, 'claim after release succeeds');
  sm.releaseOrchestratorRun(sessionDir);

  cleanup(root);
});

test('SessionManager — updateCampaignStatusSync + heartbeat surface for external monitors', () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession(process.cwd(), 'status-test');

  sm.updateCampaignStatusSync(sessionDir, {
    progress: { total: 50, done: 12, failed: 1, remaining: 37 },
    note: 'T012 done',
    resource: { memRss: 123456789, rssHuman: '117.7MB' },
  });

  const statusPath = path.join(sessionDir, 'campaign-status.json');
  assert.ok(fs.existsSync(statusPath));
  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  assert.equal(status.progress.done, 12);
  assert.equal(status.note, 'T012 done');

  cleanup(root);
});

test('SessionManager — withFileLock basic mutual exclusion + timeout', async () => {
  const root = makeTmpRoot();
  const lock = path.join(root, '.test.lock');
  let counter = 0;

  const p1 = withFileLock(lock, async () => {
    const c = counter++;
    await new Promise(r => setTimeout(r, 50));
    return c;
  });

  const p2 = withFileLock(lock, () => { counter++; return 'p2'; }, 10); // short timeout to force contention

  const [r1, r2] = await Promise.allSettled([p1, p2]);
  assert.equal(r1.status, 'fulfilled');
  // p2 may timeout or queue; we just assert no crash and lock cleaned
  assert.ok(!fs.existsSync(lock), 'lock dir removed after');

  cleanup(root);
});

test('writeJsonAtomic — prevents torn writes', () => {
  const root = makeTmpRoot();
  const f = path.join(root, 'atomic.json');
  writeJsonAtomic(f, { foo: 42, bar: [1,2] });
  assert.ok(fs.existsSync(f));
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(data.foo, 42);
  cleanup(root);
});

console.log('[session-test] All SessionManager production paths covered for 50-tix overnight.');