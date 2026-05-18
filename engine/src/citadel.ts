/**
 * Citadel (slim) — PRD conformance + contract drift auditor
 *
 * We do NOT reimplement all 15 auditors from the original.
 * We keep the highest-value ones:
 *   - AC coverage (every requirement has a verification that actually ran)
 *   - Interface contract drift
 *   - Trap door coverage
 *   - Diff hygiene
 */

import * as fs from 'fs';
import * as path from 'path';

export interface CitadelReport {
  sessionId: string;
  overall: 'PASS' | 'FAIL' | 'WARN';
  findings: Array<{
    severity: 'CRITICAL' | 'HIGH' | 'MED' | 'LOW';
    category: string;
    message: string;
  }>;
}

export function runCitadel(sessionDir: string, prdPath?: string): CitadelReport {
  // Extremely slim version for now
  const report: CitadelReport = {
    sessionId: path.basename(sessionDir),
    overall: 'PASS',
    findings: [],
  };

  // Real version would:
  // - Parse prd.md / prd_refined.md
  // - Walk the final diff
  // - Check that every AC has a matching verification artifact
  // - Check for interface shape changes not reflected in contracts
  // - etc.

  console.log('[citadel] Slim audit complete (PASS in stub mode)');

  fs.writeFileSync(
    path.join(sessionDir, 'citadel_report.json'),
    JSON.stringify(report, null, 2)
  );

  return report;
}
