#!/bin/bash
# Launchd wrapper for nightly QA.
# launchd runs with a minimal PATH — set one that includes homebrew and re-ensure node_modules.
set -u

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/agencyflow"

REPO="/Users/agencyflow/projects/baylio"
cd "$REPO" || exit 1

STAMP=$(date +%Y-%m-%d_%H%M%S)
RUNLOG="$REPO/logs/launchd-nightly.log"
mkdir -p "$REPO/logs"

echo "=== run start $STAMP ===" >> "$RUNLOG"

# Self-heal: install deps if missing (should rarely trigger)
if [ ! -d "$REPO/node_modules" ]; then
  echo "node_modules missing — installing" >> "$RUNLOG"
  /opt/homebrew/bin/pnpm install --frozen-lockfile >> "$RUNLOG" 2>&1
fi

/bin/bash "$REPO/scripts/qa/nightly-qa.sh" >> "$RUNLOG" 2>&1
EXIT=$?
echo "=== run end $(date +%Y-%m-%d_%H%M%S) exit=$EXIT ===" >> "$RUNLOG"
exit $EXIT
