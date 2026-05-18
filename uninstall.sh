#!/bin/bash
set -euo pipefail

# Pickle Rick Grok - Uninstall Script

GROK_DIR="${HOME}/.grok"
PICKLE_HOME="${GROK_DIR}/pickle-rick-grok"
SKILLS_TARGET="${GROK_DIR}/skills/pickle-rick-grok"
PERSONAS_TARGET="${GROK_DIR}/personas"

echo "🥒 Pickle Rick Grok Uninstaller"
echo "================================"

read -p "Remove all Pickle Rick Grok files (skills, personas, engine)? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo "→ Removing stable home ($PICKLE_HOME)..."
rm -rf "$PICKLE_HOME"

echo "→ Removing skills..."
rm -rf "$SKILLS_TARGET"

echo "→ Removing personas..."
rm -f "$PERSONAS_TARGET"/pickle-rick.md
rm -f "$PERSONAS_TARGET"/morty-phase-*.md

echo ""
echo "✅ Uninstalled."
echo "Note: Your global ~/.grok/AGENTS.md was left untouched (you can remove the Pickle Rick section manually if desired)."
echo "      Any project-local copies were also left alone."