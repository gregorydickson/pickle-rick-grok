#!/usr/bin/env node
/**
 * recover.ts — First-class session recovery tool for Pickle Rick Grok.
 *
 * After an engine bug, crash, SIGKILL, or bad max_turns event, some tickets end up
 * marked 'failed' even though they are perfectly good to retry.
 *
 * This tool (and the --recover-failed flag on mux-runner) lets the machine safely
 * put failed tickets back into 'pending' with a clean phasesCompleted list so the
 * 8-phase ritual can start fresh on the next launch.
 *
 * Core principle: Recovery must be explicit, auditable, and never happen
 * automatically in a way that hides root causes.
 */

import { SessionManager } from '../session.js';

const args = process.argv.slice(2);
const sessionDir = args.find(a => !a.startsWith('--'));
const resetFailed = args.includes('--reset-failed') || args.includes('--recover-failed');
const specificTicket = (args.includes('--ticket') ? args[args.indexOf('--ticket') + 1] : null);
const dryRun = args.includes('--dry-run') || args.includes('-n');
const force = args.includes('--force');

if (!sessionDir) {
  console.error('Usage: recover.ts <sessionDir> [--reset-failed] [--ticket <id>] [--dry-run] [--force]');
  console.error('');
  console.error('Common patterns:');
  console.error('  npx tsx engine/src/bin/recover.ts /path/to/session --reset-failed');
  console.error('  npx tsx engine/src/bin/recover.ts /path/to/session --ticket 001-persist-atomic-resume');
  process.exit(1);
}

const sm = new SessionManager();

async function main() {
  console.log(`[recover] Session: ${sessionDir}`);

  if (dryRun) {
    console.log('[recover] DRY RUN — no changes will be made');
  }

  // Basic safety: don't reset while an orchestrator thinks it owns the session
  // unless --force is given.
  const pidFile = `${sessionDir}/.orchestrator.pid`;
  if (!force) {
    try {
      // Very light check — the real claim is done by mux-runner.
      // We just warn.
      const fs = await import('fs');
      if (fs.existsSync(pidFile)) {
        const raw = fs.readFileSync(pidFile, 'utf8');
        const info = JSON.parse(raw);
        console.warn(`[recover] WARNING: .orchestrator.pid exists (pid=${info.pid}).`);
        console.warn('  An orchestrator may still be running or the lock was not released.');
        console.warn('  Use --force if you are certain the previous run is dead.');
        if (!force) {
          process.exit(2);
        }
      }
    } catch {}
  }

  if (specificTicket) {
    if (dryRun) {
      console.log(`[recover] Would reset ticket ${specificTicket} to pending`);
    } else {
      await sm.resetTicketToPending(sessionDir, specificTicket);
      console.log(`[recover] Reset ticket ${specificTicket} → pending`);
    }
    return;
  }

  if (resetFailed) {
    if (dryRun) {
      // For dry-run we still want to report what *would* happen
      const state = sm.loadState(sessionDir);
      const failed = (state.tickets || []).filter((t: any) => t.status === 'failed').map((t: any) => t.id);
      console.log(`[recover] Would reset ${failed.length} failed tickets:`, failed);
    } else {
      const reset = await sm.resetAllFailedTickets(sessionDir);
      if (reset.length === 0) {
        console.log('[recover] No failed tickets found. Nothing to do.');
      } else {
        console.log(`[recover] Successfully reset ${reset.length} tickets:`);
        reset.forEach(id => console.log(`  - ${id}`));
        console.log('\nYou can now re-launch with:');
        console.log(`  npx tsx engine/src/runners/mux-runner.ts ${sessionDir}`);
      }
    }
    return;
  }

  // Default helpful behavior: show current state
  const progress = sm.countRemainingTickets(sessionDir);
  const state = sm.loadState(sessionDir);
  const failed = (state.tickets || []).filter((t: any) => t.status === 'failed');

  console.log(`Tickets: ${progress.total} total, ${progress.done} done, ${progress.failed} failed, ${progress.remaining} remaining/pending`);
  if (failed.length > 0) {
    console.log('\nFailed tickets:');
    failed.forEach((t: any) => console.log(`  ${t.id} — ${t.title?.slice(0, 60) || ''}...`));
    console.log('\nRecommended:');
    console.log(`  npx tsx engine/src/bin/recover.ts ${sessionDir} --reset-failed`);
  } else {
    console.log('\nNo failed tickets. Session looks healthy for a fresh mux-runner launch.');
  }
}

main().catch(err => {
  console.error('[recover] Fatal error:', err);
  process.exit(1);
});
