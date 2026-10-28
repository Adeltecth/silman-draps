import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { shopWhatsAppLink, productEnquiryMessage } from '../shared/whatsapp';
import { productImageFallback } from '../shared/images';
import { catalogueAssets } from '../scripts/netlify-assets';

const message = productEnquiryMessage({ businessName: 'Silima Shop', productName: 'Drap été & coton', priceKnown: true, price: '12 000 F CFA', details: 'Bleu · 240 × 260 cm', quantity: 2 });
const url = new URL(shopWhatsAppLink(message));
assert.equal(url.origin + url.pathname, 'https://wa.me/2250788880307');
assert.equal(url.searchParams.get('text'), message);
assert.match(message, /Prix : 12 000 F CFA/);
assert.match(message, /Design\/Taille : Bleu · 240 × 260 cm/);
assert.match(message, /Pouvez-vous confirmer sa disponibilité/);
assert.match(productEnquiryMessage({ businessName: 'Silima Shop', productName: 'Drap', priceKnown: false }), /Prix sur demande/);
const removed: string[] = [];
const image = { dataset: {} as { fallback?: string }, src: '/missing', removeAttribute: (name: string) => { removed.push(name); } };
productImageFallback({ currentTarget: image });
productImageFallback({ currentTarget: image });
assert.equal(image.src, '/images/product-unavailable.svg');
assert.deepEqual(removed, ['srcset']);
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'silima-assets-'));
try {
  const plugin = catalogueAssets() as any;
  plugin.configResolved({ root: process.cwd(), build: { outDir: output } });
  await plugin.closeBundle();
  const manifest = JSON.parse(await fs.readFile('data/seed-manifest.json', 'utf8'));
  for (const { base } of Object.values(manifest) as { base: string }[]) {
    for (const size of [480, 960, 1600]) assert.ok((await fs.stat(path.join(output, 'media', `${base}-${size}.webp`))).size > 0);
  }
  for (const name of await fs.readdir('data/uploads')) {
    assert.deepEqual(await fs.readFile(path.join(output, 'media', name)), await fs.readFile(path.join('data/uploads', name)));
  }
  assert.match(await fs.readFile(path.join(output, '_redirects'), 'utf8'), /\/\* \/index.html 200/);
  console.log('PASS: official WhatsApp destination, encoded French message, price, selections, image fallback, all 45 manifest variants and original upload bytes.');
} finally { await fs.rm(output, { recursive: true, force: true }); }
