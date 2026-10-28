#!/bin/sh
# Première exécution : les visuels de démonstration préparés à la compilation sont
# copiés dans le volume persistant, une seule fois.
set -e

if [ ! -f /app/data/seed-manifest.json ] && [ -d /app/seed-data ]; then
  echo "[entrée] initialisation des visuels de démonstration…"
  mkdir -p /app/data/uploads
  cp -rn /app/seed-data/. /app/data/ 2>/dev/null || true
fi

exec "$@"
