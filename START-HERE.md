# Silima Shop — start here

French e-commerce site (catalogue + WhatsApp enquiries) for a bedding shop in Adjamé,
Abidjan. React + TypeScript front end, Express + SQLite back end, images on disk.

---

## ⚠️ Read this first: Vercel will not run this app

You asked to deploy on Vercel. This codebase is a **long-running Node server with a
database file and uploaded images on disk**. Vercel runs short-lived serverless functions
with a read-only, ephemeral filesystem, so:

| What the app needs | What Vercel gives |
|---|---|
| Persistent SQLite file | Function filesystem is ephemeral and read-only (only `/tmp`, wiped) |
| Uploaded product photos saved to disk | Uploads disappear; no writable volume |
| Sessions stored in the database | Each request may hit a different instance |
| One Express app serving API + SPA + `/media/*` | Needs functions + separate static hosting, with rewrites |

Deploying as-is would appear to work and then **lose products, photos and enquiries on the
next request**. Do not launch the shop that way.

### Two real options

**Option A — Use a host with a persistent disk (works with this code, 10 minutes)**

- Render → Web Service + a **Persistent Disk** mounted at `/app/data`
- Railway → service + **volume** mounted at `/app/data`
- Fly.io → `fly.toml` with a volume mounted at `/app/data`
- Any VPS (Hetzner, Contabo, OVH) → `deploy/install.sh` (fully automatic)

For Render / Railway, build and start commands:

```
Build:  npm ci && npm run build
Start:  npm start
Disk:   mount at /app/data
Env:    ADMIN_PASSWORD, SITE_URL, DEMO_MODE, NODE_ENV=production
```

**Option B — Make it Vercel-native (a rewrite, not a config change)**

Requires replacing the storage layer:

- SQLite → Postgres (Vercel Postgres / Neon / Supabase)
- `data/uploads` → Vercel Blob or S3 (uploads go through a signed-URL or API route)
- Sessions → database-backed or JWT cookies
- `server/routes/*` → API route handlers; the SPA becomes static on the CDN
- Demo seeding and `seed:images` reworked (sharp can't write to disk)

Roughly a day of work, and it changes how backups and image processing behave. Possible —
say the word and I'll do it — but if your goal is simply "the shop online this week",
Option A is the sane choice.

---

## Run it locally in one command

```bash
./serve.sh
```

Creates `.env` from `.env.example` if missing, installs dependencies, builds, starts.
Open http://localhost:3000 — admin at `/admin`.

If `.env` has an empty `ADMIN_PASSWORD`, a random password is generated once and written to
`data/admin-credentials.txt`. Change it after the first sign-in.

## Deploy on a VPS (recommended)

```bash
rsync -av --exclude node_modules --exclude dist --exclude dist-server \
      --exclude data ./ root@YOUR_SERVER_IP:/root/silima-shop/
ssh root@YOUR_SERVER_IP
cd /root/silima-shop && sudo ./deploy/install.sh your-domain.com
```

Installs Node 20, Caddy (free HTTPS), a systemd service, a random admin password and daily
backups. Details: `deploy/README.md`.

## Deploy with Docker

```bash
cp .env.example .env      # set ADMIN_PASSWORD and SITE_URL
docker compose up -d --build
```

Data lives in the named volume `silima-data`.

## What is where

| Path | Contents |
|---|---|
| `src/` | Public site + admin dashboard (React) |
| `server/` | Express API, SQLite schema, auth, uploads, SEO rendering |
| `shared/` | Types, stock rules, WhatsApp message builder, formatting |
| `data/` | **Database and uploaded photos — back this up** |
| `public/` | Static assets, favicon, OG image, hero photos |
| `assets-source/` | Original photos used to generate demo images |
| `docs/` | Deployment, admin guide, launch checklist, photo credits |
| `deploy/` | `install.sh`, `update.sh`, systemd unit, Docker entrypoint |
| `tests/` | 20 API integration tests, 18 Playwright browser tests |

## Before going live

1. `/admin` → change the password.
2. Settings → set the real WhatsApp number (until then, WhatsApp buttons show a
   configuration hint instead of a broken link — that is intended).
3. Replace the 9 demo products with real ones, then set `DEMO_MODE=false`.
4. `SITE_URL` must be your real domain, for canonicals and `sitemap.xml`.
5. Submit `sitemap.xml` to Google Search Console.

Step-by-step, in French, for the shop owner: `docs/MISE-EN-LIGNE-PAS-A-PAS.md`.

## Verified state of this package

- `npm ci && npm run build` on a clean copy: passes
- `npm run test:api`: 20/20 · `npm run test:e2e`: 18/18
- Production dependencies: no known vulnerabilities

Demo content is **not** real stock: photos are generic Pexels/Unsplash images
(`docs/CREDITS-PHOTOS.md`) and every demo product is flagged in the database.
