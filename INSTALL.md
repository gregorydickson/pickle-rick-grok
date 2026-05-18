# Installing Pickle Rick Grok

## Quick Install

From inside the `pickle-rick-grok` directory:

```bash
bash install.sh
```

This will:
- Copy the engine + references to a stable home at `~/.grok/pickle-rick-grok/`
- Copy all skills to `~/.grok/skills/pickle-rick-grok/`
- Install the Rick persona + all Morty phase personas to `~/.grok/personas/`
- Rewrite the installed skills so they point at the stable engine location (you can run from anywhere)

## After Installation

You should now be able to use:

- `/pickle-rick`
- `/pickle-pipeline`
- `/microverse`
- `/anatomy-park`
- `/szechuan-sauce`
- `/citadel`
- `/help-pickle`

## Using the Persona

### 1. Automatic (via Skills)
Most skills automatically pull in the Rick voice when the skill frontmatter has:

```yaml
references:
  - path: references/persona.md
    conditional: true
```

### 2. Explicit Subagent Personas
When spawning Morties, you can use the installed personas directly:

```ts
spawn_subagent({
  persona: "pickle-rick",                    // Manager voice
  // or
  persona: "morty-phase-implementer",
  fork_context: false,
  isolation: "worktree",
  ...
})
```

Available personas after install:
- `pickle-rick`
- `morty-phase-researcher`
- `morty-phase-research-reviewer`
- `morty-phase-planner`
- `morty-phase-plan-reviewer`
- `morty-phase-implementer`
- `morty-phase-verifier`
- `morty-phase-reviewer`
- `morty-phase-simplifier`

## Updating

Just run `bash install.sh` again after pulling new changes. It will safely overwrite the stable home at `~/.grok/pickle-rick-grok/`.

## Uninstall

```bash
bash uninstall.sh
```

This removes the stable home (`~/.grok/pickle-rick-grok/`), skills, and personas. Your global `~/.grok/AGENTS.md` is left untouched.

## AGENTS.md Integration (Global Only)

During install, you have the option to append a short Pickle Rick section to your **global** `~/.grok/AGENTS.md`.

This is the Grok equivalent of the old Claude behavior of appending the persona to `CLAUDE.md`.

**Important**: The installer will **never** touch a project-level `AGENTS.md`. The automated integration is global only.

The appended section includes:
- Quick command reference
- Recommended persona names for `spawn_subagent`
- Uninstall instructions

You can safely re-run `install.sh` — it will not duplicate the section.

## Project-Level Usage

If you want to use Pickle Rick only inside a specific repo (without polluting your global `~/.grok/`), you can simply copy the `skills/` folder into your repo as:

```
.grok/skills/pickle-rick-grok/
```

Grok will prefer repo-scoped skills over user-scoped ones.

**Note:** The installer (`install.sh`) only ever touches your *global* `~/.grok/` directory. It does **not** modify any project-level `AGENTS.md` files. If you want Pickle Rick notes in a specific repo's `AGENTS.md`, you can copy the content manually from `references/agents-append.md`.

## Notes

- The persona is **optional**. You can disable the Rick voice per-skill or globally by setting `persona: false` in relevant config.
- The real power comes from the **skills + engine**, not just the voice. The voice is flavor on top of a very capable autonomous engineering system.