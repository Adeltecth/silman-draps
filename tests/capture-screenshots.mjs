/**
 * Génère les captures d'écran de présentation (docs/captures).
 * Prérequis : serveur démarré avec les données de démonstration.
 * Usage : npm run captures
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.join(process.cwd(), 'docs', 'captures');
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const envValue = (key) => {
  const fromFile = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return process.env[key] ?? (fromFile ? fromFile[1].trim() : '');
};

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 });
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const d = await desktop.newPage();
const m = await mobile.newPage();

async function capture(page, url, name, { fullPage = true, wait = 700 } = {}) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log('capture', name);
}

await capture(d, '/', '01-accueil-desktop');
await capture(m, '/', '02-accueil-mobile', { fullPage: false });
await capture(d, '/produits', '03-catalogue-desktop');
await capture(m, '/produits', '04-catalogue-mobile', { fullPage: false });
const product = (await (await fetch(BASE + '/api/public/products?limit=1&featured=1')).json()).products[0];
if (product) {
  await capture(d, `/produits/${product.slug}`, '05-fiche-produit-desktop');
  await capture(m, `/produits/${product.slug}`, '06-fiche-produit-mobile', { fullPage: false });
}
await capture(d, '/gros', '07-vente-en-gros-desktop');
await capture(m, '/contact', '08-contact-mobile', { fullPage: false });
await capture(d, '/a-propos', '09-a-propos-desktop');

// Administration
await d.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
await d.screenshot({ path: path.join(OUT, '10-admin-connexion.png') });
await d.locator('#field-login-email').fill(envValue('ADMIN_EMAIL'));
await d.locator('#field-login-password').fill(envValue('ADMIN_PASSWORD'));
await d.getByRole('button', { name: /Se connecter/i }).click();
await d.getByRole('heading', { name: 'Tableau de bord' }).waitFor();
await d.waitForTimeout(800);
await d.screenshot({ path: path.join(OUT, '11-admin-tableau-de-bord.png'), fullPage: true });
await capture(d, '/admin/produits', '12-admin-produits');
await capture(d, '/admin/produits/nouveau', '13-admin-fiche-produit');
await capture(d, '/admin/demandes', '14-admin-demandes');
await capture(d, '/admin/parametres', '15-admin-parametres');

await m.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
await m.locator('#field-login-email').fill(envValue('ADMIN_EMAIL'));
await m.locator('#field-login-password').fill(envValue('ADMIN_PASSWORD'));
await m.getByRole('button', { name: /Se connecter/i }).click();
await m.getByRole('heading', { name: 'Tableau de bord' }).waitFor();
await m.waitForTimeout(700);
await m.screenshot({ path: path.join(OUT, '16-admin-mobile.png'), fullPage: false });

await browser.close();
console.log(`\nCaptures enregistrées dans ${path.relative(process.cwd(), OUT)}/`);
