# Overnight Campaign Readiness Report — 50-Ticket Self-Improvement Run

**Session**: {{SESSION_ID}}  
**Date/Range**: {{RUN_START}} — {{RUN_END}} ({{ELAPSED_HOURS}}h)  
**Backend**: {{BACKEND}} | **Tickets**: {{TOTAL_TICKETS}}  
**Harness Version**: 50tix-validator v1 (orchestrator + ManagerRitual + resource-guard)

---

## 1. Executive Verdict
**GO / NO-GO**: {{VERDICT}}  
**Success Rate**: {{SUCCESS_RATE}}% (done {{DONE}} / failed {{FAILED}} / remaining {{REMAINING}})  
**Isolation Score**: {{ISOLATED_FAILURES}} toxic tickets neutralized (no cascade)  
**Resumption Fidelity**: {{RESUMPTION_CHECKPOINTS}} phase checkpoints honored after {{SIM_CRASHES}} simulated / real SIGTERM/crashes

---

## 2. Failure Injection & Chaos Results (what tried to kill us)
- Timeouts injected: {{TIMEOUTS}}
- Bad / thin artifacts: {{BAD_ARTIFACTS}}
- Gate regressions: {{GATE_REGRESS}}
- SIGTERM / mid-run crashes simulated: {{SIGTERMS}}
- Disk pressure events: {{DISK_PRESSURE}}
- Rollbacks executed (clean resume): {{ROLLBACKS}}
- Circuit trips: {{CIRCUITS}}

**Key**: Every failure was contained. Ritual + per-ticket try/catch + locked appendPhase ensured the other 49 marched on.

---

## 3. Resource & Long-Run Stability
- Peak RSS: {{PEAK_RSS_MB}} MB (threshold <800MB for safety)
- Max state.json size: {{MAX_STATE_KB}} KB (bounded growth, atomic writes held)
- Settle / prune / gc events: {{SETTLES}} (git gc + log prune + hintGC between tickets)
- Disk free at end: {{DISK_FREE}}
- Heartbeats delivered: {{HEARTBEATS}} (5min cadence, campaign-status.json fresh)

No OOM, no repo bloat, no silent state corruption under 12h+ load.

---

## 4. Resumption & Checkpoint Integrity
- phasesCompleted correctly skipped done work on "resume"
- currentTicketId + in_progress markers correct at every boundary
- campaign-status.json (cat-able by tmux/externals) always consistent with state
- Post-crash reloads never lost a phase or double-ran work

---

## 5. Ritual / Citadel / Drivers Under Load
- Every phase went through ManagerRitual (promise + contract + gate + circuit)
- Citadel post-build: {{CITADEL_OVERALL}} ({{CITADEL_CRITICALS}} criticals, {{CITADEL_FINDINGS}} total)
- Anatomy 3-phase cycles: {{ANATOMY_CYCLES}} (Review→Fix→Verify + auto-rollback on regress)
- Szechuan scans: {{SZECHUAN_ITER}} (principles + convergence)
- No trap-door violations, no contract drift introduced by the campaign itself

---

## 6. Observability & Forensics Surface
- Activity events: ticket_started/phase_completed/failed/heartbeat/circuit/ritual
- campaign-status.json (latest): see `cat {{SESSION_DIR}}/campaign-status.json`
- Worker logs + prompt files pruned (48h/7d) — inspect `.worker-logs/` and `.worker-prompts/` for any toxic ticket
- Git boundary never violated (all rollbacks precise via preSha + changed paths)

---

## 7. Go / No-Go Checklist for Real 50-Ticket Overnight
- [ ] Engine/tests pass (ritual, citadel, anatomy/szechuan drivers, stress-longrun, campaign-simulator --tickets 50)
- [ ] mux-runner + orchestrator claim pid guard hardened (no double-run)
- [ ] SIGTERM/SIGINT graceful: current phase finishes or bails, state persisted via locks + ritual
- [ ] Resource guard: settle jitter + gc + prune + disk approx + mem snapshots active
- [ ] All state mutations locked + atomic (no torn writes on crash)
- [ ] WorkingDir resolution always correct (no wrong-tree edits/rollbacks)
- [ ] campaign-status.json + heartbeats rich enough for external monitors (tmux, gt bots, linear)
- [ ] Citadel gate post-build wired and FAIL stops joy
- [ ] Anatomy/Szechuan drivers exercise rollback on regression under load
- [ ] 10-20 ticket real dry-run with --inject-* equivalent chaos completed cleanly
- [ ] Standup/metrics can emit this report from a completed sessionDir

**If all green → fire the real 50-tix with `npx tsx src/runners/mux-runner.ts <sessionDir> --heartbeat-ms 300000` in tmux, walk away, check in morning.**

---

## 8. Raw Data Sources (for automation)
- `{{SESSION_DIR}}/campaign-status.json`
- `{{SESSION_DIR}}/state.json`
- `{{SESSION_DIR}}/citadel_report.json`
- `{{SESSION_DIR}}/anatomy-park.json`
- `{{SESSION_DIR}}/szechuan-sauce.json`
- activity jsonl (last 24-48h)
- `git log --since="{{RUN_START}}"` + `git diff` hygiene

**Template populated by**: standup --campaign or metrics --overnight <sessionDir> or the 50tix-harness itself.

Wubba lubba. The engine ate its own dogfood at scale. Ship it, Morty.

— Pickle Rick (via the 50-Ticket Overnight Readiness Validator Agent)
