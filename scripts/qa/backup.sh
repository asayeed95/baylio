#!/usr/bin/env bash
# Rsync the Baylio repo to ~/backups/agencyflow/<timestamp>/baylio/
# Excludes build/vendor artifacts and .git (GitHub is authoritative for history).
set -u

cd "$(dirname "$0")/../.."  # repo root
STAMP=$(date +%Y-%m-%d_%H%M%S)
DEST="$HOME/backups/agencyflow/$STAMP/baylio"
mkdir -p "$DEST"

rsync -a \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='.next/' \
  --exclude='coverage/' \
  --exclude='.pnpm-store/' \
  --exclude='logs/' \
  --exclude='.vercel/' \
  --exclude='.DS_Store' \
  ./ "$DEST/"

SIZE=$(du -sh "$DEST" 2>/dev/null | awk '{print $1}')
echo "✅ Backup → $DEST ($SIZE)"
