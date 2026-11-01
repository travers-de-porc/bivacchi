# Bivacco Explorer

Le carnet de bivouacs alpins d’une équipe ni rapide, ni experte, ni franchement organisée. On part en retard, on prend le sentier à l’envers au moins une fois, et le sac pèse le poids d’un petit réfrigérateur parce qu’il est hors de question de mal manger là-haut. Mais on arrive toujours. Tard, rincés, et avec du fromage.

L’application sert à choisir le prochain bivouac depuis un téléphone ou un ordinateur. Cette première version tourne sans compte et sans backend : les modifications restent dans le navigateur utilisé. C’est simple. Presque suspect, venant de nous.

## Démarrer

Prérequis : Node.js 22.12+ et npm. La version de déploiement vérifiée est fixée dans `.node-version` (24.22.1) ; utiliser cette même version pour reproduire le build. Python 3 est nécessaire uniquement pour reconvertir le classeur source.

```sh
npm ci
npm run dev
```

Ouvrir l’URL affichée par Vite. Pour la version de production :

```sh
npm run lint
npm test
npm run build
npm run preview
```

`npm run build` vérifie TypeScript et produit le site statique dans `dist/`.

Les tests unitaires couvrent la conversion, l’import/export, les filtres et la persistance. Pour vérifier aussi les parcours dans Chromium (dont le mobile et le mode hors connexion) :

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright démarre automatiquement la prévisualisation sur le port 4173, ou réutilise celle qui fonctionne déjà. Les tests vérifient notamment le chargement des 57 photos locales, y compris sans connexion, et le carrousel photo de la carte. Une photo indisponible dans un import personnel conserve le remplacement visuel prévu.

## Ce que ça fait

- Trois façons de choisir : des cartes, une liste qu’on peut fouiller et une carte Leaflet / OpenStreetMap. Oui, ça fait beaucoup de cartes.
- Des fiches détaillées : accès selon la saison, notes, évaluations et sources du backlog.
- Une recherche et des filtres fondés sur ce qui existe vraiment dans les données, pas sur ce qu’on aimerait y trouver.
- Envies, bivouacs faits et corrections personnelles, gardés dans le navigateur.
- Import et export CSV, pour déménager le carnet ou le sauvegarder avant la catastrophe.
- Interface en français, sur téléphone comme sur ordinateur, installable et utilisable hors connexion.

## Source des données

L'application utilise **`data/Bivacco_Explorer_enrichi.csv`** : **146 lignes saisonnières regroupées en 57 lieux**, avec **57 paires de coordonnées explicites et 56 URL de photos**. `data/Bivacco_Explorer_sources_et_controles.csv` apporte les sources et les contrôles de ces 57 lieux. Leur provenance et les réserves de fiabilité sont consultables dans les fiches. `data/Bivacco_Explorer_complements.csv` corrige ou complète, ligne source par ligne source, ce qui manquait, avec une source et une date : pour l'instant la montée et l'itinéraire du Bivacco Beltrando, posé au sommet même de la Punta Rama. Les CSV fournis restent intacts.

Les **57 lieux disposent maintenant d'une photo servie localement**, dont celle de Resegotti fournie séparément. `data/photos.json` associe les URL historiques aux fichiers de `public/images/bivouacs/`, avec provenance, date de vérification et empreinte SHA-256. Trois URL en erreur ont été remplacées par des photos sourcées ; les CSV d'origine restent intacts. Le bilan détaillé et les commandes de vérification sont dans [docs/PHOTO_AUDIT.md](docs/PHOTO_AUDIT.md).

Sur la carte, cliquer un bivouac ouvre une popup avec un petit carrousel : la photo principale, puis jusqu'à trois photos de plus, dont l'intérieur quand on en a trouvé une fiable. **134 photos supplémentaires couvrent 52 lieux, dont 51 vues d'intérieur.** Elles viennent de camptocamp, refuges.info et Wikimedia Commons, sont servies localement et chaque vue affiche son auteur, sa licence et un lien vers la source. `data/photo-gallery.json` garde leur provenance et leur empreinte. Cinq lieux n'ont que leur photo principale : on n'a rien trouvé de fiable, et on préfère monter voir que deviner.

Le classeur historique **`data/Bivacco Backlog.xlsx`** et sa conversion `data/bivouacs.csv` sont conservés intacts. Pour reproduire uniquement cette conversion historique :

```sh
python3 scripts/convert_workbook.py
```

La même conversion est accessible via `npm run data:convert` ; elle ne remplace pas les deux CSV enrichis. Le fichier `data/workbook-metadata.json` conserve les métadonnées de conversion du classeur.

Les occurrences saisonnières d’un même lieu sont regroupées à l’affichage. Les champs originaux, les liens, les estimations et les différences entre saisons restent conservés. Les notes importées sont celles du classeur, sans validation externe ni nouvelle évaluation. Les correspondances et les ambiguïtés sont détaillées dans [docs/DATA_MAPPING.md](docs/DATA_MAPPING.md).

Amateurs, oui ; menteurs, non. Aucune coordonnée, cotation, condition ou photo de bivouac n’est inventée. Un lieu sans coordonnées valides reste consultable dans les cartes et listes ; il ne reçoit pas de marqueur géographique. Un lien de recherche Google Maps ne constitue pas une coordonnée.

## Sauvegardes et changements locaux

Les changements sont stockés dans `localStorage` sur cet appareil, pour l’origine exacte du site. Ils ne modifient pas le classeur et ne se synchronisent pas entre navigateurs ou appareils. Le mode privé, l’effacement des données du navigateur et un changement de domaine peuvent rendre ces données indisponibles.

La persistance utilise une enveloppe versionnée et le même format CSV validé que les sauvegardes. Une sauvegarde locale illisible ou d’une version future bloque les écritures automatiques ; conserver le fichier de récupération proposé avant de demander explicitement sa réinitialisation.

Les carnets enregistrés avant l'enrichissement ou avant les compléments sont actualisés au chargement : les valeurs inchangées reçoivent les nouvelles coordonnées, photos et données d'accès. Les corrections locales, envies, visites, notes et imports supplémentaires sont conservés, ainsi que leurs lignes source historiques. Aucune réinitialisation n'est nécessaire. La mise à jour n'écrit dans le stockage qu'à la prochaine modification enregistrée.

Exporter régulièrement via **Mes données → Exporter en CSV**, notamment avant de vider les données du navigateur ou d’importer un autre fichier. Oui, régulièrement : tout le monde connaît quelqu’un qui a perdu son carnet. Conserver cette sauvegarde hors du navigateur ; **Choisir un fichier CSV**, dans la même fenêtre, permet de la reprendre. L’export conserve les données sources ainsi que les modifications, notes et statuts personnels.

## Installer et utiliser hors connexion

Utile au fond d’un vallon sans réseau, c’est-à-dire là où l’on finit généralement par se demander où on est.

La PWA est activée dans le build de production, désactivée avec `npm run dev`. Tester avec `npm run build` puis `npm run preview` sur `localhost`, ou servir `dist/` en HTTPS.

- **Android / Chrome** : ouvrir le site puis choisir « Installer l’application » dans le menu du navigateur lorsque l’option est proposée.
- **iPhone / iPad / Safari** : Partager → « Sur l’écran d’accueil ».
- **Ordinateur** : utiliser l’action d’installation du navigateur lorsqu’elle est disponible.

Après une première ouverture en ligne et la mise en cache terminée, l’interface, le jeu de données initial et les 191 photos locales (57 principales, 134 de galerie) sont disponibles hors connexion. Elles représentent environ 35,97 Mo à télécharger pour ce premier cache : on vous avait prévenus, on part toujours trop chargés. Les modifications locales restent enregistrées. Les tuiles OpenStreetMap, les pages sources et les photos externes ajoutées par des imports personnels nécessitent une connexion. Les tuiles ne sont ni préchargées ni conservées par le service worker. Une mise à jour du site prend effet après fermeture des onglets de l’ancienne version puis réouverture, afin de ne pas interrompre une modification en cours.

## Cloudflare Workers

Le site reste entièrement statique. `wrangler.jsonc` configure le Worker **`bivacchi`** pour servir `dist/`, avec un repli SPA et des aperçus de branches. Aucun backend ou compte utilisateur n’est ajouté.

Sur l’écran GitHub **Workers → Set up your application** :

| Paramètre | Valeur |
| --- | --- |
| Project name | `bivacchi` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Path | `/` |
| Version Node.js | `24.22.1`, lue dans `.node-version` |

Envoyer d’abord la configuration Wrangler et les fichiers `package.json` / `package-lock.json` sur GitHub. Workers Builds installe les dépendances automatiquement ; laisser `SKIP_DEPENDENCY_INSTALL` non défini avec cette commande de build. Le token de déploiement est créé et géré dans le tableau de bord Cloudflare, jamais dans le dépôt.

La procédure complète, les contrôles PWA et le parcours **Cloudflare Pages en alternative** sont dans [DEPLOYMENT.md](DEPLOYMENT.md). Les chemins restent à la racine du domaine. `public/_headers` s’applique aux ressources statiques ; `public/_redirects` n’ajoute aucune règle globale.

## Architecture et suite

- `src/types/bivouac.ts` : modèle métier TypeScript, provenance et distinction entre lieux et observations datées.
- `src/lib/csv.ts` : import, normalisation, regroupement saisonnier et export sans perte des données sources.
- `src/lib/enrichment.ts` : rapprochement des contrôles et lecture de la provenance GPS/photo.
- `src/lib/photos.ts` et `data/photos.json` : résolution des photos locales sans modifier les sources ni les sauvegardes personnelles.
- `src/lib/gallery.ts` et `data/photo-gallery.json` : photos supplémentaires du carrousel de la carte, avec auteur, licence et source.
- `src/lib/seed-update.ts` : mise à jour du jeu initial sans écraser les différences personnelles.
- `src/lib/repository.ts` : persistance locale versionnée, validation et récupération des sauvegardes.
- `src/lib/filters.ts` : recherche, filtres et tri indépendants de la présentation.
- `src/hooks/useBivouacs.ts` : lien entre les données métier, le dépôt et React.
- `src/components/` : cartes, fiches, filtres, carte géographique, import/export et installation ; primitives shadcn/ui dans `ui/`.
- `src/App.tsx` et `src/index.css` : navigation, assemblage des vues et identité visuelle responsive.
- `data/` : classeur original, conversion historique, CSV enrichi et sources/contrôles.
- `scripts/` : conversion reproductible indépendante du frontend.
- `public/` : icônes, photos locales, ressources statiques et en-têtes Cloudflare.
- `wrangler.jsonc` : publication des ressources statiques sur Workers et repli SPA.
- `pwa.config.ts` : manifeste et politique de cache de l’application.

Les conventions de contribution sont dans [AGENTS.md](AGENTS.md). Les prochaines étapes sont dans [ROADMAP.md](ROADMAP.md). Supabase, la collaboration et les agents d’ingestion ne font pas partie de cette version. Chaque chose en son temps, et le nôtre est lent.
