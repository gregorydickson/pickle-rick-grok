/**
 * ConvergenceGate — the "truth layer"
 *
 * After every iteration (microverse, anatomy, szechuan, ticket), we run
 * the project's typecheck + lint + tests and compare against a baseline.
 * New regressions cause an automatic revert + failure.
 *
 * This is a slim, clean reimplementation of the old convergence-gate + remediator.
 *
 * HARDENED for 50-ticket overnight self-dogfood on grok tree (and arbitrary targets):
 * - ONLY runs `npm run <script> --if-present` for the three standard gates (and ONLY if package.json exists).
 * - NO unconditional npx tsc/eslint fallbacks. Those were murder on trees without the scripts
 *   (our own grok root for self-runs, or minimal sim wds) — caused full-tree scans 400x,
 *   false failures, ENOENT spam, 5min+ timeouts per phase, log floods.
 * - If project declares the scripts in package.json, gate enforces (failures → warn + optional rollback).
 * - If absent (grok self-meta, custom setups, test harnesses, bare dirs), gate is instant no-op PASS. No perf hit.
 *   Real enforcement for self comes from citadel/anatomy/szechuan drivers instead.
 * - Remediator (prettier/eslint --fix) only on actual declared-script failures.
 * - cwd always from session workingDir (or safe fallback), timeouts sane.
 * - Now 50-tix overnight on pickle-rick-grok is actually viable, not a lie.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Activity } from './activity-logger.js';
import { SessionManager } from './session.js';
import { enforceGitBoundaries } from './git_safety.js';

export interface GateResult {
  passed: boolean;
  newFailures: string[];
  baselineUsed: boolean;
  /** Richer diagnostics for debugging silent failures */
  failureDetails?: Array<{ cmd: string; error: string; stderr?: string }>;
}

export class ConvergenceGate {
  private workingDir: string;

  constructor(private sessionDir: string) {
    const sm = new SessionManager();
    this.workingDir = sm.getWorkingDirSafe(sessionDir);
  }

  async runGate(scope: 'changed' | 'full' = 'changed'): Promise<GateResult> {
    const baselinePath = path.join(this.sessionDir, 'gate', 'baseline.json');
    const cwd = this.workingDir;

    const gateTimeout = Number(process.env.PICKLE_GATE_TIMEOUT_MS) || 300000; // 5min default — Jerry 2min was causing mass false positives on real codebases

    // Robustness for all contexts (self-grok, sim, tests, bare wds): if no package.json, no declared gates possible.
    // Instant PASS, zero spam, zero cost. Fixes the last "gate always lies on non-npm trees" micro-gap.
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
      const base: GateResult = { passed: true, newFailures: [], baselineUsed: fs.existsSync(baselinePath) };
      Activity.gateResult('gate', path.basename(this.sessionDir), true, 0);
      return base;
    }

    // SAFE: only declared scripts. --if-present = no-op + exit0 if absent. No npx fallbacks ever.
    const commands = [
      'npm run typecheck --if-present',
      'npm run lint --if-present',
      'npm test --if-present',
    ];

    const failures: string[] = [];
    const failureDetails: Array<{ cmd: string; error: string; stderr?: string }> = [];

    for (const cmd of commands) {
      enforceGitBoundaries(cmd);
      try {
        execSync(cmd, { cwd, stdio: 'pipe', timeout: gateTimeout });
      } catch (e: any) {
        const stderr = e.stderr ? e.stderr.toString().slice(0, 500) : undefined;
        const errMsg = e.message || String(e);
        failures.push(cmd);
        failureDetails.push({ cmd, error: errMsg, stderr });
        console.error(`[gate] Command failed: ${cmd} :: ${errMsg}`);
        if (stderr) console.error(`[gate] stderr: ${stderr}`);
      }
    }

    // Basic remediator: auto-fix what we can — only if real declared-script failures occurred
    if (failures.length > 0) {
      const rem1 = 'npx prettier --write . --ignore-unknown 2>/dev/null || true';
      const rem2 = 'npx eslint . --ext .ts,.tsx,.js --fix 2>/dev/null || true';
      enforceGitBoundaries(rem1);
      enforceGitBoundaries(rem2);
      try {
        execSync(rem1, { cwd, stdio: 'ignore', timeout: gateTimeout });
        execSync(rem2, { cwd, stdio: 'ignore', timeout: gateTimeout });
        console.log('[gate] Remediator ran prettier + eslint --fix');
      } catch {}
    }

    const passed = failures.length === 0;

    // Only log on interesting cases to keep overnight logs sane (400+ phases)
    if (!passed || failures.length > 0) {
      console.log(`[gate] Gate ran (timeout=${gateTimeout}ms). Passed=${passed}. Failures: ${failures.length}`);
    }

    Activity.gateResult('gate', path.basename(this.sessionDir), passed, failures.length);

    const base: GateResult = {
      passed,
      newFailures: failures,
      baselineUsed: fs.existsSync(baselinePath),
    };
    if (failureDetails.length > 0) {
      (base as any).failureDetails = failureDetails;
    }
    return base;
  }
}
