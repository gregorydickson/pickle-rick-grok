#!/usr/bin/env node
/**
 * validate-artifact.ts — simple helper the manager can call after a Morty returns
 * to enforce the artifact contract.
 */

import * as fs from 'fs';
import * as path from 'path';

const [ticketDir, expectedArtifact] = process.argv.slice(2);

if (!ticketDir || !expectedArtifact) {
  console.error('Usage: validate-artifact.ts <ticketDir> <expected-file.md>');
  process.exit(2);
}

const full = path.join(ticketDir, expectedArtifact);
if (fs.existsSync(full)) {
  console.log(`OK: ${expectedArtifact} exists`);
  process.exit(0);
} else {
  console.error(`MISSING: ${expectedArtifact} in ${ticketDir}`);
  process.exit(1);
}
