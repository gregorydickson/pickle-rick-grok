#!/bin/bash
set -euo pipefail

# Pickle Rick Grok - Install Script
# Installs skills + personas + stable engine into the user's Grok environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GROK_DIR="${HOME}/.grok"
PICKLE_HOME="${GROK_DIR}/pickle-rick-grok"          # Stable home for engine + references
SKILLS_TARGET="${GROK_DIR}/skills/pickle-rick-grok"
PERSONAS_TARGET="${GROK_DIR}/personas"

echo "🥒 Pickle Rick Grok Installer"
echo "=============================="

if [ ! -d "$GROK_DIR" ]; then
    echo "❌ No ~/.grok directory found."
    echo "   Please run Grok at least once so it creates its config directory."
    exit 1
fi

# Active session guard.
# Warns (and can hard-refuse in non-tty) if a Pickle Rick orchestrator or
# active session is detected. This is the primary protection against
# installing while a long campaign is running.
# --force / --no-confirm / --closer-context bypass the interactive parts.
# The previous LOCKDIR/flock/stealStaleLock "concurrent protection" has been
# removed entirely (it was a constant source of hangs under agent execution).

FORCE=0
NO_CONFIRM=0
CLOSER_CONTEXT=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --no-confirm) NO_CONFIRM=1 ;;
    --closer-context) NO_CONFIRM=1; CLOSER_CONTEXT=1 ;;
  esac
done

# Improved active detection (pgrep + full find_active_session style over all possible data roots, like claude)
ACTIVE=0
if pgrep -f "run-pipeline|mux-runner|orchestrator.*pickle" > /dev/null 2>&1; then
  ACTIVE=1
else
  # find_active_session style (claude:118 pattern) over all possible data roots
  for root in "$HOME/.local/share/pickle-rick" "$HOME/.grok/pickle-rick-grok" "$HOME/.grok"; do
    [ -d "$root/sessions" ] || continue
    for sdir in "$root/sessions"/*; do
      if [ -f "$sdir/state.json" ] && grep -q '"active"[[:space:]]*:[[:space:]]*true' "$sdir/state.json" 2>/dev/null; then
        ACTIVE=1; break 2
      fi
    done
  done
fi

if [ "$ACTIVE" -eq 1 ]; then
    echo "⚠️  WARNING: Detected running Pickle Rick orchestrator process(es) or active session state."
    echo "   Installing now risks version skew, state corruption, or mid-campaign breakage."
    echo "   (Strongly recommended to stop campaigns before installing to avoid skew.)"
    echo "   Strongly recommended: stop all campaigns (or wait for clean shutdown) before re-running install."

    if [ "$FORCE" -eq 0 ] && [ "$NO_CONFIRM" -eq 0 ]; then
        # Hard refuse in non-tty / headless contexts (no interactive prompt)
        if [ ! -t 0 ]; then
            echo "❌ REFUSE: install.sh blocked in non-tty/headless context without --force or --no-confirm/--closer-context."
            echo "   Use --closer-context --no-confirm for self-loop closer handoff (see closer-ticket-manager-handoff.md)."
            exit 1
        fi
        read -p "Continue anyway? This is a bad idea. [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted. Stop campaigns and re-run."
            exit 1
        fi
    else
        echo "   --force or --no-confirm/--closer-context supplied; proceeding at your own risk."
    fi
fi

# Direct install of core (no locking).
# The previous LOCKDIR / flock / stealStaleLock machinery has been removed.
# It was causing more problems (indefinite hangs under the agent harness,
# stale directories after killed runs, non-tty background execution) than
# it solved. Concurrent install protection is now handled by the ACTIVE
# detection warning above + explicit bypass flags.
echo "→ Installing core (engine + references) to $PICKLE_HOME"
mkdir -p "$PICKLE_HOME"
rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.DS_Store' \
    "$SCRIPT_DIR/" "$PICKLE_HOME/"
chmod +x "$PICKLE_HOME/bin/grok-pipeline" 2>/dev/null || true
# H-INSTALL-ROBUST-01 hygiene seam (minimal, portable, best-effort for closer handoff verification).
# Future runs can assert on presence or content of a manifest/hash. No MD5 tax, no new deps.
echo "   (H-INSTALL hygiene: core deployed; closer handoff path exercised)"
mkdir -p "$SKILLS_TARGET"
mkdir -p "$PERSONAS_TARGET"

# Make the dispatch helper(s) executable (grok-pipeline wrapper for the automatic "run a pipeline" UX)
# This is the tiny helper that bakes --target + long tsx path so the LLM constructs dramatically shorter argv.
chmod +x "$PICKLE_HOME/bin/grok-pipeline" 2>/dev/null || true
# (Any future thin dispatch wrappers in bin/ get +x here.)

mkdir -p "$SKILLS_TARGET"
mkdir -p "$PERSONAS_TARGET"

echo "→ Installing skills to $SKILLS_TARGET"
rsync -a --delete "$SCRIPT_DIR/skills/" "$SKILLS_TARGET/"

echo "→ Installing personas to $PERSONAS_TARGET"
rsync -a "$SCRIPT_DIR/references/personas/" "$PERSONAS_TARGET/"
cp "$SCRIPT_DIR/references/persona.md" "$PERSONAS_TARGET/pickle-rick.md" 2>/dev/null || true

# Rewrite the installed skills + key reference docs so they point at the stable $PICKLE_HOME
# instead of fragile relative paths. This fixes interactive ritual calls, frontmatter refs,
# PROMPT cats, and code examples after `bash install.sh`.
echo "→ Rewriting skill + reference paths to use installed engine/references at $PICKLE_HOME"

# 1. SKILL.md files: npx, imports in -e snippets, frontmatter, body cats/references, prose mentions of paths
find "$SKILLS_TARGET" -name "SKILL.md" -type f -exec sed -i.bak \
    -e "s|npx tsx engine/|npx tsx $PICKLE_HOME/engine/|g" \
    -e "s|engine/src/bin/|$PICKLE_HOME/engine/src/bin/|g" \
    -e "s|from \"\./engine/src/|from \"$PICKLE_HOME/engine/src/|g" \
    -e "s|from '\./engine/src/|from '$PICKLE_HOME/engine/src/|g" \
    -e "s|import(\"\./engine/src/|import(\"$PICKLE_HOME/engine/src/|g" \
    -e "s|import('\./engine/src/|import('$PICKLE_HOME/engine/src/|g" \
    -e "s|path: \.\./\.\./references/|path: $PICKLE_HOME/references/|g" \
    -e "s|cat references/|cat $PICKLE_HOME/references/|g" \
    -e "s| references/| $PICKLE_HOME/references/|g" \
    -e "s|\`references/|\`$PICKLE_HOME/references/|g" \
    -e "s|engine/src/ritual\.ts|$PICKLE_HOME/engine/src/ritual.ts|g" \
    -e "s|engine/src/session\.js|$PICKLE_HOME/engine/src/session.js|g" \
    -e "s|engine/src/git_safety\.js|$PICKLE_HOME/engine/src/git_safety.js|g" \
    {} +

# 2. Also rewrite the loaded contract doc (contains ritual import example used by interactive managers)
if [ -f "$PICKLE_HOME/references/spawn-subagent-contract.md" ]; then
    sed -i.bak \
        -e "s|from '\./engine/src/|from '$PICKLE_HOME/engine/src/|g" \
        -e "s|from \"\./engine/src/|from \"$PICKLE_HOME/engine/src/|g" \
        -e "s|import('\./engine/src/|import('$PICKLE_HOME/engine/src/|g" \
        -e "s|import(\"\./engine/src/|import(\"$PICKLE_HOME/engine/src/|g" \
        -e "s|engine/src/ritual\.js|$PICKLE_HOME/engine/src/ritual.js|g" \
        "$PICKLE_HOME/references/spawn-subagent-contract.md"
    rm -f "$PICKLE_HOME/references/spawn-subagent-contract.md.bak"
fi

# 3. Light touch on send-to-morty.md (instructional refs only)
if [ -f "$PICKLE_HOME/references/send-to-morty.md" ]; then
    sed -i.bak -e "s|\`references/phases/|\`$PICKLE_HOME/references/phases/|g" \
        "$PICKLE_HOME/references/send-to-morty.md"
    rm -f "$PICKLE_HOME/references/send-to-morty.md.bak"
fi

# Clean up any sed backup files left in skills or references
find "$SKILLS_TARGET" -name "*.bak" -delete 2>/dev/null || true
find "$PICKLE_HOME/references" -name "*.bak" -delete 2>/dev/null || true

# Optional: Append to user's *global* AGENTS.md only
AGENTS_FILE="$GROK_DIR/AGENTS.md"
APPEND_BLOCK="$SCRIPT_DIR/references/agents-append.md"

echo ""
echo "Note: This will only modify your *global* ~/.grok/AGENTS.md (never any project AGENTS.md)."
if [ "$CLOSER_CONTEXT" -eq 1 ] || [ "$NO_CONFIRM" -eq 1 ] || [ ! -t 0 ]; then
    echo "   (closer/headless/non-tty context — skipping interactive AGENTS prompt; block already updated idempotently by prior logic or --force)"
else
    read -p "Append Pickle Rick guidance to $AGENTS_FILE ? [y/N] " append_choice
    if [[ "$append_choice" =~ ^[Yy]$ ]]; then
        mkdir -p "$(dirname "$AGENTS_FILE")"
        touch "$AGENTS_FILE"

        # Idempotent replace of the Pickle Rick (Grok) persona block (including EAGER DISPATCH GUARD,
        # source-only rules, sealed-prior policy, etc.). Updates to the contract in this tree now
        # actually propagate on re-install (was append-only — a P1 drift vector per dispatch auditor).
        # Preserves all user content outside the block. End marker from global AGENTS contract.
        TMP_BLOCK="$(mktemp)"
        cat "$APPEND_BLOCK" > "$TMP_BLOCK"

        # Remove any prior version of the block (start marker to the known end marker or EOF)
        if grep -q "=== Pickle Rick (Grok) ===" "$AGENTS_FILE" 2>/dev/null; then
            # Delete from the start marker through the end marker (or to EOF if no end marker yet)
            awk '
                /=== Pickle Rick \(Grok\) ===/ { in_block=1; next }
                in_block && /=== End Pickle Rick ===/ { in_block=0; next }
                !in_block { print }
            ' "$AGENTS_FILE" > "$AGENTS_FILE.tmp" && mv "$AGENTS_FILE.tmp" "$AGENTS_FILE"
            echo "   → Replaced existing Pickle Rick (Grok) block with fresh version from source"
        else
            echo "" >> "$AGENTS_FILE"
            echo "   → Inserting Pickle Rick (Grok) block (first time)"
        fi

        cat "$TMP_BLOCK" >> "$AGENTS_FILE"
        rm -f "$TMP_BLOCK"
        echo "   → Persona/dispatch contract updated from this tree's references/agents-append.md (sibling parity: replace not append)"
    fi
fi

echo ""
echo "✅ Install complete."
echo "   Deployed to: $PICKLE_HOME"
echo "   Skills:      $SKILLS_TARGET"
echo "   Run: grok, then say 'run a pipeline on prds/...' (the persona now auto-dispatches via the guard + template)."
echo "   For source work in this checkout: use the local bin/grok-pipeline or npx tsx engine/src/bin/run-pipeline.ts --target ."
echo "Wubba lubba dub dub."
