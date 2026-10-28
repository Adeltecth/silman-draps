#!/bin/sh
# Démarre le site en local, en réinstallant/compilant seulement si nécessaire.
# Les dossiers node_modules/ et dist/ ne sont pas conservés d'une session à l'autre :
# ce script les régénère en quelques secondes.
set -e
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[serve] installation des dépendances…"
  npm ci --no-audit --no-fund
fi

if [ ! -f dist/index.html ] || [ ! -f dist-server/server/index.js ]; then
  echo "[serve] compilation…"
  npm run build
fi

if [ ! -f .env ]; then
  echo "[serve] fichier .env absent : copie de .env.example"
  cp .env.example .env
fi

echo "[serve] démarrage sur http://localhost:${PORT:-3000}"
exec npm start
