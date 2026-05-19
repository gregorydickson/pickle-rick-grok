#!/bin/bash
# pickle-env.sh — resolver for Grok-native Pickle Rick engine location
# Source this (after install) to get stable paths regardless of cwd or checkout location.
#
#   source ~/.grok/pickle-rick-grok/lib/pickle-env.sh
#
# Sets:
#   PICKLE_GROK_ROOT     — ~/.grok/pickle-rick-grok (engine + skills + references live here)
#   PICKLE_ENGINE_DIR    — $PICKLE_GROK_ROOT/engine
#   PICKLE_REFERENCES_DIR — $PICKLE_GROK_ROOT/references
#
# Used by custom scripts or when you want explicit imports instead of baked absolute paths in skills.

if [ -n "${BASH_SOURCE[0]}" ]; then
  THIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
else
  THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

export PICKLE_GROK_ROOT="$(dirname "$THIS_DIR")"
export PICKLE_ENGINE_DIR="$PICKLE_GROK_ROOT/engine"
export PICKLE_REFERENCES_DIR="$PICKLE_GROK_ROOT/references"

# Optional: also expose for tsx/node if someone wants to require.resolve from here
export NODE_PATH="${NODE_PATH:+$NODE_PATH:}$PICKLE_ENGINE_DIR/src"

echo "🥒 Pickle Rick Grok env active:"
echo "   PICKLE_GROK_ROOT=$PICKLE_GROK_ROOT"
echo "   Use absolute imports from \$PICKLE_ENGINE_DIR/src/ for ritual, orchestrator, etc."
echo "   Skills have paths baked at install time; source this only for ad-hoc engine hacking."