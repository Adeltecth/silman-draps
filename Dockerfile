# ---------------------------------------------------------------------------
# Silima Shop — image de production (Node 20, Debian slim)
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Dépendances natives (better-sqlite3, sharp) + outils de compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
# Les visuels de démonstration sont préparés ici (sharp) puis copiés dans le volume
# persistant au premier démarrage, par deploy/docker-entrypoint.sh.
RUN npm run build && npm run seed:images && npm prune --omit=dev

# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/public ./public
COPY --from=build /app/assets-source ./assets-source
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/data ./seed-data
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Les données persistantes vivent dans /app/data (volume)
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/data/uploads \
    && chown -R node:node /app/data /app/seed-data
USER node

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist-server/server/index.js"]
