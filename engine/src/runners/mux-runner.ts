#!/usr/bin/env node
/**
 * mux-runner.ts — Detached long-running orchestrator (Grok native)
 *
 * This is the equivalent of the old mux-runner that ran inside tmux.
 * It is meant to be launched via Grok background tasks or as a standalone process.
 *
 * It uses headless `grok -p` calls for workers when no interactive agent is present.
 */

import { SessionManager } from '../session.js';
import { Orchestrator } from '../bin/orchestrator.js'; // would be refactored in real code

export async function runDetached(sessionDir: string, options: { monitor?: boolean } = {}) {
  console.log(`[mux-runner] Starting detached run for ${sessionDir}`);

  const sm = new SessionManager();
  const state = sm.loadState(sessionDir);

  // In real version: set up logging, circuit breaker, rate limit handling,
  // then drive the orchestrator in a loop with headless workers.

  console.log('[mux-runner] Would now drive the full ticket loop using headless grok -p workers.');
  console.log('[mux-runner] Background mode active. Use Grok background task monitoring to watch.');

  // For now this is a stub that can be expanded into the real long-running driver.
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sessionDir = process.argv[2];
  runDetached(sessionDir).catch(console.error);
}
