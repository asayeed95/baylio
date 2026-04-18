#!/bin/bash
# Launchd wrapper for morning brief. Pipes the brief prompt through `claude -p`
# and writes the result to logs/brief-YYYY-MM-DD.md.
set -u

export PATH="/Users/agencyflow/.local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/agencyflow"

REPO="/Users/agencyflow/projects/baylio"
cd "$REPO" || exit 1

DATE=$(date +%Y-%m-%d)
OUT="$REPO/logs/brief-${DATE}.md"
RUNLOG="$REPO/logs/launchd-morning.log"
mkdir -p "$REPO/logs"

read -r -d '' PROMPT <<EOF || true
Morning brief for Baylio (cwd: $REPO).

1. Read logs/qa-$DATE.md. If absent, read the most recent logs/qa-*.md.
2. Surface any ❌ hard-check failures verbatim — must-fix today.
3. Classify model findings into must-fix / should-fix / ignore, one-line reason each.
4. Cross-reference docs/memory/open-loops.md and docs/memory/roadmap.md. Don't duplicate tracked loops.
5. Output a 4-line plan-of-attack.
6. Do NOT auto-fix.
EOF

echo "=== brief start $(date +%H:%M:%S) ===" >> "$RUNLOG"
/Users/agencyflow/.local/bin/claude -p "$PROMPT" > "$OUT" 2>> "$RUNLOG"
EXIT=$?
echo "=== brief end $(date +%H:%M:%S) exit=$EXIT out=$OUT ===" >> "$RUNLOG"
exit $EXIT
