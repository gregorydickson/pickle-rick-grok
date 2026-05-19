# Installing Pickle Rick Grok

## Quick Install

From inside the `pickle-rick-grok` directory:

```bash
bash install.sh
```

This will:

- Copy the engine + full `references/` tree (phases, contracts, persona, templates) to a stable home at `~/.grok/pickle-rick-grok/`
- Copy all skills to `~/.grok/skills/pickle-rick-grok/`
- Install the Rick persona + all Morty phase personas to `~/.grok/personas/`
- **Comprehensively rewrite** the installed `SKILL.md` frontmatter, every embedded command / require / cat snippet, **and** the key contract files inside `references/` (`send-to-morty.md`, `spawn-subagent-contract.md`) so every path points at the stable `$PICKLE_HOME` using absolute paths computed at install time.
- Create `$PICKLE_HOME/lib/pickle-env.sh` (the `PICKLE_GROK_ROOT` resolver you can source).
- Run a **post-install smoke test** that verifies key files exist, no dev relative paths (`../../references/`, bare `references/`, bare `engine/`) remain in the skills, and sample frontmatter + commands are absolute. Install fails fast if smoke barfs.

**Reality, not marketing**:
- After `install.sh` the primary interactive path (`/pickle-rick`, `/pickle-pipeline`, `/microverse`, `/anatomy-park`, `/szechuan-sauce`, `/citadel`, `/pickle-prd`, etc.) works from **any** directory / any project, even if you delete the original checkout.
- The rewrite is what makes it so. Source tree is dev layout only.
- Subagent prompts now tell workers to load phase contracts etc. via absolute paths under the stable tree, so `read_file` works regardless of cwd.
- Engine bins (orchestrator etc.) also honor `PICKLE_GROK_ROOT` env if you set it.
- AGENTS.md integration is **global only** (never touches project AGENTS.md).

## After Installation

You should now be able to use:

- `/pickle-prd`
- `/pickle-refine-prd`
- `/pickle-rick` (DEPRECATED — old interactive 8-phase live `spawn_subagent` manager loop was removed by design. See the skill stub and AGENTS.md Core Execution Principle. Use `/pickle-tmux` or `/pickle-pipeline` instead.)
- `/pickle-tmux` (detached orchestrator)
- `/pickle-pipeline`
- `/microverse`
- `/anatomy-park`
- `/szechuan-sauce`
- `/citadel`
- `/pickle-metrics`
- `/pickle-standup`
- `/help-pickle`

## Using the Persona

### 1. Automatic (via Skills)
Most skills automatically pull in the Rick voice when the skill frontmatter has (after rewrite):

```yaml
references:
  - path: /your/home/.grok/pickle-rick-grok/references/persona.md
    conditional: true
```

### 2. Explicit Subagent Personas
When spawning Morties, use the installed ones:

```ts
spawn_subagent({
  persona: "pickle-rick",                    // Voice only (or refinement coordinator in /pickle-refine-prd ONLY). See AGENTS.md + installed persona.md for strict scoping. Never for full execution manager loops.
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

## PICKLE_GROK_ROOT + Resolver

Install drops:

```bash
~/.grok/pickle-rick-grok/lib/pickle-env.sh
```

Source it when you want the env var:

```bash
source ~/.grok/pickle-rick-grok/lib/pickle-env.sh
# now $PICKLE_GROK_ROOT and $PICKLE_ENGINE_DIR are set
```

The engine (orchestrator, etc.) uses it as override for finding references/. Skills themselves have the paths baked at install time so the LLM just sees the concrete commands.

## Updating

Just run `bash install.sh` again after pulling new changes. It will safely overwrite the stable home, re-run the full rewrite, and re-verify with smoke test.

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
- The real power comes from the **skills + engine**, not just the voice.
- Smoke test + comprehensive rewrite = the install story now actually delivers what the docs promise for the primary interactive path.
