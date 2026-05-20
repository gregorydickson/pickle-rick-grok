/**
 * Activity Logger for Pickle Rick Grok
 *
 * Structured daily JSONL. Lives in engine so orchestrator/drivers can use it.
 * Full self-meta + high-signal events for autonomous dogfood loop tracking + long campaign forensics.
 * Storage: ~/.local/share/pickle-rick-grok/activity/YYYY-MM-DD.jsonl
 * First-class observability: per-day deltas, regressions, self-loop deltas, PRD suggestions now possible.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type ActivityEventType =
  | 'session_start'
  | 'session_end'
  | 'ticket_started'
  | 'ticket_completed'
  | 'ticket_failed'
  | 'phase_completed'
  | 'phase_failed'
  | 'convergence_iteration'
  | 'gate_result'
  | 'circuit_breaker_tripped'
  | 'commit_logged'
  | 'worker_spawned'
  | 'worker_completed'
  | 'worker_outcome'
  | 'prd_created'
  | 'refinement_completed'
  | 'hardening_tickets_triggered'
  | 'verify_theater_rejected'
  | 'citadel_audit'
  | 'heartbeat'
  | 'self_prd_generated'
  | 'self_improvement_loop_closed'
  | 'meta_phase_started'
  | 'post_campaign_ingest'
  | 'prd_feedback_ingested'
  | 'self_meta_ticket'
  | 'prdPipelineInitiated'
  | 'sessionLinkedToPrd'
  | 'preflightReport'
  | 'awaitingRefineForPrd'
  | 'campaign_watchdog_alarm';

export interface ActivityEvent {
  ts: string;
  event: ActivityEventType;
  source: string;
  session?: string;
  ticket?: string;
  phase?: string;
  backend?: 'grok' | 'codex' | 'hermes';
  duration_ms?: number;
  iterations?: number;
  outcome?: 'improved' | 'held' | 'regressed' | 'failed' | 'converged';
  metric?: number;
  stall_count?: number;
  commit_sha?: string;
  files_changed?: number;
  gate_passed?: boolean;
  new_failures?: number;
  citadel_overall?: 'PASS' | 'WARN' | 'FAIL';
  citadel_critical?: number;
  citadel_findings?: number;
  details?: Record<string, any>;
}

/** Centralized — import from here in bin/metrics, bin/standup, and future tools. */
export function getActivityDir(): string {
  const xdgData = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgData, 'pickle-rick-grok', 'activity');
}

export function getActivityFilePath(date: Date = new Date()): string {
  const dir = getActivityDir();
  const dateKey = date.toISOString().slice(0, 10);
  return path.join(dir, `${dateKey}.jsonl`);
}

let pendingBuffer: string[] = [];
const MAX_BUFFER = 200;

export function logActivity(event: ActivityEvent): void {
  try {
    const dir = getActivityDir();
    fs.mkdirSync(dir, { recursive: true });

    const line = JSON.stringify(event) + '\n';
    const filepath = getActivityFilePath(new Date(event.ts));

    try {
      fs.appendFileSync(filepath, line, { mode: 0o600 });
    } catch (err) {
      if (pendingBuffer.length < MAX_BUFFER) pendingBuffer.push(line);
      return;
    }

    if (pendingBuffer.length > 0) {
      const toFlush = [...pendingBuffer];
      pendingBuffer = [];
      for (const bufferedLine of toFlush) {
        try { fs.appendFileSync(filepath, bufferedLine, { mode: 0o600 }); } catch {
          if (pendingBuffer.length < MAX_BUFFER) pendingBuffer.push(bufferedLine);
        }
      }
    }
  } catch (err) {
    console.error('[activity-logger] Logging failed:', err);
  }
}

/** Helper for common events */
export const Activity = {
  sessionStart(sessionId: string, prompt?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'session_start' as const,
      source: 'manager',
      session: sessionId,
    };
    if (prompt) evt.details = { prompt };
    logActivity(evt);
  },

  sessionEnd(sessionId: string, durationMs: number) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'session_end' as const,
      source: 'manager',
      session: sessionId,
      duration_ms: durationMs,
    });
  },

  ticketStarted(sessionId: string, ticketId: string, title: string) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'ticket_started' as const,
      source: 'orchestrator',
      session: sessionId,
      ticket: ticketId,
      details: { title },
    });
  },

  ticketCompleted(sessionId: string, ticketId: string, iterations: number) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'ticket_completed' as const,
      source: 'orchestrator',
      session: sessionId,
      ticket: ticketId,
      iterations,
    });
  },

  ticketFailed(sessionId: string, ticketId: string, reason?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'ticket_failed' as const,
      source: 'orchestrator',
      session: sessionId,
      ticket: ticketId,
    };
    if (reason) evt.details = { reason };
    logActivity(evt);
  },

  phaseCompleted(sessionId: string, ticketId: string, phase: string, durationMs?: number) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'phase_completed' as const,
      source: 'orchestrator',
      session: sessionId,
      ticket: ticketId,
      phase,
    };
    if (durationMs != null) evt.duration_ms = durationMs;
    logActivity(evt);
  },

  phaseFailed(sessionId: string, ticketId: string, phase: string, reason?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'phase_failed' as const,
      source: 'orchestrator',
      session: sessionId,
      ticket: ticketId,
      phase,
    };
    if (reason) evt.details = { reason };
    logActivity(evt);
  },

  convergenceIteration(
    source: string,
    sessionId: string,
    ticket?: string,
    outcome?: ActivityEvent['outcome'],
    metric?: number,
    stallCount?: number
  ) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'convergence_iteration' as const,
      source,
      session: sessionId,
    };
    if (ticket) evt.ticket = ticket;
    if (outcome) evt.outcome = outcome;
    if (metric != null) evt.metric = metric;
    if (stallCount != null) evt.stall_count = stallCount;
    logActivity(evt);
  },

  gateResult(source: string, sessionId: string, passed: boolean, newFailures: number) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'gate_result' as const,
      source,
      session: sessionId,
      gate_passed: passed,
      new_failures: newFailures,
    });
  },

  commitLogged(sessionId: string, ticketId?: string, sha?: string, filesChanged?: number) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'commit_logged' as const,
      source: 'orchestrator',
      session: sessionId,
    };
    if (ticketId) evt.ticket = ticketId;
    if (sha) evt.commit_sha = sha;
    if (filesChanged != null) evt.files_changed = filesChanged;
    logActivity(evt);
  },

  workerSpawned(sessionId: string, role: string, ticket?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'worker_spawned' as const,
      source: 'workers',
      session: sessionId,
      details: { role },
    };
    if (ticket) evt.ticket = ticket;
    logActivity(evt);
  },

  workerCompleted(sessionId: string, role: string, success: boolean, ticket?: string, details?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'worker_completed' as const,
      source: 'workers',
      session: sessionId,
      details: { role, success, ...(details || {}) },
    };
    if (ticket) evt.ticket = ticket;
    logActivity(evt);
  },

  // High-signal companion for reports (worker_outcome gives clean success/fail + details for forensics)
  workerOutcome(sessionId: string, role: string, success: boolean, ticket?: string, details?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'worker_outcome' as const,
      source: 'workers',
      session: sessionId,
      details: { role, success, outcome: success ? 'success' : 'fail', ...(details || {}) },
    };
    if (ticket) evt.ticket = ticket;
    logActivity(evt);
  },

  prdCreated(sessionId: string, prdPath?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'prd_created' as const,
      source: 'setup',
      session: sessionId,
    };
    if (prdPath) evt.details = { prdPath };
    logActivity(evt);
  },

  refinementCompleted(sessionId: string, ticketCount = 0, hardeningCount = 0) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'refinement_completed' as const,
      source: 'pipeline',
      session: sessionId,
      details: { ticketCount, hardeningCount },
    });
  },

  hardeningTicketsTriggered(sessionId: string, count: number, context?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'hardening_tickets_triggered' as const,
      source: 'refine-prd',
      session: sessionId,
      details: { count },
    };
    if (context) evt.details.context = context;
    logActivity(evt);
  },

  verifyTheaterRejected(sessionId: string, details: Record<string, any> = {}) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'verify_theater_rejected' as const,
      source: 'self-prd-generator',
      session: sessionId,
      details,
    });
  },

  citadelAudit(sessionId: string, overall: 'PASS' | 'WARN' | 'FAIL', critical: number, findings: number, extra?: Record<string, any>) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'citadel_audit' as const,
      source: 'citadel',
      session: sessionId,
      citadel_overall: overall,
      citadel_critical: critical,
      citadel_findings: findings,
      details: extra || {},
    });
  },

  selfPrdGenerated(sessionId: string, gapCount: number, prdPath?: string, extra?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'self_prd_generated' as const,
      source: 'self-prd-generator',
      session: sessionId,
      details: { gapCount, prdPath, ...(extra || {}) },
    };
    logActivity(evt);
  },

  selfImprovementLoopClosed(sessionId: string, closedCount: number, extra?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'self_improvement_loop_closed' as const,
      source: 'loop-closer',
      session: sessionId,
      details: { closedCount, ...(extra || {}) },
    };
    logActivity(evt);
  },

  metaPhaseStarted(phase: 'self-prd' | 'post-campaign' | 'loop-close', sessionId: string, extra?: Record<string, any>) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'meta_phase_started' as const,
      source: 'pipeline',
      session: sessionId,
      phase,
      details: { meta: true, ...(extra || {}) },
    });
  },

  postCampaignIngest(sessionId: string, closedCount: number, backlogPath?: string) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: "post_campaign_ingest" as const,
      source: "self-prd-generator",
      session: sessionId,
      details: { closedCount, backlogPath },
    };
    logActivity(evt);
  },

  prdFeedbackIngested(sessionId: string, categories: string[], details?: Record<string, any>) {
    logActivity({
      ts: new Date().toISOString(),
      event: "prd_feedback_ingested" as const,
      source: "loop-closer",
      session: sessionId,
      details: { categories, ...(details || {}) },
    });
  },

  selfMetaTicket(sessionId: string, ticketId: string, title: string) {
    logActivity({
      ts: new Date().toISOString(),
      event: "self_meta_ticket" as const,
      source: "orchestrator",
      session: sessionId,
      ticket: ticketId,
      details: { title, meta: true },
    });
  },

  prdPipelineInitiated(sessionId: string, prdPath?: string, extra?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'prdPipelineInitiated' as const,
      source: 'pipeline',
      session: sessionId,
    };
    if (prdPath || extra) evt.details = { prdPath, ...(extra || {}) };
    logActivity(evt);
  },

  sessionLinkedToPrd(sessionId: string, prdPath: string, linkedAt?: string) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'sessionLinkedToPrd' as const,
      source: 'session-manager',
      session: sessionId,
      details: { prdPath, linkedAt: linkedAt || new Date().toISOString() },
    });
  },

  preflightReport(sessionId: string, summary: Record<string, any>) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'preflightReport' as const,
      source: 'preflight',
      session: sessionId,
      details: summary,
    });
  },

  awaitingRefineForPrd(sessionId: string, prdPath: string, reasons?: string[]) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'awaitingRefineForPrd' as const,
      source: 'preflight',
      session: sessionId,
      details: { prdPath, reasons: reasons || [] },
    });
  },

  heartbeat(sessionId: string, ticketId?: string, phase?: string, details?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'heartbeat' as const,
      source: 'orchestrator',
      session: sessionId,
    };
    if (ticketId) evt.ticket = ticketId;
    if (phase) evt.phase = phase;
    if (details) evt.details = details;
    logActivity(evt);
  },

  circuitBreakerTripped(sessionId: string, reason?: string, details?: Record<string, any>) {
    const evt: any = {
      ts: new Date().toISOString(),
      event: 'circuit_breaker_tripped' as const,
      source: 'circuit',
      session: sessionId,
    };
    if (reason || details) evt.details = { reason, ...(details || {}) };
    logActivity(evt);
  },

  campaignWatchdogAlarm(sessionId: string, details?: Record<string, any>) {
    logActivity({
      ts: new Date().toISOString(),
      event: 'campaign_watchdog_alarm' as const,
      source: 'campaign-watchdog',
      session: sessionId,
      details: details || {},
    });
  },
};
