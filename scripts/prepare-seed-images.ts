/**
 * Génère les visuels de démonstration et les fichiers statiques de marque.
 *
 * - Photos produits : traitées par le même pipeline que les uploads administrateur
 *   (WebP 480/960/1600) et enregistrées dans data/uploads via la table `media`.
 * - Photos d'ambiance : dérivées dans public/images (hero, page à propos, gros).
 * - Favicon, icônes et image Open Graph par défaut.
 *
 * Les photos proviennent de banques d'images libres (Pexels / Unsplash), copiées
 * dans assets-source/. Elles servent uniquement d'exemples de démonstration et
 * doivent être remplacées par les photos réelles de la boutique.
 *
 * Usage : npm run seed:images [-- --force]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { migrate, seedSettings } from '../server/db';
import { storeImageFromFile } from '../server/uploads';
import { config } from '../server/config';

const force = process.argv.includes('--force');
const sourceDir = path.join(config.rootDir, 'assets-source');
const manifestPath = path.join(config.dataDir, 'seed-manifest.json');
const publicDir = path.join(config.rootDir, 'public');
const imagesDir = path.join(publicDir, 'images');

interface ManifestEntry {
  base: string;
  alt: string;
  width: number;
  height: number;
}

const PRODUCT_IMAGES: { key: string; file: string; alt: string }[] = [
  { key: 'sheets-offwhite', file: 'sheets-offwhite.jpg', alt: 'Lit préparé avec une parure de draps claire, oreillers assortis' },
  { key: 'sheets-white', file: 'sheets-white.jpg', alt: 'Draps de lit blancs sur un lit, vue rapprochée' },
  { key: 'sheets-blue', file: 'sheets-blue.jpg', alt: 'Parure de lit à motif bleu et blanc' },
  { key: 'pillows', file: 'pillows.jpg', alt: 'Oreillers et linge de lit clair' },
  { key: 'bed-made', file: 'bed-made.jpg', alt: 'Drap housse blanc sur un lit' },
  { key: 'texture-white', file: 'texture-white.jpg', alt: 'Texture de tissu de lit blanc' },
  { key: 'texture-linen', file: 'texture-linen.jpg', alt: 'Taie d’oreiller en tissu naturel' },
  { key: 'duvet-white', file: 'duvet-white.jpg', alt: 'Housse de couette blanche sur un lit' },
  { key: 'duvet-linen', file: 'duvet-linen.jpg', alt: 'Parure de lit aux tons naturels dans une chambre' },
  { key: 'sheets-sand', file: 'sheets-sand.jpg', alt: 'Linge de lit aux tons sable' },
  { key: 'bed-sunrise', file: 'bed-sunrise.jpg', alt: 'Lit préparé avec du linge de maison, lumière du matin' },
  { key: 'linen-room', file: 'linen-room.jpg', alt: 'Chambre avec linge de lit clair et lumière naturelle' },
  { key: 'curtain-linen', file: 'curtain-linen.jpg', alt: 'Rideaux clairs devant une fenêtre' },
  { key: 'curtain-sun', file: 'curtain-sun.jpg', alt: 'Rideaux filtrant la lumière du soleil' },
  { key: 'curtain-drape', file: 'curtain-drape.jpg', alt: 'Tissu de rideau plissé aux tons naturels' },
];

const LANDSCAPES: { key: string; file: string; alt: string }[] = [
  { key: 'hero-bed', file: 'hero-bed.jpg', alt: 'Chambre lumineuse avec un lit préparé en linge de maison clair' },
  { key: 'ambiance-naturel', file: 'sheets-sand.jpg', alt: 'Linge de lit clair dans une lumière du matin' },
  { key: 'about-bedroom', file: 'about-bedroom.jpg', alt: 'Chambre préparée avec une parure de lit aux tons naturels' },
  { key: 'wholesale-folded', file: 'sheets-white.jpg', alt: 'Draps pliés empilés, prêts à être proposés à la vente' },

];

async function processLandscape(entry: { key: string; file: string; alt: string }) {
  const source = path.join(sourceDir, entry.file);
  if (!fs.existsSync(source)) {
    console.warn(`[seed] source manquante : ${entry.file}`);
    return;
  }
  fs.mkdirSync(imagesDir, { recursive: true });
  const base = sharp(source).rotate();
  const meta = await base.clone().metadata();
  const ratio = 4 / 3;
  const width = 1600;
  const height = Math.round(width / ratio);
  const focusLeft = meta.width && meta.height ? meta.height > meta.width * 0.8 : false;

  const large = sharp(source)
    .rotate()
    .resize({ width, height, fit: 'cover', position: focusLeft ? 'centre' : 'centre' })
    .webp({ quality: 78 })
    .toFile(path.join(imagesDir, `${entry.key}.webp`));
  const small = sharp(source)
    .rotate()
    .resize({ width: 800, height: Math.round(800 / ratio), fit: 'cover' })
    .webp({ quality: 74 })
    .toFile(path.join(imagesDir, `${entry.key}-800.webp`));
  await Promise.all([large, small]);
  console.info(`[seed] image d’ambiance : ${entry.key} (${entry.alt})`);
}

async function buildBrandAssets() {
  const hero = path.join(imagesDir, 'hero-bed.webp');
  if (fs.existsSync(hero)) {
    // Image Open Graph 1200×630 avec bandeau de marque sobre.
    const bannerHeight = 132;
    const banner = Buffer.from(`
      <svg width="1200" height="${bannerHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="${bannerHeight}" fill="#FAF6EF" fill-opacity="0.94"/>
        <text x="56" y="58" font-family="Georgia, serif" font-size="34" fill="#1E2630">Silima Shop</text>
        <text x="56" y="98" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="#5C6670">Draps Jimmy &amp; textiles de maison — Adjamé, Abidjan</text>
      </svg>`);
    await sharp(hero)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .composite([{ input: banner, top: 630 - bannerHeight, left: 0 }])
      .jpeg({ quality: 82 })
      .toFile(path.join(publicDir, 'og-default.jpg'));
    console.info('[seed] image Open Graph générée');
  }

  // Icône de marque (SVG) + déclinaisons PNG/ICO.
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
    <rect width="40" height="40" rx="10" fill="#1E2630"/>
    <rect x="9" y="12.5" width="22" height="3.2" rx="1.6" fill="#F4ECE0"/>
    <rect x="9" y="18.4" width="22" height="3.2" rx="1.6" fill="#F4ECE0" fill-opacity="0.82"/>
    <rect x="9" y="24.3" width="13" height="3.2" rx="1.6" fill="#C86A43"/>
  </svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconSvg);
  await sharp(Buffer.from(iconSvg)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(iconSvg)).resize(32, 32).png().toFile('/tmp/favicon-32.png');
  console.info('[seed] favicon et icônes générés (favicon.ico à convertir si nécessaire)');
}

async function main() {
  migrate();
  seedSettings();

  let manifest: Record<string, ManifestEntry> = {};
  const shouldProcess = force || !fs.existsSync(manifestPath);
  if (!shouldProcess) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const missing = PRODUCT_IMAGES.some((entry) => {
      const item = manifest[entry.key];
      return !item || !fs.existsSync(path.join(config.uploadsDir, `${item.base}-960.webp`));
    });
    if (!missing) {
      console.info('[seed] images produits déjà présentes — utilisez --force pour régénérer.');
    } else {
      manifest = {};
    }
  }

  if (Object.keys(manifest).length === 0) {
    for (const entry of PRODUCT_IMAGES) {
      const source = path.join(sourceDir, entry.file);
      if (!fs.existsSync(source)) {
        console.warn(`[seed] source manquante : ${entry.file}`);
        continue;
      }
      const asset = await storeImageFromFile(source, null);
      manifest[entry.key] = {
        base: asset.path.replace('/media/', ''),
        alt: entry.alt,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      };
      console.info(`[seed] photo produit traitée : ${entry.key}`);
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.info(`[seed] manifeste écrit : ${path.relative(config.rootDir, manifestPath)}`);
  }

  for (const entry of LANDSCAPES) await processLandscape(entry);
  await buildBrandAssets();
  console.info('[seed] terminé.');
}

main().catch((err) => {
  console.error('[seed] échec :', err);
  process.exit(1);
});
