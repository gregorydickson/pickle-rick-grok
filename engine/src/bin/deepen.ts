#!/usr/bin/env node
/**
 * CLI entrypoint for the Architecture Deepening system (/deepen).
 *
 * Supports the 4 paths requested:
 *   - Direct "run" for focused campaigns
 *   - Callable as a phase from pipeline
 *   - Long-running standalone loop (Microverse-style)
 *   - Used internally by the evolved Anatomy Park
 */

import { ArchitectureDeepener } from '../arch-deepener.js';
import { SessionManager } from '../session.js';

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'run') {
  const sessionDir = args[0];
  if (!sessionDir) {
    console.error('Usage: deepen run <sessionDir> [--max-iterations N]');
    process.exit(1);
  }

  console.log(`[deepen] Starting architecture deepening run for ${sessionDir}`);

  const driver = new ArchitectureDeepener(sessionDir);
  const state = driver.init(['.']); // will be smarter later

  // For now this just exercises the skeleton.
  // Real version will do proper scanning + worker spawning + ConvergenceLoop.
  driver.runDeepening(state).then(result => {
    console.log('[deepen] Run complete (skeleton):', result);
    process.exit(0);
  });
} else {
  console.error('Unknown deepen command. Supported: run');
  process.exit(1);
}