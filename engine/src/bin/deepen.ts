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

import { execSync } from 'child_process';
import * as path from 'path';
import { ArchitectureDeepener, DeepeningOpportunity } from '../arch-deepener.js';
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
  let opps = driver.discoverOpportunities(state.targetPaths);
  console.log(`[deepen] Discovered ${opps.length} deepening opportunities using LANGUAGE.md vocabulary:`);
  opps.slice(0, 5).forEach((o, i) => {
    console.log(`  ${i + 1}. [${o.currentDepth}] ${o.module}`);
    console.log(`     Seam: ${o.proposedSeam.slice(0, 80)}...`);
    console.log(`     Leverage: ${o.expectedLeverage.slice(0, 80)}...`);
  });

  // === FULL AUTONOMOUS LOOP (path #4) — real WorkerSpawner + deepen-changer ===
  if (cmd === 'loop') {
    const { WorkerSpawner } = await import('../workers.js');
    const sm = new SessionManager();
    const workingDir = sm.getWorkingDirSafe(sessionDir);

    const spawner = new WorkerSpawner('grok');

    let iteration = 0;
    const stallLimit = 4;
    let stallCount = 0;
    let lastDebt = opps.filter(o => o.currentDepth !== 'deep').length;
    const failedApproaches: any[] = [];

    while (iteration < maxIterations) {
      iteration++;
      console.log(`[deepen] Iteration ${iteration} — current debt (non-deep modules): ${lastDebt}`);

      const contextPrompt = `You are a Deepen Changer.

Goal: increase architectural depth using the exact vocabulary in references/LANGUAGE.md (Module, Interface, Depth, Seam, Leverage, Locality, Deletion Test).

Current opportunities (top 5):
${opps.slice(0, 5).map((o, i) => `${i + 1}. [${o.currentDepth}] ${o.module}\n   Proposed Seam: ${o.proposedSeam}\n   Leverage: ${o.expectedLeverage}\n   Deletion Test: ${o.deletionTestImpact}`).join('\n')}

Failed approaches this run (NEVER repeat):
${failedApproaches.map((f, i) => `${i + 1}. ${f.description || f}`).join('\n') || 'None'}

Propose ONE tiny structural deepening. Follow references/phases/deepen-changer.md exactly.`;

      const workerRes = await spawner.spawn('deepen-changer', {
        sessionDir,
        prompt: contextPrompt,
        workingDir,
      });

      const newOpps = driver.discoverOpportunities(state.targetPaths);
      const newDebt = newOpps.filter(o => o.currentDepth !== 'deep').length;

      if (newDebt < lastDebt) {
        console.log(`[deepen] → Debt reduced ${lastDebt} → ${newDebt}. Accepted.`);
        stallCount = 0;
        opps = newOpps;
        lastDebt = newDebt;
      } else {
        stallCount++;
        console.log(`[deepen] → No improvement. Rolling back.`);
        try { execSync('git checkout -- .', { cwd: workingDir, stdio: 'ignore' }); } catch {}
        failedApproaches.push({ iteration, description: (workerRes?.output || '').slice(0, 500), debtBefore: lastDebt, debtAfter: newDebt });
        if (stallCount >= stallLimit) { console.log('[deepen] Stall limit hit.'); break; }
      }
    }

    console.log(`[deepen] loop finished after ${iteration} iters. Final debt=${lastDebt}`);
    process.exit(0);
  }

  // run path — discovery only
  driver.runDeepening(state).then(result => {
    console.log('[deepen] Complete:', result);
    process.exit(0);
  });
} else {
  console.error('Unknown deepen command. Supported: run, loop');
  process.exit(1);
}