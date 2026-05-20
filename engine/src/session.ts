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
    // Seed progress ts immediately (prevents watchdog false-positive on brand new sessions)
    this.recordProgress(sessionDir, 'session created');

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
   * Per-ticket stall/timeout-repeat isolation (P1).
   * Increments stallCount on the ticket (persisted in state.json), records last* RCA fields,
   * bumps campaign-status note for monitors. Returns the new count.
   * Called from ritual (post-return) on WorkerResult stall signals.
   * After N (see getTicketStallLimit), caller will mark failed/halted; <N sets pending for resume retry.
   * Reuses locked write + campaign-status + no sidecars.
   */
  async recordStallForTicket(
    sessionDir: string,
    ticketId: string,
    reason?: string,
    phase?: string
  ): Promise<number> {
    const lockPath = getStateLock(sessionDir);
    let count = 0;
    await withFileLock(lockPath, () => {
      const state = this.loadState(sessionDir);
      const t = state.tickets.find((x: any) => x.id === ticketId);
      if (t) {
        t.stallCount = (typeof t.stallCount === 'number' ? t.stallCount : 0) + 1;
        count = t.stallCount;
        if (reason) t.lastStallReason = reason;
        if (phase) t.lastStallPhase = phase;
        t.lastStallAt = new Date().toISOString();
      }
      this.writeState(sessionDir, state);
      this.updateCampaignStatusSync(sessionDir, {
        note: `stall #${count} for ticket ${ticketId}${phase ? ` @${phase}` : ''} (${reason || 'unknown'})`,
      } as any);
    });
    return count;
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

  /** Record a meaningful progress delta (timestamp-based, for long-running campaign watchdog). Safe to call often; updates lastMeaningfulProgressTs + campaign-status. */
  recordProgress(sessionDir: string, reason = 'meaningful delta'): void {
    const now = new Date().toISOString();
    try {
      this.updateCampaignStatusSync(sessionDir, {
        lastMeaningfulProgressTs: now,
        note: `progress: ${reason}`,
      } as any);
    } catch (e: any) {
      // never let progress recording kill a campaign
      console.warn('[session] recordProgress non-fatal:', e?.message || e);
    }
  }

  /** Retrieve last recorded meaningful progress timestamp from campaign-status.json (null if none). */
  getLastProgressTs(sessionDir: string): string | null {
    const p = this.getCampaignStatusPath(sessionDir);
    if (!fs.existsSync(p)) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      return raw.lastMeaningfulProgressTs || null;
    } catch {
      return null;
    }
  }

  /**
   * Thin campaign-level no-progress heartbeat watchdog.
   * Intended to be called on the existing 5m heartbeat cadence (reuses getProgressSnapshot path in caller).
   * Tracks via lastMeaningfulProgressTs (updated only on *real* deltas: ticket/phase advance, git changes, non-stall outcomes).
   * Long window (default 4h, tunable via PICKLE_CAMPAIGN_WATCHDOG_HOURS=3..6), alarms via loud log + campaign-status flag + Activity event.
   * NEVER auto-kills or stops the campaign — just surfaces for human (or future self-PRD) inspection.
   * Idempotent: only raises alarm once until a recordProgress clears the flag (or manual).
   * cribs Claude's detectProgress + record pattern at campaign timescale (timestamp instead of consecutive count).
   */
  checkCampaignWatchdog(sessionDir: string): { alarmed: boolean; lastTs: string | null; ageHours: number; thresholdHours: number } {
    const envH = Number(process.env.PICKLE_CAMPAIGN_WATCHDOG_HOURS);
    const thresholdHours = Number.isFinite(envH) && envH >= 1 && envH <= 12 ? envH : 4;
    const lastTs = this.getLastProgressTs(sessionDir);
    const nowMs = Date.now();
    let ageHours = 0;
    if (lastTs) {
      const then = new Date(lastTs).getTime();
      if (Number.isFinite(then)) ageHours = (nowMs - then) / (1000 * 3600);
    } else {
      // Seed on first sight so fresh campaigns don't false-alarm immediately
      this.recordProgress(sessionDir, 'watchdog first-seen (seeded)');
      return { alarmed: false, lastTs: null, ageHours: 0, thresholdHours };
    }

    // Read current status to avoid repeated alarms
    const statusPath = this.getCampaignStatusPath(sessionDir);
    let current: any = {};
    try { if (fs.existsSync(statusPath)) current = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch {}
    const already = !!current.noProgressAlarm;

    const alarmed = ageHours > thresholdHours && !already;
    if (alarmed) {
      const reason = `No meaningful progress for ${ageHours.toFixed(1)}h (threshold ${thresholdHours}h). Last: ${lastTs}. Requires real deltas (ticket/phase, ritual git, worker non-stall).`;
      console.error(`[campaign-watchdog] 🚨 ALARM: ${reason}`);
      console.error(`[campaign-watchdog] Long-running campaign still alive (no kill). Inspect activity/ritual/campaign-status.json + git. Record progress or tune PICKLE_CAMPAIGN_WATCHDOG_HOURS to silence.`);
      this.updateCampaignStatusSync(sessionDir, {
        noProgressAlarm: true,
        noProgressAlarmReason: reason,
        noProgressAlarmAt: new Date().toISOString(),
        note: `WATCHDOG ALARM @ ${ageHours.toFixed(1)}h`,
      } as any);
      try {
        const sess = path.basename(sessionDir);
        Activity.campaignWatchdogAlarm(sess, { ageHours: Number(ageHours.toFixed(1)), thresholdHours, lastTs, reason });
      } catch {}
    }
    return { alarmed, lastTs, ageHours: Number(ageHours.toFixed(2)), thresholdHours };
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
   * Create a fresh session and immediately stamp it with source PRD provenance.
   * This is the canonical machine entry for "run pipeline on PRD".
   * Fires prdPipelineInitiated + sessionLinkedToPrd.
   * Async because stamp uses lock. Single owner for linkage + seal.
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
    await this.stampPrdProvenance(res.sessionDir, prdPath);
    Activity.prdPipelineInitiated(res.sessionId, prdPath, { via: 'createSessionForPrd' });
    return res;
  }

  /**
   * Find an existing session directory already linked to the given PRD (via state or legacy sidecar).
   * Uses getManifestSeal (state-first) to avoid duped sidecar logic.
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
        const seal = this.getManifestSeal(sdir);
        if (seal?.prdPath && path.resolve(seal.prdPath) === target) {
          return sdir;
        }
      }
    } catch {
      /* dataRoot issues */
    }
    return null;
  }

  /**
   * Single owner for PRD provenance + manifest seal (collapses the hydra).
   * Idempotent, atomic under state lock. Populates sourcePrd/* + optional ticketManifestHash into state.
   * NO sidecar write (reduces sidecars; legacy sidecars only read in getManifestSeal for compat).
   * Always stamps the *real* resolved PRD so downstream (emitter, preflight, re-dispatch) see canonical extra for hash.
   * Emits sessionLinkedToPrd.
   */
  async stampPrdProvenance(sessionDir: string, prdPath: string, opts: { content?: string; ticketManifestHash?: string } = {}): Promise<void> {
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
        state.prdContentHash = hash || state.prdContentHash || '';
        if (opts.ticketManifestHash) {
          state.ticketManifestHash = opts.ticketManifestHash;
        }
        this.writeState(sessionDir, state);
      } catch (e: any) {
        // session may be brand new without state yet; ignore (createSessionForPrd path always has it)
        console.warn('[session] stampPrdProvenance state update skipped:', e?.message);
      }
    }, 8000);

    // Reduced sidecars: no write here. Seal + prd now live in authoritative state.json.
    // getManifestSeal provides legacy sidecar fallback for pre-collapse sessions only.

    Activity.sessionLinkedToPrd(path.basename(sessionDir), resolved, new Date().toISOString());
  }

  /**
   * Legacy alias (for any stragglers). Delegates to the single stampPrdProvenance.
   * @deprecated use stampPrdProvenance
   */
  async stampPrdSource(sessionDir: string, prdPath: string, opts?: { content?: string }): Promise<void> {
    return this.stampPrdProvenance(sessionDir, prdPath, opts);
  }

  /**
   * Single method: authoritative manifest seal + provenance for a session (state-first).
   * Returns prdPath (real stamped, never 'self-generated'), ticketManifestHash (P0 seal), etc.
   * Falls back to legacy .prd-source.json only for very old sessions (simple parse, zero rescue regex).
   * This + stampPrdProvenance collapses the previous spread across preflight/emitter/run-pipeline.
   */
  getManifestSeal(sessionDir: string): { prdPath: string | undefined; ticketManifestHash: string | undefined; contentHash: string | undefined; linkedAt: string | undefined } | null {
    // 1. state.json — authoritative owner post-collapse (clean atomic writes, no corruption)
    try {
      const state = this.loadState(sessionDir);
      if (state.sourcePrd || state.ticketManifestHash || state.prdLinkedAt) {
        return {
          prdPath: state.sourcePrd,
          ticketManifestHash: state.ticketManifestHash,
          contentHash: state.prdContentHash,
          linkedAt: state.prdLinkedAt,
        };
      }
    } catch {
      /* corrupt or missing; try legacy */
    }

    // 2. legacy sidecar (compat read-only; never written by new code; no regex rescue)
    const metaP = path.join(sessionDir, '.prd-source.json');
    if (fs.existsSync(metaP)) {
      try {
        const m = JSON.parse(fs.readFileSync(metaP, 'utf8')) || {};
        return {
          prdPath: m.prdPath,
          ticketManifestHash: m.ticketManifestHash,
          contentHash: m.contentHash,
          linkedAt: m.linkedAt,
        };
      } catch {
        /* corrupt legacy — ignore; next stamp/seal will populate state */
        return null;
      }
    }
    return null;
  }

  /**
   * Convenience: canonical resolved PRD path for manifest hashing (prefers state via seal).
   * Guarantees the *real* PRD (not specs[0]?.sourcePrd markers) so hash extra is deterministic
   * across re-dispatch, partial-refine emits, and self-generated meta PRDs.
   */
  getManifestPrdPath(sessionDir: string, fallback = ''): string {
    const seal = this.getManifestSeal(sessionDir);
    const p = seal?.prdPath || fallback;
    return p ? path.resolve(p) : '';
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
