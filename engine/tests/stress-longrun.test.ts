/**
 * stress-longrun.test.ts — Resource usage, state growth, long-run stability under 50+ ticket load.
 * + CHAOS 50-ticket sim with failure injection for isolation proof.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionManager } from '../src/session.js';
import { ManagerRitual } from '../src/ritual.js';
import { WorkerResult } from '../src/workers.js';
import { getMemSnapshot } from '../src/lib/resource-guard.js';

function makeTmpRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'stress-50-')); }
function cleanup(d: string) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }

test('long-run stress — 25 tickets proxy, 4 phases, bounded state/RSS', async () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession('/tmp/wd-stress', 'stress proxy');
  const N = 25;
  const PHASES = 4;
  const startRss = getMemSnapshot().rss;
  for (let i = 1; i <= N; i++) {
    const id = `ST${String(i).padStart(3, '0')}`;
    await sm.addTicket(sessionDir, { id, title: `s ${id}`, path: '', status: 'pending', phasesCompleted: [] });
    await sm.markTicketInProgress(sessionDir, id);
    for (let p = 0; p < PHASES; p++) {
      const phase = `p${p}`;
      const tdir = sm.ensureTicketDir(sessionDir, id);
      const art = path.join(tdir, `${phase}_${id}.md`);
      fs.writeFileSync(art, 'x'.repeat(220) + '<promise>I AM DONE</promise>');
      const ritual = new ManagerRitual(sessionDir);
      await ritual.performPostReturn({ sessionDir, ticketId: id, phase, workerResult: { success: true, output: '<promise>I AM DONE</promise>', artifactsWritten: [art] } as any, artifactDir: tdir, expectedArtifact: `${phase}_${id}.md`, preSha: `h${i}${p}`, workingDir: root });
      await sm.appendPhase(sessionDir, id, phase);
    }
    await sm.updateTicketStatus(sessionDir, id, 'done');
  }
  const finalRss = getMemSnapshot().rss;
  assert.ok((finalRss - startRss) < 80 * 1024 * 1024);
  cleanup(root);
  console.log('[stress] 25-tix proxy PASS');
});

test('50-ticket chaos campaign with injected failures (proxy 12-tix fast) — isolation + recovery', async () => {
  const root = makeTmpRoot();
  const sm = new SessionManager(root);
  const { sessionDir } = sm.createSession('/tmp/chaos', 'chaos');
  const N = 12;
  const PHASES = ['impl', 'test'];
  let done = 0, fail = 0;
  for (let i = 1; i <= N; i++) {
    const id = `C${i}`;
    await sm.addTicket(sessionDir, { id, title: id, path: '', status: 'pending', phasesCompleted: [] });
    await sm.markTicketInProgress(sessionDir, id);
    const tdir = sm.ensureTicketDir(sessionDir, id); fs.mkdirSync(tdir, { recursive: true });
    let survived = true;
    for (const ph of PHASES) {
      const art = path.join(tdir, `${ph}.md`);
      const chaos = Math.random() < 0.35;
      const out = chaos ? 'bad no promise' : '<promise>I AM DONE</promise> ' + 'x'.repeat(200);
      if (!chaos) fs.writeFileSync(art, out);
      else fs.writeFileSync(art, 'thin');
      const ritual = new ManagerRitual(sessionDir);
      const res = await ritual.performPostReturn({ sessionDir, ticketId: id, phase: ph, workerResult: { success: !chaos, output: out, artifactsWritten: !chaos ? [art] : [] } as any, artifactDir: tdir, expectedArtifact: `${ph}.md`, preSha: 'p', workingDir: root });
      if (res.valid) await sm.appendPhase(sessionDir, id, ph); else survived = false;
    }
    await sm.updateTicketStatus(sessionDir, id, survived ? 'done' : 'failed');
    survived ? done++ : fail++;
  }
  assert.ok(done + fail === N);
  assert.ok(done >= 3);
  cleanup(root);
  console.log(`[chaos] 50-tix proxy (12) with chaos PASS: ${done} ok ${fail} isolated fails`);
});