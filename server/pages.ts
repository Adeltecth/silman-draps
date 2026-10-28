import { getPublicSettings, queryProducts, getProductBySlug, isPubliclyVisible, listCategories } from './db';
import { config } from './config';
import { imageVariant } from '../shared/images';
import type { AdminProduct } from '../shared/types';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface HeadInput {
  baseUrl: string;
  path: string;
}

interface MetaResult {
  title: string;
  description: string;
  canonical: string;
  ogImage: string | null;
  ogType: 'website' | 'product' | 'article';
  robots: string;
  jsonLd: unknown[];
}

function trimDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : cut.length)}…`;
}

function organisationJsonLd(baseUrl: string) {
  const s = getPublicSettings();
  const organisation: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HomeGoodsStore',
    name: s.businessName,
    url: `${baseUrl}/`,
    description: s.seoDefaultDescription,
    areaServed: s.serviceAreas || 'Abidjan, Côte d\'Ivoire',
  };
  if (s.phone) organisation.telephone = s.phone;
  if (s.email) organisation.email = s.email;
  if (s.location) {
    organisation.address = {
      '@type': 'PostalAddress',
      addressLocality: s.location,
      addressCountry: 'CI',
    };
  }
  if (s.logoUrl) organisation.logo = s.logoUrl.startsWith('http') ? s.logoUrl : `${baseUrl}${s.logoUrl}`;
  if (s.openingHours) organisation.openingHours = s.openingHours;
  const sameAs = [s.social.facebook, s.social.instagram, s.social.tiktok].filter(Boolean);
  if (sameAs.length) organisation.sameAs = sameAs;
  return organisation;
}

function websiteJsonLd(baseUrl: string) {
  const s = getPublicSettings();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: s.businessName,
    url: `${baseUrl}/`,
    inLanguage: 'fr-CI',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/produits?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildMeta({ baseUrl, path }: HeadInput): MetaResult {
  const s = getPublicSettings();
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  const canonical = `${baseUrl}${cleanPath === '/' ? '/' : cleanPath}`;
  const ogImage = s.logoUrl
    ? `${baseUrl}${s.logoUrl}`
    : `${baseUrl}/og-default.jpg`;

  if (cleanPath.startsWith('/admin')) {
    return {
      title: `Administration — ${s.businessName}`,
      description: 'Espace de gestion privé.',
      canonical: `${baseUrl}/admin`,
      ogImage,
      ogType: 'website',
      robots: 'noindex, nofollow',
      jsonLd: [],
    };
  }

  if (cleanPath === '/') {
    return {
      title: `Draps Jimmy à Abidjan | ${s.businessName} — vente au détail et en gros`,
      description: trimDescription(s.seoDefaultDescription),
      canonical,
      ogImage,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: [organisationJsonLd(baseUrl), websiteJsonLd(baseUrl)],
    };
  }

  if (cleanPath === '/produits') {
    const cats = listCategories(false).filter((c) => c.productCount > 0).map((c) => c.name.toLowerCase());
    const desc = `Catalogue ${s.businessName} : ${cats.length ? cats.join(', ') : 'draps de lit, housses de couette et rideaux'} à Abidjan. Prix et disponibilité confirmés sur WhatsApp.`;
    return {
      title: `Nos produits — draps, housses de couette et rideaux | ${s.businessName}`,
      description: trimDescription(desc),
      canonical,
      ogImage,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: [
        organisationJsonLd(baseUrl),
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Nos produits', item: canonical },
          ],
        },
      ],
    };
  }

  if (cleanPath.startsWith('/produits/')) {
    const slug = decodeURIComponent(cleanPath.replace('/produits/', ''));
    const found = getProductBySlug(slug, true);
    if (!found || !isPubliclyVisible(found.row)) {
      return {
        title: `Produit introuvable | ${s.businessName}`,
        description: 'Ce produit n’est plus disponible dans le catalogue.',
        canonical,
        ogImage,
        ogType: 'website',
        robots: 'noindex, follow',
        jsonLd: [],
      };
    }
    const p = found.product as AdminProduct;
    const categoryName = p.category?.name ?? 'Textiles de maison';
    const descriptionSource =
      p.metaDescription || p.shortDescription || p.description || `${p.name} — ${categoryName} disponible chez ${s.businessName} à Abidjan.`;
    const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
    const productImage = primary ? `${baseUrl}${imageVariant(primary.path, 960)}` : ogImage;
    const jsonLd: unknown[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${baseUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Nos produits', item: `${baseUrl}/produits` },
          { '@type': 'ListItem', position: 3, name: p.name, item: canonical },
        ],
      },
    ];
    // Données structurées Product uniquement si le prix est renseigné par l'administrateur.
    if (p.price !== null && p.price !== undefined) {
      const availability =
        p.stockState === 'rupture' || p.stockState === 'indisponible'
          ? 'https://schema.org/OutOfStock'
          : p.stockState === 'limite'
            ? 'https://schema.org/LimitedAvailability'
            : 'https://schema.org/InStock';
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: trimDescription(descriptionSource, 400),
        sku: p.reference ?? undefined,
        category: categoryName,
        url: canonical,
        image: p.images.slice(0, 4).map((i) => `${baseUrl}${imageVariant(i.path, 960)}`),
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: s.currency,
          availability,
          url: canonical,
          seller: { '@type': 'Organization', name: s.businessName },
        },
      });
    }
    return {
      title: `${p.name}${p.reference ? ` (réf. ${p.reference})` : ''} — ${categoryName} | ${s.businessName}`,
      description: trimDescription(descriptionSource),
      canonical,
      ogImage: productImage,
      ogType: 'product',
      robots: p.isDemo ? 'noindex, follow' : 'index, follow',
      jsonLd,
    };
  }

  if (cleanPath === '/gros') {
    return {
      title: `Vente de draps en gros à Abidjan — commerçants et revendeurs | ${s.businessName}`,
      description: trimDescription(
        `Achetez des draps Jimmy et textiles de maison en gros à Abidjan. Contactez ${s.businessName} pour les prix de gros, les quantités minimums et la disponibilité.`
      ),
      canonical,
      ogImage,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: [
        organisationJsonLd(baseUrl),
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Vente en gros', item: canonical },
          ],
        },
      ],
    };
  }

  if (cleanPath === '/a-propos') {
    return {
      title: `À propos de ${s.businessName} — textiles de maison à Abidjan`,
      description: trimDescription(
        `${s.businessName} propose des draps, housses de couette et rideaux aux particuliers et aux commerçants, à ${s.location || 'Abidjan'}.`
      ),
      canonical,
      ogImage,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: [organisationJsonLd(baseUrl)],
    };
  }

  if (cleanPath === '/contact') {
    return {
      title: `Contact — ${s.businessName}, ${s.location || 'Abidjan'}`,
      description: trimDescription(
        `Contactez ${s.businessName} par téléphone ou WhatsApp pour vos draps, housses de couette et rideaux. ${s.phone ? `Téléphone : ${s.phone}.` : ''}`
      ),
      canonical,
      ogImage,
      ogType: 'website',
      robots: 'index, follow',
      jsonLd: [organisationJsonLd(baseUrl)],
    };
  }

  return {
    title: `Page introuvable | ${s.businessName}`,
    description: 'La page demandée n’existe pas ou a été déplacée.',
    canonical,
    ogImage,
    ogType: 'website',
    robots: 'noindex, follow',
    jsonLd: [],
  };
}

export function renderHead(meta: MetaResult): string {
  const esc = escapeHtml;
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${esc(meta.robots)}" />`,
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta property="og:site_name" content="${esc(getPublicSettings().businessName)}" />`,
    `<meta property="og:locale" content="fr_CI" />`,
    `<meta property="og:type" content="${esc(meta.ogType)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    `<meta property="og:image" content="${esc(meta.ogImage ?? '')}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${esc(meta.ogImage ?? '')}" />`,
  ];
  for (const ld of meta.jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}

export function resolveBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const s = getPublicSettings();
  if (config.siteUrl) return config.siteUrl;
  if (s.siteUrl) return s.siteUrl;
  const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost';
  return `${proto}://${host}`;
}

export function buildSitemap(baseUrl: string): string {
  const s = getPublicSettings();
  const staticPages: { path: string; priority: string; changefreq: string }[] = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/produits', priority: '0.9', changefreq: 'daily' },
    { path: '/gros', priority: '0.8', changefreq: 'monthly' },
    { path: '/a-propos', priority: '0.5', changefreq: 'yearly' },
    { path: '/contact', priority: '0.6', changefreq: 'yearly' },
  ];
  const products = queryProducts({ limit: 200 }).rows;
  const urls = [
    ...staticPages.map(
      (p) => `  <url>\n    <loc>${escapeHtml(baseUrl + p.path)}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ),
    ...products.map((p) => {
      const lastmod = (p.updated_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
      return `  <url>\n    <loc>${escapeHtml(`${baseUrl}/produits/${p.slug}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobots(baseUrl: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
}
