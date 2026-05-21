#!/usr/bin/env node
/**
 * metrics.ts — aggregates activity logs into productivity/reliability reports.
 * RicheR: per-day deltas, regression forensics, self-loop delta visibility, suggested next PRDs.
 * Makes observability first-class for spotting patterns across long autonomous self-improvement campaigns.
 * --json retains full machine data for pipeline ingestion.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getActivityDir } from '../activity-logger.js';

interface MetricsOptions {
  days: number;
  json: boolean;
}

function parseArgs(): MetricsOptions {
  const args = process.argv.slice(2);
  let days = 7;
  let json = false;
  for (const a of args) {
    if (a.startsWith('--days=')) {
      const val = a.split('=')[1];
      days = val ? (parseInt(val, 10) || 7) : 7;
    }
    if (a === '--json' || a === '-j') json = true;
  }
  return { days, json };
}

function getActivityEvents(days: number): any[] {
  const dir = getActivityDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .slice(-days);
  const events: any[] = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    content.split('\n').filter(Boolean).forEach(line => {
      try {
        events.push(JSON.parse(line));
      } catch {}
    });
  }
  return events;
}

function loadReliabilityBacklogDelta(root = process.cwd()): any {
  const blPath = path.join(root, 'reliability-backlog.md');
  if (!fs.existsSync(blPath)) return { campaigns: 0, totalClosed: 0, recentClosed: [], trend: 'n/a' };
  const txt = fs.readFileSync(blPath, 'utf8');
  const campaigns = (txt.match(/## Campaign /g) || []).length;
  const closedMatches = txt.match(/closed=(\d+)/g) || [];
  const closeds = closedMatches.map(m => parseInt((m.match(/\d+/) || ['0'])[0], 10));
  const totalClosed = closeds.reduce((s, n) => s + n, 0);
  const recent = closeds.slice(-5);
  let trend = 'flat';
  if (recent.length >= 2) {
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    if (last > prev) trend = 'improving';
    else if (last < prev) trend = 'regressing';
  }
  return { campaigns, totalClosed, recentClosed: recent, trend, path: blPath };
}

function suggestNextPrds(events: any[], backlog: any): string[] {
  const out: string[] = [];
  // From latest self-PRD gap categories (high signal)
  const latestSelf = [...events].reverse().find((e: any) => e.event === 'self_prd_generated');
  if (latestSelf?.details?.categories?.length) {
    latestSelf.details.categories.slice(0, 3).forEach((cat: string) => {
      out.push(`Close gap: ${cat} (auto-detected in latest self-PRD scan)`);
    });
  }
  // From failure reasons + citadel
  const badPhases = events.filter((e: any) => e.event === 'phase_failed' || (e.event === 'ticket_failed' && /phase/i.test(e.details?.reason || '')));
  if (badPhases.length > 3) out.push('Harden ritual/phase contracts — recurring phase failures in long campaigns');
  const citFails = events.filter((e: any) => e.event === 'citadel_audit' && e.citadel_overall === 'FAIL');
  if (citFails.length) out.push('Remediate Citadel FAILs — audit coverage + trap doors in persist/ritual');
  // Circuit + convergence correlation
  const circuits = events.filter((e: any) => e.event === 'circuit_breaker_tripped').length;
  const regressed = events.filter((e: any) => e.event === 'convergence_iteration' && e.outcome === 'regressed').length;
  if (circuits > 2 || regressed > 2) out.push('PRD: Circuit breaker + convergence gate forensics + auto-recovery for overnight runs');
  // Worker fails
  const wFails = events.filter((e: any) => (e.event === 'worker_outcome' || e.event === 'worker_completed') && e.details?.success === false).length;
  if (wFails > 4) out.push('Stabilize headless worker contracts + promise token detection');
  if (backlog.campaigns > 0 && backlog.trend !== 'improving') out.push(`Self-loop delta lagging — target ${backlog.trend} gaps from reliability-backlog.md`);
  if (out.length === 0) out.push('Run `npm run self-improve` or `pickle-pipeline --self-improvement` to auto-seed next 40-50 ticket improvement PRD from current gaps');
  return Array.from(new Set(out)).slice(0, 6);
}

function generateReport(events: any[], options: MetricsOptions) {
  const report: any = {
    period_days: options.days,
    total_sessions: 0,
    total_tickets_completed: 0,
    total_tickets_failed: 0,
    total_commits: 0,
    total_phases: 0,
    total_convergence_iterations: 0,
    convergence_success_rate: 0,
    gate_passes: 0,
    gate_failures: 0,
    circuit_breaker_trips: 0,
    worker_success: 0,
    worker_fail: 0,
    prds_created: 0,
    refinements_completed: 0,
    hardening_tickets_triggered: 0,
    verify_theater_rejected: 0,
    self_prds_generated: 0,
    self_loops_closed: 0,
    citadel_audits: 0,
    citadel_fails: 0,
    by_source: {} as Record<string, number>,
    by_day: {} as Record<string, any>,
    failure_reasons: [] as string[],
    trend_slope: 'flat',
    self_delta: { campaigns: 0, total_closed: 0, avg_closed: 0, trend: 'n/a' },
    suggested_prds: [] as string[],
    regression_patterns: { high_fail_days: [] as string[], circuit_fail_correlation: 0 },
  };
  let successfulConvergences = 0;
  let totalConvergenceAttempts = 0;
  const dayKeys: string[] = [];
  const backlog = loadReliabilityBacklogDelta();

  // init richer by_day
  for (const e of events) {
    const day = e.ts ? e.ts.slice(0, 10) : 'unknown';
    if (!report.by_day[day]) {
      report.by_day[day] = {
        tickets_completed: 0,
        tickets_failed: 0,
        commits: 0,
        convergence_iters: 0,
        gates: 0,
        circuits: 0,
        workers: 0,
        worker_fails: 0,
        prds: 0,
        refinements: 0,
        hardenings: 0,
        self_prds: 0,
        loops: 0,
        citadels: 0,
        citadel_fails: 0,
        delta_tickets: 0, // computed later
      };
      dayKeys.push(day);
    }
    if (e.event === 'session_start') report.total_sessions++;
    if (e.event === 'ticket_completed') {
      report.total_tickets_completed++;
      report.by_day[day].tickets_completed++;
    }
    if (e.event === 'ticket_failed') {
      report.total_tickets_failed++;
      report.by_day[day].tickets_failed++;
      if (e.details?.reason) report.failure_reasons.push(e.details.reason);
    }
    if (e.event === 'commit_logged') {
      report.total_commits++;
      report.by_day[day].commits++;
    }
    if (e.event === 'phase_completed') report.total_phases++;
    if (e.event === 'convergence_iteration') {
      report.total_convergence_iterations++;
      report.by_day[day].convergence_iters++;
      totalConvergenceAttempts++;
      if (['improved', 'converged'].includes(e.outcome)) successfulConvergences++;
      if (e.outcome === 'regressed') {
        if (!report.regression_patterns.high_fail_days.includes(day)) report.regression_patterns.high_fail_days.push(day);
      }
    }
    if (e.event === 'gate_result') {
      report.by_day[day].gates++;
      if (e.gate_passed) report.gate_passes++;
      else report.gate_failures++;
    }
    if (e.event === 'circuit_breaker_tripped') {
      report.circuit_breaker_trips++;
      report.by_day[day].circuits++;
    }
    if (e.event === 'worker_outcome' || e.event === 'worker_completed' || e.event === 'worker_spawned') {
      report.by_day[day].workers++;
      const fail = e.details?.success === false;
      if (fail) {
        report.worker_fail++;
        report.by_day[day].worker_fails++;
      } else if (e.details?.success === true) {
        report.worker_success++;
      }
    }
    if (e.event === 'prd_created') {
      report.prds_created++;
      report.by_day[day].prds++;
    }
    if (e.event === 'refinement_completed') {
      report.refinements_completed++;
      report.by_day[day].refinements++;
    }
    if (e.event === 'hardening_tickets_triggered') {
      report.hardening_tickets_triggered += (e.details?.count || 1);
      report.by_day[day].hardenings++;
    }
    if (e.event === 'verify_theater_rejected') {
      report.verify_theater_rejected += (e.details?.count || 1);
      report.by_day[day].verify_rejects = (report.by_day[day].verify_rejects || 0) + 1;
    }
    if (e.event === 'self_prd_generated') {
      report.self_prds_generated++;
      report.by_day[day].self_prds++;
    }
    if (e.event === 'self_improvement_loop_closed') {
      report.self_loops_closed++;
      report.by_day[day].loops++;
    }
    if (e.event === 'citadel_audit') {
      report.citadel_audits++;
      report.by_day[day].citadels++;
      if (e.citadel_overall === 'FAIL') {
        report.citadel_fails++;
        report.by_day[day].citadel_fails++;
      }
    }
    const src = e.source || 'unknown';
    report.by_source[src] = (report.by_source[src] || 0) + 1;
  }

  if (totalConvergenceAttempts > 0) {
    report.convergence_success_rate = Math.round((successfulConvergences / totalConvergenceAttempts) * 100);
  }

  // Per-day deltas (tickets completed day-over-day)
  const sortedDays = [...dayKeys].sort();
  for (let i = 1; i < sortedDays.length; i++) {
    const d = sortedDays[i];
    const prev = sortedDays[i - 1];
    const delta = (report.by_day[d]?.tickets_completed || 0) - (report.by_day[prev]?.tickets_completed || 0);
    report.by_day[d].delta_tickets = delta;
  }

  // Trend
  if (sortedDays.length > 1) {
    const mid = Math.floor(sortedDays.length / 2);
    const early = sortedDays.slice(0, mid).reduce((s: number, d: string) => s + (report.by_day[d]?.tickets_completed || 0), 0);
    const late = sortedDays.slice(mid).reduce((s: number, d: string) => s + (report.by_day[d]?.tickets_completed || 0), 0);
    if (late > early * 1.2) report.trend_slope = 'improving';
    else if (late < early * 0.8) report.trend_slope = 'regressing';
  }

  // Self delta + correlation
  report.self_delta = {
    campaigns: backlog.campaigns,
    total_closed: backlog.totalClosed,
    avg_closed: backlog.campaigns ? Math.round(backlog.totalClosed / backlog.campaigns) : 0,
    trend: backlog.trend,
  };
  // naive circuit/fail correlation
  const highCircuitDays = sortedDays.filter(d => (report.by_day[d]?.circuits || 0) > 0 && (report.by_day[d]?.tickets_failed || 0) > 0).length;
  report.regression_patterns.circuit_fail_correlation = highCircuitDays;

  // Suggested PRDs (rich signal for next self-loop)
  report.suggested_prds = suggestNextPrds(events, backlog);

  return report;
}

function main() {
  const options = parseArgs();
  const events = getActivityEvents(options.days);
  const report = generateReport(events, options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`🥒 Pickle Rick Grok — Metrics (Last ${options.days} days) — First-Class Campaign Observability`);
    console.log('='.repeat(70));
    console.log(`Sessions started:              ${report.total_sessions}`);
    console.log(`Tickets completed:             ${report.total_tickets_completed}`);
    console.log(`Tickets failed:                ${report.total_tickets_failed}`);
    console.log(`Commits made:                  ${report.total_commits}`);
    console.log(`Phases completed:              ${report.total_phases}`);
    console.log(`Convergence iterations:        ${report.total_convergence_iterations}`);
    console.log(`Convergence success rate:      ${report.convergence_success_rate}%`);
    console.log(`Gate passes / failures:        ${report.gate_passes} / ${report.gate_failures}`);
    console.log(`Circuit breaker trips:         ${report.circuit_breaker_trips}`);
    console.log(`Worker success / fail:         ${report.worker_success} / ${report.worker_fail}`);
    console.log(`PRDs created:                  ${report.prds_created}`);
    console.log(`Refinements completed:         ${report.refinements_completed}`);
    console.log(`Hardening tickets triggered:   ${report.hardening_tickets_triggered}`);
    console.log(`Verify theater rejected:       ${report.verify_theater_rejected}`);
    console.log(`Self-PRDs generated:           ${report.self_prds_generated}`);
    console.log(`Self-loops closed:             ${report.self_loops_closed}`);
    console.log(`Citadel audits (fails):        ${report.citadel_audits} (${report.citadel_fails})`);
    console.log(`Trend slope (tickets):         ${report.trend_slope}`);
    console.log(`Self-loop delta:               ${report.self_delta.campaigns} campaigns, ${report.self_delta.total_closed} gaps closed total (avg ${report.self_delta.avg_closed}/camp, trend ${report.self_delta.trend})`);

    console.log('\nPer-Day Trends + Deltas (tickets completed day-over-day):');
    const sorted = Object.keys(report.by_day).sort();
    sorted.forEach(d => {
      const b = report.by_day[d];
      const deltaStr = b.delta_tickets !== undefined ? ` (Δ${b.delta_tickets >= 0 ? '+' : ''}${b.delta_tickets})` : '';
      console.log(`  ${d}: +${b.tickets_completed} done / -${b.tickets_failed} fail | conv=${b.convergence_iters} circ=${b.circuits} wrk=${b.workers} self=${b.self_prds || 0}${deltaStr}`);
    });

    console.log('\nActivity by source:');
    Object.entries(report.by_source as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .forEach(([src, count]) => {
        console.log(`  ${src.padEnd(24)} ${count}`);
      });

    if (report.failure_reasons.length) {
      console.log('\nTop failure reasons (sample):');
      const uniq = [...new Set(report.failure_reasons)].slice(0, 5);
      uniq.forEach((r: string) => console.log(`  - ${r}`));
    }

    // Regression forensics (richer)
    console.log('\nRegression Forensics:');
    if (report.regression_patterns.high_fail_days.length) {
      console.log(`  High-fail days: ${report.regression_patterns.high_fail_days.join(', ')}`);
    }
    if (report.regression_patterns.circuit_fail_correlation > 0) {
      console.log(`  Circuit+fail correlation days: ${report.regression_patterns.circuit_fail_correlation} — investigate runaway loops`);
    }
    if (report.circuit_breaker_trips > 2 || report.total_tickets_failed > report.total_tickets_completed * 0.3) {
      console.log('  ⚠️ Pattern: circuits or failures elevated — review activity jsonl + last citadel_prd_feedback.md');
    } else {
      console.log('  No major regression clusters detected. The pickle is holding its shape.');
    }

    // Suggested Next PRDs (the money shot for self-improvement)
    console.log('\nSuggested Next PRDs (auto-derived for next self-loop):');
    report.suggested_prds.forEach((s: string, i: number) => console.log(`  ${i + 1}. ${s}`));

    console.log('\nSuggested actions:');
    if (report.total_tickets_failed > report.total_tickets_completed * 0.25) {
      console.log('  • High failure ratio — use standup --days 3 and investigate ticket_failed events.');
    }
    if (report.circuit_breaker_trips > 0) {
      console.log('  • Circuits tripping — review last session circuit.json and worker logs.');
    }
    if (report.convergence_success_rate < 60) {
      console.log('  • Convergence sucking — tighten metrics or fix gate signals in drivers.');
    }
    if (report.refinements_completed === 0 && report.total_sessions > 2) {
      console.log('  • No refinements logged — consider /pickle-refine-prd before big builds for better ticket hygiene.');
    }
    if (report.self_prds_generated === 0 && report.total_sessions > 5) {
      console.log('  • No self-PRDs — fire pipeline --self-improvement to dogfood the meta loop.');
    }
    if (report.self_delta.trend === 'regressing') {
      console.log('  • Self-loop delta regressing — next PRD must target the top open gaps from reliability-backlog.md');
    }
    console.log('  • Full forensics: cat ~/.local/share/pickle-rick-grok/activity/$(date +%Y-%m-%d).jsonl | jq .');
    console.log('  • Self delta: cat reliability-backlog.md | head -100');
  }
}

main();
