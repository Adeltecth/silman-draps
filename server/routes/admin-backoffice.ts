import { Router } from 'express';
import { db, getAdminSettings, saveSettings, getSetting } from '../db';
import { requireAdmin, csrfGuard } from '../auth';
import { enquiryUpdateSchema, settingsSchema } from '../schemas';
import { bodyOf, str } from '../http';
import type { Enquiry } from '../../shared/types';

export const adminBackofficeRouter = Router();
adminBackofficeRouter.use(requireAdmin, csrfGuard);

function mapEnquiry(row: Record<string, unknown>): Enquiry {
  return {
    id: row.id as number,
    type: row.type as Enquiry['type'],
    name: row.name as string,
    phone: row.phone as string,
    email: (row.email as string) ?? null,
    businessName: (row.business_name as string) ?? null,
    productId: (row.product_id as number) ?? null,
    productLabel: (row.product_label as string) ?? null,
    quantity: (row.quantity as number) ?? null,
    message: (row.message as string) ?? null,
    status: row.status as Enquiry['status'],
    adminNote: (row.admin_note as string) ?? null,
    source: row.source as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

adminBackofficeRouter.get('/enquiries', (req, res) => {
  const status = str(req.query.statut, 20);
  const type = str(req.query.type, 20);
  const q = str(req.query.q, 120);
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (['new', 'contacted', 'converted', 'closed'].includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (['retail', 'wholesale'].includes(type)) {
    where.push('type = ?');
    params.push(type);
  }
  if (q) {
    const like = `%${q.toLowerCase()}%`;
    where.push(
      "(lower(name) LIKE ? OR lower(phone) LIKE ? OR lower(coalesce(email,'')) LIKE ? OR lower(coalesce(business_name,'')) LIKE ? OR lower(coalesce(product_label,'')) LIKE ? OR lower(coalesce(message,'')) LIKE ?)"
    );
    params.push(like, like, like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM enquiries ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset) as Record<string, unknown>[];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM enquiries ${whereSql}`).get(...params) as { n: number };
  const counts = db.prepare('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status').all() as { status: string; n: number }[];
  res.json({
    enquiries: rows.map(mapEnquiry),
    total: total.n,
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
  });
});

adminBackofficeRouter.get('/enquiries/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(Number(req.params.id)) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }
  res.json({ enquiry: mapEnquiry(row) });
});

adminBackofficeRouter.patch('/enquiries/:id', (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM enquiries WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }
  const parsed = enquiryUpdateSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides.' });
    return;
  }
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (parsed.data.status) {
    sets.push('status = ?');
    params.push(parsed.data.status);
  }
  if (parsed.data.adminNote !== undefined) {
    sets.push('admin_note = ?');
    params.push(parsed.data.adminNote || null);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: 'Aucune modification fournie.' });
    return;
  }
  sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  db.prepare(`UPDATE enquiries SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
  const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id) as Record<string, unknown>;
  res.json({ enquiry: mapEnquiry(row) });
});

adminBackofficeRouter.delete('/enquiries/:id', (req, res) => {
  const info = db.prepare('DELETE FROM enquiries WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) {
    res.status(404).json({ error: 'Demande introuvable.' });
    return;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Paramètres

adminBackofficeRouter.get('/settings', (_req, res) => {
  res.json({ settings: getAdminSettings() });
});

adminBackofficeRouter.put('/settings', (req, res) => {
  const parsed = settingsSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'form'] ??= issue.message;
    res.status(422).json({ error: 'Merci de corriger les champs signalés.', fields });
    return;
  }
  const data = parsed.data;
  const values: Record<string, string> = {
    business_name: data.business_name,
    whatsapp_number: data.whatsapp_number,
    phone: data.phone,
    email: data.email,
    location: data.location,
    service_areas: data.service_areas,
    opening_hours: data.opening_hours,
    social_facebook: data.social_facebook,
    social_instagram: data.social_instagram,
    social_tiktok: data.social_tiktok,
    hero_title: data.hero_title,
    hero_subtitle: data.hero_subtitle,
    currency: data.currency,
    delivery_info: data.delivery_info,
    low_stock_threshold: String(data.low_stock_threshold),
    seo_default_description: data.seo_default_description,
    seo_site_url: data.seo_site_url,
    seo_og_image: data.seo_og_image,
    logo_url: data.logo_url,
  };
  saveSettings(values);
  console.info(`[admin] paramètres mis à jour par ${req.admin?.email}`);
  res.json({ settings: getAdminSettings() });
});

// ---------------------------------------------------------------- Tableau de bord

adminBackofficeRouter.get('/stats', (_req, res) => {
  const productCounts = db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS hidden,
        SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) AS demo,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) AS featured,
        SUM(CASE WHEN is_available = 0 OR (track_stock = 1 AND coalesce(stock_qty,0) <= 0) THEN 1 ELSE 0 END) AS out_of_stock
       FROM products`
    )
    .get() as Record<string, number | null>;

  const threshold = Number(getSetting('low_stock_threshold')) || 3;
  const lowStock = db
    .prepare(
      `SELECT id, name, stock_qty, coalesce(low_stock_threshold, ?) AS threshold FROM products
       WHERE track_stock = 1 AND is_active = 1 AND coalesce(stock_qty,0) > 0 AND coalesce(stock_qty,0) <= coalesce(low_stock_threshold, ?)
       ORDER BY stock_qty ASC LIMIT 5`
    )
    .all(threshold, threshold) as { id: number; name: string; stock_qty: number; threshold: number }[];

  const enquiryCounts = db.prepare('SELECT status, COUNT(*) AS n FROM enquiries GROUP BY status').all() as { status: string; n: number }[];
  const byStatus: Record<string, number> = { new: 0, contacted: 0, converted: 0, closed: 0 };
  for (const c of enquiryCounts) byStatus[c.status] = c.n;
  const totalEnquiries = enquiryCounts.reduce((sum, c) => sum + c.n, 0);
  const typeCounts = db.prepare('SELECT type, COUNT(*) AS n FROM enquiries GROUP BY type').all() as { type: string; n: number }[];
  const byType: Record<string, number> = { retail: 0, wholesale: 0 };
  for (const c of typeCounts) byType[c.type] = c.n;

  const recent = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5').all() as Record<string, unknown>[];
  const last7 = db.prepare("SELECT COUNT(*) AS n FROM enquiries WHERE created_at >= datetime('now','-7 days')").get() as { n: number };

  const settings = getAdminSettings();
  res.json({
    products: {
      total: productCounts.total ?? 0,
      active: productCounts.active ?? 0,
      hidden: productCounts.hidden ?? 0,
      featured: productCounts.featured ?? 0,
      outOfStock: productCounts.out_of_stock ?? 0,
      demo: productCounts.demo ?? 0,
      lowStock,
    },
    enquiries: { total: totalEnquiries, ...byStatus, ...byType, last7days: last7.n, recent: recent.map(mapEnquiry) },
    config: {
      whatsappMissing: !settings.whatsappNumber,
      phoneMissing: !settings.phone,
      emailMissing: !settings.email,
      locationMissing: !settings.location,
      openingHoursMissing: !settings.openingHours,
      deliveryInfoMissing: !settings.deliveryInfo,
      demoProducts: (productCounts.demo ?? 0) > 0,
      demoMode: settings.demoMode,
    },
  });
});
