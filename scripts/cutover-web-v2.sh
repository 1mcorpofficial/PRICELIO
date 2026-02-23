#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT_DIR/.legacy-web-backup/$TIMESTAMP"

echo "[cutover] Building apps/web..."
npm -w apps/web run build

echo "[cutover] Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
for file in index.html styles.css app.js service-worker.js manifest.webmanifest; do
  if [[ -f "$ROOT_DIR/$file" ]]; then
    cp "$ROOT_DIR/$file" "$BACKUP_DIR/$file"
  fi
done
if [[ -d "$ROOT_DIR/assets" ]]; then
  cp -a "$ROOT_DIR/assets" "$BACKUP_DIR/assets"
fi

mkdir -p "$ROOT_DIR/assets"

echo "[cutover] Replacing root web shell with apps/web/dist..."
cp "$ROOT_DIR/apps/web/dist/index.html" "$ROOT_DIR/index.html"

if [[ -d "$ROOT_DIR/apps/web/dist/assets" ]]; then
  rsync -a --delete "$ROOT_DIR/apps/web/dist/assets/" "$ROOT_DIR/assets/"
fi

# Copy Vite PWA files (sw/workbox/manifest/icons/etc) without touching repository source dirs.
while IFS= read -r -d '' file; do
  base="$(basename "$file")"
  cp "$file" "$ROOT_DIR/$base"
done < <(find "$ROOT_DIR/apps/web/dist" -maxdepth 1 -type f -print0)

echo "[cutover] Completed. Backup saved: $BACKUP_DIR"
echo "[cutover] Next: reload your static server (nginx) if needed. PM2 restart is usually not required for static files."
