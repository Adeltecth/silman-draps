import { Router } from 'express';
import { db, getPublicSettings, hydrateProducts, getProductBySlug, isPubliclyVisible, listCategories, queryProducts } from '../db';
import { config, hashIp } from '../config';
import { rateLimit } from '../auth';
import { enquirySchema } from '../schemas';
import { bodyOf } from '../http';

export const publicRouter = Router();

const badRequest = (res: Parameters<typeof publicRouter.get>[1] extends never ? never : any, fields: Record<string, string>) =>
  res.status(422).json({ error: 'Merci de vérifier les champs du formulaire.', fields });

publicRouter.get('/settings', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(getPublicSettings());
});

publicRouter.get('/categories', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ categories: listCategories(false) });
});

publicRouter.get('/products', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '';
  const category = typeof req.query.categorie === 'string' ? req.query.categorie.slice(0, 80) : '';
  const sortParam = typeof req.query.tri === 'string' ? req.query.tri : 'recent';
  const sort = (['recent', 'name', 'price-asc', 'price-desc'] as const).includes(sortParam as never) ? (sortParam as 'recent') : 'recent';
  const limit = Number(req.query.limit) || 60;
  const offset = Number(req.query.offset) || 0;
  const featuredOnly = req.query.featured === '1';
  const { rows, total } = queryProducts({ q, categorySlug: category || undefined, featuredOnly, limit, offset, sort });
  res.set('Cache-Control', 'no-store');
  res.json({ products: hydrateProducts(rows, 'public'), total, categories: listCategories(false) });
});

publicRouter.get('/products/:slug', (req, res) => {
  const found = getProductBySlug(req.params.slug, false);
  if (!found) {
    res.status(404).json({ error: 'Produit introuvable ou non disponible.' });
    return;
  }
  const product = found.product;
  let related: unknown[] = [];
  if (product.category) {
    const rows = queryProducts({ categorySlug: product.category.slug, limit: 5 }).rows.filter((r) => r.id !== product.id).slice(0, 4);
    related = hydrateProducts(rows, 'public');
  }
  res.set('Cache-Control', 'no-store');
  res.json({ product, related });
});

publicRouter.get('/home', (_req, res) => {
  const featured = queryProducts({ featuredOnly: true, limit: 8 }).rows;
  const latest = queryProducts({ limit: 4 }).rows;
  const totalRow = db.prepare('SELECT COUNT(*) AS n FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.is_active = 1 AND (p.category_id IS NULL OR c.is_active = 1)').get() as { n: number };
  res.set('Cache-Control', 'no-store');
  res.json({
    featured: hydrateProducts(featured, 'public'),
    latest: hydrateProducts(featured.length > 0 ? [] : latest, 'public'),
    categories: listCategories(false),
    totalProducts: totalRow.n,
  });
});

publicRouter.post('/enquiries', (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (!rateLimit(`enquiry:${hashIp(ip)}`, config.enquiryRateLimit, 10 * 60 * 1000)) {
    res.status(429).json({ error: "Trop de demandes envoyées en peu de temps. Merci de réessayer dans quelques minutes ou de nous écrire sur WhatsApp." });
    return;
  }

  const parsed = enquirySchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fields[key]) fields[key] = issue.message;
    }
    res.status(422).json({ error: 'Merci de vérifier les champs indiqués.', fields });
    return;
  }

  const data = parsed.data;
  if (data.website && data.website.trim() !== '') {
    res.status(400).json({ error: 'Demande invalide.' });
    return;
  }

  let productLabel = data.productLabel ?? null;
  let productId: number | null = null;
  if (data.productId) {
    const row = db
      .prepare(
        'SELECT p.id, p.name, p.reference, p.is_active, c.slug AS category_slug, c.is_active AS category_active FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?'
      )
      .get(data.productId) as { id: number; name: string; reference: string | null; is_active: number; category_slug: string | null; category_active: number | null } | undefined;
    if (row && isPubliclyVisible(row)) {
      productId = row.id;
      productLabel = row.reference ? `${row.name} (réf. ${row.reference})` : row.name;
    }
  }

  const info = db
    .prepare(
      `INSERT INTO enquiries (type, name, phone, email, business_name, product_id, product_label, quantity, message, status, source, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'website', ?, ?)`
    )
    .run(
      data.type,
      data.name,
      data.phone,
      data.email || null,
      data.businessName || null,
      productId,
      productLabel,
      data.quantity ?? null,
      data.message || null,
      hashIp(ip),
      String(req.headers['user-agent'] ?? '').slice(0, 250)
    );

  const id = Number(info.lastInsertRowid);
  console.info(`[enquiry] nouvelle demande #${id} (${data.type}) enregistrée`);
  res.status(201).json({
    ok: true,
    id,
    reference: `SS-${String(id).padStart(5, '0')}`,
    message:
      "Votre demande a bien été enregistrée. Elle n'est pas encore une commande : Silima Shop vous contacte pour confirmer le prix, la disponibilité et les modalités.",
  });
});
