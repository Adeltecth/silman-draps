# Guide de l'espace de gestion — Silima Shop

Ce guide est écrit pour être suivi depuis un téléphone.

Adresse : **`https://votre-site.ci/admin`** (ou `/admin` sur votre adresse actuelle).

---

## 1. Se connecter

1. Ouvrir `/admin`.
2. Saisir l'adresse e-mail et le mot de passe fournis lors de l'installation.
3. Après 8 échecs, le compte est bloqué 15 minutes (protection automatique).

**Changer le mot de passe** : `Paramètres` → carte « Sécurité du compte ».
Le changement déconnecte les autres appareils.

---

## 2. Comprendre le tableau de bord

- **Produits actifs** : ce que voient les visiteurs.
- **Nouvelles demandes** : messages reçus via les formulaires du site (pas WhatsApp).
- **En rupture / indisponibles** : produits à réapprovisionner.
- **Demandes de gros** : demandes de commerçants.
- Les blocs orange listent ce qu'il reste à compléter (WhatsApp, téléphone, horaires…).
- Le bouton **« Supprimer les produits de démonstration »** retire les exemples d'un coup.

---

## 3. Ajouter un produit

`Produits` → **Ajouter un produit**

1. **Photos** : jusqu'à 10. Touchez « Choisir des photos ». La première est la photo
   principale ; l'étoile permet d'en choisir une autre. Chaque photo peut avoir une
   description (utile pour Google et les lecteurs d'écran).
2. **Nom**, **référence** (facultatif mais pratique pour WhatsApp), **catégorie**.
3. **Description courte** (2 lignes) et **description complète** (dimensions, contenu de
   la parure, conseils).
4. **Prix** : laisser vide si le prix n'est pas publié → le site affiche « Prix sur demande ».
5. **Tailles** : tapez puis « Ajouter » (ex. `2 places (140×190)`).
6. **Options** : par exemple « Couleur » avec `blanc, sable, bleu`.
7. **Stock** : activer « Suivre le stock » puis indiquer la quantité et le seuil
   (« Stock limité » en dessous). Sinon, la disponibilité dépend seulement de l'interrupteur.
8. **Publication** : « Publier sur le site » et, si besoin, « Mettre en avant » (accueil).
9. **Aperçu** pour vérifier, puis **Publier le produit**.

Le produit apparaît immédiatement dans le catalogue.

---

## 4. Modifier, masquer, supprimer

- Liste des produits : recherche par nom ou référence, filtre par statut et catégorie.
- Interrupteurs directs : **Publié / Masqué**, **Commandable / Indisponible**.
- Crayon = modifier, œil = voir sur le site, corbeille = supprimer (confirmation demandée).

Un produit **masqué** disparaît complètement du site public, même avec un lien direct.

---

## 5. Stock et statuts affichés

| Statut affiché | Signification |
|---|---|
| Disponible | produit commandable |
| Stock limité | quantité ≤ au seuil configuré, encore commandable |
| Rupture de stock | quantité = 0 : commande désactivée, le client peut laisser ses coordonnées |
| Indisponible | vous avez désactivé le produit : commande désactivée |

Le stock **ne descend jamais automatiquement** quand un client clique sur WhatsApp.
Mettez à jour la quantité après une vente confirmée.

---

## 6. Catégories

`Catégories` → ajouter, renommer, réordonner, masquer.
Une catégorie masquée retire ses produits du site (utile pour préparer une nouvelle gamme).
Une catégorie contenant des produits ne peut pas être supprimée.

---

## 7. Demandes clients

`Demandes` regroupe uniquement les messages envoyés **depuis le site** :

- filtre par statut (Nouvelle, Contactée, Convertie, Clôturée) et par type (Détail / Gros) ;
- recherche par nom, téléphone, produit, message ;
- fiche détaillée : coordonnées, produit, quantité, message ;
- **Statut** à faire évoluer au fil du suivi ;
- **Note interne** (enregistrée automatiquement quand vous quittez le champ) ;
- **Répondre sur WhatsApp** ouvre WhatsApp avec le numéro du client.

> Les conversations WhatsApp ne sont **pas** enregistrées ici : ce sont deux canaux
> différents, et l'interface le mentionne. Pour ne rien perdre, demandez aux clients
> d'utiliser le formulaire, ou reportez l'essentiel dans la note interne.

---

## 8. Paramètres

- **Identité** : nom de la boutique, logo.
- **Contact** : numéro WhatsApp au format international (ex. `+225 07 00 00 00 00`),
  téléphone, e-mail, localisation, zones desservies, horaires, réseaux sociaux.
  Seuls les champs remplis apparaissent sur le site.
- **Accueil** : titre et texte d'introduction.
- **Affichage et stock** : devise (XOF par défaut), seuil de stock faible, informations
  de livraison (laissées vides, le site n'annonce aucun délai).
- **SEO** : adresse du site, description par défaut, image de partage.

**Sans numéro WhatsApp**, les boutons de commande affichent un message d'aide au lieu
d'un lien cassé. C'est le premier réglage à renseigner.

---

## 9. Avant l'ouverture

1. Renseigner le numéro WhatsApp réel, le téléphone et les horaires.
2. Ajouter vos vrais produits avec **vos photos**.
3. Supprimer les produits de démonstration (tableau de bord).
4. Vérifier le rendu sur votre téléphone dans `Produits` → œil.
5. Demander à un proche de faire un essai de commande WhatsApp.
