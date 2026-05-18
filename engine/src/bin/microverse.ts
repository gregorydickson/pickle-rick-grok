#!/usr/bin/env node
/**
 * CLI entrypoint for the microverse engine.
 * Invoked from skills as: npx tsx engine/src/bin/microverse.ts <command> ...
 */

import { MicroverseDriver } from '../microverse.js';
import { SessionManager } from '../session.js';

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'init') {
  const sessionDir = args[0];
  const metricJson = args[1] ? JSON.parse(args[1]) : {};
  const driver = new MicroverseDriver(sessionDir);
  const state = driver.init(sessionDir + '/prd.md', metricJson);
  console.log(`Microverse initialized for session ${state.sessionId}`);
  process.exit(0);
}

if (cmd === 'run-metric') {
  const sessionDir = args[0];
  const command = args.slice(1).join(' ');
  const driver = new MicroverseDriver(sessionDir);
  const result = driver.runCommandMetric(command);
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.error('Unknown microverse command. Supported: init, run-metric');
process.exit(1);
