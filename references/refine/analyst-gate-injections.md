# Analyst Gate Injections (Single Source — P0 Emission Quality)

**This is the canonical home for the three repeated prompt sections injected into the rich refine analysts (requirements, codebase, risk).**

Do **not** duplicate these blocks in the persona files. Reference this document once from each persona's Immutable Rules (or immediately before the final `<promise>`).

See the driving synthesis PRD: `prds/claude-to-grok-ports-emission-quality-and-autonomous-reliability-2026-05-24.md` and the implementation in `engine/src/lib/pipeline-preflight.ts` (`scanAnalystOutputsForUnverifiedPaths`, `checkVerifyMachinability`, `detectVerifyTheater`, the forward-ref regex with exact one-ASCII-space rule + git enforcement) + `ticket-emitter.ts` (hard emission gate + auto H-VERIFY-EMISSION-HONESTY healer siblings + amber waivers). `evaluateAcShapeEnforcement` is the remaining AC-shape enforcement fn (reliability-backlog; current defense is the injected section + manual + auto healer). Cross-checked against Claude sibling ports. R10 fidelity audit (019e5a71-5ad9-7763-804b-061082b708cc).

---

## AC_SHAPE_PROMPT_SECTION (Claude port — P0 emission quality)

At the very end of EVERY round output (after the tables), emit a machine-readable block:

```
## ac_shape_smells
{
  "smells": [
    {
      "type": "endpoint_enumeration" | "repeated_predicate" | "no_universal_quantifier" | "other",
      "location": "AC table row X or Requirements section Y",
      "description": "3+ bullets repeating 'the foo does X' without 'for each X in the set of Y'",
      "requires_justification": true,
      "justification": "explicit text or // JUSTIFICATION: comment here, or null",
      "collapsed": false,
      "recommended_action": "collapse to parametrized ticket (describe.each / table-driven / matrix) OR add // JUSTIFICATION: + dedicated acceptance test proving the enumeration is required"
    }
  ]
}
```

**Rule**: If you see 3+ repeated predicate bullets in an AC or requirement without a universal quantifier ("for every", "for each in the collection", "all members of Z satisfy") it is a smell. 

- Preferred: collapse into ONE ticket whose Verify uses describe.each / forEach / data-driven table.
- Alternative (only if collapse genuinely harms): include explicit `// JUSTIFICATION: <why enumeration is the only way>` in the criterion text + a machine-checkable acceptance test that the smell is intentional.

Never emit smelly ACs without one or the other. The manager collects the `## ac_shape_smells` JSON per the injection. Full machine `evaluateAcShapeEnforcement` is pending (see reliability-backlog + TESTABILITY_AUDIT); un-justified smells are caught by the auto-attached H-VERIFY-EMISSION-HONESTY sibling (per ticket-emitter) + manual review in synthesis step + Hard Rule in SKILL.md. This preserves the never-stop + amber waiver contract for council paths.

---

## PATH_VERIFICATION_PROMPT_SECTION (R-RTRC-1/7 strict hygiene — mandatory before any backtick)

**Before writing ANY backticked path or symbol** (`engine/src/lib/foo.ts:123`, `someSymbol`, `new-ticket-id`, `references/bar.md`) in your Files/Locations touched, ACs, Verifies, Scope, contracts, or ticket specs:

1. You **MUST** invoke the shell/tool to run `git ls-files --error-unmatch -- "the/path"` and/or `git grep -n "the symbol or string" -- "the/file"` (at current HEAD) and capture the literal success/failure.
2. Only if the git command succeeds (or the forward-create is explicitly planned in this PRD's scope) may you emit the backtick.
3. **Stdlib / node built-ins / external packages** (fs, path, 'node:fs', lodash, etc.) are **NEVER** backticked — plain text only.
4. **Forward-created** artifacts (new files, new tickets, new events the work will introduce) **MUST** be annotated with **exactly one ASCII space** immediately outside the closing backtick, using one of these exact forms:
   - `new-artifact.ts` (forward-created)
   - `H-VERIFY-foo-001` (created by ticket R-abc1234)
   - `the-helper` (introduced by ticket 2026-05-24-xyz)

No other wording, no missing space, no parens inside the backticks.

If you cannot run the git verification in this round (e.g. first bootstrap), mark the token `unverified-pending-git` and the manager's post-synthesis scan (`scanAnalystOutputsForUnverifiedPaths`) will flag it. Violations are errors that block emission or force healer siblings.

---

## ACTIVITY_EVENT_SCHEMA_SECTION

Any event name you propose in AC Verifies, contracts, or activity expectations **MUST** be an exact canonical name already used by the engine (see `engine/src/activity-logger.ts` for the source of truth):

- 'prd_created', 'refinement_completed', 'hardening_tickets_triggered', 'verify_theater_rejected', 'citadel_audit', 'preflight_report', 'activity_logged', etc.

**DO NOT INVENT** new names like "my_feature_done" or "emission_theater_fixed". If a new event type is truly required, the ticket that introduces it must also extend the logger first. Use the exact string that will be logged.

---

## Ticket Complexity Classification (for decomposition hygiene)

Classify every recommended ticket:

- **Simple**: <=3 files, <=4 ACs, low blast radius, no meta surfaces. 15-25 min Morty.
- **Medium**: 4-7 files or 5-7 ACs or touches one integration point. 30-45 min.
- **Complex**: 8+ files, high risk, meta (ritual/session/citadel), or >7 ACs. Must be split or have dedicated H- hardening sibling. Flag for Risk analyst review.

Always state the classification in your "Recommendations for Ticket Boundaries".

---

**Rick**: "These three sections are the shift-left that keeps the autonomous loop from choking on its own backticks. Put them in one place so the analysts actually read them instead of scrolling past the 47th copy. Now go emit something the Morties can actually verify." 

Wubba lubba dub dub.