/**
 * GitSafety — enforces the strict git boundary rules across the entire system
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
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function hasWorkingTreeChanges(cwd: string): boolean {
  try {
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}
