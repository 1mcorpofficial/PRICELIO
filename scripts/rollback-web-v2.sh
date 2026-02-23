#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -gt 0 ]]; then
  BACKUP_DIR="$1"
else
  BACKUP_DIR="$(ls -1dt "$ROOT_DIR/.legacy-web-backup"/* 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "${BACKUP_DIR:-}" || ! -d "$BACKUP_DIR" ]]; then
  echo "[rollback] No backup directory found. Pass one explicitly: scripts/rollback-web-v2.sh /path/to/backup"
  exit 1
fi

echo "[rollback] Restoring from $BACKUP_DIR"
for file in index.html styles.css app.js service-worker.js manifest.webmanifest; do
  if [[ -f "$BACKUP_DIR/$file" ]]; then
    cp "$BACKUP_DIR/$file" "$ROOT_DIR/$file"
  fi
done

if [[ -d "$BACKUP_DIR/assets" ]]; then
  rm -rf "$ROOT_DIR/assets"
  cp -a "$BACKUP_DIR/assets" "$ROOT_DIR/assets"
fi

echo "[rollback] Completed."
