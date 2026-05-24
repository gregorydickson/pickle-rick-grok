/**
 * pipeline-preflight.ts — machine-owned guards for "run pipeline on PRD"
 *
 * Produces detailed PreflightReport so callers (future run-pipeline bin, pipeline.ts, mux)
 * can decide: fresh create, link existing, force-refine, or abort on zombie/partial state.
 *
 * Follows the council RCA decision tree:
 * - provenance now owned by SessionManager (stampPrdProvenance + getManifestSeal + getManifestPrdPath in session.ts — state is single source)
 * - artifact materialization (state vs on-disk tickets/<id>/ticket.md)
 * - PRD refinement heuristic (strict Verify runnable check)
 * - zombie/consistent diagnostics with operator recovery instructions
 *
 * Provenance/seal hydra collapsed: no more sidecar writes, no rescue regex, no non-canonical extras.
 * Preflight uses state-loaded sourcePrd + ticketManifestHash for seal checks (deterministic).
 * Uses existing atomic + lock patterns.
 * No SKILLs, no self-prd mutation here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Activity } from '../activity-logger.js';
import type { PreflightReport, ReadinessAssessment } from '../types.js';

export type { PreflightReport };

const RUNNABLE_VERIFY_RE = /\b(npx |node -e |node --|grep |test -f |ls |find |diff |tsc --noEmit|npm test|npm run |sh -c |python -c |cat |head |tail )\b/i;

/** Detects common "theatrical" / non-deterministic / always-pass patterns inside Verify command strings.
 *  These are the exact anti-patterns that let R-META-DEEPEN-001 (and self-prd pads) emit tickets
 *  whose ACs could never be proven by a Verifier Morty on the current tree.
 *  Extended by the post-synthesis readiness-gate.ts (machinability + path/forward-ref) which calls this + adds Claude R-RTRC hygiene.
 *  See prds/claude-to-grok-ports-...-2026-05-24.md + ticket-emitter integration.
 *
 *  P0 self-theater fix (2026-05-24 auditor): added patterns for the old wc/grep count and grep-A|grep-q
 *  anti-patterns that were baked into auto-generated H-VERIFY healers themselves. Replacements use
 *  node -e + direct exit codes / fs checks. This prevents healer-needs-healer infinite debt.
 */
const VERIFY_THEATER_RE: RegExp[] = [
  /\|\|\s*(true|echo\s|cat\s|:\s*;\s*true)/i,
  /\b(verify|check|ensure|confirm)\s+(manually|by\s*eye|visually|observe|see\s+that|hand|human)/i,
  /must (pass|exit 0|report success|succeed) (on current|today|before impl|stub|now)/i,
  /\bTODO\b.*(verify|check|AC)/i,
  /placeholder|later|NYI.*(verify|AC)/i,
  /^\s*(ls|cat|find|echo|head|tail)\s+[^\n|;]*$/i, // bare observation, no assertion
  /grep -qE? ['"].*['"]\s*\|\|\s*true/i,
  /\/\*\s*(after|post|once|when|feed good)/i, // the exact incident markers
  // === P0: catch the exact self-theatrical patterns previously emitted by ticket-emitter healers ===
  /\|?\s*wc -l\s*\|?\s*grep -q/i,                    // wc -l | grep -q '^0$' or '^[1-9]' count checks (fragile, non-direct)
  /grep -A\s+\d+\s+['"].*['"]\s*\|?\s*grep -[qE]/i,  // grep -A N ... | grep -q  (use node regex span instead)
  /node -e\s+['"][^'"]*['"]\s*\|\s*grep -q/i,        // node -e '...' | grep -q (fold the assertion into the -e with process.exit)
];

export function detectVerifyTheater(verify: string): { isTheatrical: boolean; reasons: string[]; hits: number } {
  const reasons: string[] = [];
  let hits = 0;
  for (const re of VERIFY_THEATER_RE) {
    if (re.test(verify)) {
      hits++;
      reasons.push(re.source);
    }
  }
  return { isTheatrical: hits > 0, reasons, hits };
}
