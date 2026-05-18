# PRD Writing Guide for Pickle Rick (Grok)

A practical guide to writing high-quality Product Requirements Documents that work well with autonomous AI engineering systems like Pickle Rick on Grok Build.

---

## The Golden Rule

**The spec is the review.**

Every requirement must be machine-verifiable. If a later AI worker (or a human) cannot automatically check whether the requirement was met, it should not be in the PRD.

This is the single biggest difference between a traditional PRD and one written for Pickle Rick.

---

## Recommended PRD Structure

Use the template in `references/prd-template.md` (or let `/pickle-prd` generate one for you).

Key sections:

### 1. Problem Statement
- Who is affected?
- What pain are they feeling?
- Why does this matter now?

### 2. Objective & Scope
- One-sentence objective
- Explicit In-Scope / Out-of-Scope lists (this prevents scope creep)

### 3. Requirements Table (Most Important)

| Priority | Requirement | User Story | Verification |
|----------|-------------|------------|--------------|

**Verification** is non-negotiable. Examples:
- `npm test -- user-preferences.test.ts`
- `curl -w '%{time_total}' /api/health returns < 50ms`
- TypeScript compiles with no errors on the new interfaces
- LLM judge prompt: "Does this error message clearly explain what went wrong?"

### 4. Interface Contracts

List every boundary that crosses files or services with exact shapes (Zod schemas, TypeScript interfaces, API request/response examples, event payloads, etc.).

This is where most integration bugs hide.

### 5. Test Expectations

What tests should exist after this work? What should they assert?

### 6. Risks & Assumptions

Call out anything that could derail the work.

---

## Writing Tips That Actually Matter

- **Be specific about verification early.** The AI will push you on this anyway — do it proactively.
- **Ground everything in the existing codebase.** Mention real file paths and patterns when possible.
- **Write contracts, not vibes.** “The API should return user data” is bad. “POST /preferences returns `{ userId: string, preferences: UserPreferences }` where `UserPreferences` is defined as...” is good.
- **Keep requirements atomic.** One row in the table = one verifiable thing.
- **Separate “what” from “how”.** The PRD should define the what and the contracts. The implementation tickets decide the how.

---

## Common Anti-Patterns

- Writing requirements that can only be checked by a human looking at the UI.
- Using words like “should feel fast”, “good UX”, “intuitive” without defining what that means measurably.
- Skipping the Interface Contracts section.
- Making the PRD too long. Atomic tickets come from good decomposition during refinement, not from a 50-page PRD.

---

## Using It With Pickle Rick on Grok

1. Use natural language or `/pickle-prd` to draft.
2. Use `/pickle-refine-prd` to have three AI analysts (requirements, codebase integration, risk) tear it apart and improve it.
3. The refined PRD + generated atomic tickets become the input to `/pickle-rick` or `/pickle-pipeline`.

The better the PRD, the better the autonomous implementation.

---

*This guide is part of the Grok-native port of Pickle Rick. The core philosophy ("the spec is the review") is unchanged from the original Claude version.*