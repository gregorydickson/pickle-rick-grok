/**
 * SessionManager — canonical session layout and state handling for Pickle Rick Grok (TS)
 *
 * XDG layout: ~/.local/share/pickle-rick-grok/sessions/<id>/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { SessionState, Ticket, Step, Backend, Runtime } from './types.js';

function getDataRoot(): string {
  const xdg = process.env.XDG_DATA_HOME;
  const base = xdg ? path.join(xdg, 'pickle-rick-grok', 'sessions')
                   : path.join(os.homedir(), '.local', 'share', 'pickle-rick-grok', 'sessions');
  return base;
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

  writeState(sessionDir: string, state: SessionState): void {
    const tmp = path.join(sessionDir, '.state.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, path.join(sessionDir, 'state.json'));
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

  addTicket(sessionDir: string, ticket: Ticket): void {
    const state = this.loadState(sessionDir);
    state.tickets.push(ticket);
    this.writeState(sessionDir, state);
  }

  updateTicketStatus(sessionDir: string, ticketId: string, status: Ticket['status']): void {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (t) t.status = status;
    this.writeState(sessionDir, state);
  }

  getTicketDir(sessionDir: string, ticketId: string): string {
    return path.join(sessionDir, 'tickets', ticketId);
  }

  ensureTicketDir(sessionDir: string, ticketId: string): string {
    const dir = this.getTicketDir(sessionDir, ticketId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  appendPhase(sessionDir: string, ticketId: string, phase: string, artifactPath?: string): void {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (t) {
      if (!t.phasesCompleted) (t as any).phasesCompleted = [];
      if (!(t as any).phasesCompleted.includes(phase)) {
        (t as any).phasesCompleted.push(phase);
      }
    }
    this.writeState(sessionDir, state);
  }

  getTicketProgress(sessionDir: string, ticketId: string): { completed: string[]; nextPhase?: string } | null {
    const state = this.loadState(sessionDir);
    const t = state.tickets.find(x => x.id === ticketId);
    if (!t) return null;
    const completed = (t as any).phasesCompleted || [];
    return { completed, nextPhase: undefined }; // caller decides order
  }
}
