#!/usr/bin/env node
/**
 * Standup generator for Pickle Rick Grok
 *
 * Produces a useful daily/weekly summary of autonomous development activity.
 * RicheR output: per-day deltas, regression forensics, *suggested next PRDs*, self-loop delta visibility.
 * First-class for long autonomous campaigns + self-improvement meta loops. No more Jerry "it did some stuff".
 * Wubba lubba dub dub — the pickle now tells you exactly what to PRD next.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getActivityDir } from '../activity-logger.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let days = 1;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10) || 1;
      i++;
    }
  }
  return { days };
}

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function safeRun(cmd: string, timeoutMs = 15000): string | null {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function getActivityEvents(days: number): any[] {
  const dir = getActivityDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter((f: string) => f.endsWith('.jsonl'))
    .sort()
    .reverse()
    .slice(0, days);
  const events: any[] = [];
  for (const file of files) {
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').trim().split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {}
    }
  }
  return events;
}

function loadBacklogSummary(): string {
  const blPath = path.join(process.cwd(), 'reliability-backlog.md');
  if (!fs.existsSync(blPath)) return 'no backlog yet (run self-improvement to seed)';
  const t = fs.readFileSync(blPath, 'utf8');
  const c = (t.match(/## Campaign /g) || []).length;
  const cl = (t.match(/closed=(\d+)/g) || []).reduce((s: number, m: string) => s + parseInt((m.match(/\d+/) || ['0'])[0], 10), 0);
  const recentCloses = (t.match(/closed=(\d+)/g) || []).slice(-3).map(m => parseInt((m.match(/\d+/) || ['0'])[0], 10));
  let delta = '';
  if (recentCloses.length >= 2) {
    const d = recentCloses[recentCloses.length - 1] - recentCloses[0];
    delta = d >= 0 ? `(+${d} recent trend)` : `(${d} recent)`;
  }
  return `${c} campaigns, ${cl} gaps closed total ${delta}`;
}

function deriveSuggestedPrds(events: any[], blInfo: string): string[] {
  const s: string[] = [];
  const latestSelf = [...events].reverse().find((e: any) => e.event === 'self_prd_generated');
  if (latestSelf?.details?.categories) {
    latestSelf.details.categories.slice(0, 2).forEach((cat: string) => s.push(`• PRD seed: ${cat} (from self-PRD gap scan)`));
  }
  const failCount = events.filter((e: any) => e.event === 'ticket_failed').length;
  const circ = events.filter((e: any) => e.event === 'circuit_breaker_tripped').length;
  if (failCount > 3 || circ > 1) s.push('• PRD: Circuit + worker resilience + better phase rollback for multi-day campaigns');
  const citFail = events.some((e: any) => e.event === 'citadel_audit' && e.citadel_overall === 'FAIL');
  if (citFail) s.push('• Close Citadel coverage gaps exposed in last audit (ritual/persist contracts)');
  if (blInfo.includes('regress') || !blInfo.includes('+')) s.push('• Ingest more post-campaign feedback; target top 5 open items from reliability-backlog.md');
  if (s.length === 0) s.push('• Run `/pickle-self-prd` or pipeline --self-improvement to auto-generate next improvement PRD');
  return s;
}

function generateStandup(events: any[], options: { days: number }): string {
  const completed = events.filter(e => e.event === 'ticket_completed').length;
  const failed = events.filter(e => e.event === 'ticket_failed').length;
  const commits = events.filter(e => e.event === 'commit_logged').length;
  const phases = events.filter(e => e.event === 'phase_completed').length;
  const convergence = events.filter(e => e.event === 'convergence_iteration');
  const gates = events.filter(e => e.event === 'gate_result');
  const circuits = events.filter(e => e.event === 'circuit_breaker_tripped');
  // Fixed: now catches both legacy worker_outcome + new worker_completed (from workers.ts wiring)
  const workers = events.filter(e => e.event === 'worker_outcome' || e.event === 'worker_completed');
  const improved = convergence.filter((e: any) => ['improved', 'converged'].includes(e.outcome)).length;
  const regressed = convergence.filter((e: any) => e.outcome === 'regressed').length;
  const workerFails = workers.filter((w: any) => w.details && w.details.success === false).length;

  // Richer per-day + deltas
  const byDay: Record<string, any> = {};
  for (const e of events) {
    const day = (e.ts || '').slice(0, 10);
    if (!byDay[day]) byDay[day] = { comp: 0, fail: 0, conv: 0, circ: 0, wrk: 0, cit: 0, selfp: 0 };
    if (e.event === 'ticket_completed') byDay[day].comp++;
    if (e.event === 'ticket_failed') byDay[day].fail++;
    if (e.event === 'convergence_iteration') byDay[day].conv++;
    if (e.event === 'circuit_breaker_tripped') byDay[day].circ++;
    if (e.event === 'worker_outcome' || e.event === 'worker_completed') byDay[day].wrk++;
    if (e.event === 'citadel_audit') byDay[day].cit++;
    if (e.event === 'self_prd_generated') byDay[day].selfp++;
  }
  const daysSorted = Object.keys(byDay).sort();

  // Compute simple deltas for standup table
  const dayDeltas: Record<string, number> = {};
  for (let i = 1; i < daysSorted.length; i++) {
    const d = daysSorted[i];
    const p = daysSorted[i-1];
    dayDeltas[d] = (byDay[d].comp || 0) - (byDay[p].comp || 0);
  }

  // Regression forensics (expanded)
  let forensics = '';
  if (failed > completed * 0.3) {
    forensics += `⚠️ High failure rate (${failed}/${completed + failed}). Check recent ticket_failed reasons.\n`;
  }
  if (circuits.length > 2) {
    forensics += `🔥 Circuit trips: ${circuits.length} — runaway detector saving your ass. Look at no-progress streaks.\n`;
  }
  if (regressed > 2) {
    forensics += `📉 Regressions detected in convergence: ${regressed}. Gate is working but your changes suck.\n`;
  }
  if (workerFails > 5) {
    forensics += `🤖 ${workerFails} worker failures — headless timeout/escape or bad prompt contracts?\n`;
  }
  const citFails = events.filter((e: any) => e.event === 'citadel_audit' && e.citadel_overall === 'FAIL').length;
  if (citFails > 0) forensics += `🛡️ ${citFails} Citadel FAILs — PRD feedback + coverage holes must be closed before next meta run.\n`;
  if (forensics === '') forensics = 'No major regressions. The universe is (barely) cooperating.\n';

  // Suggested next actions
  let actions = '';
  if (failed > 0) actions += '- Run `/pickle-metrics --days 3` and grep the activity jsonl for "ticket_failed" details.\n';
  if (circuits.length) actions += '- Inspect circuit.json + last failed tickets; consider raising maxNoProgress or fixing the loop.\n';
  if (improved < convergence.length * 0.6) actions += '- Your convergence success is low — tighten the metric or add better gate signals.\n';
  if (!actions) actions = '- Everything nominal. Ship more, or run anatomy-park on the gnarliest subsystem.\n';

  // === SELF-IMPROVEMENT + DELTA (richer) ===
  const selfPrd = events.filter((e: any) => e.event === "self_prd_generated").length;
  const selfLoops = events.filter((e: any) => e.event === "self_improvement_loop_closed").length;
  const metas = events.filter((e: any) => e.event === "meta_phase_started").length;
  const ing = events.filter((e: any) => e.event === "post_campaign_ingest").length;
  const feedbackIngests = events.filter((e: any) => e.event === "prd_feedback_ingested").length;
  const metaTickets = events.filter((e: any) => e.event === "self_meta_ticket").length;
  const blInfo = loadBacklogSummary();
  const selfSection = `## Self-Improvement Loop + Delta Visibility\n- Self-PRDs generated: ${selfPrd}\n- Loops closed: ${selfLoops}\n- Meta phases: ${metas}\n- Post ingests + feedback: ${ing + feedbackIngests}\n- Meta tickets executed: ${metaTickets}\n- Backlog: ${blInfo}\nDelta visible in reliability-backlog.md — each loop shrinks the gap list and raises convergence %. Check metrics for numbers.\n\n`;

  const suggestedPrds = deriveSuggestedPrds(events, blInfo);

  let report = `=== Pickle Rick Grok Standup ===\n`;
  report += `Period: Last ${options.days} day(s) — Rich Campaign Observability\n\n`;
  report += `## Summary\n`;
  report += `- Tickets completed: ${completed}\n`;
  report += `- Tickets failed:    ${failed}\n`;
  report += `- Commits made:      ${commits}\n`;
  report += `- Phases executed:   ${phases}\n`;
  report += `- Convergence steps: ${convergence.length} (${improved} successful, ${regressed} regressed)\n`;
  report += `- Gate checks:       ${gates.length}\n`;
  report += `- Circuit trips:     ${circuits.length}\n`;
  report += `- Worker outcomes:   ${workers.length} (${workerFails} failures)\n`;
  report += `- Citadel audits:    ${events.filter((e: any) => e.event === 'citadel_audit').length} (fails: ${citFails})\n\n`;

  // Richer per-day table with deltas
  if (daysSorted.length > 0) {
    report += `## Per-Day Trends (with day-over-day deltas)\n`;
    daysSorted.forEach(d => {
      const b = byDay[d];
      const delta = dayDeltas[d] !== undefined ? ` Δ${dayDeltas[d] >= 0 ? '+' : ''}${dayDeltas[d]}` : '';
      report += `  ${d}: +${b.comp} done / -${b.fail} failed | conv=${b.conv} circ=${b.circ} wrk=${b.wrk} selfp=${b.selfp} cit=${b.cit}${delta}\n`;
    });
    report += `\n`;
  }

  // Recent commits
  const recentCommits = events.filter((e: any) => e.event === 'commit_logged').slice(-5);
  if (recentCommits.length > 0) {
    report += `## Recent Commits\n`;
    recentCommits.forEach((c: any) => {
      report += `  • ${c.commit_sha?.slice(0, 8) || '????'}  (${c.files_changed || '?'} files)`;
      if (c.ticket) report += `  [${c.ticket}]`;
      report += `\n`;
    });
    report += `\n`;
  }

  report += `## Regression Forensics\n${forensics}\n`;
  report += `## Suggested Next Actions\n${actions}\n`;
  report += `## Suggested Next PRDs (for the self-loop)\n${suggestedPrds.join('\n')}\n\n`;
  report += selfSection;

  // Graphite / Linear light integrations (kept for richer external visibility)
  if (hasCommand('gt')) {
    const stackOutput = safeRun('gt log --json 2>/dev/null');
    if (stackOutput) {
      try {
        const stack = JSON.parse(stackOutput);
        report += `## Graphite Stack\n`;
        if (Array.isArray(stack) && stack.length > 0) {
          stack.slice(0, 5).forEach((item: any) => {
            const branch = item.branch || item.name || 'unknown';
            const status = item.status || '';
            report += `  • ${branch} ${status ? `(${status})` : ''}\n`;
          });
        } else {
          report += `  (No active stack or empty output)\n`;
        }
        report += `\n`;
      } catch {
        report += `## Graphite Stack\n  (Could not parse gt output)\n\n`;
      }
    } else {
      report += `## Graphite Stack\n  (gt available but no output — possibly not authenticated)\n\n`;
    }
  }
  if (hasCommand('linear')) {
    const linearOutput = safeRun('linear issues --limit 10 --json 2>/dev/null');
    if (linearOutput) {
      try {
        const issues = JSON.parse(linearOutput);
        if (Array.isArray(issues) && issues.length > 0) {
          report += `## Recent Linear Activity\n`;
          issues.slice(0, 5).forEach((issue: any) => {
            const title = issue.title || 'Untitled';
            const state = issue.state || '';
            const id = issue.identifier || '';
            report += `  • ${id} ${title} ${state ? `[${state}]` : ''}\n`;
          });
          report += `\n`;
        }
      } catch {
        report += `## Recent Linear Activity\n  (Could not parse linear output)\n\n`;
      }
    } else {
      report += `## Recent Linear Activity\n  (linear CLI available but returned no data)\n\n`;
    }
  }

  report += `Run \`/pickle-metrics --days ${options.days}\` for the cold hard numbers (trends, deltas, self-loop, suggested PRDs).\n`;
  report += `Full activity: ~/.local/share/pickle-rick-grok/activity/ + reliability-backlog.md\n`;
  return report;
}

function main() {
  const options = parseArgs();
  const events = getActivityEvents(options.days);
  const report = generateStandup(events, options);
  console.log(report);
}

main();
