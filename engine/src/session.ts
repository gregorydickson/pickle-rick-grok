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
import { SessionState, Ticket, Step, Backend, Runtime, CampaignStatus, CampaignProgress, ReadinessAssessment, SessionTicket } from './types.js';
import { Activity } from './activity-logger.js';
import * as Preflight from './lib/pipeline-preflight.js';
import type { PreflightReport } from './types.js';

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

  /**
   * Update (or attach) ReadinessAssessment on ticket (from preflight emission or ritual research extraction).
   * If assessment signals 'blocked'/'deferred', also flips the ticket status.
   * Used by ritual for post-research honesty without nuking the ticket as 'failed'.
   */
  async updateTicketReadiness(sessionDir: string, ticketId: string, assessment: ReadinessAssessment): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) {
        t.readiness = assessment;
        const rStatus = (assessment as any)?.status;
        if (rStatus === 'blocked' || rStatus === 'deferred') {
          t.status = rStatus;
        }
      }
      this.writeState(sessionDir, state);
    });
  }

  /**
   * Core recovery primitive.
   * Resets a single ticket back to 'pending' so the orchestrator will pick it up again on next run.
   * Clears phasesCompleted (forces fresh start from researcher) and updates campaign status.
   * Safe to call even if the ticket is currently 'failed' due to a previous engine bug or crash.
   */
  async resetTicketToPending(sessionDir: string, ticketId: string): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) {
        t.status = 'pending';
        t.phasesCompleted = [];
      }
      // If this was the current ticket, clear the pointer so the next run starts fresh
      if (state.currentTicketId === ticketId) {
        delete state.currentTicketId;  // omit key (exactOptional-safe); matches clearCurrentTicket
      }
      this.writeState(sessionDir, state);

      this.updateCampaignStatusSync(sessionDir, {
        note: `ticket ${ticketId} reset to pending (recovery)`,
        ...(state.currentTicketId !== undefined ? { currentTicketId: state.currentTicketId } : {}),
      });
    });
  }

  /**
   * Bulk recovery helper — the common case after fixing an engine bug or after a crash.
   * Returns the list of ticket IDs that were actually reset.
   */
  async resetAllFailedTickets(sessionDir: string): Promise<string[]> {
    const lockPath = getStateLock(sessionDir);
    const reset: string[] = [];

    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      let changed = false;

      for (const t of state.tickets || []) {
        if (t.status === 'failed') {
          t.status = 'pending';
          t.phasesCompleted = [];
          reset.push(t.id);
          changed = true;
        }
      }

      if (reset.length > 0 && reset.includes(state.currentTicketId || '')) {
        delete state.currentTicketId;  // omit key (exactOptional-safe)
      }

      if (changed) {
        this.writeState(sessionDir, state);
      }

      this.updateCampaignStatusSync(sessionDir, {
        note: reset.length > 0
          ? `recovered ${reset.length} failed tickets: ${reset.join(', ')}`
          : 'no failed tickets to recover',
        ...(state.currentTicketId !== undefined ? { currentTicketId: state.currentTicketId } : {}),
      });
    });

    return reset;
  }

  getTicketDir(sessionDir: string, ticketId: string): string {
    return path.join(sessionDir, 'tickets', ticketId);
  }

  ensureTicketDir(sessionDir: string, ticketId: string): string {
    const dir = this.getTicketDir(sessionDir, ticketId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  /**
   * Generalized helper for any ticket-emitting tool (refine, self-prd, future anatomy/deepener, etc.).
   * Writes the ticket.md under the canonical session layout and registers it in state.
   */
  async persistTicket(
    sessionDir: string,
    id: string,
    mdContent: string,
    meta: { title: string; status?: Ticket['status']; phasesCompleted?: string[]; [k: string]: any }
  ): Promise<string> {
    const dir = this.ensureTicketDir(sessionDir, id);
    const ticketPath = path.join(dir, 'ticket.md');
    fs.writeFileSync(ticketPath, mdContent, 'utf8');

    const t = {
      ...meta,
      id,
      path: path.join('tickets', id, 'ticket.md'),
      status: meta.status || 'pending',
      phasesCompleted: meta.phasesCompleted || [],
      title: meta.title,  // explicit after spread (avoids duplicate key issues under strict TS)
    } as SessionTicket;  // richer shape actually stored; still compatible where Ticket expected

    await this.addTicket(sessionDir, t);
    return ticketPath;
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

  /** Locked persistence of runtime-owned discrete ticket completion commit (state + campaign-status surface). */
  async setTicketCompletionCommit(
    sessionDir: string,
    ticketId: string,
    sha: string,
    source: 'runtime-orchestrator' | 'worker-direct' | 'inferred' | 'fallback' = 'runtime-orchestrator'
  ): Promise<void> {
    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t) {
        t.completionCommit = sha;
        t.completionCommitSource = source;
        t.completionCommitAt = new Date().toISOString();
      }
      this.writeState(sessionDir, state);
      this.updateCampaignStatusSync(sessionDir, {
        note: `ticket ${ticketId} completionCommit recorded ${sha.slice(0, 8)} (source=${source})`,
      } as any);
    });
  }

  getTicketCompletionCommit(sessionDir: string, ticketId: string): { sha?: string; source?: string; at?: string } | null {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (!t) return null;
    return {
      sha: t.completionCommit,
      source: t.completionCommitSource,
      at: t.completionCommitAt,
    };
  }

  getTicketProgress(sessionDir: string, ticketId: string) {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (!t) return null;
    const completed = t.phasesCompleted || [];
    return { completed, nextPhase: undefined };
  }

  /** Rich progress for 50+ ticket runs and external monitors. */
  countRemainingTickets(sessionDir: string): { total: number; remaining: number; done: number; failed: number; blocked?: number; deferred?: number } {
    try {
      const state = this.loadState(sessionDir);
      const ts = state.tickets || [];
      const done = ts.filter(t => t.status === 'done').length;
      const failed = ts.filter(t => t.status === 'failed').length;
      const blocked = ts.filter(t => t.status === 'blocked').length;
      const deferred = ts.filter(t => t.status === 'deferred').length;
      const remaining = ts.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
      return { total: ts.length, remaining, done, failed, blocked, deferred };
    } catch {
      return { total: 0, remaining: 0, done: 0, failed: 0, blocked: 0, deferred: 0 };
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

  // === PRD LINKAGE + PREFLIGHT EXTENSIONS (P0-1 / P0-2 / P0-5) ===

  /**
   * Create a fresh session and immediately stamp it with source PRD linkage.
   * This is the canonical machine entry for "run pipeline on PRD".
   * Fires prdPipelineInitiated + sessionLinkedToPrd.
   * Async because stamp uses lock.
   */
  async createSessionForPrd(
    workingDir: string,
    task: string,
    prdPath: string,
    maxIterations = 200,
    backend: Backend = 'grok',
    runtime: Runtime = 'grok'
  ): Promise<{ sessionId: string; sessionDir: string }> {
    const res = this.createSession(workingDir, task, maxIterations, backend, runtime);
    await this.stampPrdSource(res.sessionDir, prdPath);
    Activity.prdPipelineInitiated(res.sessionId, prdPath, { via: 'createSessionForPrd' });
    return res;
  }

  /**
   * Find an existing session directory that is already linked (via state.sourcePrd or .prd-source.json)
   * to the given PRD path. Returns the full sessionDir or null.
   * Used by dispatch to avoid zombie reuse of prior partial runs on same PRD.
   */
  findLinkedSessionForPrd(prdPath: string): string | null {
    if (!prdPath) return null;
    const target = path.resolve(prdPath);
    try {
      const dirs = fs.readdirSync(this.dataRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort()
        .reverse(); // newest first

      for (const id of dirs) {
        const sdir = path.join(this.dataRoot, id);
        // 1. state.json stamp
        try {
          const st = this.loadState(sdir);
          if (st.sourcePrd && path.resolve(st.sourcePrd) === target) {
            return sdir;
          }
        } catch {
          /* skip corrupt */
        }
        // 2. sidecar .prd-source.json (authoritative for linkage even if state pruned)
        const metaP = path.join(sdir, '.prd-source.json');
        if (fs.existsSync(metaP)) {
          try {
            const m = JSON.parse(fs.readFileSync(metaP, 'utf8'));
            if (m.prdPath && path.resolve(m.prdPath) === target) {
              return sdir;
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* dataRoot issues */
    }
    return null;
  }

  /**
   * Stamp a session with its originating PRD (idempotent, atomic on state + writes .prd-source.json sidecar).
   * Always uses lock for state mutation. Updates prdLinkedAt + content hash for drift detection.
   * Emits sessionLinkedToPrd.
   */
  async stampPrdSource(sessionDir: string, prdPath: string, opts?: { content?: string }): Promise<void> {
    const resolved = path.resolve(prdPath);
    let hash = '';
    try {
      const content = opts?.content || (fs.existsSync(resolved) ? fs.readFileSync(resolved, 'utf8') : '');
      if (content) {
        // stable cheap hash (matches lib compute)
        let h = 0;
        for (let i = 0; i < content.length; i++) h = (h * 31 + content.charCodeAt(i)) | 0;
        hash = 'h' + ((h >>> 0).toString(16));
      }
    } catch {
      /* best effort */
    }

    const lockPath = getStateLock(sessionDir);
    await withFileLock(lockPath, () => {
      try {
        const state = this.loadState(sessionDir);
        state.sourcePrd = resolved;
        state.prdLinkedAt = new Date().toISOString();
        state.prdContentHash = hash;
        this.writeState(sessionDir, state);
      } catch (e: any) {
        // session may be brand new without state yet; ignore (createSessionForPrd path always has it)
        console.warn('[session] stampPrdSource state update skipped:', e?.message);
      }
    }, 8000);

    // Always materialize sidecar (even without state) for citadel/findPrd + external tools
    Preflight.writePrdSourceMeta(sessionDir, resolved, hash);

    Activity.sessionLinkedToPrd(path.basename(sessionDir), resolved, new Date().toISOString());
  }

  /**
   * Run the full preflight report (delegates to lib).
   * Call before launching orchestrator/mux on a PRD-linked session.
   */
  preflightPipeline(sessionDir: string, prdPath?: string): PreflightReport {
    return Preflight.runPreflight(sessionDir, prdPath);
  }

  /**
   * P0 guard: asserts every ticket listed in state.json has its ticket.md materialized on disk.
   * Returns actionable error string for operator when failing (exact emit command).
   * Used by run-pipeline entrypoint and citadel-adjacent paths.
   */
  validateTicketArtifacts(sessionDir: string): { valid: boolean; missing: string[]; error?: string } {
    const mat = Preflight.checkTicketMaterialization(sessionDir);
    if (!mat.allPresent) {
      const err = `[validateTicketArtifacts] P0 GUARD TRIGGERED: ${mat.missingTicketIds.length} ticket.md files missing ` +
        `(${mat.missingTicketIds.join(', ')}). State claims tickets but disk does not. ` +
        `Recovery (do not skip): (1) re-emit via ticket-emitter.emitRefineCouncilTickets(sessionDir, specsFromRefine) ` +
        `or (2) rm -rf ${sessionDir} && re-run createSessionForPrd + full refine council. --fresh on pipeline does the latter.`;
      return { valid: false, missing: mat.missingTicketIds, error: err };
    }
    return { valid: true, missing: [] };
  }
}

// Types re-export guard (CampaignStatus etc in types.ts)
