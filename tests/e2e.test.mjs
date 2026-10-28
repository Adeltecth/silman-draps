/**
 * Test de bout en bout du parcours client et du parcours administrateur,
 * exécuté dans un vrai navigateur (Chromium via Playwright).
 *
 * Prérequis : serveur démarré, base contenant les données de démonstration,
 * et Playwright installé (npx playwright install chromium).
 *
 * Usage :
 *   npm run test:e2e
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR || path.join(process.cwd(), 'docs', 'captures', 'e2e');
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const envValue = (key) => {
  const fromFile = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return process.env[key] ?? (fromFile ? fromFile[1].trim() : '');
};

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await mobile.newPage();
  const admin = await desktop.newPage();
  const adminMobile = await mobile.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`client: ${e.message}`));
  admin.on('pageerror', (e) => consoleErrors.push(`admin: ${e.message}`));

  const uniqueRef = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const productName = `Parure E2E ${uniqueRef}`;

  await step('Accueil : titre, CTA et produits mis en avant', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('h1');
    assert.match(await page.title(), /Silima Shop/);
    assert.ok(await page.getByRole('link', { name: /Découvrir nos produits/i }).isVisible());
    assert.ok(await page.getByRole('link', { name: /Acheter en gros/i }).first().isVisible());
    const cards = await page.locator('article').count();
    assert.ok(cards >= 1, 'Aucune carte produit sur la page d’accueil');
    await page.screenshot({ path: path.join(SHOTS, '01-accueil-mobile.png'), fullPage: true });
  });

  await step('Bandeau de démonstration visible et masquable', async () => {
    const banner = page.getByTestId('demo-banner');
    assert.ok(await banner.isVisible());
    await page.getByRole('button', { name: /Masquer le bandeau/i }).click();
    await banner.waitFor({ state: 'detached', timeout: 5000 });
  });

  await step('Catalogue : recherche et filtre par catégorie', async () => {
    await page.goto(BASE + '/produits', { waitUntil: 'networkidle' });
    const initial = await page.locator('article').count();
    assert.ok(initial > 1);

    await page.getByPlaceholder(/Rechercher/i).fill('rideau');
    await page.waitForTimeout(1200);
    assert.match(page.url(), /q=rideau/);
    const filtered = await page.locator('article').count();
    assert.ok(filtered >= 1 && filtered < initial, `Recherche inefficace (${filtered}/${initial})`);

    await page.getByPlaceholder(/Rechercher/i).fill('');
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Housses de couette/i }).click();
    await page.waitForTimeout(700);
    assert.match(page.url(), /categorie=housses-de-couette/);
    const count = await page.locator('article').count();
    assert.ok(count >= 1);
    await page.screenshot({ path: path.join(SHOTS, '02-catalogue-mobile.png'), fullPage: true });
  });

  await step('Fiche produit : galerie, quantité et lien WhatsApp pré-rempli', async () => {
    await page.goto(BASE + '/produits', { waitUntil: 'networkidle' });
    await page.locator('article').first().getByRole('link', { name: /Voir le produit/i }).click();
    await page.waitForSelector('h1');
    await page.getByRole('button', { name: /Augmenter la quantité/i }).click();
    await page.getByRole('button', { name: /Augmenter la quantité/i }).click();
    const qty = await page.getByLabel(/Quantité souhaitée/i).inputValue();
    assert.equal(qty, '3');

    const cta = page.getByTestId('product-whatsapp').or(page.getByTestId('product-sticky-whatsapp')).first();
    const href = await cta.getAttribute('href');
    if (href) {
      assert.match(href, /^https:\/\/wa\.me\/\d+\?text=/);
      const message = decodeURIComponent(href.split('text=')[1]);
      assert.match(message, /Silima Shop/);
      assert.match(message, /Quantité souhaitée : 3/);
      assert.match(message, /https?:\/\//, 'Le lien du produit doit être inclus');
    } else {
      // Numéro non configuré : le bouton doit expliquer la configuration manquante.
      await cta.click();
      await page.getByText(/numéro WhatsApp de la boutique n’est pas encore configuré/i).waitFor();
    }
    await page.screenshot({ path: path.join(SHOTS, '03-produit-mobile.png'), fullPage: true });
  });

  await step('Formulaire de contact : validation puis enregistrement réel', async () => {
    await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
    await page.locator('#field-name').fill('Client Test E2E');
    await page.locator('#field-phone').fill('07 01 02 03 04');
    await page.locator('#field-message').fill('Message envoyé par le test E2E.');
    const submit = page.getByRole('button', { name: /Envoyer ma demande/i });
    await submit.click();
    await page.getByText(/Demande enregistrée/i).waitFor({ timeout: 10000 });
    const reference = await page.getByText(/SS-\d{5}/).first().innerText();
    assert.match(reference, /SS-\d{5}/);
    await page.screenshot({ path: path.join(SHOTS, '04-contact-confirmation.png'), fullPage: true });
  });

  await step('Formulaire invalide : messages d’erreur affichés', async () => {
    await page.goto(BASE + '/contact', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Envoyer ma demande/i }).click();
    await page.getByText(/Merci d’indiquer votre nom/i).waitFor();
    await page.getByText(/Indiquez un numéro joignable/i).waitFor();
  });

  await step('Page gros : formulaire de demande professionnelle', async () => {
    await page.goto(BASE + '/gros', { waitUntil: 'networkidle' });
    await page.locator('#field-name').fill('Revendeur E2E');
    await page.locator('#field-businessName').fill('Boutique E2E');
    await page.locator('#field-phone').fill('+225 05 44 33 22 11');
    await page.locator('#field-quantity').fill('48');
    await page.getByRole('button', { name: /Envoyer ma demande/i }).click();
    await page.getByText(/Demande enregistrée/i).waitFor({ timeout: 10000 });
    await page.screenshot({ path: path.join(SHOTS, '05-gros-confirmation.png'), fullPage: true });
  });

  await step('Administration : accès refusé sans connexion', async () => {
    await admin.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await admin.waitForURL(/\/admin\/login/);
    await admin.locator('#field-login-email').waitFor();
    await admin.screenshot({ path: path.join(SHOTS, '06-admin-connexion.png') });
  });

  await step('Administration : connexion sécurisée', async () => {
    const email = envValue('ADMIN_EMAIL');
    const password = envValue('ADMIN_PASSWORD');
    assert.ok(email && password, 'Identifiants absents du fichier .env');
    await admin.locator('#field-login-email').fill(email);
    await admin.locator('#field-login-password').fill('mot-de-passe-incorrect');
    await admin.getByRole('button', { name: /Se connecter/i }).click();
    await admin.getByText(/E-mail ou mot de passe incorrect/i).waitFor();

    await admin.locator('#field-login-password').fill(password);
    await admin.getByRole('button', { name: /Se connecter/i }).click();
    await admin.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 10000 });
    await admin.screenshot({ path: path.join(SHOTS, '07-admin-tableau-de-bord.png'), fullPage: true });
  });

  await step('Administration mobile : tableau de bord utilisable sur téléphone', async () => {
    const email = envValue('ADMIN_EMAIL');
    const password = envValue('ADMIN_PASSWORD');
    await adminMobile.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await adminMobile.locator('#field-login-email').fill(email);
    await adminMobile.locator('#field-login-password').fill(password);
    await adminMobile.getByRole('button', { name: /Se connecter/i }).click();
    await adminMobile.getByRole('heading', { name: 'Tableau de bord' }).waitFor({ timeout: 10000 });
    await adminMobile.screenshot({ path: path.join(SHOTS, '08-admin-mobile.png'), fullPage: true });
  });

  await step('Administration : création d’un produit avec photo uploadée', async () => {
    await admin.goto(BASE + '/admin/produits/nouveau', { waitUntil: 'networkidle' });
    await admin.locator('#product-name').fill(productName);
    await admin.locator('#product-reference').fill(uniqueRef);
    await admin.locator('#product-category').selectOption({ label: 'Draps de lit' });
    await admin.locator('#product-price').fill('27500');
    await admin.locator('#product-short').fill('Produit créé par le test de bout en bout.');
    await admin.getByRole('switch', { name: /Suivre le stock/i }).click();
    await admin.locator('#product-stock').fill('12');

    const fileInput = admin.locator('#product-images');
    await fileInput.setInputFiles(path.join(process.cwd(), 'assets-source', 'folded.jpg'));
    await admin.locator('img[src*="/media/"]').first().waitFor({ timeout: 20000 });

    await admin.getByRole('button', { name: /Publier le produit/i }).click();
    await admin.getByText(/a été enregistré/i).waitFor({ timeout: 10000 });
    await admin.screenshot({ path: path.join(SHOTS, '09-admin-produits.png'), fullPage: true });
  });

  await step('Le nouveau produit apparaît publiquement avec sa photo', async () => {
    await page.goto(BASE + '/produits?q=' + encodeURIComponent(uniqueRef), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const card = page.locator('article').filter({ hasText: uniqueRef }).first();
    await card.waitFor({ timeout: 10000 });
    const img = card.locator('img').first();
    const src = await img.getAttribute('src');
    assert.match(src, /\/media\//, 'La photo uploadée doit être servie depuis /media');
    await card.getByRole('link', { name: /Voir le produit/i }).click();
    await page.getByRole('heading', { name: productName }).waitFor();
    await page.screenshot({ path: path.join(SHOTS, '10-produit-cree.png'), fullPage: true });
  });

  await step('Modification du produit et mise à jour du stock', async () => {
    await admin.goto(BASE + '/admin/produits?q=' + encodeURIComponent(uniqueRef), { waitUntil: 'networkidle' });
    await admin.getByRole('link', { name: /Modifier/i }).first().click();
    await admin.locator('#product-name').waitFor();
    await admin.locator('#product-stock').fill('1');
    await admin.getByRole('button', { name: /Enregistrer les modifications/i }).click();
    await admin.getByText(/a été enregistré/i).waitFor({ timeout: 10000 });

    await page.goto(BASE + '/produits?q=' + encodeURIComponent(uniqueRef), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const badge = await page.locator('article').filter({ hasText: uniqueRef }).first().getByText(/Stock limité/i);
    assert.ok(await badge.isVisible(), 'Le statut « Stock limité » devrait être affiché');
  });

  await step('Produit masqué : disparaît du catalogue public', async () => {
    await admin.goto(BASE + '/admin/produits?q=' + encodeURIComponent(uniqueRef), { waitUntil: 'networkidle' });
    const row = admin.locator('table tbody tr').filter({ hasText: uniqueRef }).first();
    const visibleRow = (await row.count()) > 0 ? row : admin.locator('li').filter({ hasText: uniqueRef }).first();
    await visibleRow.getByRole('switch', { name: /Publié/i }).click();
    await admin.waitForTimeout(1200);
    await page.goto(BASE + '/produits?q=' + encodeURIComponent(uniqueRef), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    assert.equal(await page.locator('article').count(), 0, 'Un produit masqué ne doit pas être visible');
  });

  await step('Les demandes du site sont visibles et modifiables dans l’administration', async () => {
    await admin.goto(BASE + '/admin/demandes', { waitUntil: 'networkidle' });
    const item = admin.locator('li').filter({ hasText: 'Client Test E2E' }).first();
    await item.waitFor({ timeout: 10000 });
    await item.getByRole('button', { name: /Détails/i }).click();
    await item.locator('select').first().selectOption('contacted');
    await admin.getByText(/Demande mise à jour/i).waitFor({ timeout: 10000 });
    await admin.screenshot({ path: path.join(SHOTS, '11-admin-demandes.png'), fullPage: true });
  });

  await step('Paramètres : enregistrement du numéro WhatsApp et répercussion publique', async () => {
    await admin.goto(BASE + '/admin/parametres', { waitUntil: 'networkidle' });
    await admin.locator('#s-whatsapp').fill('+225 07 00 11 22 33');
    await admin.locator('#s-phone').fill('+225 27 20 00 00 00');
    await admin.getByRole('button', { name: /Enregistrer les paramètres/i }).click();
    await admin.getByText(/Paramètres enregistrés/i).waitFor({ timeout: 10000 });

    await page.goto(BASE + '/produits', { waitUntil: 'networkidle' });
    const waLink = page.locator('a[href^="https://wa.me/2250700112233"]:visible').first();
    await waLink.waitFor({ timeout: 10000 });
    const href = await waLink.getAttribute('href');
    assert.match(decodeURIComponent(href), /Silima Shop/);
    await page.screenshot({ path: path.join(SHOTS, '12-catalogue-whatsapp.png'), fullPage: true });
  });

  await step('Le site public ne montre aucune donnée d’administration', async () => {
    await page.goto(BASE + '/produits', { waitUntil: 'networkidle' });
    const html = await page.content();
    assert.ok(!/stockQty|adminNote|password/i.test(html), 'Données internes détectées dans le HTML public');
  });

  await step('Aucune erreur JavaScript pendant le parcours', async () => {
    assert.equal(consoleErrors.length, 0, consoleErrors.join(' | '));
  });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} test(s) réussi(s), ${failed.length} échec(s).`);
  if (failed.length > 0) process.exit(1);
})().catch((error) => {
  console.error('Erreur fatale :', error);
  process.exit(1);
});
