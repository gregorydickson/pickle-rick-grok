/**
 * GitSafety — enforces the strict git boundary rules across the entire system
 *
 * HARDENED for 12h+ 50-ticket detached runs:
 * - Every execSync now carries a sane default timeout (env PICKLE_GIT_TIMEOUT_MS or 45s)
 *   so a hung git on a bloated repo or I/O storm doesn't wedge the whole overnight campaign.
 * - New safeGitExec helper for callers who want explicit control.
 */

import { execSync } from 'child_process';

export const PROHIBITED_COMMANDS = [
  'git checkout',
  'git switch',
  'git reset --hard',
  'git reset',
  'git rebase',
  'git stash',
  'git pull',
  'git push',
  'git fetch --prune',
];

const DEFAULT_GIT_TIMEOUT = Number(process.env.PICKLE_GIT_TIMEOUT_MS) || 45000; // 45s — enough for normal, not enough to hang forever

function withGitTimeout(opts: any = {}) {
  return { ...opts, timeout: opts.timeout || DEFAULT_GIT_TIMEOUT };
}

export function safeGitExec(cmd: string, cwd: string, opts: any = {}): string {
  try {
    return execSync(cmd, withGitTimeout({ cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts })).toString().trim();
  } catch (e: any) {
    // surface the real error for callers who care
    throw e;
  }
}

export function enforceGitBoundaries(command: string, allowedPaths: string[] = []): void {
  const lower = command.toLowerCase().trim();

  for (const bad of PROHIBITED_COMMANDS) {
    if (lower.includes(bad)) {
      throw new Error(`PROHIBITED by Pickle Rick git boundary rules: ${bad}`);
    }
  }

  // Additional scope checks can go here
}

export function getCurrentBranch(cwd: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', withGitTimeout({ cwd, encoding: 'utf8' })).trim();
  } catch {
    return 'unknown';
  }
}

export function hasWorkingTreeChanges(cwd: string): boolean {
  try {
    const status = execSync('git status --porcelain', withGitTimeout({ cwd, encoding: 'utf8' }));
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/** Canonical way to get current HEAD for pre/post snapshotting in ritual and loops. */
export function getGitHead(cwd?: string): string {
  const c = cwd || process.cwd();
  try {
    return execSync('git rev-parse HEAD', withGitTimeout({ cwd: c, encoding: 'utf8' })).trim();
  } catch {
    return 'unknown';
  }
}

/** Returns list of files changed between two shas (used for precise rollback). */
export function getChangedPaths(preSha: string, postSha = 'HEAD', cwd?: string): string[] {
  const c = cwd || process.cwd();
  try {
    const out = execSync(`git diff --name-only ${preSha} ${postSha}`, withGitTimeout({
      cwd: c,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }));
    return out.trim().split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Precise, safe rollback of only the paths touched since preSha using `git restore --source`.
 * This is the official mechanism called by the manager post-return ritual on regression.
 * It deliberately avoids all PROHIBITED git commands.
 */
export async function safeRollback(preSha: string, paths?: string[], cwd?: string): Promise<{ restored: string[]; success: boolean }> {
  const c = cwd || process.cwd();
  let toRestore = paths && paths.length > 0 ? [...paths] : getChangedPaths(preSha, 'HEAD', c);
  if (toRestore.length === 0) {
    return { restored: [], success: true }; // nothing to do is success for ritual
  }

  const quotedPaths = toRestore.map(p => `"${p.replace(/"/g, '')}"`).join(' ');
  const cmd = `git restore --source ${preSha} -- ${quotedPaths}`;

  try {
    execSync(cmd, withGitTimeout({ cwd: c, stdio: 'pipe', encoding: 'utf8' }));
    return { restored: toRestore, success: true };
  } catch (err: any) {
    console.error(`[git-safety] safeRollback failed for ${preSha.slice(0, 8)}: ${err.message || err}`);
    return { restored: [], success: false };
  }
}
