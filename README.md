# Bivacco Explorer

Un carnet personnel de bivouacs alpins, en français, conçu pour préparer la prochaine sortie depuis un téléphone ou un ordinateur. Cette première version fonctionne sans compte et sans backend : les modifications restent dans le navigateur utilisé.

## Démarrer

Prérequis : Node.js 22.12+ (ou Node.js 24 LTS) et npm. Python 3 est nécessaire uniquement pour reconvertir le classeur source.

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

Playwright démarre automatiquement la prévisualisation sur le port 4173, ou réutilise celle qui fonctionne déjà. Les photos externes sont remplacées par une illustration neutre lorsqu’elles ne peuvent pas être chargées.

## Fonctionnalités

- Exploration par cartes, liste recherchable et carte Leaflet / OpenStreetMap.
- Fiches détaillées avec accès saisonniers, notes, évaluations et sources du backlog.
- Recherche et filtres fondés sur les attributs réellement présents dans les données.
- Liste d’envies, statut visité et modifications personnelles conservés localement.
- Import et export CSV pour déplacer et sauvegarder les données.
- Interface responsive en français, manifeste et service worker pour installation mobile.

## Source des données

Le fichier fourni dans ce dépôt est **`data/Bivacco Backlog.xlsx`**. Le CSV annoncé initialement était absent. Le classeur original est conservé intact ; un script reproductible extrait les données de ses quatre feuilles saisonnières dans `data/bivouacs.csv`.

```sh
python3 scripts/convert_workbook.py
```

La même conversion est accessible via `npm run data:convert`. Le jeu initial contient **146 lignes saisonnières, regroupées en 57 lieux**, avec **deux paires de coordonnées explicites**. Le fichier `data/workbook-metadata.json` conserve les métadonnées de conversion du classeur.

Les occurrences saisonnières d’un même lieu sont regroupées à l’affichage. Les champs originaux, les liens, les estimations et les différences entre saisons restent conservés. Les notes importées sont celles du classeur, sans validation externe ni nouvelle évaluation. Les correspondances et les ambiguïtés sont détaillées dans [docs/DATA_MAPPING.md](docs/DATA_MAPPING.md).

Aucune coordonnée, cotation, condition ou photo de bivouac n’est inventée. Un lieu sans coordonnées valides reste consultable dans les cartes et listes ; il ne reçoit pas de marqueur géographique. Un lien de recherche Google Maps ne constitue pas une coordonnée.

## Sauvegardes et changements locaux

Les changements sont stockés dans `localStorage` sur cet appareil, pour l’origine exacte du site. Ils ne modifient pas le classeur et ne se synchronisent pas entre navigateurs ou appareils. Le mode privé, l’effacement des données du navigateur et un changement de domaine peuvent rendre ces données indisponibles.

La persistance utilise une enveloppe versionnée et le même format CSV validé que les sauvegardes. Une sauvegarde locale illisible ou d’une version future bloque les écritures automatiques ; conserver le fichier de récupération proposé avant de demander explicitement sa réinitialisation.

Utiliser **Exporter CSV** régulièrement, notamment avant de vider les données du navigateur ou d’importer un autre fichier. Conserver cette sauvegarde hors du navigateur ; **Importer CSV** permet de la reprendre. L’export conserve les données sources ainsi que les modifications, notes et statuts personnels.

## Installer et utiliser hors connexion

La PWA est activée dans le build de production, désactivée avec `npm run dev`. Tester avec `npm run build` puis `npm run preview` sur `localhost`, ou servir `dist/` en HTTPS.

- **Android / Chrome** : ouvrir le site puis choisir « Installer l’application » dans le menu du navigateur lorsque l’option est proposée.
- **iPhone / iPad / Safari** : Partager → « Sur l’écran d’accueil ».
- **Ordinateur** : utiliser l’action d’installation du navigateur lorsqu’elle est disponible.

Après une première ouverture en ligne et la mise en cache terminée, l’interface, le jeu de données initial et les ressources locales sont disponibles hors connexion. Les modifications locales restent enregistrées. Les tuiles OpenStreetMap, les pages sources et les éventuelles images distantes nécessitent une connexion. Les tuiles ne sont ni préchargées ni conservées par le service worker. Une mise à jour du site prend effet après fermeture des onglets de l’ancienne version puis réouverture, afin de ne pas interrompre une modification en cours.

## Cloudflare Pages

Ce dépôt produit un site entièrement statique. Aucune clé, variable secrète, base de données ou fonction serveur n’est requise.

Configurer un projet Cloudflare Pages avec :

| Paramètre | Valeur |
| --- | --- |
| Dossier racine | Racine de ce dépôt |
| Commande de build | `npm ci && npm run build` |
| Dossier de sortie | `dist` |
| Version de Node.js | `24` |

Les fichiers `public/_redirects` et `public/_headers` fournissent le repli SPA et des en-têtes adaptés aux ressources et au service worker. Le site est conçu pour être servi à la racine d’un domaine. Aucun déploiement n’est nécessaire pour le développement local.

## Architecture et suite

- `src/types/bivouac.ts` : modèle métier TypeScript, provenance et distinction entre lieux et observations datées.
- `src/lib/csv.ts` : import, normalisation, regroupement saisonnier et export sans perte des données sources.
- `src/lib/repository.ts` : persistance locale versionnée, validation et récupération des sauvegardes.
- `src/lib/filters.ts` : recherche, filtres et tri indépendants de la présentation.
- `src/hooks/useBivouacs.ts` : lien entre les données métier, le dépôt et React.
- `src/components/` : cartes, fiches, filtres, carte géographique, import/export et installation ; primitives shadcn/ui dans `ui/`.
- `src/App.tsx` et `src/index.css` : navigation, assemblage des vues et identité visuelle responsive.
- `data/` : classeur original et CSV extrait.
- `scripts/` : conversion reproductible indépendante du frontend.
- `public/` : icônes, ressources statiques et configuration Cloudflare Pages.
- `pwa.config.ts` : manifeste et politique de cache de l’application.

Les conventions de contribution sont dans [AGENTS.md](AGENTS.md). Les prochaines étapes sont dans [ROADMAP.md](ROADMAP.md). Supabase, la collaboration et les agents d’ingestion ne font pas partie de cette version.
