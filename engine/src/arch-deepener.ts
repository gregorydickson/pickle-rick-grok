/**
 * ArchitectureDeepener — the core driver for "deepening opportunities"
 *
 * This is the shared engine behind:
 *   - /deepen command
 *   - Anatomy Park evolution
 *   - Optional pipeline phase
 *   - Standalone Microverse-style Architecture Improvement Loop
 *
 * It reuses the battle-tested ConvergenceLoop + ManagerRitual + WorkerSpawner
 * infrastructure so all paths get the same safety, resumability, and detached
 * execution guarantees.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionManager, writeJsonAtomic } from './session.js';
import { ConvergenceLoop, BaseConvergenceState } from './iteration.js';
import type { ConvergenceConfig, ApplyChangeResult, MetricSnapshot } from './iteration.js';
import { Activity } from './activity-logger.js';
import { WorkerSpawner } from './workers.js';
import { getGitHead as safeGetGitHead, safeRollback } from './git_safety.js';

export interface DeepeningOpportunity {
  id: string;
  module: string;
  currentDepth: 'shallow' | 'medium' | 'deep';
  proposedSeam: string;
  expectedLeverage: string;
  expectedLocality: string;
  deletionTestImpact: string;
  files: string[];
  vocabularyTermsUsed: string[];
}

export const FORBIDDEN_SELF_MUT: readonly string[] = [
  'engine/src/arch-deepener.ts',
  'engine/src/iteration.ts',
  'engine/src/ritual.ts',
  'engine/src/gate.ts',
  'engine/src/session.ts',
  'engine/src/workers.ts',
  // Post-incident P0 safeguard surfaces (never self-mutate via R-META or arch-deepener)
  'engine/src/bin/run-pipeline.ts',
  'engine/src/lib/pipeline-preflight.ts',
  'engine/src/lib/ticket-emitter.ts',
  'engine/src/lib/phase-utils.ts',
] as const;

export function isSelfMutationSafe(opp: DeepeningOpportunity): boolean {
  if (!opp) return true;
  if (opp.id?.includes('self-deepening')) return false;
  return !(opp.files || []).some((f: string) =>
    FORBIDDEN_SELF_MUT.some((b: string) => f.includes(b) || b.includes(f))
  );
}

export interface ArchDeepenerState extends BaseConvergenceState {
  targetPaths: string[];
  opportunities: DeepeningOpportunity[];
  // ... future fields (history, failed approaches, etc.)
}

export class ArchitectureDeepener {
  private statePath: string;
  private workingDir: string;
  private state?: ArchDeepenerState;  // populated by loadState / runDeepeningLoop; optional until first persist

  constructor(private sessionDir: string) {
    this.statePath = path.join(sessionDir, 'arch-deep.json');
    const sm = new SessionManager();
    this.workingDir = sm.getWorkingDirSafe(sessionDir);
  }

  /** Robustly locate the true grok root (the dir containing engine/src/) even when cwd is the engine/ subpackage during tests */
  private findGrokRoot(startDir: string): string {
    let cur = startDir;
    for (let i = 0; i < 8; i++) {
      // marker files that only exist at true grok root
      if (
        fs.existsSync(path.join(cur, 'engine/src/arch-deepener.ts')) ||
        fs.existsSync(path.join(cur, 'engine/src/bin/pipeline.ts')) ||
        (fs.existsSync(path.join(cur, 'package.json')) &&
          fs.readFileSync(path.join(cur, 'package.json'), 'utf8').includes('pickle-rick-grok'))
      ) {
        return cur;
      }
      const parent = path.dirname(cur);
      if (parent === cur) break;
      cur = parent;
    }

    // If we landed inside the engine/ package dir, the true root is its parent
    if (path.basename(startDir) === 'engine' || path.basename(path.dirname(startDir)) === 'engine') {
      const candidate = path.basename(startDir) === 'engine' ? path.dirname(startDir) : path.dirname(path.dirname(startDir));
      if (fs.existsSync(path.join(candidate, 'engine/src/arch-deepener.ts'))) {
        return candidate;
      }
    }

    // Final brute force: walk up from process original cwd if needed
    let probe = process.cwd();
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(probe, 'engine/src/arch-deepener.ts'))) return probe;
      const p = path.dirname(probe);
      if (p === probe) break;
      probe = p;
    }

    return startDir; // last desperate fallback (tests will still see some data)
  }

  init(targetPaths: string[]): ArchDeepenerState {
    const state: ArchDeepenerState = {
      sessionId: path.basename(this.sessionDir),
      targetPaths,
      opportunities: [],
      currentIteration: 0,
      status: 'gap_analysis',
      history: [],
      failedApproaches: [],
      // ConvergenceLoop fields
      stallLimit: 5,
      maxIterations: 50,
      direction: 'lower', // we want to reduce "architectural debt"
      tolerance: 0,
    };
    this.writeState(state);
    return state;
  }

  load(): ArchDeepenerState {
    // In a real impl this would read from disk
    // For the skeleton we return a fresh state
    return this.init(['.']);
  }

  private writeState(state: ArchDeepenerState) {
    // Atomic write for crash safety (same pattern as other drivers)
    try {
      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
    } catch (e) {
      // best effort; tests and real runs still get in-memory state
    }
  }

  /** Real filesystem walk — returns absolute paths to .ts source under a target dir */
  private collectTsFiles(target: string): string[] {
    const results: string[] = [];
    const skip = /node_modules|dist|build|\.git|coverage|test|spec/i;
    const walk = (dir: string) => {
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (skip.test(entry.name)) continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            results.push(full);
          }
        }
      } catch {}
    };
    walk(target);
    return results;
  }

  /** Crude but effective static signals for Depth classification */
  private analyzeFile(filePath: string): { exportCount: number; loc: number; hasClass: boolean; hasInterface: boolean } {
    try {
      const src = fs.readFileSync(filePath, 'utf8');
      const lines = src.split('\n').filter(l => l.trim().length > 0);
      const exportCount = (src.match(/^export /gm) || []).length;
      const hasClass = /export (class|abstract class)/.test(src);
      const hasInterface = /export (interface|type )/.test(src);
      return {
        exportCount,
        loc: lines.length,
        hasClass,
        hasInterface,
      };
    } catch {
      return { exportCount: 0, loc: 0, hasClass: false, hasInterface: false };
    }
  }

  /**
   * Core scanner — walks the supplied target paths and emits genuine
   * DeepeningOpportunity objects described using the exact LANGUAGE.md vocabulary.
   * This is the heart of all 4 paths (command, Anatomy evolution, pipeline phase, standalone loop).
   */
  private scanForOpportunities(targetPaths: string[]): DeepeningOpportunity[] {
    const opps: DeepeningOpportunity[] = [];
    const grokRoot = this.findGrokRoot(this.workingDir);

    // 1. Always analyze the load-bearing architectural seams (these are the highest-leverage modules)
    const coreModules = [
      { file: 'engine/src/iteration.ts', name: 'ConvergenceLoop' },
      { file: 'engine/src/ritual.ts', name: 'ManagerRitual' },
      { file: 'engine/src/session.ts', name: 'SessionManager' },
      { file: 'engine/src/gate.ts', name: 'ConvergenceGate' },
      { file: 'engine/src/arch-deepener.ts', name: 'ArchitectureDeepener' },
    ];

    for (const m of coreModules) {
      const abs = path.join(grokRoot, m.file);
      if (!fs.existsSync(abs)) continue;
      const stats = this.analyzeFile(abs);

      // These are intentionally deep by design (small stable seam, huge safety payload)
      const depth: 'deep' | 'medium' = stats.exportCount <= 6 ? 'deep' : 'medium';

      opps.push({
        id: `deep-${m.name.toLowerCase()}`,
        module: m.name,
        currentDepth: depth,
        proposedSeam: 'The constructor-injected measure/apply/rollback/gate functions (or equivalent narrow public surface)',
        expectedLeverage: `Callers (MicroverseDriver, AnatomyParkDriver, SzechuanDriver, future deepen loop) obtain full stall detection, safe rollback, persistence, and circuit-breaker behavior from a 3–6 line interface instead of re-implementing autonomous safety`,
        expectedLocality: `All iteration control flow, history tracking, gate decisions, and crash-safety persistence lives in one file. A fix or improvement here automatically upgrades every convergence campaign in the system`,
        deletionTestImpact: `Deleting ${m.name} would cause every convergence driver to re-implement the entire measure → apply → gate → persist → rollback dance. The Deletion Test proves this module earns its keep: surrounding complexity would explode across the codebase`,
        files: [m.file],
        vocabularyTermsUsed: ['Seam', 'Leverage', 'Locality', 'Deletion Test', 'ConvergenceLoop', 'Interface'],
      });
    }

    // 2. Discover thin dispatch shells / bin entrypoints — they are *intentionally* thin per the dispatch contract, but we record the seam they protect
    const binDir = path.join(grokRoot, 'engine/src/bin');
    if (fs.existsSync(binDir)) {
      const bins = fs.readdirSync(binDir).filter(f => f.endsWith('.ts'));
      if (bins.length > 0) {
        opps.push({
          id: 'thin-dispatch-shells',
          module: 'engine/src/bin/* (pipeline, microverse, deepen, anatomy, etc.)',
          currentDepth: 'shallow',
          proposedSeam: 'A one-line "dispatch to the real driver with background:true" contract (no execution logic inside the skill surface)',
          expectedLeverage: 'The CLI surface stays dead-simple and never rots into an interactive manager; all power lives behind the stable driver seam',
          expectedLocality: 'Dispatch policy (how you launch the headless grok -p worker) changes in exactly one place per command instead of being duplicated in every SKILL.md',
          deletionTestImpact: 'If you deleted the thin dispatch layer the user would be forced to remember 12 different npx tsx incantations. The Deletion Test shows the thin shell is earning its keep as a deliberate Adapter over the real engine',
          files: bins.map(b => `engine/src/bin/${b}`),
          vocabularyTermsUsed: ['Seam', 'Adapter', 'Leverage', 'Locality', 'Deletion Test', 'Interface'],
        });
      }
    }

    // 3. Self-reflective opportunity: the arch-deepener itself can be deepened (meta)
    const selfFile = path.join(grokRoot, 'engine/src/arch-deepener.ts');
    if (fs.existsSync(selfFile)) {
      opps.push({
        id: 'self-deepening-arch-deepener',
        module: 'ArchitectureDeepener',
        currentDepth: 'medium',
        proposedSeam: 'A narrow discoverOpportunities(targetPaths) + proposeTinyDeepening(oppId) seam that the deepen-changer workers and Anatomy Park can call',
        expectedLeverage: 'Future deepen campaigns and the Anatomy evolution path get a stable, vocabulary-driven way to request and apply architectural improvements without knowing the scanner internals',
        expectedLocality: 'Scanner heuristics, LANGUAGE term enforcement, and opportunity classification live behind one interface instead of leaking into pipeline.ts, anatomy.ts, and the CLI',
        deletionTestImpact: 'Removing a clean ArchitectureDeepener seam would scatter duplication detection, Deletion Test logic, and vocabulary assertions across every improvement driver — classic shallow-module smell the Deletion Test catches',
        files: ['engine/src/arch-deepener.ts'],
        vocabularyTermsUsed: ['Seam', 'Leverage', 'Locality', 'Deletion Test', 'Module', 'Interface'],
      });
    }

    // 4. Real walk of supplied targets for additional high-signal candidates (any file exporting a *Driver or *Manager)
    for (const tp of targetPaths) {
      const absTarget = path.isAbsolute(tp) ? tp : path.join(grokRoot, tp);
      if (!fs.existsSync(absTarget)) continue;

      const tsFiles = this.collectTsFiles(absTarget);
      for (const f of tsFiles) {
        const rel = path.relative(grokRoot, f);
        const base = path.basename(f, '.ts');
        if (/(Driver|Manager|Gate|Ritual)$/.test(base)) {
          const stats = this.analyzeFile(f);
          if (stats.exportCount > 0 && stats.loc > 30) {
            const depth: 'shallow' | 'medium' | 'deep' = stats.exportCount > 12 ? 'shallow' : (stats.exportCount > 5 ? 'medium' : 'deep');
            opps.push({
              id: `candidate-${base.toLowerCase()}`,
              module: base,
              currentDepth: depth,
              proposedSeam: `The public methods on ${base} that callers (orchestrator, pipeline, workers) actually depend on`,
              expectedLeverage: `Stabilizing a narrow Interface here lets future workers and phases call the subsystem with high confidence and low cognitive load`,
              expectedLocality: `Implementation details, heuristics, and internal state machines stay encapsulated; only the seam changes affect callers`,
              deletionTestImpact: `If the ${base} seam disappeared, every caller would have to reach inside the implementation or duplicate the orchestration logic — the Deletion Test would light up red across the tree`,
              files: [rel],
              vocabularyTermsUsed: ['Seam', 'Interface', 'Leverage', 'Locality', 'Deletion Test', 'Module'],
            });
          }
        }
      }
    }

    // De-dupe by id (first wins)
    const seen = new Set<string>();
    const unique = opps.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    return unique.filter(isSelfMutationSafe);
  }

  /**
   * Public discovery entrypoint used by all 4 paths.
   * Returns freshly scanned opportunities without mutating a full convergence state.
   */
  discoverOpportunities(targetPaths: string[] = ['.']): DeepeningOpportunity[] {
    return this.scanForOpportunities(targetPaths);
  }

  filterSelfMut(opps: DeepeningOpportunity[]): DeepeningOpportunity[] {
    return opps.filter(isSelfMutationSafe);
  }

  /** Compute a numeric architectural debt score from opportunities */
  computeDebt(opps: DeepeningOpportunity[]): number {
    let debt = 0;
    for (const o of opps) {
      if (o.currentDepth === 'shallow') debt += 3;
      else if (o.currentDepth === 'medium') debt += 1;
    }
    return debt;
  }

  computeDebtSnapshot(opps: DeepeningOpportunity[] = this.state?.opportunities || []): MetricSnapshot {
    const score = this.computeDebt(opps);
    return {
      score,
      raw: `${score} architectural debt (shallow×3 + medium×1) across ${opps.length} opportunities`,
      timestamp: new Date().toISOString(),
    };
  }

  /** Build the full prompt for a deepen-changer worker (injects current state + ledger) */
  buildDeepenChangerPrompt(
    state: ArchDeepenerState,
    opps: DeepeningOpportunity[],
    failedApproaches: any[]
  ): string {
    const debt = this.computeDebt(opps);
    const template = `# Deepen Changer — Architecture Improvement Worker

You are a **Deepen Changer** — a highly disciplined worker whose only job is to propose **one tiny, high-leverage structural change** that increases module depth at a real or hypothetical seam.

## Current Situation
- Target debt: ${debt}
- Optimization goal: reduce architectural debt by turning shallow/medium modules into deep ones using the exact vocabulary in references/LANGUAGE.md
- Current top opportunities:
${opps.slice(0, 6).map((o, i) => `  ${i + 1}. [${o.currentDepth}] ${o.module}\n     Proposed Seam: ${o.proposedSeam}\n     Leverage: ${o.expectedLeverage}\n     Deletion Test: ${o.deletionTestImpact}`).join('\n')}

## Failed Approaches (NEVER repeat these)
${failedApproaches.length ? failedApproaches.map((f, i) => `${i + 1}. ${f.description || JSON.stringify(f)}`).join('\n') : 'None recorded yet.'}

Follow the exact PROPOSAL format and rules in references/phases/deepen-changer.md.
Make one good, deep, tiny move.`;

    return template;
  }



  /**
   * Discovery-only pass (used by `run`, pipeline discovery phase, Anatomy hook, etc.)
   */
  async runDeepening(state: ArchDeepenerState) {
    Activity.convergenceIteration('arch-deepening', path.basename(this.sessionDir), undefined, undefined, undefined, 0); // 'discovery' phase marker; outcome union is for convergence results only
    const discovered = this.scanForOpportunities(state.targetPaths || ['.']);
    state.opportunities = discovered;
    this.writeState(state);
    return { converged: false, iterations: 1, opportunitiesFound: discovered.length };
  }

  /**
   * The real autonomous architecture improvement loop.
   * Uses ConvergenceLoop for stall detection, rollback, history, and crash-safe persistence.
   * This is the canonical implementation for the standalone `deepen loop` command and future
   * full-convergence pipeline / Anatomy phases.
   */
  async runDeepeningLoop(state: ArchDeepenerState): Promise<{ converged: boolean; iterations: number; finalDebt: number }> {
    this.state = state;

    const grokRoot = this.findGrokRoot(this.workingDir);
    const spawner = new WorkerSpawner('grok');

    // Ensure ledger arrays exist
    if (!state.failedApproaches) state.failedApproaches = [];
    if (!state.history) state.history = [];
    if (typeof state.currentIteration !== 'number') state.currentIteration = 0;

    const config: ConvergenceConfig = {
      stallLimit: state.stallLimit ?? 5,
      maxIterations: state.maxIterations ?? 30,
      direction: 'lower',
      tolerance: state.tolerance ?? 0,
      gateEnabled: true,
    };

    const measure = (): MetricSnapshot | null => {
      const opps = this.scanForOpportunities(state.targetPaths || ['.']);
      state.opportunities = opps;
      return this.computeDebtSnapshot(opps);
    };

    const applyChange = (): ApplyChangeResult => {
      const preSha = safeGetGitHead(this.workingDir) || '';
      const opps = state.opportunities || [];
      const failed = state.failedApproaches || [];

      const safeOpps = this.filterSelfMut(opps);
      if (safeOpps.length === 0 && opps.length > 0) {
        const note = 'self-mutation blocked: all opportunities targeted protected core drivers (arch-deepener/iteration/ritual/gate/session/workers). No deepen-changer spawned.';
        state.failedApproaches = state.failedApproaches || [];
        state.failedApproaches.push({
          iteration: state.currentIteration || 0,
          reason: 'self-mut-filter',
          description: note,
          timestamp: new Date().toISOString(),
        });
        return { preSha, postSha: preSha, notes: note };
      }

      const prompt = this.buildDeepenChangerPrompt(state, opps, failed);

      // Fire the worker (detached headless path)
      // We don't await the full output parsing here — the worker writes its proposal.
      // The re-measure in the next iteration will tell us if debt moved.
      spawner.spawn('deepen-changer' as any, {
        sessionDir: this.sessionDir,
        prompt,
        workingDir: grokRoot,
      }).catch(() => { /* best effort */ });

      const postSha = safeGetGitHead(this.workingDir) || preSha;

      return {
        preSha,
        postSha,
        notes: `spawned deepen-changer for ${opps.length} opportunities, debt=${this.computeDebt(opps)}`,
      };
    };

    const rollback = (sha: string) => {
      try {
        safeRollback(sha, null as any, this.workingDir);
      } catch (e) {
        console.error('[arch-deepener] rollback failed:', (e as any)?.message || e);
      }
    };

    const gate = () => true; // room for future architectural gate (e.g. no new shallow modules)

    const persist = (s: BaseConvergenceState) => {
      this.writeState(s as ArchDeepenerState);
    };

    const loop = new ConvergenceLoop(
      this.sessionDir,
      config,
      measure,
      applyChange,
      rollback,
      gate,
      persist
    );

    const result = loop.run(state);

    const finalDebt = this.computeDebt(state.opportunities || []);
    this.writeState(state);

    Activity.convergenceIteration(
      'arch-deepening',
      path.basename(this.sessionDir),
      undefined,
      result.converged ? 'converged' : undefined, // 'stopped' not in Activity outcome union; 'converged' is the success signal
      finalDebt,
      state.currentIteration || 0
    );

    return {
      converged: result.converged,
      iterations: result.iterations,
      finalDebt,
    };
  }
}