# Checklist avant lancement — Silima Shop

> **Le pas-à-pas détaillé, dans l'ordre, avec les champs exacts de l'administration :**
> [`docs/MISE-EN-LIGNE-PAS-A-PAS.md`](MISE-EN-LIGNE-PAS-A-PAS.md).
> Le document ci-dessous est la vue d'ensemble ; l'autre est la version « à suivre écran en
> main ».

Ce qui fonctionne déjà (testé) et ce qui reste à faire **par vous**, parce que cela
dépend d'informations que je ne peux pas inventer (numéro réel, photos, hébergement).

## 1. Informations à fournir (obligatoire)

- [ ] **Numéro WhatsApp** au format international — `Administration → Paramètres`.
      Tant qu'il est vide, les boutons affichent une aide au lieu d'un lien.
      C'est le réglage n°1 : sans lui, aucune commande WhatsApp n'est possible.
- [ ] **Téléphone** de la boutique, **horaires** d'ouverture.
- [ ] **Localisation** : ville/quartier. L'adresse exacte n'est pas publiée — ajoutez-la
      seulement si vous souhaitez la communiquer.
- [ ] **E-mail** de contact (facultatif) et **réseaux sociaux** (facultatifs).
- [ ] **Informations de livraison** : uniquement si elles sont réellement garanties
      (le site n'annonce aucun délai par défaut).
- [ ] **Devise** : XOF par défaut ; modifiable si nécessaire.
- [ ] **Seuil de stock faible** (3 par défaut).

## 2. Contenu

- [ ] Remplacer les **9 produits de démonstration** par les vrais modèles (photos
      fournies par la boutique). Bouton « Supprimer les produits de démonstration ».
- [ ] Ne saisir un **prix** que s'il doit être public ; sinon laissez vide
      (« Prix sur demande »).
- [ ] Ne renseigner la **composition du tissu** que si elle est confirmée.
- [ ] Vérifier **tailles**, **contenu de la parure** et **références**.
- [ ] Remplacer le **logo** et l'**image de partage** dans `Paramètres`.
- [ ] Ajouter/corriger les **catégories** selon l'assortiment réel.

## 3. Comptes et accès

- [ ] Changer le **mot de passe administrateur** (`Paramètres → Sécurité du compte`).
- [ ] Supprimer `data/admin-credentials.txt` s'il existe encore sur le serveur.
- [ ] Vérifier que `.env` n'est **pas** accessible par HTTP (il est hors de `dist/`).
- [ ] Un seul administrateur est créé par défaut. Pour une seconde personne, créez un
      compte via SSH :
      `node -e "const p=require('./dist-server/server/password');const db=require('better-sqlite3')('data/silima.db');db.prepare('INSERT INTO admin_users (email,name,password_hash) VALUES (?,?,?)').run('email@exemple.ci','Nom',p.hashPassword('MotDePasseSolide123'))"`
      puis supprimez ce compte depuis `admin_users` en cas de départ.

## 4. Configuration serveur

- [ ] `SITE_URL=https://votre-domaine.ci` dans `.env` (canonical, sitemap, Open Graph).
- [ ] `DEMO_MODE=false` après avoir retiré les produits d'exemple (supprime le bandeau).
- [ ] HTTPS actif + `COOKIE_SECURE=auto` (cookie `Secure` automatique en HTTPS).
- [ ] Sauvegarde automatique du dossier `data/` (cron quotidien) et **test de restauration**.
- [ ] Vérifier `https://votre-domaine.ci/robots.txt` et `/sitemap.xml`.

## 5. SEO / Google

- [ ] Vérifier `SITE_URL` puis soumettre `sitemap.xml` dans **Google Search Console**.
      (Une balise de vérification peut être ajoutée dans `index.html`, section `<head>`.)
- [ ] Créer la fiche **Google Business Profile** de la boutique (Adjamé, Abidjan) —
      c'est le levier local le plus efficace.
- [ ] Contrôler les titres/descriptions des produits les plus importants
      (`Produits → modifier → Référencement`).

## 6. Contrôles sécurité avant mise en ligne

- [ ] `curl -I https://votre-domaine.ci/` → en-têtes CSP, `X-Content-Type-Options`,
      `Referrer-Policy` présents.
- [ ] `https://votre-domaine.ci/api/admin/stats` renvoie **401** sans connexion.
- [ ] Tentative de connexion erronée répétée → message de verrouillage.
- [ ] Vérifier qu'aucun produit masqué n'apparaît (`/produits` + lien direct).
- [ ] Vérifier que les pages `/admin` sont en `noindex`.
- [ ] Lancer `npm run test:api` sur le serveur de production (lecture/écriture réelle :
      supprime le produit de test à la fin).

## 7. Points techniques à connaître

- Aucun paiement en ligne n'est implémenté (volontaire) : le site est un catalogue avec
  demandes. Ne pas communiquer sur un paiement immédiat.
- Les **conversations WhatsApp ne sont pas enregistrées** dans l'administration.
  Seuls les formulaires du site créent des demandes.
- Le stock n'est **jamais** décrémenté automatiquement par un clic WhatsApp.
- Les images sont stockées sur le disque du serveur (`data/uploads`) : sauvegarde = `data/`.
- Migration vers PostgreSQL/Supabase ou stockage objet : le code est isolé dans
  `server/db.ts` et `server/uploads.ts`.
