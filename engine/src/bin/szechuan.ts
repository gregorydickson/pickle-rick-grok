#!/usr/bin/env node
/**
 * szechuan.ts — CLI for szechuan sauce runs
 */

import { SzechuanDriver } from '../szechuan.js';

const [cmd, sessionDir, ...rest] = process.argv.slice(2);

if (cmd === 'init') {
  const paths = rest.length ? rest : ['.'];
  const driver = new SzechuanDriver(sessionDir);
  driver.init(paths, ['KISS', 'DRY', 'SECURITY', 'COGNITIVE_LOAD']);
  console.log('Szechuan session initialized');
  process.exit(0);
}

console.log('szechuan init <sessionDir> [paths...]');
