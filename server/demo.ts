import fs from 'node:fs';
import path from 'node:path';
import { db } from './db';
import { config } from './config';

interface ManifestEntry {
  base: string;
  alt: string;
  width: number;
  height: number;
}

interface DemoProduct {
  name: string;
  reference: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  price: number | null;
  priceNote: string | null;
  sizes: string[];
  images: string[];
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    name: 'Parure Jimmy « Confort » — blanc cassé',
    reference: 'DEMO-001',
    categorySlug: 'draps-de-lit',
    shortDescription: 'Parure de lit unie, coloris blanc cassé. Photo et description de démonstration.',
    description:
      "Exemple de fiche produit destiné à la démonstration du site. La parure comprend un drap et des taies d'oreiller assorties ; les tailles réellement disponibles doivent être confirmées par Silima Shop. Aucune composition de tissu n'est indiquée ici : elle sera ajoutée par l'administrateur.",
    price: 18500,
    priceNote: null,
    sizes: ['1 place (90×190)', '2 places (140×190)', '2 places (160×200)'],
    images: ['sheets-offwhite', 'sheets-sand'],
    trackStock: true,
    stockQty: 14,
    lowStockThreshold: 5,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    name: 'Parure Jimmy « Côtier » — imprimé bleu',
    reference: 'DEMO-002',
    categorySlug: 'draps-de-lit',
    shortDescription: 'Parure imprimée à motif bleu. Contenu de démonstration.',
    description:
      "Exemple de fiche produit : parure à motif bleu présentée pour illustrer le catalogue. Les dimensions, le contenu de la parure et la composition du tissu sont à confirmer avec Silima Shop avant commande.",
    price: 21000,
    priceNote: null,
    sizes: ['2 places (140×190)', '2 places (160×200)'],
    images: ['sheets-blue', 'pillows'],
    trackStock: true,
    stockQty: 4,
    lowStockThreshold: 5,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    name: 'Drap housse Jimmy — uni',
    reference: 'DEMO-003',
    categorySlug: 'draps-de-lit',
    shortDescription: 'Drap housse seul. Prix communiqué sur demande.',
    description:
      "Exemple de fiche produit sans prix affiché : dans ce cas, le site indique « Prix sur demande » et invite le client à écrire sur WhatsApp. Cette fiche montre comment l'administrateur peut choisir de ne pas publier de prix.",
    price: null,
    priceNote: null,
    sizes: ['1 place (90×190)', '2 places (140×190)', '2 places (160×200)'],
    images: ['bed-made', 'texture-white'],
    trackStock: false,
    stockQty: null,
    lowStockThreshold: null,
    isAvailable: true,
    isFeatured: false,
    sortOrder: 3,
  },
  {
    name: 'Housse de couette Jimmy — lin naturel',
    reference: 'DEMO-004',
    categorySlug: 'housses-de-couette',
    shortDescription: 'Housse de couette coloris naturel, avec taies assorties (démonstration).',
    description:
      "Fiche de démonstration pour la catégorie Housses de couette. L'administrateur renseignera ici la description réelle, les dimensions disponibles et, si elle est confirmée, la composition du tissu.",
    price: 24500,
    priceNote: null,
    sizes: ['2 places (200×200)', '2 places (220×240)'],
    images: ['duvet-white', 'duvet-linen'],
    trackStock: true,
    stockQty: 9,
    lowStockThreshold: 4,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 4,
  },
  {
    name: 'Housse de couette « Sable »',
    reference: 'DEMO-005',
    categorySlug: 'housses-de-couette',
    shortDescription: 'Housse de couette coloris sable. Produit de démonstration en rupture.',
    description:
      "Cet exemple illustre l'affichage « Rupture de stock » : la commande directe est désactivée et le client peut uniquement manifester son intérêt. Stock à ajuster par l'administrateur.",
    price: 26000,
    priceNote: null,
    sizes: ['2 places (200×200)'],
    images: ['sheets-sand'],
    trackStock: true,
    stockQty: 0,
    lowStockThreshold: 3,
    isAvailable: true,
    isFeatured: false,
    sortOrder: 5,
  },
  {
    name: 'Rideau Jimmy « Lin clair » — la paire',
    reference: 'DEMO-006',
    categorySlug: 'rideaux',
    shortDescription: 'Paire de rideaux en coloris lin clair (photo de démonstration).',
    description:
      "Fiche de démonstration pour la catégorie Rideaux. Les dimensions, le système de fixation et le degré d'occultation doivent être renseignés par l'administrateur.",
    price: 15000,
    priceNote: null,
    sizes: ['140 × 260 cm', '200 × 260 cm', 'Sur mesure (nous consulter)'],
    images: ['curtain-linen', 'curtain-sun'],
    trackStock: false,
    stockQty: null,
    lowStockThreshold: null,
    isAvailable: true,
    isFeatured: true,
    sortOrder: 6,
  },
  {
    name: 'Rideau occultant « Terre »',
    reference: 'DEMO-007',
    categorySlug: 'rideaux',
    shortDescription: 'Rideau coloris terre cuite. Produit de démonstration.',
    description:
      "Exemple destiné à montrer l'affichage « Stock limité » : la commande reste possible, avec confirmation du prix et de la disponibilité par Silima Shop.",
    price: 19500,
    priceNote: null,
    sizes: ['140 × 260 cm', '200 × 260 cm'],
    images: ['curtain-drape'],
    trackStock: true,
    stockQty: 2,
    lowStockThreshold: 3,
    isAvailable: true,
    isFeatured: false,
    sortOrder: 7,
  },
  {
    name: "Taies d'oreiller Jimmy — lot de 2",
    reference: 'DEMO-008',
    categorySlug: 'autres-articles-textiles',
    shortDescription: "Lot de deux taies d'oreiller. Article de démonstration.",
    description:
      "Fiche de démonstration pour la catégorie Autres articles textiles. L'administrateur remplacera ce texte par les informations réelles du produit.",
    price: 6000,
    priceNote: null,
    sizes: ['50 × 70 cm'],
    images: ['texture-linen', 'pillows'],
    trackStock: false,
    stockQty: null,
    lowStockThreshold: null,
    isAvailable: true,
    isFeatured: false,
    sortOrder: 8,
  },
  {
    name: 'Parure Jimmy « Soleil couchant »',
    reference: 'DEMO-009',
    categorySlug: 'draps-de-lit',
    shortDescription: 'Parure de démonstration marquée indisponible par l’administrateur.',
    description:
      "Cet exemple montre un produit que l'administrateur a marqué indisponible : il reste visible sur le site mais la commande directe est désactivée. Utile pour préparer un réassort.",
    price: 22000,
    priceNote: null,
    sizes: ['2 places (140×190)'],
    images: ['bed-sunrise', 'linen-room'],
    trackStock: true,
    stockQty: 6,
    lowStockThreshold: 3,
    isAvailable: false,
    isFeatured: false,
    sortOrder: 9,
  },
];

export function seedDemoProducts(): number {
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get() as { n: number };
  if (count.n > 0) return 0;

  const manifestPath = path.join(config.dataDir, 'seed-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn('[demo] manifeste d’images absent : exécutez « npm run seed:images » pour générer les visuels de démonstration.');
    return 0;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, ManifestEntry>;
  const categories = db.prepare('SELECT id, slug FROM categories').all() as { id: number; slug: string }[];
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const insertProduct = db.prepare(
    `INSERT INTO products (slug, name, reference, category_id, short_description, description, price, price_note, currency,
      sizes, options, track_stock, stock_qty, low_stock_threshold, is_available, is_featured, is_active, is_demo,
      allow_enquiry_when_out_of_stock, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'XOF', ?, '[]', ?, ?, ?, ?, ?, 1, 1, 1, ?)`
  );
  const insertImage = db.prepare(
    'INSERT INTO product_images (product_id, base, alt, width, height, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  let inserted = 0;
  const tx = db.transaction(() => {
    for (const p of DEMO_PRODUCTS) {
      const slug = p.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
      const exists = db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug);
      if (exists) continue;
      const info = insertProduct.run(
        slug,
        p.name,
        p.reference,
        categoryBySlug.get(p.categorySlug) ?? null,
        p.shortDescription,
        p.description,
        p.price,
        p.priceNote,
        JSON.stringify(p.sizes),
        p.trackStock ? 1 : 0,
        p.stockQty,
        p.lowStockThreshold,
        p.isAvailable ? 1 : 0,
        p.isFeatured ? 1 : 0,
        p.sortOrder
      );
      const productId = Number(info.lastInsertRowid);
      let order = 0;
      for (const imageKey of p.images) {
        const entry = manifest[imageKey];
        if (!entry) continue;
        insertImage.run(productId, entry.base, entry.alt, entry.width, entry.height, order, order === 0 ? 1 : 0);
        order += 1;
      }
      inserted += 1;
    }
  });
  tx();
  if (inserted > 0) console.info(`[demo] ${inserted} produits de démonstration créés (identifiés comme tels dans l'administration).`);
  return inserted;
}
