# Engineering Council — Native Grok Agent Teams for Development Work

These personas are designed for **chat-based engineering collaboration** inside Pickle Rick Grok (or plain Grok).

They are **not** the strict Morty pipeline workers. They do not require a formal `TICKET_DIR` or the 8-phase ritual. They are meant for real development work: refactoring, architecture reviews, skill improvement, analyzing changes, designing new features, etc.

## Recommended Default Engineering Council

When doing significant engineering work, spawn a combination of the following:

- `requirements-analyst` — Clarifies intent and acceptance criteria
- `codebase-analyst` — Maps work to actual files and existing patterns
- `risk-analyst` — Surfaces hidden risks and blast radius
- `engineering-architect` — Evaluates structural health and long-term leverage
- `backend-reviewer-fixer` — Reviews and proposes fixes for engine / server-side logic
- `frontend-reviewer-fixer` — Reviews and proposes fixes for UI / skills / components
- `code-simplifier` — Ruthlessly reduces unnecessary complexity

You can run them in parallel rounds (like the refinement council) for high-signal results.

## Example Usage (native spawn_subagent)

```ts
// Round 1 - Parallel fan-out
spawn_subagent({ persona: "requirements-analyst", ... })
spawn_subagent({ persona: "engineering-architect", ... })
spawn_subagent({ persona: "code-simplifier", ... })
spawn_subagent({ persona: "backend-reviewer-fixer", ... })

// Round 2 - Cross-critique (feed everyone the previous round's output)
```

## Philosophy

- Use these teams for **thinking and design work** in the chat.
- When the work is ready to become real production tickets, turn the output into a proper PRD and run it through `/pickle-refine-prd` + the pipeline (where the strict Morty workers take over).
- Never force these engineering personas into the production execution ritual. They are collaborators, not pipeline drones.

This separation exists so you can keep using Grok's native agent team power for development without the Morty ticket machinery getting in the way.

Wubba lubba dub dub. Think clearly. Build cleanly.