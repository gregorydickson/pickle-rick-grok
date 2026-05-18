/**
 * WorkerSpawner — Grok-native worker abstraction
 *
 * Supports two modes:
 *   1. Native subagents (preferred when running inside a Grok session)
 *   2. Headless `grok -p` (for detached runners and --backend codex/hermes)
 *
 * This is the key architectural difference from the Claude version.
 */

import { Backend } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export type WorkerRole =
  | 'morty-phase-researcher'
  | 'morty-phase-research-reviewer'
  | 'morty-phase-planner'
  | 'morty-phase-plan-reviewer'
  | 'morty-phase-implementer'
  | 'morty-phase-verifier'
  | 'morty-phase-reviewer'
  | 'morty-phase-simplifier'
  | 'microverse-changer'
  | 'anatomy-reviewer'
  | 'anatomy-fixer'
  | 'anatomy-verifier';

export interface SpawnOptions {
  sessionDir: string;
  ticketId?: string;
  phase?: string;
  prompt: string;                    // full prompt text
  backend?: Backend;
  role?: WorkerRole;
  maxTurns?: number;
  readOnly?: boolean;                // for review/verifier phases
  isolation?: 'none' | 'worktree';   // Grok subagent feature
}

export interface WorkerResult {
  success: boolean;
  output: string;
  artifactsWritten: string[];        // paths to research_*.md etc.
  exitCode: number;
}

/**
 * WorkerSpawner — Grok-native worker abstraction
 *
 * Preferred path (interactive skills):
 *   The skill directly calls `spawn_subagent({
 *     subagent_type: 'general-purpose' or custom,
 *     persona: role,
 *     fork_context: false,
 *     isolation: 'worktree',
 *     prompt: buildPrompt(role, ticket, artifacts)
 *   })`
 *
 * Detached / CLI path:
 *   This class shells `grok -p "..."` or `codex exec` / `hermes ...`
 */
export class WorkerSpawner {
  constructor(private defaultBackend: Backend = 'grok') {}

  async spawn(role: WorkerRole, opts: SpawnOptions): Promise<WorkerResult> {
    const backend = opts.backend || this.defaultBackend;

    if (backend === 'grok' && !process.env.PICKLE_FORCE_HEADLESS) {
      // Interactive skills should call spawn_subagent directly.
      // This is only a fallback for pure CLI use.
      console.warn('[workers] Interactive mode recommended — use spawn_subagent from the skill');
    }

    return this.spawnViaHeadless(backend, role, opts);
  }

  private async spawnViaHeadless(backend: Backend, role: WorkerRole, opts: SpawnOptions): Promise<WorkerResult> {
    const { execSync } = await import('child_process');

    let cmd = '';
    if (backend === 'grok') {
      // Minimal real headless call. In production pass full escaped prompt.
      const prompt = opts.prompt.replace(/"/g, '\\"');
      cmd = `grok -p "${prompt}" --yolo --max-turns ${opts.maxTurns || 50} --output-format plain`;
    } else if (backend === 'codex') {
      cmd = `codex exec --prompt "${opts.prompt}"`; // placeholder
    } else {
      return { success: false, output: `Unsupported backend ${backend}`, artifactsWritten: [], exitCode: 1 };
    }

    try {
      const output = execSync(cmd, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      });

      // Robust promise token + artifact discovery
      const lowerOutput = output.toLowerCase();
      const hasPromise = output.includes('<promise>I AM DONE</promise>') ||
                         lowerOutput.includes('i am done') ||
                         lowerOutput.includes('promise') && lowerOutput.includes('done');

      const artifactsWritten: string[] = [];
      if (opts.ticketId && opts.sessionDir) {
        const ticketDir = path.join(opts.sessionDir, 'tickets', opts.ticketId);
        if (fs.existsSync(ticketDir)) {
          const files = fs.readdirSync(ticketDir)
            .filter(f => f.endsWith('.md') && (f.includes('research') || f.includes('plan') || f.includes('conformance') || f.includes('review') || f.includes('simplify')))
            .map(f => path.join(ticketDir, f));
          artifactsWritten.push(...files);
        }
      }

      const success = hasPromise || artifactsWritten.length > 0;

      return { success, output, artifactsWritten, exitCode: 0 };
    } catch (err: any) {
      return { success: false, output: err.message || String(err), artifactsWritten: [], exitCode: 1 };
    }
  }
}
