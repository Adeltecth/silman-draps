import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config, isProduction } from './config';
import { db, getPublicSettings, migrate, seedCategories, seedSettings, ensureAdminUser } from './db';
import { seedDemoProducts } from './demo';
import { cleanupSessions, currentAdmin } from './auth';
import { publicRouter } from './routes/public';
import { adminAuthRouter } from './routes/admin-auth';
import { adminCatalogRouter } from './routes/admin-catalog';
import { adminBackofficeRouter } from './routes/admin-backoffice';
import { buildMeta, buildRobots, buildSitemap, renderHead, resolveBaseUrl } from './pages';
import { normaliseWhatsAppNumber } from '../shared/whatsapp';

// ---------------------------------------------------------------------------
// Initialisation de la base (migrations idempotentes + amorçage contrôlé)
// ---------------------------------------------------------------------------
migrate();
seedSettings();
seedCategories();
const adminBootstrap = ensureAdminUser();
if (adminBootstrap.created) {
  console.info(`[auth] compte administrateur initial créé pour ${adminBootstrap.email}.`);
  if (!config.adminPassword) {
    console.info('[auth] mot de passe initial écrit dans data/admin-credentials.txt (à conserver puis supprimer).');
  }
}
if (config.demoMode) seedDemoProducts();
cleanupSessions();

// Avertissements de configuration affichés dans les journaux serveur (jamais côté client).
const startupSettings = getPublicSettings();
if (!normaliseWhatsAppNumber(startupSettings.whatsappNumber).ok) {
  console.warn('[config] Aucun numéro WhatsApp valide : les boutons WhatsApp afficheront un message de configuration.');
}
if (config.demoMode && !process.env.WHATSAPP_DEMO_NUMBER) {
  // Le numéro de démonstration est saisi via l'administration ; ce message rappelle qu'il ne doit pas partir en production.
  console.info('[config] DEMO_MODE actif : pensez à remplacer les produits et le numéro WhatsApp de démonstration avant la mise en ligne.');
}

const app = express();
if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // frame-ancestors est volontairement permissif pour permettre l'aperçu intégré ;
  // en production sur votre domaine, restreignez-le si nécessaire.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')
  );
  if (isProduction && (req.secure || req.headers['x-forwarded-proto'] === 'https')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// Journaux d'accès compacts (sans données personnelles).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api') || res.statusCode >= 400) {
      console.info(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${Date.now() - start}ms`);
    }
  });
  next();
});

// ---------------------------------------------------------------------------
// Médias (stockage persistant sur disque)
// ---------------------------------------------------------------------------
app.use(
  '/media',
  express.static(config.uploadsDir, {
    index: false,
    dotfiles: 'deny',
    fallthrough: true,
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.use('/api/public', publicRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin', adminCatalogRouter);
app.use('/api/admin', adminBackofficeRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), demoMode: config.demoMode });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Point d’accès introuvable.' });
});

// ---------------------------------------------------------------------------
// SEO : sitemap, robots, image Open Graph par défaut
// ---------------------------------------------------------------------------
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.set('Cache-Control', 'public, max-age=600');
  res.send(buildSitemap(resolveBaseUrl(req)));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=600');
  res.send(buildRobots(resolveBaseUrl(req)));
});

app.get('/og-default.jpg', (_req, res) => {
  const file = path.join(config.distDir, 'og-default.jpg');
  if (fs.existsSync(file)) {
    res.sendFile(file);
    return;
  }
  res.status(404).end();
});

// ---------------------------------------------------------------------------
// Application React (SPA) avec métadonnées SEO rendues côté serveur
// ---------------------------------------------------------------------------
const templatePath = path.join(config.distDir, 'index.html');
let templateCache: { mtimeMs: number; html: string } | null = null;

function getTemplate(): string | null {
  try {
    const stat = fs.statSync(templatePath);
    if (!templateCache || templateCache.mtimeMs !== stat.mtimeMs) {
      templateCache = { mtimeMs: stat.mtimeMs, html: fs.readFileSync(templatePath, 'utf8') };
    }
    return templateCache.html;
  } catch {
    return null;
  }
}

app.use(
  express.static(config.distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Point d’accès introuvable.' });
    return;
  }
  const template = getTemplate();
  if (!template) {
    res
      .status(503)
      .type('html')
      .send('<h1>Site en cours de compilation</h1><p>Le dossier <code>dist</code> est absent. Lancez <code>npm run build</code> puis redémarrez le serveur.</p>');
    return;
  }
  const baseUrl = resolveBaseUrl(req);
  const meta = buildMeta({ baseUrl, path: req.path });
  const isAdmin = req.path.startsWith('/admin');
  const html = template
    .replace('<!--SEO_HEAD-->', `${renderHead(meta)}${isAdmin ? '\n    <meta name="theme-color" content="#1E2630" />' : ''}`)
    .replace(/<html lang="[^"]*"/, '<html lang="fr"');

  res.set('Cache-Control', isAdmin ? 'no-store' : 'no-cache');
  res.type('html').send(html);
});

// ---------------------------------------------------------------------------
// Gestion des erreurs
// ---------------------------------------------------------------------------
app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'Données trop volumineuses.' });
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Requête invalide.' });
    return;
  }
  console.error('[erreur]', err.message);
  res.status(err.status ?? 500).json({ error: 'Une erreur est survenue. Merci de réessayer.' });
});

const server = app.listen(config.port, config.host, () => {
  console.info(`Silima Shop — serveur démarré sur http://${config.host}:${config.port}`);
  console.info(`Base de données : ${path.relative(process.cwd(), path.join(config.dataDir, 'silima.db'))}`);
});

function shutdown(signal: string) {
  console.info(`[serveur] ${signal} reçu, fermeture…`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, currentAdmin };
