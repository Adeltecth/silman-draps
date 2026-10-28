/**
 * Tests d'intégration de l'API Silima Shop (serveur réellement démarré).
 *
 * Prérequis : le serveur doit tourner (npm start) et la base contenir les données de démo.
 * Usage : npm run test:api
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const envValue = (key) => {
  const fromFile = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return process.env[key] ?? (fromFile ? fromFile[1].trim() : '');
};
const ADMIN_EMAIL = envValue('ADMIN_EMAIL');
const ADMIN_PASSWORD = envValue('ADMIN_PASSWORD');
const IMAGE = path.join(process.cwd(), 'assets-source', 'folded.jpg');

let cookie = '';
let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`  ✗ ${name}\n      ${error.message}`);
  }
}

async function request(pathname, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.cookie = cookie;
  if (options.admin && options.method && options.method !== 'GET') headers['x-silima-csrf'] = '1';
  const res = await fetch(`${BASE}${pathname}`, { ...options, headers, redirect: 'manual' });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body, headers: res.headers };
}

async function json(pathname, { method = 'GET', body, admin = false } = {}) {
  return request(pathname, {
    method,
    admin,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

console.log(`\nSilima Shop — tests d'intégration (${BASE})\n`);

let publicProducts = [];
let createdId = null;
let uploadedPath = null;
let enquiryId = null;
const testRef = `TEST-${Date.now().toString(36).toUpperCase()}`;

await check('Le serveur répond et expose /api/health', async () => {
  const { status, body } = await json('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

await check('Paramètres publics accessibles sans exposition de données privées', async () => {
  const { status, body } = await json('/api/public/settings');
  assert.equal(status, 200);
  assert.ok(body.businessName);
  assert.equal(body.adminPassword, undefined);
  assert.equal(body.seoOgImage, undefined);
});

await check('Le catalogue public ne renvoie que des produits publiés', async () => {
  const { status, body } = await json('/api/public/products?limit=50');
  assert.equal(status, 200);
  assert.ok(body.products.length > 0, 'Aucun produit de démonstration trouvé — lancez npm run seed:images puis redémarrez');
  publicProducts = body.products;
  for (const p of body.products) {
    assert.equal(typeof p.stockQty, 'undefined', 'La quantité exacte ne doit pas être exposée publiquement');
    assert.ok(['disponible', 'limite', 'rupture', 'indisponible'].includes(p.stockState));
  }
});

await check('Recherche plein texte et filtre par catégorie', async () => {
  const search = await json('/api/public/products?q=rideau');
  assert.ok(search.body.total >= 1);
  assert.ok(search.body.products.every((p) => /rideau/i.test(p.name)));

  const cat = await json('/api/public/products?categorie=draps-de-lit');
  assert.ok(cat.body.total >= 1);
  assert.ok(cat.body.products.every((p) => p.category?.slug === 'draps-de-lit'));

  const empty = await json('/api/public/products?q=zzzz-introuvable');
  assert.equal(empty.body.total, 0);
});

await check("Un visiteur non authentifié ne peut pas accéder à l'administration", async () => {
  const stats = await json('/api/admin/stats');
  assert.equal(stats.status, 401);
  const enquiries = await json('/api/admin/enquiries');
  assert.equal(enquiries.status, 401);
  const settings = await json('/api/admin/settings');
  assert.equal(settings.status, 401);
});

await check('La connexion administrateur refuse un mauvais mot de passe', async () => {
  const res = await json('/api/admin/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: 'mauvais-mot-de-passe' } });
  assert.equal(res.status, 401);
  assert.match(res.body.error, /incorrect/i);
});

await check('La connexion administrateur valide ouvre une session', async () => {
  assert.ok(ADMIN_PASSWORD, 'ADMIN_PASSWORD absent du fichier .env');
  const res = await json('/api/admin/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.user?.email);
  const me = await json('/api/admin/auth/me');
  assert.equal(me.status, 200);
});

await check("Une requête d'écriture sans en-tête CSRF est refusée", async () => {
  const res = await request('/api/admin/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sans CSRF' }),
  });
  assert.equal(res.status, 403);
});

await check('Upload d’image : validation du type réel et génération des variantes', async () => {
  const buffer = fs.readFileSync(IMAGE);
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/jpeg' }), 'photo-test.jpg');
  const res = await request('/api/admin/uploads', { method: 'POST', admin: true, body: form });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.body.asset.path, /^\/media\/[a-z0-9]+$/);
  uploadedPath = res.body.asset.path;

  for (const size of [480, 960, 1600]) {
    const media = await fetch(`${BASE}${res.body.asset.urls[`${size === 480 ? 'small' : size === 960 ? 'medium' : 'large'}`]}`);
    assert.equal(media.status, 200, `Variante ${size} introuvable`);
  }

  const bad = new FormData();
  bad.append('image', new Blob([Buffer.from('pas une image')], { type: 'image/jpeg' }), 'faux.jpg');
  const rejected = await request('/api/admin/uploads', { method: 'POST', admin: true, body: bad });
  assert.equal(rejected.status, 400);
});

await check('Création d’un produit par l’administrateur', async () => {
  const res = await json('/api/admin/products', {
    method: 'POST',
    admin: true,
    body: {
      name: `Parure de test ${testRef}`,
      reference: testRef,
      categoryId: publicProducts.find((p) => p.category)?.category?.id ?? null,
      shortDescription: 'Produit créé par le test automatisé.',
      description: 'Description de test.',
      price: 12345,
      sizes: ['2 places (140×190)'],
      trackStock: true,
      stockQty: 7,
      lowStockThreshold: 3,
      isAvailable: true,
      isFeatured: false,
      isActive: true,
      images: [{ path: uploadedPath, alt: 'Photo de test', isPrimary: true }],
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.product.reference, testRef);
  assert.equal(res.body.product.stockState, 'disponible');
  createdId = res.body.product.id;
});

await check('Le produit créé apparaît immédiatement dans le catalogue public', async () => {
  const list = await json('/api/public/products?limit=100');
  const found = list.body.products.find((p) => p.id === createdId);
  assert.ok(found, 'Produit absent du catalogue public');
  const detail = await json(`/api/public/products/${found.slug}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.product.price, 12345);
});

await check('Édition du produit et mise à jour du stock', async () => {
  const current = await json(`/api/admin/products/${createdId}`, { admin: true });
  const p = current.body.product;
  const updated = await json(`/api/admin/products/${createdId}`, {
    method: 'PUT',
    admin: true,
    body: {
      name: p.name,
      reference: p.reference,
      categoryId: p.categoryId,
      shortDescription: 'Description modifiée par le test.',
      description: p.description,
      price: 13000,
      sizes: p.sizes,
      options: p.options,
      trackStock: true,
      stockQty: 2,
      lowStockThreshold: 3,
      isAvailable: true,
      isFeatured: false,
      isActive: true,
      allowEnquiryWhenOutOfStock: true,
      images: p.images.map((img, i) => ({ path: img.path, alt: img.alt, isPrimary: img.isPrimary, sortOrder: i })),
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.product.price, 13000);
  assert.equal(updated.body.product.stockState, 'limite');

  const stock = await json(`/api/admin/products/${createdId}/stock`, { method: 'PATCH', admin: true, body: { trackStock: true, stockQty: 0 } });
  assert.equal(stock.status, 200);
  assert.equal(stock.body.product.stockState, 'rupture');

  const publicDetail = await json(`/api/public/products/${updated.body.product.slug}`);
  assert.equal(publicDetail.body.product.stockState, 'rupture');
});

await check('Un produit marqué indisponible ne peut pas être commandé', async () => {
  const res = await json(`/api/admin/products/${createdId}/status`, { method: 'PATCH', admin: true, body: { isAvailable: false } });
  assert.equal(res.status, 200);
  assert.equal(res.body.product.stockState, 'indisponible');
  const p = res.body.product;
  assert.equal(p.allowEnquiryWhenOutOfStock, true);
});

await check('Un produit masqué disparaît du site public et renvoie 404', async () => {
  const current = await json(`/api/admin/products/${createdId}`, { admin: true });
  const slug = current.body.product.slug;
  const hidden = await json(`/api/admin/products/${createdId}/status`, { method: 'PATCH', admin: true, body: { isActive: false } });
  assert.equal(hidden.status, 200);

  const list = await json('/api/public/products?limit=100');
  assert.ok(!list.body.products.some((p) => p.id === createdId), 'Produit masqué encore visible');
  const detail = await json(`/api/public/products/${slug}`);
  assert.equal(detail.status, 404);

  const headers = await request(`/produits/${slug}`);
  assert.equal(headers.status, 200);
  assert.match(headers.body, /noindex/, 'La page produit masquée doit être en noindex');
});

await check('Les messages WhatsApp contiennent produit, référence, quantité et lien', async () => {
  const { normaliseWhatsAppNumber, buildWhatsAppLink, productEnquiryMessage, wholesaleWhatsAppMessage } = await import('../dist-server/shared/whatsapp.js');
  assert.equal(normaliseWhatsAppNumber('').ok, false);
  assert.equal(normaliseWhatsAppNumber('07 00 00 00 00').ok, false, 'Un numéro local ne doit pas produire de lien');
  assert.equal(buildWhatsAppLink('', 'test'), null);

  const link = buildWhatsAppLink('+225 07 12 34 56 78', 'Bonjour');
  assert.ok(link.startsWith('https://wa.me/2250712345678?text='));

  const message = productEnquiryMessage({
    businessName: 'Silima Shop',
    productName: 'Parure Jimmy Test',
    reference: 'JM-140',
    quantity: 3,
    url: 'https://silimashop.ci/produits/parure-jimmy-test',
    priceKnown: false,
  });
  assert.match(message, /Parure Jimmy Test/);
  assert.match(message, /référence JM-140/);
  assert.match(message, /Quantité souhaitée : 3/);
  assert.match(message, /Prix et la disponibilité|prix et la disponibilité/);
  assert.match(message, /https:\/\/silimashop\.ci\/produits\/parure-jimmy-test/);

  const wholesale = wholesaleWhatsAppMessage('Silima Shop', 'Parure Jimmy Test', 50);
  assert.match(wholesale, /prix de gros/);
  assert.match(wholesale, /quantités minimums/);
  assert.match(wholesale, /disponibilité/);
});

await check('Une demande du formulaire est enregistrée et visible par l’administrateur', async () => {
  const res = await json('/api/public/enquiries', {
    method: 'POST',
    body: {
      type: 'wholesale',
      name: 'Test Revendeur',
      phone: '+225 07 99 88 77 66',
      businessName: 'Boutique Test',
      productLabel: 'Parure de test',
      quantity: 24,
      message: 'Demande générée par le test automatisé.',
      website: '',
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.body.reference, /^SS-\d{5}$/);

  const list = await json('/api/admin/enquiries?q=Test Revendeur', { admin: true });
  assert.equal(list.status, 200);
  const found = list.body.enquiries.find((e) => e.phone === '+225 07 99 88 77 66');
  assert.ok(found, 'Demande absente de l’administration');
  assert.equal(found.status, 'new');
  enquiryId = found.id;

  const updated = await json(`/api/admin/enquiries/${enquiryId}`, { method: 'PATCH', admin: true, body: { status: 'contacted', adminNote: 'Contacté par téléphone.' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.enquiry.status, 'contacted');
  assert.equal(updated.body.enquiry.adminNote, 'Contacté par téléphone.');
});

await check('Les formulaires invalides renvoient des erreurs de champ', async () => {
  const res = await json('/api/public/enquiries', { method: 'POST', body: { type: 'retail', name: 'A', phone: '12' } });
  assert.equal(res.status, 422);
  assert.ok(res.body.fields.name);
  assert.ok(res.body.fields.phone);
});

await check('Un produit lié à une demande supprimée ne casse pas l’administration', async () => {
  const res = await json(`/api/admin/products/${createdId}`, { method: 'DELETE', admin: true });
  assert.equal(res.status, 200);
  const list = await json('/api/admin/enquiries', { admin: true });
  assert.equal(list.status, 200);
});

await check('Déconnexion : la session n’est plus valide', async () => {
  const res = await json('/api/admin/auth/logout', { method: 'POST', admin: true });
  assert.equal(res.status, 200);
  const stats = await json('/api/admin/stats');
  assert.equal(stats.status, 401);
});

await check('sitemap.xml, robots.txt et métadonnées produit', async () => {
  const robots = await request('/robots.txt');
  assert.match(robots.body, /Disallow: \/admin/);
  assert.match(robots.body, /Sitemap:/);

  const sitemap = await request('/sitemap.xml');
  assert.match(sitemap.body, /<urlset/);
  assert.match(sitemap.body, /\/produits\//);

  const product = publicProducts.find((p) => p.price !== null && !p.isDemo) || publicProducts[0];
  const page = await request(`/produits/${product.slug}`);
  assert.equal(page.status, 200);
  assert.match(page.body, /<title>/);
  assert.match(page.body, /rel="canonical"/);
  assert.match(page.body, /og:title/);
});

console.log(`\n${passed} test(s) réussi(s), ${failures.length} échec(s).`);
if (failures.length > 0) {
  console.log('\nDétail des échecs :');
  for (const f of failures) console.log(`- ${f.name} : ${f.error.message}`);
  process.exit(1);
}
