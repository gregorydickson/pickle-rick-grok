---
name: council-of-ricks
description: Higher-tier parallel reviewer (Graphite stack health + Linear + fan-out subagents). NOT PORTED to Grok engine yet.
version: 0.0.0-deprecated
triggers:
  - council-of-ricks
  - council
---
# Council of Ricks — DEPRECATED / NOT PORTED (Grok)

**Honest status**: This P2/P3 skill from the original Claude implementation (parallel fan-out review of metrics, tickets, external signals like Graphite `gt` + Linear comments) has **not been ported** to the Grok-native skills/ or engine/.

- Real implementation lives in the `pickle-rick-claude` variant.
- No `engine/src/council.ts` or dedicated Grok skill driver exists.
- Using `/council-of-ricks` here will not do anything useful.

**Recommendation for autonomous self-development**:
- Use `/pickle-standup` + `/pickle-metrics` (which now pull real external CLI signals with graceful fallback) for daily signals.
- For full Council power, switch to the Claude Code checkout or wait for future P3 port.

See `/help-pickle` and `SKILL_MANIFEST.md` for the authoritative list of what actually works in this Grok port.

*Rick: "Don't call something that isn't there, Morty. That's how you get Cronenberged."*
