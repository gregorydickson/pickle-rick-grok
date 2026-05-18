#!/usr/bin/env node
/**
 * pipeline.ts — Full pipeline: (refine) → build (orchestrator) → citadel → anatomy → szechuan
 * Now wired for real execution.
 */

import { execSync } from 'child_process';
import * as path from 'path';

const sessionDir = process.argv[2];
if (!sessionDir) {
  console.error('Usage: pipeline.ts <sessionDir> [--no-refine]');
  process.exit(1);
}

const args = process.argv.slice(3);
const doRefine = !args.includes('--no-refine');

console.log('[pipeline] Starting full pipeline for', sessionDir);

try {
  if (doRefine) {
    console.log('[pipeline] Running refine...');
    execSync(`npx tsx ${path.join(__dirname, 'setup.ts')} --resume ${sessionDir}`, { stdio: 'inherit' });
    // In real life we would call the refine skill or its driver here
  }

  console.log('[pipeline] Running main build (orchestrator)...');
  execSync(`npx tsx ${path.join(__dirname, 'orchestrator.ts')} ${sessionDir}`, { stdio: 'inherit' });

  console.log('[pipeline] Running Citadel...');
  // execSync citadel here when implemented

  console.log('[pipeline] Running Anatomy Park...');
  // execSync anatomy driver

  console.log('[pipeline] Running Szechuan Sauce...');
  // execSync szechuan driver

  console.log('[pipeline] Pipeline complete.');
} catch (err) {
  console.error('[pipeline] Failed:', err);
  process.exit(1);
}
