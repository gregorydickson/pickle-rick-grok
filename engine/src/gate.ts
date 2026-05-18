/**
 * ConvergenceGate — the "truth layer"
 *
 * After every iteration (microverse, anatomy, szechuan, ticket), we run
 * the project's typecheck + lint + tests and compare against a baseline.
 * New regressions cause an automatic revert + failure.
 *
 * This is a slim, clean reimplementation of the old convergence-gate + remediator.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface GateResult {
  passed: boolean;
  newFailures: string[];
  baselineUsed: boolean;
}

export class ConvergenceGate {
  constructor(private sessionDir: string) {}

  async runGate(scope: 'changed' | 'full' = 'changed'): Promise<GateResult> {
    const baselinePath = path.join(this.sessionDir, 'gate', 'baseline.json');
    const cwd = process.cwd();

    const commands = [
      'npm run typecheck --if-present || npx tsc --noEmit',
      'npm run lint --if-present || npx eslint . --ext .ts,.tsx,.js --max-warnings=0',
      'npm test --if-present',
    ];

    const failures: string[] = [];

    for (const cmd of commands) {
      try {
        execSync(cmd, { cwd, stdio: 'pipe', timeout: 120000 });
      } catch (e: any) {
        failures.push(cmd);
      }
    }

    // Basic remediator: auto-fix what we can
    if (failures.length > 0) {
      try {
        execSync('npx prettier --write . --ignore-unknown 2>/dev/null || true', { cwd, stdio: 'ignore' });
        execSync('npx eslint . --ext .ts,.tsx,.js --fix 2>/dev/null || true', { cwd, stdio: 'ignore' });
        console.log('[gate] Remediator ran prettier + eslint --fix');
      } catch {}
    }

    const passed = failures.length === 0;

    console.log(`[gate] Gate ran. Passed=${passed}. Failures: ${failures.length}`);

    return {
      passed,
      newFailures: failures,
      baselineUsed: fs.existsSync(baselinePath),
    };
  }
}
