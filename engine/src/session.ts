/**
 * SessionManager — canonical session layout and state handling for Pickle Rick Grok (TS)
 *
 * XDG layout: ~/.local/share/pickle-rick-grok/sessions/<id>/
 *
// Meta self-improvement wiring visibility: integrates with self-prd-generator + runSelfImprovementLoopCloser as first-class meta-phases (ritual/persist contracts for 50-tix self campaigns)
 * Productionized for 50+ ticket overnight runs:
 * - All mutations now async + protected by advisory file lock (crash + resume safe)
 * - Helpers for currentTicketId, remaining counts, in-progress marking
 * - Atomic JSON writes (tmp+rename)
 * - Persistent campaign-status.json for external monitors, tmux, gt/linear bots
 * - PID claim guard + stale lock recovery for reboot/resume safety
 * - countRemainingTickets, markInProgress, clearCurrent, etc.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { SessionState, Ticket, Step, Backend, Runtime, CampaignStatus, CampaignProgress } from './types.js';

function getDataRoot(): string {
  const xdg = process.env.XDG_DATA_HOME;
  const base = xdg ? path.join(xdg, 'pickle-rick-grok', 'sessions')
                   : path.join(os.homedir(), '.local', 'share', 'pickle-rick-grok', 'sessions');
  return base;
}

/** Atomic JSON write using tmp + rename (prevents partial writes on crash). */
export function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

/** Helper for the lock file (used by production orchestrator + withFileLock). */
export function getStateLock(sessionDir: string): string {
  return path.join(sessionDir, '.state.lock');
}

/**
 * Basic advisory file lock using atomic mkdir (no extra deps, cross-platform).
 * Use for critical state updates during concurrent/resume scenarios.
 * NOW USED BY ORCHESTRATOR for every ticket/phase state flip on long campaigns.
 * Gracefully skips if parent dir is gone (test cleanup / post-rm scenarios).
 */
export async function withFileLock<T>(
  lockPath: string,
  fn: () => Promise<T> | T,
  timeoutMs = 15000
): Promise<T | undefined> {
  const start = Date.now();
  while (true) {
    try {
      fs.mkdirSync(lockPath, { recursive: false });
      break; // acquired
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        // parent sessionDir deleted (test teardown or manual rm) — best effort skip
        return undefined as any;
      }
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() - start > timeoutMs) {
        throw new Error(`withFileLock timeout acquiring ${lockPath}`);
      }
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 30));
    }
  }
  try {
    return await Promise.resolve(fn());
  } finally {
    try {
      fs.rmdirSync(lockPath);
    } catch {
      /* best effort */
    }
  }
}

export class SessionManager {
  private dataRoot: string;

  constructor(dataRoot?: string) {
    this.dataRoot = dataRoot || getDataRoot();
    fs.mkdirSync(this.dataRoot, { recursive: true });
  }

  createSession(
    workingDir: string,
    task: string,
    maxIterations = 200,
    backend: Backend = 'grok',
    runtime: Runtime = 'grok'
  ): { sessionId: string; sessionDir: string } {
    const sessionId = `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
    const sessionDir = path.join(this.dataRoot, sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const now = new Date().toISOString();
    const state: SessionState = {
      sessionId,
      createdAt: now,
      workingDir,
      step: 'prd',
      tickets: [],
      maxIterations,
      backend,
      runtime,
      flags: {},
      breaker: {},
    };

    this.writeState(sessionDir, state);

    // Human manifest
    fs.writeFileSync(
      path.join(sessionDir, 'manifest.json'),
      JSON.stringify({ sessionId, task, created: now }, null, 2)
    );

    // Seed empty campaign status for monitors
    this.updateCampaignStatusSync(sessionDir, {
      sessionId,
      progress: { total: 0, done: 0, failed: 0, remaining: 0 },
      note: 'session created',
    });

    return { sessionId, sessionDir };
  }

  loadState(sessionDir: string): SessionState {
    const p = path.join(sessionDir, 'state.json');
    if (!fs.existsSync(p)) {
      throw new Error(`No state.json found in ${sessionDir}`);
    }
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    return raw as SessionState;
  }

  getWorkingDir(sessionDir: string): string {
    const state = this.loadState(sessionDir);
    if (!state.workingDir) {
      throw new Error(`Session ${sessionDir} has no workingDir (corrupt state)`);
    }
    return state.workingDir;
  }

  /**
   * Safe resolver: falls back to process.cwd() if no session or corrupt state.
   * Centralizes the former 7+ copy-pasted try/catch dances.
   */
  getWorkingDirSafe(sessionDir: string): string {
    try {
      return this.getWorkingDir(sessionDir);
    } catch {
      return process.cwd();
    }
  }

  writeState(sessionDir: string, state: SessionState): void {
    const p = path.join(sessionDir, 'state.json');
    writeJsonAtomic(p, state);
  }

  listRecentSessions(limit = 20) {
    const dirs = fs.readdirSync(this.dataRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort()
      .reverse()
      .slice(0, limit);

    return dirs.map(id => {
      const p = path.join(this.dataRoot, id, 'state.json');
      if (!fs.existsSync(p)) return null;
      try {
        const s = JSON.parse(fs.readFileSync(p, 'utf8'));
        return {
          id,
          path: path.join(this.dataRoot, id),
          step: s.step,
          created: s.createdAt,
          ticketCount: (s.tickets || []).length,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  /** Locked + async. */
  async addTicket(sessionDir: string, ticket: Ticket): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      state.tickets.push(ticket);
      this.writeState(sessionDir, state);
    });
  }

  async updateTicketStatus(sessionDir: string, ticketId: string, status: Ticket['status']): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) t.status = status;
      this.writeState(sessionDir, state);
    });
  }

  getTicketDir(sessionDir: string, ticketId: string): string {
    return path.join(sessionDir, 'tickets', ticketId);
  }

  ensureTicketDir(sessionDir: string, ticketId: string): string {
    const dir = this.getTicketDir(sessionDir, ticketId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /** Locked + async. Appends to phasesCompleted (the key for mid-ticket resumption). */
  async appendPhase(sessionDir: string, ticketId: string, phase: string, artifactPath?: string): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) {
        if (!t.phasesCompleted) t.phasesCompleted = [];
        if (!t.phasesCompleted.includes(phase)) {
          t.phasesCompleted.push(phase);
        }
      }
      this.writeState(sessionDir, state);
    });
  }

  getTicketProgress(sessionDir: string, ticketId: string) {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (!t) return null;
    const completed = t.phasesCompleted || [];
    return { completed, nextPhase: undefined };
  }

  /** Rich progress for 50+ ticket runs and external monitors. */
  countRemainingTickets(sessionDir: string): { total: number; remaining: number; done: number; failed: number } {
    try {
      const state = this.loadState(sessionDir);
      const ts = state.tickets || [];
      const done = ts.filter(t => t.status === 'done').length;
      const failed = ts.filter(t => t.status === 'failed').length;
      const remaining = ts.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
      return { total: ts.length, remaining, done, failed };
    } catch {
      return { total: 0, remaining: 0, done: 0, failed: 0 };
    }
  }

  /**
   * Production: atomically mark a ticket in_progress + set currentTicketId (for resumption + heartbeat visibility).
   * Used by orchestrator at start of every ticket.
   */
  async markTicketInProgress(sessionDir: string, ticketId: string): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) t.status = 'in_progress';
      state.currentTicketId = ticketId;
      this.writeState(sessionDir, state);
      this.updateCampaignStatusSync(sessionDir, {
        currentTicketId: ticketId,
        note: `ticket ${ticketId} in progress`,
      });
    });
  }

  /** Clear the current pointer (end of run or graceful stop). */
  async clearCurrentTicket(sessionDir: string): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      delete state.currentTicketId;
      this.writeState(sessionDir, state);
    });
  }

  private getPidPath(sessionDir: string): string {
    return path.join(sessionDir, '.orchestrator.pid');
  }

  private getCampaignStatusPath(sessionDir: string): string {
    return path.join(sessionDir, 'campaign-status.json');
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Atomic, lock-protected PID claim for single-run guard (prevents double-run).
   * Stale pid auto-overwritten. Callers must await.
   */
  async claimOrchestratorRun(sessionDir: string): Promise<{ ok: boolean; reason?: string; existingPid?: number }> {
    const p = this.getPidPath(sessionDir);
    const claimLock = path.join(sessionDir, '.pid-claim.lock');
    try {
      const inner = await withFileLock(claimLock, () => {
        try {
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8');
            const { pid } = JSON.parse(raw);
            if (pid && this.isProcessAlive(pid)) {
              return { ok: false, reason: 'orchestrator already running', existingPid: pid };
            }
          }
          const payload = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), sessionDir });
          const tmp = `${p}.tmp-${Date.now()}`;
          fs.writeFileSync(tmp, payload);
          fs.renameSync(tmp, p);
          return { ok: true };
        } catch (e: any) {
          console.warn('[session] claim hiccup:', e?.message);
          return { ok: true }; // last ditch allow
        }
      }, 5000);
      if (inner && typeof inner === 'object' && 'ok' in (inner as any)) {
        return inner as any;
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: 'pid claim lock timeout (contention or disk pressure?)' };
    }
  }

  releaseOrchestratorRun(sessionDir: string): void {
    try {
      const p = this.getPidPath(sessionDir);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }

  /** Cleanup stale lock/pid for mux-runner on resume after kill/reboot. */
  cleanupStaleLock(sessionDir: string): void {
    try {
      const pidPath = this.getPidPath(sessionDir);
      if (fs.existsSync(pidPath)) {
        const raw = fs.readFileSync(pidPath, 'utf8');
        const { pid } = JSON.parse(raw);
        if (pid && !this.isProcessAlive(pid)) {
          fs.unlinkSync(pidPath);
        }
      }
    } catch {}
  }

  /** Update or init the persistent campaign-status.json (authoritative for monitors). */
  updateCampaignStatusSync(sessionDir: string, patch: Partial<CampaignStatus> & { progress?: CampaignProgress }): void {
    const p = this.getCampaignStatusPath(sessionDir);
    let current: any = {};
    if (fs.existsSync(p)) {
      try { current = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
    }
    const merged = {
      ...current,
      ...patch,
      lastUpdated: new Date().toISOString(),
    };
    // also merge progress if provided
    if (patch.progress) {
      merged.progress = { ...(current.progress || {}), ...patch.progress };
    }
    writeJsonAtomic(p, merged);
  }
}

// Types re-export guard (CampaignStatus etc in types.ts)
