#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Silima Shop — one-command production installer.
#
# Tested target: fresh Ubuntu 22.04 / 24.04 VPS, run as root.
#
#   sudo ./deploy/install.sh shop.example.com
#
# What it does:
#   1. installs Node.js 20 and Caddy (automatic HTTPS)
#   2. creates the `silima` system user and copies the app to /var/www/silima/app
#   3. generates .env with a random admin password
#   4. installs + builds dependencies, prepares demo images
#   5. registers a systemd service (auto-restart, boots on startup)
#   6. configures Caddy as reverse proxy for your domain
#   7. installs a daily backup of data/ and keeps 30 days
#
# Re-running the script is safe: existing .env, database and uploads are kept.
# ---------------------------------------------------------------------------
set -euo pipefail

DOMAIN="${1:-}"
APP_DIR="/var/www/silima/app"
APP_USER="silima"
NODE_MAJOR="20"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: sudo $0 your-domain.com" >&2
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (use sudo)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(dirname "$SCRIPT_DIR")"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# --- 1. Base packages ------------------------------------------------------
say "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg rsync build-essential python3 >/dev/null

if ! command -v node >/dev/null || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]]; then
  say "Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v) / npm $(npm -v)"

if ! command -v caddy >/dev/null; then
  say "Installing Caddy (HTTPS)"
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

# --- 2. Service user and files --------------------------------------------
say "Creating user ${APP_USER} and copying the application"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/var/www/silima" --shell /usr/sbin/nologin "$APP_USER"

mkdir -p "$APP_DIR" "$APP_DIR/data"
# --exclude data: never overwrite a live database or uploaded photos
rsync -a --delete \
  --exclude 'node_modules' --exclude 'dist' --exclude 'dist-server' \
  --exclude 'data' --exclude '.git' --exclude 'docs/captures' --exclude '*.log' \
  "$SRC_DIR"/ "$APP_DIR"/
mkdir -p "$APP_DIR/data/uploads"

# --- 3. Environment file ---------------------------------------------------
if [[ ! -f "$APP_DIR/.env" ]]; then
  say "Generating .env with a random admin password"
  ADMIN_PW="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)"
  cat > "$APP_DIR/.env" <<EOF
PORT=3000
HOST=127.0.0.1
SITE_URL=https://${DOMAIN}
NODE_ENV=production
ADMIN_EMAIL=admin@silimashop.ci
ADMIN_PASSWORD=${ADMIN_PW}
ADMIN_NAME=Administrateur Silima
DEMO_MODE=true
COOKIE_SECURE=auto
SESSION_DAYS=7
ENQUIRY_RATE_LIMIT=6
TRUST_PROXY=true
EOF
  chmod 600 "$APP_DIR/.env"
  GENERATED_PW="$ADMIN_PW"
else
  say "Keeping the existing .env"
  if ! grep -q "^SITE_URL=https://${DOMAIN}$" "$APP_DIR/.env"; then
    sed -i "s|^SITE_URL=.*|SITE_URL=https://${DOMAIN}|" "$APP_DIR/.env"
    echo "SITE_URL updated to https://${DOMAIN}"
  fi
fi

# --- 4. Build --------------------------------------------------------------
say "Installing dependencies and building (takes ~1 min)"
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build
if [[ ! -f data/seed-manifest.json ]]; then
  npm run seed:images
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# --- 5. systemd ------------------------------------------------------------
say "Installing the systemd service"
install -m 644 "$APP_DIR/deploy/silima-shop.service" /etc/systemd/system/silima-shop.service
systemctl daemon-reload
systemctl enable silima-shop >/dev/null
systemctl restart silima-shop
sleep 3
systemctl --no-pager --lines=5 status silima-shop || true
curl -fsS http://127.0.0.1:3000/api/health && echo " <- app is healthy"

# --- 6. Caddy + HTTPS ------------------------------------------------------
say "Configuring Caddy for https://${DOMAIN}"
mkdir -p /etc/caddy
if [[ -f /etc/caddy/Caddyfile ]] && grep -q "^${DOMAIN}" /etc/caddy/Caddyfile; then
  echo "Caddyfile already has an entry for ${DOMAIN}"
else
  cat >> /etc/caddy/Caddyfile <<EOF

${DOMAIN} {
    encode gzip zstd
    request_body {
        max_size 15MB
    }
    reverse_proxy 127.0.0.1:3000
}
EOF
fi
systemctl reload caddy 2>/dev/null || systemctl restart caddy

# --- 7. Daily backup -------------------------------------------------------
say "Installing the daily backup"
cat > /etc/cron.daily/silima-backup <<EOF
#!/bin/sh
set -e
mkdir -p /var/backups/silima
tar czf /var/backups/silima/silima-\$(date +%F).tar.gz -C ${APP_DIR} data
find /var/backups/silima -name 'silima-*.tar.gz' -mtime +30 -delete
EOF
chmod 755 /etc/cron.daily/silima-backup

# --- Done ------------------------------------------------------------------
cat <<EOF

────────────────────────────────────────────────────────────
 Silima Shop is installed.

   URL       : https://${DOMAIN}
   Admin     : https://${DOMAIN}/admin
   Email     : admin@silimashop.ci
   Password  : ${GENERATED_PW:-"(unchanged — see ${APP_DIR}/.env)"}

   Config    : ${APP_DIR}/.env
   Data      : ${APP_DIR}/data  (database + photos)
   Logs      : journalctl -u silima-shop -f
   Backups   : /var/backups/silima (daily, 30 days)

 Next steps
   1. Point the DNS A record of ${DOMAIN} to this server if you have
      not done so — HTTPS is issued automatically once DNS resolves.
   2. Open https://${DOMAIN}/admin, change the password.
   3. Settings -> set the real WhatsApp number.
   4. Products -> remove the demo products, then set DEMO_MODE=false
      in .env and run: systemctl restart silima-shop
────────────────────────────────────────────────────────────
EOF
