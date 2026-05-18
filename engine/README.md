# Pickle Rick Grok Engine (TypeScript)

This is the clean, Grok-native core of the autonomous engineering system.

## Running

```bash
# From the pickle-rick-grok root
npx tsx engine/src/bin/setup.ts --task "build the thing"

npx tsx engine/src/bin/microverse.ts init <session> '{"type":"command",...}'

npx tsx engine/src/bin/orchestrator.ts <sessionDir>
```

## Structure

- `src/` — library code (types, session, iteration, workers, gate, etc.)
- `src/bin/` — CLI entrypoints invoked by the `/pickle-*` skills

The engine is deliberately small and focused compared to the original 100k+ LOC Claude extension. We kept only what delivered real value.
