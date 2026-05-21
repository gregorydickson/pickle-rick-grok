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

echo "→ Installing core (engine + references) to $PICKLE_HOME"
mkdir -p "$PICKLE_HOME"
rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.DS_Store' \
    "$SCRIPT_DIR/" "$PICKLE_HOME/"

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
read -p "Append Pickle Rick guidance to $AGENTS_FILE ? [y/N] " append_choice
if [[ "$append_choice" =~ ^[Yy]$ ]]; then
    mkdir -p "$(dirname "$AGENTS_FILE")"
    touch "$AGENTS_FILE"

    if grep -q "=== Pickle Rick (Grok) ===" "$AGENTS_FILE" 2>/dev/null; then
        echo "   → Pickle Rick section already present in $AGENTS_FILE (skipping)"
    else
        echo "" >> "$AGENTS_FILE"
        cat "$APPEND_BLOCK" >> "$AGENTS_FILE"
        echo "   → Appended (source of truth lives in this tree's references/agents-append.md)"
    fi
fi

echo ""
echo "✅ Install complete."
echo "   Deployed to: $PICKLE_HOME"
echo "   Skills:      $SKILLS_TARGET"
echo "   Run: grok, then say 'run a pipeline on prds/...' (the persona now auto-dispatches via the guard + template)."
echo "   For source work in this checkout: use the local bin/grok-pipeline or npx tsx engine/src/bin/run-pipeline.ts --target ."
echo "Wubba lubba dub dub."
