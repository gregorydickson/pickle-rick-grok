/**
 * resource-guard.ts — back-pressure, retry, hygiene, and monitoring helpers for 12h+ 50-ticket runs
 *
 * The thing that keeps the detached path from turning into a Jerry-flavored OOM + hung-git + silent CLI death spiral.
 *
 * Used by: orchestrator (settle + status), workers (grok CLI graceful retry), future drivers.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  shouldRetry?: (err: any, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const max = opts.maxAttempts ?? 2;
  const baseBackoff = opts.backoffMs ?? 5000;
  let lastErr: any;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const should = opts.shouldRetry ? opts.shouldRetry(e, attempt) : true;
      if (attempt === max || !should) break;
      const delay = baseBackoff * attempt; // linear backoff, simple
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Safe memory snapshot for heartbeat / status file. */
export function getMemSnapshot(): { rss: number; rssHuman: string } {
  const mu = process.memoryUsage();
  const rss = mu.rss;
  const rssHuman = (rss / 1024 / 1024).toFixed(1) + 'MB';
  return { rss, rssHuman };
}

/** Best effort GC hint between tickets (only if --expose-gc was passed). */
export function hintGC(): void {
  if (typeof (global as any).gc === 'function') {
    try { (global as any).gc(); } catch {}
  }
}

/** Prune files in dir older than maxAgeMs. Returns count pruned. */
export function pruneDirOlderThan(dir: string, maxAgeMs: number): number {
  if (!fs.existsSync(dir)) return 0;
  let pruned = 0;
  try {
    const files = fs.readdirSync(dir);
    const now = Date.now();
    for (const f of files) {
      const fp = path.join(dir, f);
      try {
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > maxAgeMs) {
          fs.unlinkSync(fp);
          pruned++;
        }
      } catch {}
    }
  } catch {}
  return pruned;
}

/** Gentle git gc between tickets — keeps repo from exploding after 50* lots of small commits. */
export function gentleGitGc(cwd: string): void {
  try {
    execSync('git gc --auto --quiet', { cwd, stdio: 'ignore', timeout: 30000 });
  } catch {
    // best effort, never kill campaign
  }
}

/** Rough disk free (best effort, mac/linux). */
export function getDiskFreeApprox(cwd: string): string {
  try {
    const out = execSync('df -h . | tail -1', { cwd, encoding: 'utf8', timeout: 5000, stdio: ['ignore','pipe','ignore'] });
    return out.trim().split(/\s+/).slice(-2).join(' ');
  } catch {
    return 'unknown';
  }
}
