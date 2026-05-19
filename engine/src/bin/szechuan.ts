#!/usr/bin/env node
/**
 * szechuan.ts — CLI entry for the FULL EXPANDED principle-driven deslop engine.
 * Now loads every principle from the canonical sauce docs (adapted).
 * Supports --domain financial for elevated financial rules + priority bumps.
 *
 * Usage:
 *   node dist/bin/szechuan.js init <sessionDir> [paths...] [--domain financial]
 */
import { SzechuanDriver } from '../szechuan.js';

const [cmd, sessionDirArg, ...rest] = process.argv.slice(2);
const sessionDir = sessionDirArg || process.cwd();

let domain: 'base' | 'financial' = 'base';
const domainIdx = rest.indexOf('--domain');
if (domainIdx !== -1 && rest[domainIdx + 1]) {
  domain = rest[domainIdx + 1] as any;
}

if (cmd === 'init') {
  const paths = rest.filter(a => !a.startsWith('--')).length ? rest.filter(a => !a.startsWith('--')) : ['.'];
  const driver = new SzechuanDriver(sessionDir);
  const allPrins = [
    'KISS', 'YAGNI', 'SMALL_FUNCTIONS', 'GUARD_CLAUSES', 'COGNITIVE_LOAD', 'SELF_DOCUMENTING', 'ELEGANCE',
    'DRY', 'SINGLE_SOURCE_OF_TRUTH', 'SEPARATION_OF_CONCERNS', 'MODULARITY', 'ENCAPSULATION', 'LAW_OF_DEMETER',
    'SRP', 'COMPOSITION_OVER_INHERITANCE', 'COMMAND_QUERY',
    'FAIL_FAST', 'ERROR_HANDLING', 'PARSE_DONT_VALIDATE', 'IMMUTABILITY', 'IDEMPOTENCY', 'RESILIENCE',
    'LEAST_PRIVILEGE', 'OBSERVABILITY', 'MIGRATION_SAFETY', 'MIGRATION_HYGIENE',
    'DEPENDENCY_HEALTH', 'TEST_QUALITY', 'BOY_SCOUT', 'SECURITY',
    'MONETARY_PRECISION', 'ROUNDING_CONSISTENCY', 'CURRENCY_DISPLAY', 'STATISTICAL_CORRECTNESS',
    'RATE_PERCENTAGE_HANDLING', 'REGULATORY_COMPLIANCE', 'TEMPORAL_PRECISION', 'AUDIT_TRAIL'
  ];
  driver.init(paths, allPrins, 5, domain);
  console.log(`Szechuan session initialized (domain=${domain}, ${allPrins.length} principles loaded from full sauce catalog)`);
  process.exit(0);
}

console.log('szechuan init <sessionDir> [paths...] [--domain base|financial]');
console.log('Full principles: KISS/YAGNI/DRY/SRP/FAIL_FAST/SECURITY/MONETARY_PRECISION/... + every last one from the two md sources.');
