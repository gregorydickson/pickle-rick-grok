#!/usr/bin/env node
/**
 * setup.ts — the universal session bootstrapper (Grok-native)
 *
 * Replaces the old extension/bin/setup.js
 * Creates session, writes initial state, optionally creates prd skeleton, etc.
 */

import { SessionManager } from '../session.js';
import { Backend, Runtime } from '../types.js';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const task = flags.task || args.find(a => !a.startsWith('--')) || 'Untitled task';
const maxIters = Number(flags['max-iterations'] || 200);
const backend = (flags.backend || 'grok') as Backend;
const runtime = (flags.runtime || 'grok') as Runtime;
const tmux = !!flags.tmux;

const sm = new SessionManager();

const { sessionId, sessionDir } = sm.createSession(
  process.cwd(),
  task,
  maxIters,
  backend,
  runtime
);

console.log(`SESSION_ROOT=${sessionDir}`);
console.log(`SESSION_ID=${sessionId}`);
console.log(`Created new Pickle Rick session for: ${task}`);

if (tmux) {
  console.log('tmux mode requested — use /pickle-tmux or the detached runner');
}
