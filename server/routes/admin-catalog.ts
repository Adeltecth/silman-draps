import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db, getProductById, getProductBySlug, hydrateProducts, isPubliclyVisible, listCategories, queryProducts, uniqueSlug, deleteUnusedMedia, getSetting } from '../db';
import { requireAdmin, csrfGuard } from '../auth';
import { categorySchema, productSchema, quickStatusSchema, stockUpdateSchema } from '../schemas';
import { storeImage, mediaExists } from '../uploads';
import { bodyOf, str } from '../http';
import { config } from '../config';
import type { AdminProduct } from '../../shared/types';

export const adminCatalogRouter = Router();
adminCatalogRouter.use(requireAdmin, csrfGuard);

// ---------------------------------------------------------------- Produits

adminCatalogRouter.get('/products', (req, res) => {
  const q = str(req.query.q, 120);
  const status = str(req.query.status, 20) || 'all';
  const categoryId = Number(req.query.categorie) || undefined;
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const offset = Number(req.query.offset) || 0;

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    where.push("(lower(p.name) LIKE ? OR lower(coalesce(p.reference,'')) LIKE ?)");
    params.push(like, like);
  }
  if (categoryId) {
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  if (status === 'active') where.push('p.is_active = 1');
  if (status === 'hidden') where.push('p.is_active = 0');
  if (status === 'featured') where.push('p.is_featured = 1');
  if (status === 'demo') where.push('p.is_demo = 1');
  if (status === 'out') {
    where.push('(p.is_available = 0 OR (p.track_stock = 1 AND coalesce(p.stock_qty,0) <= 0))');
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT p.*, c.id AS category_id_join, c.slug AS category_slug, c.name AS category_name, c.is_active AS category_active
       FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}
       ORDER BY p.is_active DESC, p.updated_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS n FROM products p ${whereSql}`).get(...params) as { n: number };
  res.json({ products: hydrateProducts(rows as never, 'admin'), total: total.n });
});

adminCatalogRouter.get('/products/:id', (req, res) => {
  const found = getProductById(Number(req.params.id));
  if (!found) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  res.json({ product: found.product });
});

function normaliseImages(images: { path: string; alt?: string; isPrimary?: boolean; sortOrder?: number }[] | undefined) {
  if (!images) return [];
  const prepared = images.map((img, index) => ({
    base: img.path.replace('/media/', ''),
    alt: img.alt?.trim() || null,
    sortOrder: img.sortOrder ?? index,
    isPrimary: !!img.isPrimary,
  }));
  if (prepared.length > 0 && !prepared.some((p) => p.isPrimary)) prepared[0].isPrimary = true;
  const primaryIndex = prepared.findIndex((p) => p.isPrimary);
  prepared.forEach((p, i) => (p.isPrimary = i === primaryIndex));
  return prepared;
}

function saveImages(productId: number, images: ReturnType<typeof normaliseImages>) {
  const existing = db.prepare('SELECT base FROM product_images WHERE product_id = ?').all(productId) as { base: string }[];
  db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
  const insert = db.prepare(
    'INSERT INTO product_images (product_id, base, alt, width, height, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const img of images) {
    const media = db.prepare('SELECT width, height FROM media WHERE base = ?').get(img.base) as { width: number | null; height: number | null } | undefined;
    insert.run(productId, img.base, img.alt, media?.width ?? null, media?.height ?? null, img.sortOrder, img.isPrimary ? 1 : 0);
  }
  const removed = existing.map((e) => e.base).filter((b) => !images.some((i) => i.base === b));
  deleteUnusedMedia(removed);
}

adminCatalogRouter.post('/products', (req, res) => {
  const parsed = productSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'form'] ??= issue.message;
    res.status(422).json({ error: 'Merci de corriger les champs signalés.', fields });
    return;
  }
  const data = parsed.data;
  if (data.categoryId) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(data.categoryId);
    if (!cat) {
      res.status(422).json({ error: 'Catégorie inconnue.', fields: { categoryId: 'Choisissez une catégorie existante.' } });
      return;
    }
  }
  const images = normaliseImages(data.images);
  for (const img of images) {
    if (!mediaExists(img.base)) {
      res.status(422).json({ error: "Une image n'existe plus dans le stockage. Rechargez la photo.", fields: { images: 'Image introuvable.' } });
      return;
    }
  }
  const slug = uniqueSlug('products', data.name);
  const info = db
    .prepare(
      `INSERT INTO products (slug, name, reference, category_id, short_description, description, price, price_note, currency,
        sizes, options, fabric, care, track_stock, stock_qty, low_stock_threshold, is_available, is_featured, is_active,
        allow_enquiry_when_out_of_stock, meta_title, meta_description, sort_order)
       VALUES (@slug, @name, @reference, @categoryId, @shortDescription, @description, @price, @priceNote, @currency,
        @sizes, @options, @fabric, @care, @trackStock, @stockQty, @lowStockThreshold, @isAvailable, @isFeatured, @isActive,
        @allowEnquiryWhenOutOfStock, @metaTitle, @metaDescription, @sortOrder)`
    )
    .run({
      slug,
      name: data.name,
      reference: data.reference || null,
      categoryId: data.categoryId ?? null,
      shortDescription: data.shortDescription || null,
      description: data.description || null,
      price: data.price ?? null,
      priceNote: data.priceNote || null,
      currency: getSetting('currency') || 'XOF',
      sizes: JSON.stringify(data.sizes ?? []),
      options: JSON.stringify(data.options ?? []),
      fabric: data.fabric || null,
      care: data.care || null,
      trackStock: data.trackStock ? 1 : 0,
      stockQty: data.stockQty ?? null,
      lowStockThreshold: data.lowStockThreshold ?? null,
      isAvailable: data.isAvailable === false ? 0 : 1,
      isFeatured: data.isFeatured ? 1 : 0,
      isActive: data.isActive === false ? 0 : 1,
      allowEnquiryWhenOutOfStock: data.allowEnquiryWhenOutOfStock === false ? 0 : 1,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      sortOrder: data.sortOrder ?? 0,
    });
  const id = Number(info.lastInsertRowid);
  saveImages(id, images);
  const created = getProductById(id)!;
  console.info(`[admin] produit #${id} créé par ${req.admin?.email}`);
  res.status(201).json({ product: created.product });
});

adminCatalogRouter.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getProductById(id);
  if (!existing) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const parsed = productSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'form'] ??= issue.message;
    res.status(422).json({ error: 'Merci de corriger les champs signalés.', fields });
    return;
  }
  const data = parsed.data;
  if (data.categoryId) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(data.categoryId);
    if (!cat) {
      res.status(422).json({ error: 'Catégorie inconnue.', fields: { categoryId: 'Choisissez une catégorie existante.' } });
      return;
    }
  }
  const images = normaliseImages(data.images);
  for (const img of images) {
    if (!mediaExists(img.base)) {
      res.status(422).json({ error: "Une image n'existe plus dans le stockage. Rechargez la photo.", fields: { images: 'Image introuvable.' } });
      return;
    }
  }
  db.prepare(
    `UPDATE products SET name=@name, reference=@reference, category_id=@categoryId, short_description=@shortDescription,
      description=@description, price=@price, price_note=@priceNote, sizes=@sizes, options=@options, fabric=@fabric, care=@care,
      track_stock=@trackStock, stock_qty=@stockQty, low_stock_threshold=@lowStockThreshold, is_available=@isAvailable,
      is_featured=@isFeatured, is_active=@isActive, allow_enquiry_when_out_of_stock=@allowEnquiryWhenOutOfStock,
      meta_title=@metaTitle, meta_description=@metaDescription, sort_order=@sortOrder,
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=@id`
  ).run({
    id,
    name: data.name,
    reference: data.reference || null,
    categoryId: data.categoryId ?? null,
    shortDescription: data.shortDescription || null,
    description: data.description || null,
    price: data.price ?? null,
    priceNote: data.priceNote || null,
    sizes: JSON.stringify(data.sizes ?? []),
    options: JSON.stringify(data.options ?? []),
    fabric: data.fabric || null,
    care: data.care || null,
    trackStock: data.trackStock ? 1 : 0,
    stockQty: data.stockQty ?? null,
    lowStockThreshold: data.lowStockThreshold ?? null,
    isAvailable: data.isAvailable === false ? 0 : 1,
    isFeatured: data.isFeatured ? 1 : 0,
    isActive: data.isActive === false ? 0 : 1,
    allowEnquiryWhenOutOfStock: data.allowEnquiryWhenOutOfStock === false ? 0 : 1,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    sortOrder: data.sortOrder ?? 0,
  });
  saveImages(id, images);
  const updated = getProductById(id)!;
  console.info(`[admin] produit #${id} modifié par ${req.admin?.email}`);
  res.json({ product: updated.product });
});

adminCatalogRouter.patch('/products/:id/status', (req, res) => {
  const id = Number(req.params.id);
  if (!getProductById(id)) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const parsed = quickStatusSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: 'Statut invalide.' });
    return;
  }
  const d = parsed.data;
  const sets: string[] = [];
  const params: (number | string)[] = [];
  if (d.isActive !== undefined) {
    sets.push('is_active = ?');
    params.push(d.isActive ? 1 : 0);
  }
  if (d.isFeatured !== undefined) {
    sets.push('is_featured = ?');
    params.push(d.isFeatured ? 1 : 0);
  }
  if (d.isAvailable !== undefined) {
    sets.push('is_available = ?');
    params.push(d.isAvailable ? 1 : 0);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: 'Aucun statut fourni.' });
    return;
  }
  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  res.json({ product: getProductById(id)!.product });
});

adminCatalogRouter.patch('/products/:id/stock', (req, res) => {
  const id = Number(req.params.id);
  if (!getProductById(id)) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const parsed = stockUpdateSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.issues[0]?.message ?? 'Stock invalide.' });
    return;
  }
  const d = parsed.data;
  db.prepare(
    "UPDATE products SET track_stock = ?, stock_qty = ?, low_stock_threshold = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ).run(d.trackStock ? 1 : 0, d.stockQty, d.lowStockThreshold ?? null, id);
  res.json({ product: getProductById(id)!.product });
});

adminCatalogRouter.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const found = getProductById(id);
  if (!found) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const bases = found.product.images.map((i) => i.path.replace('/media/', ''));
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  deleteUnusedMedia(bases);
  console.info(`[admin] produit #${id} supprimé par ${req.admin?.email}`);
  res.json({ ok: true });
});

// -------------------------------------------------------------- Catégories

adminCatalogRouter.get('/categories', (_req, res) => {
  res.json({ categories: listCategories(true) });
});

adminCatalogRouter.post('/categories', (req, res) => {
  const parsed = categorySchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.issues[0]?.message ?? 'Catégorie invalide.' });
    return;
  }
  const slug = uniqueSlug('categories', parsed.data.name);
  const info = db
    .prepare('INSERT INTO categories (slug, name, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?)')
    .run(slug, parsed.data.name, parsed.data.description || null, parsed.data.sortOrder ?? 0, parsed.data.isActive === false ? 0 : 1);
  res.status(201).json({ id: Number(info.lastInsertRowid), slug });
});

adminCatalogRouter.put('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Catégorie introuvable.' });
    return;
  }
  const parsed = categorySchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.issues[0]?.message ?? 'Catégorie invalide.' });
    return;
  }
  db.prepare("UPDATE categories SET name = ?, description = ?, sort_order = ?, is_active = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    parsed.data.name,
    parsed.data.description || null,
    parsed.data.sortOrder ?? 0,
    parsed.data.isActive === false ? 0 : 1,
    id
  );
  res.json({ ok: true });
});

adminCatalogRouter.delete('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const count = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').get(id) as { n: number };
  if (count.n > 0) {
    res.status(409).json({
      error: `Cette catégorie contient ${count.n} produit(s). Déplacez-les ou supprimez-les avant de supprimer la catégorie.`,
    });
    return;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ Images

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Format non pris en charge (JPG, PNG ou WebP uniquement).'));
  },
});

adminCatalogRouter.post('/uploads', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 'Image trop volumineuse (12 Mo maximum).' : err.message;
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier reçu.' });
      return;
    }
    try {
      const asset = await storeImage(req.file.buffer, req.file.originalname, req.admin?.id ?? null);
      res.status(201).json({ asset });
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500;
      console.error('[upload] échec:', (e as Error).message);
      res.status(status).json({ error: (e as Error).message || "L'image n'a pas pu être enregistrée." });
    }
  });
});

// ------------------------------------------------------- Outils de démo

adminCatalogRouter.post('/demo/remove', (req, res) => {
  const rows = db.prepare('SELECT id FROM products WHERE is_demo = 1').all() as { id: number }[];
  if (rows.length === 0) {
    res.json({ removed: 0 });
    return;
  }
  const bases: string[] = [];
  for (const r of rows) {
    const imgs = db.prepare('SELECT base FROM product_images WHERE product_id = ?').all(r.id) as { base: string }[];
    bases.push(...imgs.map((i) => i.base));
  }
  db.prepare('DELETE FROM products WHERE is_demo = 1').run();
  deleteUnusedMedia(bases);
  console.info(`[admin] ${rows.length} produits de démonstration supprimés par ${req.admin?.email}`);
  res.json({ removed: rows.length });
});

export const _internal = { normaliseImages, z, getProductBySlug, isPubliclyVisible, str, AdminProductType: null as unknown as AdminProduct };
