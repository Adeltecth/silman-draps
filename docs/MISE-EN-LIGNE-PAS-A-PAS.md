# Mise en ligne, pas à pas — Silima Shop

Marché visé : **Abidjan / Côte d'Ivoire**, vente au détail et en gros.
Objectif de ce document : passer du site de démonstration au **vrai catalogue**, avec un
numéro WhatsApp qui fonctionne. Durée totale : environ **une demi-journée**.

> Ordre important : on **prépare le contenu hors ligne** (partie 1), on **met le site en
> ligne** (partie 2), puis on **remplit l'administration** (partie 3). Remplir avant le
> déploiement reviendrait à tout recommencer : les données vivent dans `data/`, sur le
> serveur.

---

## 0. Vue d'ensemble

| Phase | Durée | Où |
|---|---|---|
| 1. Préparer photos, textes et liste de produits | 1 h à 2 h | sur votre ordinateur |
| 2. Déployer le site (domaine, HTTPS, sauvegarde) | 30 min | serveur — voir `DEPLOIEMENT.md` |
| 3. Remplir l'administration dans l'ordre | 1 h 30 à 2 h 30 | `/admin` |
| 4. Vérifier sur un vrai téléphone | 20 min | votre téléphone |
| 5. Visibilité locale (Search Console, fiche Google) | 30 min | Google |

---

## 1. À préparer hors ligne

### 1.1 Les informations à réunir

| Information | Format attendu | Où elle apparaît |
|---|---|---|
| Numéro WhatsApp de la boutique | international, ex. `+225 07 XX XX XX XX` | tous les boutons du site |
| Téléphone (si différent) | idem | Contact, pied de page |
| E-mail (facultatif) | `contact@…` | Contact |
| Horaires d'ouverture | ex. « Lun – Sam, 8 h – 18 h » | Contact |
| Localisation | « Adjamé, Abidjan » suffit ; n'ajoutez pas de rue si vous ne voulez pas la publier | Contact, fiche Google |
| Zones desservies / livraison (facultatif) | seulement si c'est réellement garanti | Contact, panier d'information |
| Réseaux sociaux (facultatif) | URL complète | Pied de page |

⚠️ Le numéro WhatsApp doit être **celui que vous décrochez vraiment** : c'est le canal
principal de vente. Un numéro erroné perd le client au moment décisif.

### 1.2 Les photos

Trois prises par modèle suffisent, toutes avec le même téléphone :

1. **Lit préparé** — photo principale. Lumière du jour, sans flash, appareil à hauteur de
   poitrine, légèrement de biais depuis le pied du lit. Format portrait (4:5).
2. **Plié en pile** — montre la matière et sert la page « Vente en gros ».
3. **Détail** — ourlet, taie d'oreiller, motif. Cadrage serré.

Règles techniques :

- 1600 px sur le grand côté minimum, JPEG, 12 Mo maximum (le site convertit
  automatiquement en trois tailles WebP).
- Repasser les draps, dégager la chambre, éviter les objets personnels.
- Nommer les fichiers clairement : `jm-confort-blanc-01.jpg`, `jm-confort-blanc-02.jpg`…
- Texte alternatif : le modèle et la couleur, pas « photo1 » —
  ex. « Parure Jimmy Confort, blanc cassé, sur un lit préparé ».

À ne pas utiliser : images générées par IA, photos récupérées sur le catalogue d'un autre
revendeur, photos avec un prix ou un logo incrusté.

### 1.3 La liste des produits

Remplissez `docs/modele-produits.csv` (modèle fourni, deux lignes d'exemple à supprimer) :
une ligne par modèle, ouvert dans Excel ou LibreOffice. Si Excel n'affiche qu'une seule
colonne, choisissez « virgule » comme séparateur à l'import.

Il n'y a **pas d'import automatique** dans l'administration : ce fichier sert à préparer et
relire les informations au calme, puis à les saisir produit par produit. Avantage : vos
prix et vos textes sont décidés une fois, pas improvisés devant l'écran.

### 1.4 Les textes

Les textes actuels du site fonctionnent tels quels. Ne les modifiez que si vous avez mieux
à dire. Des modèles à trous, volontairement neutres, sont fournis en **annexe A** : ils
contiennent des crochets `[…]` à remplacer par des faits vérifiables, et rien d'inventé.

---

## 2. Le jour J : mettre le site en ligne

Suivre `docs/DEPLOIEMENT.md`, section A (VPS) ou B (Docker). Trois choses à ne pas
oublier à ce moment-là :

- [ ] `SITE_URL=https://votre-domaine.ci` dans `.env` (sinon les liens canoniques et le
      sitemap pointent vers une adresse temporaire).
- [ ] `DEMO_MODE=true` pour l'instant — on le passera à `false` à l'étape 9.
- [ ] Sauvegarde quotidienne du dossier `data/` en place, et **un essai de restauration**
      (une sauvegarde jamais testée n'est pas une sauvegarde).

---

## 3. Remplir l'administration, dans cet ordre

Ouvrir `https://votre-domaine.ci/admin`. Chaque étape se termine par un contrôle : ne
passez à la suivante que si le contrôle est bon.

### Étape 1 — Connexion et mot de passe (5 min)

1. Se connecter avec l'e-mail et le mot de passe administrateur.
2. `Paramètres → Sécurité du compte` : saisir le mot de passe actuel, puis un nouveau
   mot de passe de 10 caractères minimum (lettres + chiffres), et confirmer.
3. Se déconnecter, se reconnecter avec le nouveau mot de passe.

- [ ] Contrôle : la reconnexion avec le nouveau mot de passe fonctionne.

### Étape 2 — Paramètres → Identité de la boutique (5 min)

| Champ | À mettre |
|---|---|
| Nom de la boutique | `Silima Shop` |
| Logo | fichier PNG ou SVG, fond transparent si possible (facultatif) |

- [ ] Contrôle : le nom apparaît en haut du site public.

### Étape 3 — Paramètres → Contact (10 min)

| Champ | À mettre | Remarque |
|---|---|---|
| Numéro WhatsApp (format international) | `+225 07 XX XX XX XX` | **champ n°1 du site** |
| Téléphone | idem ou numéro fixe | affiché sur Contact |
| E-mail | facultatif | laissez vide si vous n'en avez pas |
| Localisation | `Adjamé, Abidjan — Côte d'Ivoire` | pas de rue si non souhaitée |
| Zones desservies | facultatif | ex. « Abidjan » |
| Horaires d'ouverture | facultatif | n'écrivez rien si les horaires changent |
| Facebook / Instagram / TikTok | facultatif | URL complète |

Enregistrer, puis ouvrir le site public sur un téléphone et appuyer sur un bouton WhatsApp.

- [ ] Contrôle : WhatsApp s'ouvre sur une discussion avec **votre** numéro, avec un message
      déjà rédigé (nom du produit, référence, quantité).
- [ ] Contrôle : aucun bouton n'affiche plus « numéro non configuré ».

### Étape 4 — Paramètres → Affichage et stock (5 min)

| Champ | Valeur conseillée |
|---|---|
| Devise | `XOF` (F CFA) |
| Seuil de stock faible | `3` (un produit à 3 exemplaires ou moins passe en « Stock limité ») |
| Informations de livraison | **vide**, sauf si vos conditions sont réelles |

- [ ] Contrôle : laissez vide et vérifiez que le site parle de livraison sans promettre de
      délai.

### Étape 5 — Paramètres → Référencement (5 min)

| Champ | Valeur |
|---|---|
| Adresse du site | `https://votre-domaine.ci` |
| Description par défaut | 1 à 2 phrases, 160 caractères environ |

- [ ] Contrôle : `https://votre-domaine.ci/sitemap.xml` s'ouvre et liste vos pages.

### Étape 6 — Catégories (10 min)

Les quatre catégories de départ sont : **Draps de lit, Housses de couette, Rideaux,
Autres articles textiles**. Renommez, masquez ou complétez selon votre assortiment réel.
Une catégorie vide reste visible : masquez-la plutôt que de la laisser sans produit.

- [ ] Contrôle : les catégories affichées sur `/produits` correspondent à ce que vous vendez.

### Étape 7 — Un premier produit, en test (15 min)

Faites **un seul produit complet** avant de saisir les autres : c'est ainsi qu'on repère
les erreurs de prix ou de photo sans les répéter vingt fois.

`Produits → Ajouter un produit` :

| Champ | Conseil |
|---|---|
| Nom du produit | ce que le client dirait à voix haute — `Parure Jimmy 2 places` |
| Référence / SKU | votre référence interne, ex. `JM-140` (elle apparaît dans le message WhatsApp) |
| Catégorie | obligatoire pour que les filtres fonctionnent |
| Description courte | une phrase, affichée dans la liste |
| Description complète | dimensions, contenu de la parure, entretien |
| Photos | 1 à 3 photos ; la première est la photo principale (flèches pour réordonner) |
| Prix | le prix réel, ou **vide** → « Prix sur demande » |
| Composition / entretien | uniquement si c'est confirmé par le fournisseur |
| Tailles | ex. `1 place (90×190)`, `2 places (140×190)` |
| Suivre le stock | à cocher si vous tenez vraiment les quantités |
| Quantité en stock | le nombre réel aujourd'hui |
| Publier sur le site | **décochez d'abord** pour relire tranquillement |
| Mettre en avant | coche pour l'afficher sur la page d'accueil |

- [ ] Contrôle : « Enregistrer », puis aperçu — la fiche ressemble à un vrai produit.
- [ ] Contrôle : cocher « Publier », vérifier qu'il apparaît sur `/produits`, puis ouvrir
      le lien WhatsApp depuis la fiche et vérifier que le message reprend le nom, la
      référence et la quantité choisie.

> **Suivre le stock, ou pas ?** Si vous décochez le suivi, le site affiche le produit comme
> disponible en permanence. Ne le faites que pour des modèles que vous avez toujours en
> stock ; sinon laissez le suivi actif et mettez à jour la quantité une fois par jour.

### Étape 8 — Les autres produits (5 à 8 min chacun)

Répétez l'étape 7. Ordre de travail conseillé : **tout saisir dépublié**, puis publier
d'un coup après relecture.

Conseils de rédaction :

- Un nom = un modèle, pas une couleur : les couleurs vont dans les options (ex. « Couleur :
  blanc cassé, bleu ciel »).
- Gardez la même structure de description d'un produit à l'autre (dimensions, contenu,
  entretien) : la boutique paraît sérieuse.
- Prix : afficher un prix réduit les allers-retours ; si les prix bougent souvent, laissez
  vide et gérez la confirmation sur WhatsApp — mais restez cohérent sur tout le catalogue.
- Préférez 15 fiches justes à 60 fiches approximatives.

- [ ] Contrôle : `/produits` se charge vite sur téléphone, les filtres fonctionnent, chaque
      fiche a au moins une photo nette.

### Étape 9 — Retirer la démonstration (5 min)

`Paramètres → Données de démonstration → Supprimer les produits de démonstration`.

Puis, sur le serveur, dans `.env` : `DEMO_MODE=false`, et redémarrer
(`sudo systemctl restart silima-shop`).

- [ ] Contrôle : le bandeau noir « Démo : produits et prix d'exemple à remplacer »
      disparaît.
- [ ] Contrôle : il ne reste **que** vos produits, avec vos prix.
- [ ] Contrôle : une recherche sur `/produits` ne renvoie plus aucun produit `DEMO-…`.

### Étape 10 — Vérifications sur un vrai téléphone (20 min)

À faire en 4G, pas en Wi-Fi de bureau :

- [ ] La page d'accueil s'affiche en moins de 3 secondes.
- [ ] Un bouton WhatsApp ouvre bien la discussion, avec le bon message.
- [ ] Le formulaire de contact envoie une demande, et elle apparaît dans
      `Administration → Demandes` (statut « Nouvelle »).
- [ ] Le formulaire de gros enregistre bien l'entreprise, la quantité estimée et le type
      « Gros ».
- [ ] Un produit masqué n'apparaît nulle part et son ancien lien renvoie une page
      « introuvable ».
- [ ] Un produit en rupture affiche « Rupture de stock » et ne propose pas « Commander ».
- [ ] Le site est utilisable avec une seule main, sans zoom.
- [ ] Aucune faute visible dans les textes que vous avez saisis.

---

## 4. Après la mise en ligne

### Visibilité locale (le meilleur retour sur 30 minutes)

- [ ] **Google Search Console** : ajouter le domaine, valider, envoyer
      `https://votre-domaine.ci/sitemap.xml`.
- [ ] **Fiche Google Business Profile** : catégorie « Magasin de literie » ou
      « Magasin de linge de maison », ville Adjamé/Abidjan, téléphone et horaires
      identiques au site. Si vous ne voulez pas publier l'adresse précise, déclarez la
      fiche comme « zone desservie » et masquez l'adresse — Google exige une adresse pour
      la vérification, pas pour l'affichage.
- [ ] Même nom, même numéro, mêmes horaires partout (site, fiche Google, statut WhatsApp
      Business). C'est ce que Google recoupe pour le référencement local.

### Habitudes qui font vivre le site

- Répondre aux demandes **le jour même** ; faire passer les statuts
  Nouvelle → Contacté → Converti.
- Mettre à jour les quantités quand vous vendez : c'est ce qui rend les badges de stock
  crédibles.
- Vérifier une fois par semaine que la sauvegarde tourne (`/var/backups`).
- Regarder les demandes de gros chaque semaine : c'est le segment le plus rentable, et un
  formulaire rempli avec 5 minutes de retard se refroidit vite.

---

## 5. À ne pas faire

- Ne pas publier de prix que vous ne pouvez pas tenir une semaine plus tard.
- Ne pas écrire de délai de livraison, de remise ou de quantité minimum sans règle claire
  derrière.
- Ne pas utiliser de photos d'IA ou de photos prises sur le catalogue d'un autre
  revendeur, même « pour dépanner » : c'est la première chose qu'un client repère.
- Ne pas partager le compte administrateur : une personne, un compte, et suppression du
  compte au départ de la personne.
- Ne pas communiquer sur un paiement en ligne : le site n'en propose pas.

---

## Annexe A — Modèles de textes (à compléter)

Remplacez tout ce qui est entre crochets. Ne supprimez pas une phrase pour en mettre une
plus flatteuse : ce qui est écrit engage la boutique.

**Titre principal (accueil)** — déjà en place, modifiable :
> De beaux draps pour votre maison.

**Texte d'introduction (accueil)** :
> Découvrez les parures Jimmy disponibles chez Silima Shop. [Gammes ou tailles réellement
> proposées.] Parcourez les modèles, puis écrivez-nous sur WhatsApp : nous vous
> confirmons le prix et la disponibilité, pour un achat au détail comme en gros.

**À propos** (page `/a-propos`, à adapter : uniquement des faits vérifiables) :
> Silima Shop propose des parures de lit Jimmy et du textile de maison à Adjamé, Abidjan.
> [Ce que vend réellement la boutique : draps, housses de couette, rideaux.] [Pour qui :
> particuliers, revendeurs, hôtels ou maisons d'hôtes — seulement si c'est le cas.]
> Pour connaître les modèles disponibles et les prix, écrivez-nous sur WhatsApp : nous
> répondons avec les informations du moment.

**Informations de livraison** — à ne remplir que si c'est vrai. Exemple à confirmer :
> Retrait à Adjamé et livraison à Abidjan sur demande. Les frais et le délai sont
> confirmés sur WhatsApp avant la commande.

**Vente en gros** : la page dit déjà que prix, quantités minimum et stocks sont confirmés
au cas par cas. N'ajoutez une remise ou un minimum que le jour où vous les appliquez
vraiment.

---

## Annexe B — Ordre court, à cocher

1. [ ] Photos (3 par modèle) et liste de produits prêtes
2. [ ] Site déployé, `SITE_URL` renseignée, sauvegarde testée
3. [ ] Mot de passe administrateur changé
4. [ ] Nom, logo
5. [ ] **Numéro WhatsApp** et téléphone
6. [ ] Devise, seuil de stock, livraison (ou vide)
7. [ ] Adresse du site + description SEO
8. [ ] Catégories réelles
9. [ ] Un produit test publié, lien WhatsApp vérifié
10. [ ] Tous les produits saisis
11. [ ] Produits de démonstration supprimés, `DEMO_MODE=false`
12. [ ] 8 vérifications sur téléphone
13. [ ] Search Console + fiche Google
