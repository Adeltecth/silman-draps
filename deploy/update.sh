#!/usr/bin/env bash
# Silima Shop — update an existing install (pull new files, rebuild, restart).
# Run from the project folder on the server:  sudo ./deploy/update.sh
set -euo pipefail

APP_DIR="/var/www/silima/app"
APP_USER="silima"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

echo "==> Copying files to ${APP_DIR}"
rsync -a --delete \
  --exclude 'node_modules' --exclude 'dist' --exclude 'dist-server' \
  --exclude 'data' --exclude '.git' --exclude 'docs/captures' --exclude '*.log' \
  "$SRC_DIR"/ "$APP_DIR"/

cd "$APP_DIR"
echo "==> Installing dependencies"
npm ci --no-audit --no-fund
echo "==> Building"
npm run build
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
echo "==> Restarting"
systemctl restart silima-shop
sleep 2
curl -fsS http://127.0.0.1:3000/api/health && echo " <- healthy"
echo "Done. Database and uploads in data/ were left untouched."
