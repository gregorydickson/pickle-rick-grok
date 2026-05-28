#!/bin/bash
# TDD harness for install.sh guard behavior.
# Exercises: hard refuse in non-tty, --no-confirm / --closer-context bypass,
# active session detection (state.json + pgrep), non-interactive closer path.
#
# NOTE: The LOCKDIR / flock / stealStaleLock "serialization" feature was removed
# entirely (declared a bug — it caused more hangs than it prevented, especially
# under agent harness execution). Tests related to the old locking have been retired.
# Run: bash tests/install-guard.test.sh (from repo root)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL="$SCRIPT_DIR/install.sh"

echo "=== SWARM4 Install Guard TDD Harness ==="

# 1. Non-tty + active process => hard refuse (exit 1, no prompt)
if pgrep -f "run-pipeline|mux-runner|orchestrator.*pickle" >/dev/null 2>&1; then
  echo "SKIP: real orchestrator running; cannot safely test hard refuse path"
else
  # Simulate non-tty
  if ! bash -c "exec < /dev/null; \"$INSTALL\" 2>&1 | grep -q 'Aborted. Stop campaigns'" 2>/dev/null; then
    echo "FAIL: expected hard refuse / Aborted in non-tty without --force"
    exit 1
  fi
  echo "PASS: non-tty without --force => hard refuse"
fi

# 2. --force bypasses (still warns but proceeds)
if bash -c "\"$INSTALL\" --force 2>&1 | grep -q 'proceeding at your own risk'"; then
  echo "PASS: --force bypasses guard"
else
  echo "FAIL: --force did not bypass"
  exit 1
fi

# 3. --closer-context / --no-confirm bypass (new SWARM4 requirement)
if bash -c "\"$INSTALL\" --closer-context --no-confirm 2>&1 | grep -q 'Installing core'"; then
  echo "PASS: --closer-context --no-confirm bypasses interactive paths"
else
  echo "FAIL: closer-context bypass not working"
  exit 1
fi

# 4. (RETIRED) flock/LOCKDIR serialization tests removed along with the feature. 9>"$LOCKDIR/lock"

# 5-7. (RETIRED) All remaining SWARM5/SWARM6 locking, stale-dir, and portable-fallback
# tests have been removed because the underlying LOCKDIR feature no longer exists in install.sh.
