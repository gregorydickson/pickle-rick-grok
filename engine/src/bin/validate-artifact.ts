#!/usr/bin/env node
/**
 * validate-artifact.ts — thin CLI wrapper around the canonical ritual validator.
 *
 * Used by managers (and old prompt text) for quick checks.
 * Now supports globs + actual contract (content) validation, not just "does the file exist, Morty?"
 * Pass --contract to enforce section checks for research/plan/etc.
 */

import { resolveAndValidateArtifact } from '../ritual.js';

const args = process.argv.slice(2);
let contract = false;
const filtered = args.filter(a => {
  if (a === '--contract' || a === '-c') { contract = true; return false; }
  return true;
});

const [ticketDir, expectedArtifact] = filtered;

if (!ticketDir || !expectedArtifact) {
  console.error('Usage: validate-artifact.ts <ticketDir> <expected-file.md or pattern-with-*> [--contract]');
  console.error('  --contract  also run content contract validation (required sections, non-slop length)');
  process.exit(2);
}

const result = resolveAndValidateArtifact(ticketDir, expectedArtifact, contract);

if (result.ok) {
  const display = result.matched || expectedArtifact;
  console.log(`OK: ${display} exists${contract ? ' + contract valid' : ''}`);
  process.exit(0);
} else {
  console.error(result.error || `MISSING: ${expectedArtifact} in ${ticketDir}`);
  process.exit(1);
}
