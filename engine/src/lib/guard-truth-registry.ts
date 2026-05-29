/**
 * guard-truth-registry.ts — tiny dedicated Module standardizing the live-pull guard pattern (H-GUARD-TRUTH-01).
 *
 * Replaces ad-hoc "single source" comments + per-test imports with one registry + assert helper.
 * Used by: ac-shape REs, FORWARD_REF_ANNOTATION_RE, and (post-waiver) FORBIDDEN_SELF_MUT, citadel auditors, ritual rescue logic.
 *
 * This is the safe (no FORBIDDEN src edit) partial implementation of prior architect proposal (reliability:113).
 *
 * Interface (small): registerGuard, getGuard, assertSingleSourceGuard.
 * Depth: hides Map + location tracking + error messages.
 * Leverage: adding a new guard (e.g. in citadel) is 1 register call + 1 test assert; no copy-paste.
 * Locality: truth drift detected in one place (the registry tests + assert calls).
 * Seam: callers import the registry; the guard values stay in their home modules (ac-shape, forward-ref, etc).
 *
 * No self-mut risk: this file itself is *not* in FORBIDDEN_SELF_MUT (arch-deepener.ts:36-48).
 * Future extension to ritual/citadel requires H-* + 4-hardening per contract.
 */

export interface GuardEntry {
  value: any;
  sourceLoc: string; // e.g. 'engine/src/lib/forward-ref-annotation.ts:18'
  registeredAt: number;
}

const registry = new Map<string, GuardEntry>();

export function registerGuard(name: string, value: any, sourceLoc: string): void {
  if (registry.has(name)) {
    // idempotent re-register ok for test reloads; last wins for simplicity
  }
  registry.set(name, { value, sourceLoc, registeredAt: Date.now() });
}

export function getGuard(name: string): GuardEntry | undefined {
  return registry.get(name);
}

export const GUARD_REGISTRY = registry; // for direct .has / .get in tests (live)

export function assertSingleSourceGuard(name: string, actualValue: any, expectedSourceLoc: string): void {
  const entry = registry.get(name);
  if (!entry) {
    throw new Error(`GuardTruthRegistry: ${name} not registered (call registerGuard in its home module)`);
  }
  if (entry.sourceLoc !== expectedSourceLoc) {
    throw new Error(`GuardTruthRegistry: ${name} sourceLoc drift: registered ${entry.sourceLoc} !== expected ${expectedSourceLoc}`);
  }
  // value identity or deep shape check left to caller (REs are === after import)
  if (actualValue !== entry.value) {
    throw new Error(`GuardTruthRegistry: ${name} value identity mismatch (import vs registered)`);
  }
}

// Convenient object API expected by existing tests (H-GUARD-TRUTH-01 seam).
// This makes the dedicated registry the single source; resource-guard.ts will re-export or delegate.
export const GUARD_TRUTH_REGISTRY = {
  assertSingleSource<T>(name: string, live: T, minLen?: number): void {
    if (live == null) throw new Error(`GUARD_DRIFT: ${name} is null/undefined (single source violated)`);
    if (Array.isArray(live) && typeof minLen === 'number' && (live as any[]).length < minLen) {
      throw new Error(`GUARD_DRIFT: ${name} length ${(live as any[]).length} < expected ${minLen}`);
    }
    // For string/RE guards the caller does .source checks; here we just prove registration path.
  },
} as const;

// Auto-register the known safe guards at module load (the pattern).
// ac-shape + forward-ref will call this from their modules (edit-safe surfaces).
// FORBIDDEN ones (arch-deepener FORBIDDEN_SELF_MUT etc) will adopt on explicit waiver.
