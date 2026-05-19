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

if (cmd === 'run' || cmd === 'loop') {
  const sessionDir = args[0];
  if (!sessionDir) {
    console.error(`Usage: deepen ${cmd} <sessionDir> [--max-iterations N]`);
    process.exit(1);
  }

  const maxItersFlag = args.find(a => a.startsWith('--max-iterations'));
  const maxIterations = maxItersFlag ? parseInt(maxItersFlag.split('=')[1] || args[args.indexOf(maxItersFlag) + 1] || '20', 10) : 20;

  console.log(`[deepen] ${cmd.toUpperCase()} architecture deepening for ${sessionDir} (maxIters=${maxIterations})`);

  const driver = new ArchitectureDeepener(sessionDir);
  const state = driver.init(['engine/src', 'skills', '.']);

  // Real discovery using the LANGUAGE scanner (the foundation for all 4 paths)
  const opps = driver.discoverOpportunities(state.targetPaths);
  console.log(`[deepen] Discovered ${opps.length} deepening opportunities using LANGUAGE.md vocabulary:`);
  opps.slice(0, 5).forEach((o, i) => {
    console.log(`  ${i + 1}. [${o.currentDepth}] ${o.module}`);
    console.log(`     Seam: ${o.proposedSeam.slice(0, 80)}...`);
    console.log(`     Leverage: ${o.expectedLeverage.slice(0, 80)}...`);
  });

  // For the loop command we would now wire ConvergenceLoop + spawn deepen-changer workers.
  // This stub proves the discovery is live and the dispatcher can drive it detached.
  if (cmd === 'loop') {
    console.log('[deepen] (loop) would now enter ConvergenceLoop with deepen-changer workers. (P2 wiring)');
  }

  // Still exercise runDeepening for state shape compatibility
  driver.runDeepening(state).then(result => {
    console.log('[deepen] Complete:', result);
    process.exit(0);
  });
} else {
  console.error('Unknown deepen command. Supported: run, loop');
  process.exit(1);
}