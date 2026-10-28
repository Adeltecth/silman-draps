# Silima Shop — site vitrine et catalogue avec commande WhatsApp

Boutique de draps et textiles de maison (parures **Jimmy**) à Adjamé, Abidjan.
Le site est un **catalogue + demandes** : les clients parcourent les produits, puis
commandent ou posent leurs questions par **WhatsApp** ou via un **formulaire enregistré
en base de données**. Aucun paiement en ligne.

Application réelle (pas une maquette) :

- **Front** : React 18 + TypeScript + Tailwind, compilé par Vite.
- **API** : Node.js + Express + TypeScript.
- **Base de données** : SQLite (fichier persistant, mode WAL) via `better-sqlite3`.
- **Images** : stockage disque persistant (`data/uploads`), trois tailles WebP générées
  à l'upload avec `sharp`.
- **Sécurité** : sessions serveur (cookie `HttpOnly` + `SameSite=Lax`), mots de passe
  hachés en scrypt, protection CSRF, limitation de débit, validation Zod, CSP,
  contrôle d'accès systématique côté serveur.

> Le choix SQLite + stockage disque a été fait pour rester **simple à exploiter**
> (un seul serveur, une sauvegarde = un dossier). L'architecture est décrite plus bas ;
> le passage à PostgreSQL/Supabase ou à un stockage objet (S3) ne concerne que
> `server/db.ts` et `server/uploads.ts`.

---

## 1. Démarrage rapide (développement)

```bash
npm install
npm run seed:images        # une seule fois : prépare les visuels de démonstration
cp .env.example .env       # puis renseigner ADMIN_PASSWORD (et le reste)
npm run build              # compile le front (dist/) et le serveur (dist-server/)
npm start                  # http://localhost:3000
```

- Site public : `http://localhost:3000/`
- Administration : `http://localhost:3000/admin`
- Identifiants initiaux : `ADMIN_EMAIL` / `ADMIN_PASSWORD` du fichier `.env`
  (si `ADMIN_PASSWORD` est vide, un mot de passe aléatoire est écrit une seule fois
  dans `data/admin-credentials.txt` **et nulle part ailleurs**).

En développement, `npm run dev:server` (tsx watch) + `npm run dev:client`
(vite build --watch) permettent d'itérer.

---

## 2. Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port HTTP du serveur | `3000` |
| `HOST` | Interface d'écoute | `0.0.0.0` |
| `SITE_URL` | URL publique (canonical, sitemap, Open Graph) | détection auto |
| `ADMIN_EMAIL` | Identifiant du premier compte administrateur | `admin@silimashop.ci` |
| `ADMIN_PASSWORD` | Mot de passe initial (10 caractères minimum) | aléatoire, écrit dans `data/admin-credentials.txt` |
| `ADMIN_NAME` | Nom affiché de l'administrateur | `Administrateur` |
| `DEMO_MODE` | `true` : bandeau de démonstration + produits d'exemple | `true` |
| `COOKIE_SECURE` | `auto` = cookie `Secure` uniquement en HTTPS | `auto` |
| `SESSION_DAYS` | Durée d'une session administrateur | `7` |
| `DATA_DIR` | Dossier des données (base + uploads) | `./data` |
| `ENQUIRY_RATE_LIMIT` | Nombre de demandes autorisées par IP / 10 min | `6` |
| `TRUST_PROXY` | Faire confiance au proxy (X-Forwarded-*) | `true` |

Le fichier `.env` n'est jamais servi au navigateur : toutes les valeurs sensibles
restent côté serveur.

---

## 3. Arborescence

```
silima-shop/
├── index.html               # gabarit HTML (les balises SEO sont injectées côté serveur)
├── shared/                  # code partagé client + serveur
│   ├── types.ts             # types publics / admin
│   ├── whatsapp.ts          # validation du numéro + messages pré-remplis
│   ├── stock.ts             # règle unique de calcul Disponible / Stock limité / Rupture
│   ├── format.ts            # prix (XOF), dates, libellés
│   └── images.ts            # conventions de nommage des variantes WebP
├── server/
│   ├── index.ts             # Express, CSP, médias, API, rendu SEO, erreurs
│   ├── db.ts                # schéma SQLite, migrations idempotentes, requêtes, amorçage
│   ├── auth.ts              # sessions, requireAdmin, CSRF, rate limiting, login
│   ├── password.ts          # scrypt
│   ├── uploads.ts           # validation + conversion d'images (sharp)
│   ├── schemas.ts           # validation Zod de toutes les entrées
│   ├── pages.ts             # titres, descriptions, canonical, OG, JSON-LD, sitemap, robots
│   ├── demo.ts              # produits de démonstration (flag is_demo)
│   └── routes/              # public.ts, admin-auth.ts, admin-catalog.ts, admin-backoffice.ts
├── src/
│   ├── pages/               # Accueil, Catalogue, Fiche produit, Gros, À propos, Contact, 404
│   ├── admin/               # Connexion, Tableau de bord, Produits, Catégories, Demandes, Paramètres
│   ├── components/          # en-tête, pied de page, cartes produit, formulaires, UI
│   └── lib/                 # client API, contexte paramètres, SEO client
├── scripts/prepare-seed-images.ts
├── tests/                   # api.test.mjs (20 tests) + e2e.test.mjs (18 tests navigateur)
├── data/                    # ⚠️ données persistantes : silima.db + uploads/
└── public/                  # favicon, og-default.jpg, images d'ambiance
```

---

## 4. Modèle de données (SQLite)

| Table | Contenu |
|---|---|
| `products` | nom, slug, référence, catégorie, descriptions, prix, tailles, options, tissu, entretien, suivi de stock, quantité, seuil, disponible / mis en avant / publié, `is_demo`, SEO |
| `categories` | nom, slug, description, ordre, active |
| `product_images` | image principale, ordre, texte alternatif, dimensions |
| `media` | fichier source (base) et métadonnées des uploads |
| `enquiries` | type (détail / gros), nom, téléphone, e-mail, entreprise, produit, quantité, message, statut, note interne, canal, date |
| `settings` | paramètres publics (clé/valeur) : nom, WhatsApp, téléphone, e-mail, localisation, horaires, réseaux, textes d'accueil, devise, livraison, seuil, SEO |
| `admin_users` | e-mail, nom, hash scrypt, rôle, état, verrouillage |
| `sessions` | **hash** du jeton, utilisateur, expiration, IP, agent |

Fichiers : `data/silima.db` (+ `-wal`, `-shm`) et `data/uploads/<base>-{480,960,1600}.webp`.

---

## 5. Règles métier implémentées

- **Visibilité** : un produit n'est public que si `is_active = 1` **et** que sa catégorie
  est active (ou qu'il n'a pas de catégorie). Les produits masqués renvoient un 404 côté
  API et une page « noindex » côté HTML.
- **Stock** : `disponible` / `limite` / `rupture` / `indisponible` calculés par une seule
  fonction (`shared/stock.ts`), avec le seuil global des paramètres ou un seuil par produit.
  Un produit marqué indisponible n'est **jamais** affiché disponible.
- **Aucune déduction automatique** : ouvrir WhatsApp ne modifie jamais le stock ; seule
  une action d'administration le fait.
- **Prix** : affiché uniquement s'il est renseigné ; sinon « Prix sur demande ».
  Les données structurées `Product` ne sont générées que dans ce cas.
- **WhatsApp** : le numéro est validé (format international) avant construction du lien.
  S'il est absent ou invalide, le bouton affiche une aide (avec lien direct vers la page
  de paramètres en mode démonstration) au lieu d'un lien cassé.
- **Demandes** : les formulaires créent de vrais enregistrements. Un message de succès
  n'apparaît qu'après une réponse 201 du serveur. Les conversations WhatsApp ne sont pas
  enregistrées et l'interface le dit explicitement.

---

## 6. Sécurité

- Mots de passe : **scrypt** (N=16384, r=8, p=1, sel aléatoire), comparaison à temps constant.
- Sessions : jeton aléatoire de 32 octets, **seul son SHA-256** est stocké ; cookie
  `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS ; expiration 7 jours ; révoquées au
  changement de mot de passe.
- Verrouillage temporaire après 8 échecs + limitation à 12 tentatives / 15 min / IP.
- **CSRF** : en-tête `x-silima-csrf` obligatoire sur toute écriture d'administration,
  plus vérification de l'origine, en complément de `SameSite=Lax`.
- Autorisations : toutes les routes `/api/admin/*` passent par `requireAdmin` (vérification
  de session côté serveur) ; aucune décision d'accès n'est prise côté client.
- Validation : Zod sur toutes les entrées (longueurs, formats, énumérations) + nettoyage
  des caractères de contrôle ; requêtes SQL 100 % paramétrées.
- Uploads : type réel vérifié par décodage `sharp` (pas seulement le `Content-Type`),
  12 Mo max, ré-encodage WebP (suppression des métadonnées EXIF), nom de fichier aléatoire.
- En-têtes : CSP restrictive, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en HTTPS.
- Anti-spam des formulaires : champ piège + limitation par IP hachée (aucune IP en clair
  en base).
- Aucun secret dans le bundle : les clés/identifiants ne vivent que dans `.env` et la base.

---

## 7. Tests

```bash
npm start                    # dans un terminal
npm run typecheck            # TypeScript client + serveur
npm run test:api             # 20 tests d'intégration API (dont sécurité et WhatsApp)
npm run test:e2e             # 18 tests navigateur (mobile + desktop)
npm run captures             # captures d'écran de présentation → docs/captures/
```

Le test e2e suppose Chromium installé (`npx playwright install chromium`) et suffisamment
de demandes autorisées (`ENQUIRY_RATE_LIMIT=100 npm start` en local pour enchaîner les envois).
Les captures de présentation sont écrites dans `docs/captures/`, celles du test e2e dans
`docs/captures/e2e/`.

Scénarios couverts : navigation et recherche, filtres, fiche produit (quantité + message
WhatsApp pré-rempli), formulaires (validation, enregistrement réel), connexion admin,
création de produit avec **upload d'image**, apparition publique, édition et stock,
masquage, gestion des demandes, paramètres WhatsApp, absence de données privées dans le
HTML public.

---

## 8. Déploiement

One-command install on a fresh Ubuntu server: `sudo ./deploy/install.sh your-domain.com`
(see **[deploy/README.md](deploy/README.md)**).

Voir **[docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md)** (VPS + systemd + reverse proxy HTTPS,
ou Docker), **[docs/MISE-EN-LIGNE-PAS-A-PAS.md](docs/MISE-EN-LIGNE-PAS-A-PAS.md)** (quoi
remplir, dans quel ordre, champ par champ) et
**[docs/CHECKLIST-AVANT-LANCEMENT.md](docs/CHECKLIST-AVANT-LANCEMENT.md)**.

Sur un VPS :

```bash
npm ci && npm run build
sudo cp deploy/silima-shop.service /etc/systemd/system/
sudo systemctl enable --now silima-shop      # écoute sur 127.0.0.1:3000
```

Avec Docker (base et images dans un volume nommé) :

```bash
cp .env.example .env && nano .env
docker compose up -d --build
```

Sauvegarde = copier le dossier `data/` (base + images). Exemple :

```bash
tar czf sauvegarde-silima-$(date +%F).tar.gz data
```

---

## 9. Crédits

Photographies de démonstration : Pexels et Unsplash (licences libres, attribution non
obligatoire mais notée dans [docs/CREDITS-PHOTOS.md](docs/CREDITS-PHOTOS.md)).
**Elles doivent être remplacées par les photos réelles des produits Silima Shop.**
