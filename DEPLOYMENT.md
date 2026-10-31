# Déployer Bivacco Explorer V1 sur Cloudflare

Procédure vérifiée le 30 octobre 2026. Le dépôt local utilise la branche `main` et le remote `git@github.com:travers-de-porc/bivacchi.git`. Le parcours actuel est **Cloudflare Workers avec Static Assets et l’intégration GitHub**. `wrangler.jsonc` fournit la configuration de publication ; aucun code serveur n’est nécessaire. L’ancien parcours Pages reste décrit comme alternative en section 4.

## Sur l’écran Workers « Set up your application »

Avant de cliquer **Deploy**, envoyer sur GitHub `wrangler.jsonc`, `package.json`, `package-lock.json` et la documentation mise à jour (voir section 3). Cloudflare construit la version de GitHub, pas les fichiers du poste local.

| Champ de l’écran | Valeur |
| --- | --- |
| Project name | `bivacchi`, identique au `name` de `wrangler.jsonc` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Enable Preview builds | Peut rester activé |
| Protect with Cloudflare Access | Désactivé pour cette V1 publique sans authentification |
| Advanced settings → Path | `/` |
| API token | Garder **Create new token** ; Cloudflare gère ce token pour les builds |

Il n’y a pas de champ « Build output directory » : `assets.directory` dans `wrangler.jsonc` indique `./dist`. Aucun token ne doit être copié dans le dépôt ou dans une variable `VITE_*`. Une fois les fichiers poussés, cliquer **Deploy** puis ouvrir l’URL `*.workers.dev` renvoyée. Garder `main` comme branche de production dans les réglages du projet. [Configuration Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Workers Builds installe automatiquement les dépendances détectées depuis le lockfile et lit `.node-version`. Pour la commande ci-dessus, laisser **`SKIP_DEPENDENCY_INSTALL` non défini** ; supprimer cette variable si elle avait été ajoutée en suivant les instructions Pages. Ne pas définir `NODE_ENV=production` ou `NPM_CONFIG_OMIT=dev` pendant l’installation : Vite et Wrangler sont des dépendances de développement. [Image de build Workers](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/).

Wrangler est installé dans les dépendances de développement et verrouillé par `package-lock.json`. La commande actuelle `wrangler preview` demande une version au moins égale à **4.135.0** et le bloc `previews` de `wrangler.jsonc` ; celui-ci reste vide car l’application n’a pas de paramètres serveur distincts. [Worker Previews](https://developers.cloudflare.com/workers/previews/get-started/).

Le déploiement sert seulement les fichiers de `dist/`. `assets.not_found_handling: "single-page-application"` active le repli SPA. Le fichier `_headers` existant est pris en charge pour les ressources statiques ; `_redirects` reste sans règle globale. [Static Assets](https://developers.cloudflare.com/workers/static-assets/), [en-têtes Workers](https://developers.cloudflare.com/workers/static-assets/headers/).

## 1. Préparer et vérifier les fichiers

Utiliser Node.js **24.22.1**, version fixée dans `.node-version`. Avec `nvm`, par exemple :

```sh
nvm install 24.22.1
nvm use 24.22.1
npm ci
npm run lint
npm test
npm run build
```

Le build vérifie TypeScript et produit `dist/`, dont `index.html`, `assets/`, `manifest.webmanifest`, `registerSW.js`, `sw.js`, les icônes, `_headers` et `_redirects`. Le fichier `package-lock.json` est versionné et doit rester synchronisé avec `package.json`. Aucun script de conversion Python n’est nécessaire sur Cloudflare : les CSV de `data/` sont incorporés au build. Inclure les deux fichiers enrichis dans le commit envoyé à GitHub.

Pour examiner le résultat localement :

```sh
npm run preview
```

Ouvrir l’adresse `localhost` affichée. Pour les parcours automatisés, y compris mobile et PWA hors connexion :

```sh
npx playwright install chromium
npm run test:e2e
```

Les essais locaux ne valident pas les en-têtes HTTP appliqués par Cloudflare ; les contrôler après la première publication (section 5).

## 2. Préserver les données personnelles et les secrets

- **Données initiales à conserver dans Git** : `data/Bivacco Backlog.xlsx`, `data/bivouacs.csv`, `data/workbook-metadata.json`, `data/Bivacco_Explorer_enrichi.csv` et `data/Bivacco_Explorer_sources_et_controles.csv`. Les CSV, y compris leurs notes et sources d’origine, sont incorporés au JavaScript livré aux visiteurs. Un dépôt GitHub privé ne rend pas le site déployé privé.
- **Modifications personnelles** : envies, visites, notes et imports restent dans le `localStorage` du navigateur ; ils ne sont pas lus par le build et ne sont pas envoyés à GitHub ou Cloudflare.
- **Sauvegardes téléchargées** : les noms `bivacco-explorer-*.csv` et `bivacco-recuperation*.json` sont ignorés. Placer les fichiers personnels renommés ou les imports de travail dans `backups/`, `exports/` ou `local-data/`, également ignorés. Ne pas les copier dans `data/` ou `public/` : `public/` est publié intégralement, même pour un fichier ignoré par Git lors d’un build local.
- **Fichiers locaux** : `.env`, `.env.*`, `.dev.vars*`, `.npmrc`, `.aws/`, `.codex/`, `.agents/`, `.wrangler/`, clés privées, logs, dépendances, `dist/` et résultats des tests sont exclus. `.env.example` peut être suivi, mais doit contenir uniquement des exemples sans secret.

V1 ne nécessite aucune variable `VITE_*`. Toute variable préfixée `VITE_` utilisée par le frontend est publique dans le build ; ne jamais y mettre une clé ou un token. [Variables exposées par Vite](https://vite.dev/guide/env-and-mode). `.gitignore` ne protège pas un fichier déjà suivi : inspecter les fichiers à publier avant chaque commit.

```sh
git status --short --untracked-files=all
git ls-files -ci --exclude-standard
git diff --check
git diff
```

La deuxième commande doit rester sans sortie : elle signale les fichiers déjà suivis qui correspondent désormais à une exclusion.

## 3. Envoyer la préparation sur GitHub

Le remote existe déjà ; ne pas réinitialiser le dépôt ni remplacer son historique. Vérifier la destination et la branche :

```sh
git remote -v
git branch --show-current
```

Après revue des changements, depuis `main` :

```sh
git add wrangler.jsonc package.json package-lock.json README.md DEPLOYMENT.md
git diff --cached --check
git diff --cached
git commit -m "Configure Cloudflare Workers static deployment"
git push -u origin main
```

Le dépôt GitHub attendu est [travers-de-porc/bivacchi](https://github.com/travers-de-porc/bivacchi). Si `main` est protégée, faire le commit sur une branche et fusionner une pull request avant le premier déploiement. Si un push est refusé parce que le remote a évolué, synchroniser et résoudre les éventuels conflits ; ne pas forcer le push.

## 4. Alternative : créer un projet Cloudflare Pages

Cette section concerne uniquement le parcours **Pages**. Si vous utilisez l’écran **Workers** décrit en haut du document, passer directement à la section 5.

1. Ouvrir le tableau de bord Cloudflare, puis **Workers & Pages → Create application → Pages → Connect to Git** (ou **Import an existing Git repository** selon l’écran).
2. Choisir **GitHub**, puis installer/autoriser l’application Cloudflare pour le dépôt **`travers-de-porc/bivacchi`**. L’accès à ce seul dépôt suffit.
3. Sélectionner le dépôt, puis **Begin setup**. Une branche doit déjà avoir été poussée sur GitHub pour apparaître dans la liste.
4. Renseigner les paramètres ci-dessous. Utiliser le flux **Pages**, qui publie le résultat statique du build. [Guide officiel d’intégration Git](https://developers.cloudflare.com/pages/get-started/git-integration/).

| Paramètre | Valeur exacte |
| --- | --- |
| Project name | `bivacco-explorer`, si ce nom est disponible dans le compte |
| Production branch | `main` |
| Framework preset | `None` ; les champs de build sont renseignés explicitement |
| Root directory | Laisser vide : racine du dépôt |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Build system | Image v3 |
| Version Node.js | `24.22.1`, détectée via `.node-version` |

Ajouter la variable de build **`SKIP_DEPENDENCY_INSTALL=1`** dans **Production** et **Preview** : l’installation est alors effectuée une seule fois par `npm ci` dans la commande ci-dessus. Ne pas définir `NODE_ENV=production` ou `NPM_CONFIG_OMIT=dev` pour l’installation : Vite, TypeScript et le plugin PWA sont des dépendances de développement nécessaires au build. Supprimer un ancien `NODE_VERSION` contradictoire, ou lui donner exactement `24.22.1`. [Versions et installation des dépendances](https://developers.cloudflare.com/pages/configuration/build-image/).

5. Cliquer **Save and Deploy**. Contrôler dans les logs la version Node, le succès de `npm ci`, du build TypeScript/Vite et de la génération du service worker.
6. Ouvrir l’URL HTTPS `*.pages.dev` renvoyée par Cloudflare. Si le nom proposé a dû être changé, utiliser cette URL réelle.
7. Dans les réglages de build, conserver `main` comme branche de production. Les autres branches et pull requests peuvent produire des aperçus ; vérifier les contrôles de branches selon le fonctionnement souhaité. Les prochains pushs sur `main` déclencheront les mises à jour. [Intégration GitHub](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/).

L’application n’a besoin d’aucun backend ni secret applicatif. Le token du système de publication est géré par Cloudflare. La présente préparation ne crée pas de projet Cloudflare et n’effectue pas de publication.

## 5. Vérifier le site publié et la PWA

Le site est conçu pour la **racine d’un domaine**, par exemple `https://bivacchi.<sous-domaine-du-compte>.workers.dev/` ou une URL Pages, sans préfixe `/bivacchi/`. Vite utilise sa base `/` ; le manifeste fixe `id`, `start_url` et `scope` à `/`, et les URL des icônes commencent aussi par `/`. Aucun chemin du poste de développement n’est utilisé.

Les fiches utilisent des URL `/#/bivouac/<identifiant>`. Le fragment est traité dans le navigateur, sans route serveur supplémentaire. Sur Workers, le repli est déclaré dans `wrangler.jsonc` avec `assets.not_found_handling`. Dans l’alternative Pages, Pages fournit son **repli SPA natif** tant qu’il n’y a pas de `404.html` à la racine de `dist/`. `_redirects` reste volontairement sans règle : une règle globale `/* /index.html 200` peut intercepter les ressources existantes. [Routage SPA de Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), [priorité des redirections](https://developers.cloudflare.com/pages/configuration/redirects/).

Après publication :

1. Vérifier les 57 lieux initiaux, la recherche, les filtres, les fiches et les 57 marqueurs issus des coordonnées explicites du CSV enrichi. Vérifier les mentions de fiabilité GPS dans les fiches. Recharger directement l’URL d’une fiche.
2. Dans **DevTools → Network**, vérifier que le JavaScript et le CSS sous `/assets/` sont servis avec leur bon type, et non avec du HTML. `/sw.js` doit être du JavaScript, `/manifest.webmanifest` du JSON de manifeste et les icônes de vraies images.
3. Contrôler les en-têtes de `/`, `/sw.js`, `/registerSW.js` et `/manifest.webmanifest` : `Cache-Control: no-cache`. Les fichiers hashés de `/assets/` ont `Cache-Control: public, max-age=31536000, immutable`. `_headers` est une configuration des ressources statiques, pas une page à visiter.
4. Dans **DevTools → Application**, vérifier le manifeste, ses icônes 192/512 px et maskable, puis le service worker actif avec portée `/`.
5. Attendre la fin de la mise en cache, recharger pour être contrôlé par le service worker, passer le navigateur hors connexion et recharger de nouveau. Le carnet doit rester utilisable. Les photos distantes et les tuiles OpenStreetMap demandent Internet ; les tuiles ne sont pas mises en cache par l’application.
6. Tester une envie, une visite et une note, puis recharger. Tester l’export CSV. Installer l’application depuis Chrome/Android ou via **Partager → Sur l’écran d’accueil** sur Safari/iOS.

Exemple de contrôle HTTP, en remplaçant le domaine par l’URL Workers ou Pages effectivement renvoyée :

```sh
curl -I https://votre-site.workers.dev/
curl -I https://votre-site.workers.dev/sw.js
curl -I https://votre-site.workers.dev/manifest.webmanifest
curl -I https://votre-site.workers.dev/icons/icon-192.png
```

## 6. Mises à jour, domaine et retour arrière

Avant de passer de `localhost` au site hébergé, d’un aperçu à la production ou à un domaine personnalisé, exporter le carnet depuis **Mes données**, puis importer le CSV sur la nouvelle adresse. Le stockage du navigateur est propre à chaque origine ; il n’est pas transféré automatiquement. Choisir l’adresse principale avant d’installer la PWA sur les téléphones.

Une mise à jour se prépare avec lint/tests/build, puis un push ou une fusion sur `main`. La PWA attend que les anciens onglets et fenêtres installées soient fermés avant d’activer la nouvelle version. En cas d’affichage ancien, fermer toutes les fenêtres de l’application puis la rouvrir en ligne ; ne pas effacer le stockage du navigateur pour forcer la mise à jour.

Dans l’alternative Pages, pour un domaine personnel, passer par **Pages → projet → Custom domains → Set up a domain** et suivre les instructions DNS du tableau de bord. Vérifier le HTTPS avant de réinstaller la PWA à cette adresse. [Domaines personnalisés](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Dans l’alternative Pages, pour revenir à une version publiée précédente : **Pages → projet → Deployments**, choisir un déploiement de production réussi, puis **Rollback to this deployment**. Aligner ensuite le code de `main` avec la correction voulue avant le push suivant. Un retour arrière du site ne restaure ni ne supprime les données locales des navigateurs. [Retours arrière Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/).
