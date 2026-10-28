# Deploy Silima Shop

Two files do the work:

- `deploy/install.sh` — first-time install on a fresh server
- `deploy/update.sh` — rebuild and restart after code changes

## Requirements

- A VPS with **Ubuntu 22.04 or 24.04** (1 vCPU / 1 GB RAM is enough)
- A domain name whose DNS you control
- SSH access as root

The site stores everything in `data/` (SQLite database + uploaded images).
It must live on a real disk — not on a platform with an ephemeral filesystem.

## Install (about 5 minutes)

```bash
# 1. Point your domain at the server first (DNS A record -> server IP)

# 2. Copy the project to the server
rsync -av --exclude node_modules --exclude dist --exclude dist-server \
      --exclude data ./ silima-shop/ root@YOUR_SERVER_IP:/root/silima-shop/

# 3. Run the installer
ssh root@YOUR_SERVER_IP
cd /root/silima-shop
sudo ./deploy/install.sh your-domain.com
```

The script installs Node.js 20 and Caddy, creates a `silima` system user, copies the app
to `/var/www/silima/app`, writes `.env` with a random admin password, builds, registers a
systemd service, configures HTTPS and sets up a daily backup. It prints the admin
credentials at the end.

Re-running it is safe: an existing `.env`, database and uploads are never overwritten.

## What runs where

| Item | Path / command |
|---|---|
| Application | `/var/www/silima/app` |
| Config (secrets) | `/var/www/silima/app/.env` |
| Database + photos | `/var/www/silima/app/data` |
| Service | `systemctl status silima-shop` |
| Logs | `journalctl -u silima-shop -f` |
| Backups | `/var/backups/silima/` (daily, 30 days) |
| Reverse proxy | Caddy, automatic HTTPS from Let's Encrypt |

The Node process listens on `127.0.0.1:3000` only. Caddy handles ports 80/443, TLS and
compression, so the app itself is never exposed directly.

## Update

```bash
rsync -av --exclude node_modules --exclude dist --exclude dist-server \
      --exclude data ./ silima-shop/ root@YOUR_SERVER_IP:/root/silima-shop/
ssh root@YOUR_SERVER_IP 'cd /root/silima-shop && sudo ./deploy/update.sh'
```

`data/` is excluded by design: the database and photos on the server are the source of
truth, not your local copy.

## After install

1. Open `https://your-domain.com/admin`, sign in, change the password.
2. Settings → set the real WhatsApp number.
3. Products → add your catalogue, delete the demo products.
4. Set `DEMO_MODE=false` in `.env`, then `systemctl restart silima-shop`.
5. Submit `https://your-domain.com/sitemap.xml` to Google Search Console.

Detailed content steps are in `docs/MISE-EN-LIGNE-PAS-A-PAS.md` (French, for the shop owner).

## Docker alternative

```bash
cp .env.example .env    # set ADMIN_PASSWORD and SITE_URL
docker compose up -d --build
```

`docker-compose.yml` mounts a named volume on `/app/data`. On first start the entrypoint
copies the prepared demo images into that volume; afterwards the volume is never touched.

## Restore a backup

```bash
systemctl stop silima-shop
tar xzf /var/backups/silima/silima-2026-10-27.tar.gz -C /var/www/silima/app
chown -R silima:silima /var/www/silima/app/data
systemctl start silima-shop
```

## Note on temporary preview links

Tunnels (Cloudflare quick tunnels, pinggy, ngrok free) give a public URL for a few minutes
to a few hours, then expire. They are useful to show the site on a phone; they are not
hosting. Use the section above for a permanent address.
