import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { Plugin } from 'vite';

// Publish existing uploads without importing the SQLite server or seeding products.
export function catalogueAssets(): Plugin {
  let output: string;
  return {
    name: 'silima-catalogue-assets',
    configResolved(config) { output = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const media = path.join(output, 'media');
      await fs.mkdir(media, { recursive: true });
      for (const name of await fs.readdir('data/uploads')) {
        if (/^[a-z0-9_-]+-(480|960|1600)\.webp$/.test(name)) {
          await fs.copyFile(path.join('data/uploads', name), path.join(media, name));
        }
      }
      const manifest = JSON.parse(await fs.readFile('data/seed-manifest.json', 'utf8')) as Record<string, { base: string }>;
      for (const [source, { base }] of Object.entries(manifest)) {
        if (!/^[a-z0-9_-]+$/.test(source) || !/^[a-z0-9_-]+$/.test(base)) throw new Error('Invalid image manifest');
        for (const size of [480, 960, 1600]) {
          const target = path.join(media, `${base}-${size}.webp`);
          try { await fs.access(target); }
          catch {
            // Restore only the original source associated with this exact image.
            await sharp(path.join('assets-source', `${source}.jpg`)).rotate()
              .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
              .webp({ quality: size === 480 ? 74 : 80, effort: 4 }).toFile(target);
          }
        }
      }
      let redirects = '';
      const backend = process.env.SILIMA_BACKEND_ORIGIN;
      if (backend) {
        const url = new URL(backend);
        if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
          throw new Error('SILIMA_BACKEND_ORIGIN must be an HTTPS origin without credentials or a path');
        }
        redirects += `/api/* ${url.origin}/api/:splat 200!\n/media/* ${url.origin}/media/:splat 200\n`;
      } else {
        redirects += '/api/* /api-unavailable.json 503!\n';
      }
      redirects += '/* /index.html 200\n';
      await fs.writeFile(path.join(output, '_redirects'), redirects);
    },
  };
}
