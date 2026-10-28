# Déploiement — Silima Shop

L'application est un **serveur Node unique** qui sert l'API, les images et le front
compilé. C'est volontairement simple : un petit VPS suffit (1 vCPU / 1 Go de RAM),
et la sauvegarde se résume à un dossier.

## A. Serveur VPS avec systemd + reverse proxy (recommandé)

### 1. Préparer le serveur (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo useradd --system --create-home --home-dir /var/www/silima silima
```

### 2. Installer l'application

```bash
sudo -u silima -H bash
cd ~
git clone <votre-dépôt> app        # ou copier le dossier par rsync/scp
cd app
npm ci
npm run seed:images                # prépare les visuels d'exemple (une seule fois)
cp .env.example .env
nano .env                          # ADMIN_EMAIL, ADMIN_PASSWORD, SITE_URL, DEMO_MODE
npm run build
exit
```

### 3. Service systemd

```bash
sudo cp deploy/silima-shop.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now silima-shop
sudo systemctl status silima-shop
```

Le service écoute sur `127.0.0.1:3000` (variable `HOST` du fichier `.service`).

### 4. HTTPS avec Caddy (le plus rapide)

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
votre-domaine.ci {
    encode gzip zstd
    reverse_proxy 127.0.0.1:3000
}
EOF
sudo systemctl reload caddy
```

Avec Nginx :

```nginx
server {
  listen 443 ssl http2;
  server_name votre-domaine.ci;
  client_max_body_size 15m;          # uploads jusqu'à 12 Mo

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Renseignez ensuite `SITE_URL=https://votre-domaine.ci` dans `.env` et redémarrez.

### 5. Sauvegarde quotidienne

```bash
sudo tee /etc/cron.daily/silima-backup >/dev/null <<'EOF'
#!/bin/sh
cd /var/www/silima/app
tar czf /var/backups/silima-$(date +%F).tar.gz data
find /var/backups -name 'silima-*.tar.gz' -mtime +30 -delete
EOF
sudo chmod +x /etc/cron.daily/silima-backup
```

Restauration : arrêter le service, remplacer `data/`, redémarrer.

## B. Docker

```bash
cp .env.example .env      # renseigner ADMIN_PASSWORD et SITE_URL
docker compose up -d --build
```

`docker-compose.yml` monte un volume nommé sur `/app/data`, ce qui conserve la base et
les images entre deux redéploiements. Au premier démarrage, `deploy/docker-entrypoint.sh`
copie dans ce volume les visuels de démonstration préparés pendant la compilation ;
ensuite, le volume n'est plus jamais écrasé.

Fichiers fournis : `Dockerfile`, `docker-compose.yml`, `deploy/docker-entrypoint.sh`,
`deploy/silima-shop.service`, `.dockerignore`.

## C. Mise à jour

```bash
git pull
npm ci
npm run build
sudo systemctl restart silima-shop
```

La base est migrée automatiquement au démarrage (schéma idempotent) ; aucun script
manuel n'est nécessaire.

## D. Après déploiement (5 minutes)

1. Ouvrir `/admin`, se connecter, **changer le mot de passe**.
2. Paramètres → renseigner le **numéro WhatsApp** réel et le téléphone.
3. Ajouter un produit avec une photo, vérifier qu'il apparaît sur `/produits`.
4. Tester un lien WhatsApp depuis un téléphone.
5. Envoyer le formulaire de contact, vérifier la demande dans l'administration.
6. Retirer les produits de démonstration puis passer `DEMO_MODE=false`.
7. Soumettre `https://votre-domaine.ci/sitemap.xml` à Google Search Console.
