# Spawn Subagent Contract — Canonical Pattern for Pickle Rick Morties (Grok)

This is the single source of truth for how every manager skill must spawn workers.

## Minimal Viable Call (copy-paste template)

```ts
// Inside a skill step (the manager agent emits this as a tool call)
spawn_subagent({
  subagent_type: "general-purpose",           // or "explore" / "plan"
  persona: "morty-phase-researcher",          // or "morty-phase-implementer", "anatomy-fixer", etc.
  fork_context: false,                        // NON-NEGOTIABLE for context clearing
  isolation: "worktree",                      // Recommended for any mutating phase
  capability_mode: "read-only" | "execute" | "all",
  prompt: [
    load("references/persona.md"),            // conditional Rick voice if enabled
    load("references/send-to-morty.md"),      // immutable rules + promise token
    load(`references/phases/${phase}.md`),    // specific phase contract
    `## Current Ticket\n${readFile(ticketPath)}`,
    `## Previously Approved Artifacts\n${readApprovedArtifacts(ticketDir)}`,
    `## PRD Acceptance Criteria\n${extractACs(prdPath)}`,
    `## Git Boundary Rules (enforce these)\n${load("references/phases/git-boundary.md") || hardcode}`,
    `## Failed Approaches Ledger (never repeat)\n${failedApproaches.join("\n")}`,
    `## Your Job\n[phase specific instructions]`,
    `When you have written the required artifact and the work is done, output exactly:\n<promise>I AM DONE</promise>`
  ].join("\n\n"),
  max_turns: 60
})
```

## Post-Return Ritual (the manager *must* do this every time)

1. `read_file` the expected artifact in the ticket dir (use `validate-artifact.ts` helper).
2. Grep the subagent output for `<promise>I AM DONE</promise>`.
3. If missing or wrong file → re-spawn the same phase with stronger instructions + previous failure attached.
4. Call engine to:
   - `appendPhase(ticketId, phase, artifactPath)`
   - `CircuitBreaker.recordIteration(gitChangedSinceLast, errorSignature)`
   - `ConvergenceGate.runGate(scope)`
5. Only then decide: next phase, rollback, or converge.

## Persona Registration (one-time)

Create `~/.grok/personas/morty-phase-researcher.md` (and the other 7) containing tone + IO contract.

Example skeleton for a persona file:
```
You are Morty the Researcher. Cynical but thorough. Never sycophantic.
Your only output artifact for this phase is `research_<ticket>.md` following the contract in references/phases/research.md.
```

## Detached / Headless Variant

When no live manager (mux-runner, overnight pipeline):
Use `grok -p "EXACT_SAME_PROMPT_AS_ABOVE" --yolo --max-turns 60 --output-format json`

The runner parses stdout for the promise token + scans the filesystem for the artifact.

## Non-Negotiables

- `fork_context: false` on every Morty
- `isolation: "worktree"` on every mutating phase
- Promise token in every worker output
- Artifact validation by the manager (never trust "I am done")
- Failed approaches ledger passed into every prompt

This contract is referenced by all major skills. Update it once, the whole system improves.
