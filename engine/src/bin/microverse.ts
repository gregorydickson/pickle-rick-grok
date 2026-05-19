#!/usr/bin/env node
/**
 * CLI entrypoint for the microverse engine.
 * Invoked from skills as: npx tsx engine/src/bin/microverse.ts <command> ...
 */

import { MicroverseDriver } from '../microverse.js';
import { SessionManager } from '../session.js';
import { execSync } from 'child_process';
import * as path from 'path';

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'init') {
  const sessionDir = args[0];
  if (!sessionDir) {
    console.error('Usage: microverse init <sessionDir> [metricJson]');
    process.exit(1);
  }
  const metricJson = args[1] ? JSON.parse(args[1]) : {};
  const driver = new MicroverseDriver(sessionDir);
  const state = driver.init(sessionDir + '/prd.md', metricJson);
  console.log(`Microverse initialized for session ${state.sessionId}`);
  process.exit(0);
}

if (cmd === 'run-metric') {
  const sessionDir = args[0];
  if (!sessionDir) {
    console.error('Usage: microverse run-metric <sessionDir> <command...>');
    process.exit(1);
  }
  const command = args.slice(1).join(' ');
  const driver = new MicroverseDriver(sessionDir);
  const result = driver.runCommandMetric(command);
  console.log(JSON.stringify(result));
  process.exit(0);
}

if (cmd === 'run') {
  const sessionDir = args[0];
  if (!sessionDir) {
    console.error('Usage: microverse run <sessionDir> [--max-iterations N]');
    process.exit(1);
  }

  const maxItersFlag = args.indexOf('--max-iterations');
  const overrideMax = maxItersFlag !== -1 ? parseInt(args[maxItersFlag + 1]) : undefined;

  console.log(`[microverse] Starting full autonomous convergence run for ${path.basename(sessionDir)}`);

  const { WorkerSpawner } = await import('../workers.js');
  const sm = new SessionManager();
  const workingDir = sm.getWorkingDirSafe(sessionDir);

  const driver = new MicroverseDriver(sessionDir);
  let state = driver.load();

  if (overrideMax) {
    state.maxIterations = overrideMax;
    driver.writeState(state);
  }

  const spawner = new WorkerSpawner(state.backend || 'grok');

  let iteration = state.currentIteration || 0;
  const stallLimit = state.stallLimit || 5;
  let stallCount = 0;
  let lastScore: number | null = null;

  while (iteration < (state.maxIterations || 300)) {
    iteration++;
    state.currentIteration = iteration;
    driver.writeState(state);

    console.log(`[microverse] Iteration ${iteration}`);

    // Spawn microverse-changer with full context
    const contextPrompt = `You are the Microverse Changer for session ${path.basename(sessionDir)}.

Goal: ${state.description || state.keyMetric?.description || 'improve the metric'}
Direction: make the score ${state.direction}
Last known score: ${lastScore ?? 'unknown'}
Failed approaches (NEVER repeat these):
${(state.failedApproaches || []).map((f: any, i: number) => `${i+1}. ${f.description || JSON.stringify(f)}`).join('\n') || 'None'}

Propose ONE tiny, targeted, low-risk change. Follow the exact format in references/phases/microverse-changer.md.`;

    const workerRes = await spawner.spawn('microverse-changer', {
      sessionDir,
      prompt: contextPrompt,
      workingDir,
    });

    // Measure
    const snapshot = driver.runCommandMetric(state.keyMetric?.validation || 'echo 0');
    const currentScore = snapshot?.score ?? 0;
    console.log(`[microverse] Score after iteration: ${currentScore}`);

    const improved = lastScore === null ||
      (state.direction === 'higher'
        ? currentScore > (lastScore + (state.tolerance || 0))
        : currentScore < (lastScore - (state.tolerance || 0)));

    if (improved) {
      stallCount = 0;
      console.log('[microverse] → Improvement accepted');
    } else {
      stallCount++;
      console.log('[microverse] → No improvement — rolling back');
      try {
        execSync('git checkout -- .', { cwd: workingDir, stdio: 'ignore' });
      } catch {}

      state.failedApproaches = state.failedApproaches || [];
      state.failedApproaches.push({
        iteration,
        description: (workerRes.output || '').slice(0, 400),
        score: currentScore,
      });
    }

    state.history = state.history || [];
    state.history.push({ iteration, score: currentScore, improved });
    lastScore = currentScore;
    driver.writeState(state);

    if (stallCount >= stallLimit) {
      console.log('[microverse] Stall limit reached — converged');
      state.status = 'converged';
      driver.writeState(state);
      break;
    }
  }

  console.log(`[microverse] Autonomous run finished after ${iteration} iterations. Final score: ${lastScore}`);
  process.exit(0);
}

console.error('Unknown microverse command. Supported: init, run-metric, run');
process.exit(1);
