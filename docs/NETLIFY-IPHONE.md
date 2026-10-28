# Déploiement Netlify depuis un iPhone

Les fichiers du projet existant ont été modifiés directement ; la structure React, Express et administration a été conservée.

## Corrections et cause des incidents

Les boutons publics dépendaient d’un numéro vide dans les paramètres, puis affichaient une notice au lieu d’un lien. Ils utilisent maintenant systématiquement https://wa.me/2250788880307 et encodeURIComponent pour le texte. Ce sont des liens HTML natifs, sans fenêtre ouverte après un appel asynchrone. WhatsApp ouvre une conversation avec un texte prérempli ; le client doit encore envoyer le message.

Les requêtes de vérification du site publié vers /api/public/products et /media/mvqo811nb4b52db4e53b-480.webp ont renvoyé HTTP 404. Netlify publiait uniquement dist ; Express était chargé de servir /api et /media depuis data/uploads. Vite ne copiait pas ce dossier. Le dépôt contient 42 fichiers WebP d’uploads et les originaux JPG. Trois variantes du visuel sheets-white référencées dans le manifeste étaient absentes. Le traitement Vite copie désormais les 42 fichiers sans les modifier et reconstitue ces trois variantes à partir du JPG original associé. Il ne crée aucun produit ni prix. Les chemins publics existants /images/... restent valides.

Aucun fichier SQLite silima.db ni archive ZIP n’est présent dans les fichiers fournis. Le manifeste d’images ne contient pas les fiches produit. Il est donc impossible de restaurer les vrais produits, stocks et paramètres uniquement à partir de ce dépôt. Les images groupées sont prêtes à être servies, mais l’affichage des fiches exige une API et sa base réelle. Un message explicite remplace désormais une réponse API absente ou HTML.

## Depuis Safari sur iPhone

1. Ouvrez GitHub et vérifiez que les modifications sont enregistrées dans la branche main du dépôt connecté au site. Conservez tous les dossiers, notamment assets-source, data/uploads, scripts et public. Ne téléversez jamais de fichiers .env ni une base contenant des comptes clients.
2. Ouvrez app.netlify.com et sélectionnez le projet Silima Shop. Activez « Version pour ordinateur » dans Safari si nécessaire.
3. Dans la configuration de compilation, conservez la commande npm run build:client et le dossier de publication dist. Le fichier netlify.toml les définit déjà.
4. Dans Deploys, lancez un nouveau déploiement de main. La compilation génère automatiquement les images /media et les règles de navigation React. Un ZIP des sources ne peut pas être déposé directement comme site compilé dans Netlify Drop : utilisez le dépôt Git connecté.
5. Après publication, ouvrez /contact puis un bouton WhatsApp. Vérifiez le numéro et le texte avant tout envoi. Lorsque l’API est raccordée, ouvrez aussi une fiche produit, choisissez taille/design et vérifiez le message ; testez sur Safari iPhone, Android et un ordinateur.

## Raccordement indispensable de l’API

Le dossier server n’est pas automatiquement exécuté par l’hébergement statique Netlify. Les fonctions d’administration, connexion, uploads, formulaires, stock et catalogue dynamique nécessitent le serveur et les données réelles.

Si le serveur Express existant est déjà hébergé en HTTPS, ajoutez dans les variables de compilation Netlify SILIMA_BACKEND_ORIGIN avec son origine HTTPS réelle, sans chemin, identifiants ni paramètres, puis redéployez. Aucune adresse de serveur n’a été inventée. Le traitement génère un proxy de même origine pour /api/* et /media/* ; cela conserve les appels administrateur, cookies et uploads existants. Les images déjà groupées sont prioritaires ; les nouvelles photos sont récupérées auprès du backend. Vérifiez que le serveur reçoit les en-têtes de proxy, accepte le domaine public et utilise des cookies sécurisés ; contrôlez la connexion et le maintien de session après configuration.

Si aucun backend n’existe, il faut d’abord déployer l’API et restaurer la base réelle. Une adaptation entièrement Netlify exige une migration du schéma SQLite vers Netlify Database (Postgres), des uploads vers Netlify Blobs et des routes/authentification vers les services Netlify appropriés. Cette migration complète n’a pas été effectuée dans cette correction ciblée. N’exécutez pas SQLite ou les uploads locaux dans des fonctions éphémères pour conserver des données.

Sans origine backend configurée, /api renvoie un statut 503 explicite. Les boutons de contact WhatsApp restent utilisables. Aucun formulaire ne prétend avoir été enregistré quand l’API ne fonctionne pas.

## Vérifications réalisées

npm run typecheck a réussi. Le test ./node_modules/.bin/tsx tests/catalogue-fixes.test.mts a vérifié le numéro exact, le décodage du message français, le prix, les sélections, le remplacement d’une image cassée, les 45 variantes du manifeste et la copie identique des 42 uploads. La préparation d’assets a été exercée dans un dossier temporaire. La compilation de production est exécutée par la validation automatique de la plateforme ; aucune commande de build n’a été lancée pendant cette intervention. Le résultat du build et le contenu final de dist restent à contrôler dans le déploiement. Aucun test sur appareil physique n’a été effectué.
