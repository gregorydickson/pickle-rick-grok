/**
 * forward-ref-annotation.ts — tiny dedicated module for the exact R-RTRC-7 forward-ref annotation regex + extractor.
 *
 * Exact port of ../pickle-rick-claude/extension/src/services/forward-ref-annotation.ts (claude:1 + extractForwardRefAnnotations)
 * per fresh 6-agent swarm agent 019e64d4-7ee4-7a63-bde7-e3532597ae4a (emission/fidelity post-tranches) + mandatory protocol:
 *   list_dir on both roots + read_file/grep on sibling services/forward-ref-annotation.ts + check-readiness.ts:311 first,
 *   verbatim citation of the RE and helper before any grok implementation.
 *
 * The sibling's richer extractForwardRefAnnotations (in check-readiness.ts ~308) adds malformed detection
 * (exact one-ASCII-space separator, hash validity, requirement alias rules) + annotation_format findings.
 * This tiny module provides the canonical RE + simple token extractor for grok's lightweight hygiene scan
 * in pipeline-preflight.ts:scanAnalystOutputsForUnverifiedPaths.
 *
 * See also: references/refine/analyst-gate-injections.md, ticket-emitter.ts forward-ref hygiene prose,
 * prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md (R-RTRC-7).
 */

export const FORWARD_REF_ANNOTATION_RE = /`([^`]+)`(\s*)\((forward-created(?:\s+by\s+ticket\s+[A-Za-z0-9]{6,12})?|((created|introduced) by ticket ([^)]+))|(created by (R-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+)))\)/g;

export function extractForwardRefAnnotations(text: string): string[] {
  const re = new RegExp(FORWARD_REF_ANNOTATION_RE.source, FORWARD_REF_ANNOTATION_RE.flags);
  const results: string[] = [];
  for (const match of text.matchAll(re)) {
    results.push(match[1]);
  }
  return results;
}
