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

mkdir -p "$SKILLS_TARGET"
mkdir -p "$PERSONAS_TARGET"

echo "→ Installing skills to $SKILLS_TARGET"
rsync -a --delete "$SCRIPT_DIR/skills/" "$SKILLS_TARGET/"

echo "→ Installing personas to $PERSONAS_TARGET"
rsync -a "$SCRIPT_DIR/references/personas/" "$PERSONAS_TARGET/"
cp "$SCRIPT_DIR/references/persona.md" "$PERSONAS_TARGET/pickle-rick.md" 2>/dev/null || true

# Rewrite the installed skills so they point at the stable $PICKLE_HOME instead of relative "engine/"
echo "→ Rewriting skill paths to use installed engine at $PICKLE_HOME"
find "$SKILLS_TARGET" -name "SKILL.md" -type f -exec sed -i.bak \
    -e "s|npx tsx engine/|npx tsx $PICKLE_HOME/engine/|g" \
    -e "s|engine/src/bin/|$PICKLE_HOME/engine/src/bin/|g" \
    {} +

# Clean up sed backup files
find "$SKILLS_TARGET" -name "SKILL.md.bak" -delete

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
        echo "   → Appended Pickle Rick section to $AGENTS_FILE"
    fi
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Installed to:     $PICKLE_HOME"
echo "Skills:           $SKILLS_TARGET"
echo "Personas:         $PERSONAS_TARGET"
echo ""
echo "All engine calls now resolve from the stable location."
echo "You can safely delete or move the original checkout if you want."