import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { config } from './config';
import { hashPassword } from './password';
import { computeStockState } from '../shared/stock';
import type { AdminProduct, PublicProduct, PublicSettings, AdminSettings, PublicCategory, AdminCategory, StockState } from '../shared/types';

export const dbPath = path.join(config.dataDir, 'silima.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const nowSql = `(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL DEFAULT 'Administrateur',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','editor')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT ${nowSql},
      updated_at TEXT NOT NULL DEFAULT ${nowSql},
      last_login_at TEXT,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT ${nowSql},
      expires_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT ${nowSql},
      updated_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      reference TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      short_description TEXT,
      description TEXT,
      price INTEGER,
      price_note TEXT,
      currency TEXT,
      sizes TEXT NOT NULL DEFAULT '[]',
      options TEXT NOT NULL DEFAULT '[]',
      fabric TEXT,
      care TEXT,
      track_stock INTEGER NOT NULL DEFAULT 0,
      stock_qty INTEGER,
      low_stock_threshold INTEGER,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      allow_enquiry_when_out_of_stock INTEGER NOT NULL DEFAULT 1,
      meta_title TEXT,
      meta_description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${nowSql},
      updated_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base TEXT NOT NULL UNIQUE,
      original_name TEXT,
      width INTEGER,
      height INTEGER,
      byte_size INTEGER,
      uploaded_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      base TEXT NOT NULL,
      alt TEXT,
      width INTEGER,
      height INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('retail','wholesale')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      business_name TEXT,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_label TEXT,
      quantity INTEGER,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
      admin_note TEXT,
      source TEXT NOT NULL DEFAULT 'website',
      ip_hash TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT ${nowSql},
      updated_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT ${nowSql}
    );

    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_featured);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, type);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
}

// ---------------------------------------------------------------------------
// Paramètres
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Record<string, string> = {
  business_name: 'Silima Shop',
  logo_url: '',
  whatsapp_number: '',
  phone: '',
  email: '',
  location: "Adjamé, Abidjan — Côte d'Ivoire",
  service_areas: '',
  opening_hours: '',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  hero_title: 'De beaux draps pour votre maison.',
  hero_subtitle:
    "Découvrez les parures Jimmy disponibles chez Silima Shop. Parcourez les modèles, puis écrivez-nous sur WhatsApp : nous vous confirmons le prix et la disponibilité, pour un achat au détail comme en gros.",
  currency: 'XOF',
  delivery_info: '',
  low_stock_threshold: '3',
  seo_default_description:
    "Silima Shop, à Adjamé (Abidjan) : draps de lit Jimmy, housses de couette et rideaux. Vente au détail et en gros. Renseignez-vous sur WhatsApp.",
  seo_site_url: '',
  seo_og_image: '',
};

export function seedSettings(): void {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, value);
  });
  tx();
}

export function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : (DEFAULT_SETTINGS[key] ?? '');
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function saveSettings(values: Record<string, string>): void {
  const stmt = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')'
  );
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(values)) stmt.run(key, value);
  });
  tx();
}

function toSocial(s: Record<string, string>) {
  return { facebook: s.social_facebook || '', instagram: s.social_instagram || '', tiktok: s.social_tiktok || '' };
}

export function getPublicSettings(): PublicSettings {
  const s = getAllSettings();
  const effectiveDemo = config.demoMode;
  return {
    businessName: s.business_name || 'Silima Shop',
    logoUrl: s.logo_url || null,
    whatsappNumber: s.whatsapp_number || '',
    phone: s.phone || '',
    email: s.email || '',
    location: s.location || '',
    serviceAreas: s.service_areas || '',
    openingHours: s.opening_hours || '',
    social: toSocial(s),
    heroTitle: s.hero_title,
    heroSubtitle: s.hero_subtitle,
    currency: (s.currency || 'XOF').toUpperCase(),
    deliveryInfo: s.delivery_info || '',
    lowStockThreshold: Number(s.low_stock_threshold) || 3,
    seoDefaultDescription: s.seo_default_description || '',
    siteUrl: (config.siteUrl || s.seo_site_url || '').replace(/\/$/, ''),
    demoMode: effectiveDemo,
  };
}

export function getAdminSettings(): AdminSettings {
  const s = getAllSettings();
  return {
    ...getPublicSettings(),
    seoOgImage: s.seo_og_image || null,
  };
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function uniqueSlug(table: 'products' | 'categories', base: string, ignoreId?: number): string {
  const root = slugify(base) || 'element';
  let candidate = root;
  let i = 2;
  const stmt = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);
  while (true) {
    const row = stmt.get(candidate) as { id: number } | undefined;
    if (!row || (ignoreId && row.id === ignoreId)) return candidate;
    candidate = `${root}-${i++}`;
    if (i > 500) return `${root}-${crypto.randomBytes(3).toString('hex')}`;
  }
}

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function parseOptions(raw: unknown): { label: string; values: string[] }[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((o) => o && typeof o.label === 'string' && Array.isArray(o.values))
      .map((o) => ({ label: String(o.label), values: (o.values as unknown[]).map(String) }));
  } catch {
    return [];
  }
}

const productSelect = `
  SELECT p.*, c.id AS category_id_join, c.slug AS category_slug, c.name AS category_name, c.is_active AS category_active
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

interface ProductRow {
  id: number;
  slug: string;
  name: string;
  reference: string | null;
  category_id: number | null;
  short_description: string | null;
  description: string | null;
  price: number | null;
  price_note: string | null;
  currency: string | null;
  sizes: string;
  options: string;
  fabric: string | null;
  care: string | null;
  track_stock: number;
  stock_qty: number | null;
  low_stock_threshold: number | null;
  is_available: number;
  is_featured: number;
  is_active: number;
  is_demo: number;
  allow_enquiry_when_out_of_stock: number;
  meta_title: string | null;
  meta_description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category_slug: string | null;
  category_name: string | null;
  category_active: number | null;
}

function imagesFor(productIds: number[]): Map<number, { id: number; base: string; alt: string | null; width: number | null; height: number | null; isPrimary: boolean }[]> {
  const map = new Map<number, { id: number; base: string; alt: string | null; width: number | null; height: number | null; isPrimary: boolean }[]>();
  if (productIds.length === 0) return map;
  const placeholders = productIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, product_id, base, alt, width, height, is_primary FROM product_images
       WHERE product_id IN (${placeholders}) ORDER BY is_primary DESC, sort_order ASC, id ASC`
    )
    .all(...productIds) as { id: number; product_id: number; base: string; alt: string | null; width: number | null; height: number | null; is_primary: number }[];
  for (const r of rows) {
    const list = map.get(r.product_id) ?? [];
    list.push({ id: r.id, base: r.base, alt: r.alt, width: r.width, height: r.height, isPrimary: !!r.is_primary });
    map.set(r.product_id, list);
  }
  return map;
}

/** Un produit n'est public que s'il est actif ET rattaché à une catégorie active (ou sans catégorie). */
export function isPubliclyVisible(row: { is_active: number; category_slug: string | null; category_active: number | null }): boolean {
  if (!row.is_active) return false;
  if (row.category_slug !== null && row.category_active === 0) return false;
  return true;
}

export function stockStateOf(row: { is_available: number; track_stock: number; stock_qty: number | null; low_stock_threshold: number | null }): StockState {
  return computeStockState({
    isAvailable: !!row.is_available,
    trackStock: !!row.track_stock,
    stockQty: row.stock_qty,
    lowStockThreshold: row.low_stock_threshold,
    globalThreshold: Number(getSetting('low_stock_threshold')) || 3,
  });
}

function baseProduct(row: ProductRow, imgs: { id: number; base: string; alt: string | null; width: number | null; height: number | null; isPrimary: boolean }[]) {
  const category = row.category_id && row.category_slug
    ? { id: row.category_id, slug: row.category_slug, name: row.category_name ?? '' }
    : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    reference: row.reference,
    category,
    shortDescription: row.short_description,
    description: row.description,
    price: row.price,
    priceNote: row.price_note,
    sizes: parseJsonArray(row.sizes),
    options: parseOptions(row.options),
    fabric: row.fabric,
    care: row.care,
    stockState: stockStateOf(row),
    allowEnquiryWhenOutOfStock: !!row.allow_enquiry_when_out_of_stock,
    isFeatured: !!row.is_featured,
    isDemo: !!row.is_demo,
    images: imgs.map((i) => ({ id: i.id, path: `/media/${i.base}`, alt: i.alt, width: i.width, height: i.height, isPrimary: i.isPrimary })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPublicProduct(row: ProductRow, imgs: ReturnType<typeof imagesFor> extends Map<number, infer V> ? V : never): PublicProduct {
  return baseProduct(row, imgs);
}

export function mapAdminProduct(row: ProductRow, imgs: ReturnType<typeof imagesFor> extends Map<number, infer V> ? V : never): AdminProduct {
  return {
    ...baseProduct(row, imgs),
    categoryId: row.category_id,
    trackStock: !!row.track_stock,
    stockQty: row.stock_qty,
    lowStockThreshold: row.low_stock_threshold,
    isAvailable: !!row.is_available,
    isActive: !!row.is_active,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    sortOrder: row.sort_order,
  };
}

export interface ProductQuery {
  q?: string;
  categorySlug?: string;
  featuredOnly?: boolean;
  includeHidden?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'name' | 'price-asc' | 'price-desc' | 'manual';
  availability?: 'all' | 'available' | 'out';
}

export function queryProducts(opts: ProductQuery = {}): { rows: ProductRow[]; total: number } {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (!opts.includeHidden) {
    where.push('p.is_active = 1');
    where.push('(p.category_id IS NULL OR c.is_active = 1)');
  }
  if (opts.featuredOnly) where.push('p.is_featured = 1');
  if (opts.categorySlug) {
    where.push('c.slug = ?');
    params.push(opts.categorySlug);
  }
  if (opts.q && opts.q.trim()) {
    const like = `%${opts.q.trim().toLowerCase()}%`;
    where.push('(lower(p.name) LIKE ? OR lower(coalesce(p.reference,\'\')) LIKE ? OR lower(coalesce(p.short_description,\'\')) LIKE ? OR lower(coalesce(p.description,\'\')) LIKE ?)');
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = (() => {
    switch (opts.sort) {
      case 'name':
        return 'ORDER BY p.name COLLATE NOCASE ASC';
      case 'price-asc':
        return 'ORDER BY (p.price IS NULL), p.price ASC';
      case 'price-desc':
        return 'ORDER BY (p.price IS NULL), p.price DESC';
      case 'manual':
        return 'ORDER BY p.sort_order ASC, p.created_at DESC';
      default:
        return 'ORDER BY p.is_featured DESC, p.created_at DESC';
    }
  })();
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const rows = db
    .prepare(`${productSelect} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as ProductRow[];
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS n FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`)
    .get(...params) as { n: number };
  return { rows, total: totalRow.n };
}

export function hydrateProducts<T extends 'public' | 'admin'>(rows: ProductRow[], mode: T): T extends 'public' ? PublicProduct[] : AdminProduct[] {
  const imgs = imagesFor(rows.map((r) => r.id));
  const out = rows.map((r) => {
    const list = imgs.get(r.id) ?? [];
    return mode === 'public' ? mapPublicProduct(r, list) : mapAdminProduct(r, list);
  });
  return out as never;
}

export function getProductBySlug(slug: string, includeHidden = false): { product: PublicProduct | AdminProduct; row: ProductRow } | null {
  const row = db.prepare(`${productSelect} WHERE p.slug = ?`).get(slug) as ProductRow | undefined;
  if (!row) return null;
  if (!includeHidden && !isPubliclyVisible(row)) return null;
  const imgs = imagesFor([row.id]).get(row.id) ?? [];
  return includeHidden
    ? { product: mapAdminProduct(row, imgs), row }
    : { product: mapPublicProduct(row, imgs), row };
}

export function getProductById(id: number): { product: AdminProduct; row: ProductRow } | null {
  const row = db.prepare(`${productSelect} WHERE p.id = ?`).get(id) as ProductRow | undefined;
  if (!row) return null;
  const imgs = imagesFor([row.id]).get(row.id) ?? [];
  return { product: mapAdminProduct(row, imgs), row };
}

export function listCategories(includeHidden = false): (PublicCategory | AdminCategory)[] {
  const rows = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id ${includeHidden ? '' : 'AND p.is_active = 1'}) AS product_count
       FROM categories c ${includeHidden ? '' : 'WHERE c.is_active = 1'} ORDER BY c.sort_order ASC, c.name COLLATE NOCASE ASC`
    )
    .all() as { id: number; slug: string; name: string; description: string | null; sort_order: number; is_active: number; product_count: number }[];
  return rows.map((r) =>
    includeHidden
      ? { id: r.id, slug: r.slug, name: r.name, description: r.description, sortOrder: r.sort_order, isActive: !!r.is_active, productCount: r.product_count }
      : { id: r.id, slug: r.slug, name: r.name, description: r.description, productCount: r.product_count }
  );
}

export function deleteUnusedMedia(bases: string[]): void {
  if (!bases.length) return;
  for (const base of bases) {
    const stillUsed = db.prepare('SELECT 1 FROM product_images WHERE base = ? LIMIT 1').get(base);
    if (stillUsed) continue;
    const isLogo = db.prepare('SELECT 1 FROM settings WHERE key = \'logo_url\' AND value = ?').get(`/media/${base}-960.webp`);
    if (isLogo) continue;
    for (const size of [480, 960, 1600]) {
      const p = path.join(config.uploadsDir, `${base}-${size}.webp`);
      if (fs.existsSync(p)) fs.rmSync(p, { force: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Amorce (compte administrateur, catégories, démonstration)
// ---------------------------------------------------------------------------

export function ensureAdminUser(): { created: boolean; email: string; password?: string } {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get() as { n: number };
  if (count.n > 0) return { created: false, email: config.adminEmail };
  const email = config.adminEmail || 'admin@silimashop.ci';
  const password = config.adminPassword || crypto.randomBytes(12).toString('base64url').replace(/[-_]/g, 'x');
  const hash = hashPassword(password);
  db.prepare('INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(email, config.adminName, hash, 'admin');
  // Les identifiants initiaux ne sont jamais envoyés au navigateur : fichier serveur uniquement.
  const credFile = path.join(config.dataDir, 'admin-credentials.txt');
  if (!config.adminPassword) {
    fs.writeFileSync(
      credFile,
      `Identifiants administrateur initiaux — Silima Shop\n\nEmail : ${email}\nMot de passe : ${password}\n\n` +
        `Conservez ce fichier en lieu sûr puis supprimez-le.\nChangez le mot de passe depuis /admin/parametres après la première connexion.\n`,
      { mode: 0o600 }
    );
  }
  return { created: true, email, password };
}

export function seedCategories(): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get() as { n: number };
  if (count.n > 0) return;
  const insert = db.prepare('INSERT INTO categories (slug, name, description, sort_order) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => {
    insert.run('draps-de-lit', 'Draps de lit', 'Parures, draps housses et draps plats Jimmy.', 1);
    insert.run('housses-de-couette', 'Housses de couette', 'Housses de couette et parures assorties.', 2);
    insert.run('rideaux', 'Rideaux', 'Rideaux et voilages pour la maison.', 3);
    insert.run('autres-articles-textiles', 'Autres articles textiles', 'Taies, protège-matelas et autres articles textiles.', 4);
  });
  tx();
}
