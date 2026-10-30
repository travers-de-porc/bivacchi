# Déployer Bivacco Explorer V1 sur Cloudflare Pages

Procédure vérifiée le 30 octobre 2026. Le dépôt local utilise déjà la branche `main` et le remote `git@github.com:travers-de-porc/bivacchi.git`. Le déploiement repose sur l’intégration GitHub native de **Cloudflare Pages** : aucune GitHub Action, clé API ou configuration Wrangler n’est nécessaire.

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

Le build vérifie TypeScript et produit `dist/`, dont `index.html`, `assets/`, `manifest.webmanifest`, `registerSW.js`, `sw.js`, les icônes, `_headers` et `_redirects`. Le fichier `package-lock.json` est versionné et doit rester synchronisé avec `package.json`. Aucun script de conversion Python n’est nécessaire sur Cloudflare : `data/bivouacs.csv` est déjà suivi par Git.

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

- **Données initiales à conserver dans Git** : `data/Bivacco Backlog.xlsx`, `data/bivouacs.csv` et `data/workbook-metadata.json`. Le CSV, y compris ses notes et sources d’origine, est incorporé au JavaScript livré aux visiteurs. Un dépôt GitHub privé ne rend pas le site Pages privé.
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
git add .gitignore .node-version public/_redirects README.md DEPLOYMENT.md
git diff --cached --check
git diff --cached
git commit -m "Prepare Cloudflare Pages deployment"
git push -u origin main
```

Le dépôt GitHub attendu est [travers-de-porc/bivacchi](https://github.com/travers-de-porc/bivacchi). Si `main` est protégée, faire le commit sur une branche et fusionner une pull request avant le premier déploiement. Si un push est refusé parce que le remote a évolué, synchroniser et résoudre les éventuels conflits ; ne pas forcer le push.

## 4. Créer le projet Cloudflare Pages

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

Le site n’a besoin d’aucun binding, backend ou secret. La présente préparation ne crée pas de projet Cloudflare et n’effectue pas de publication.

## 5. Vérifier le site publié et la PWA

Le site est conçu pour la **racine d’un domaine**, par exemple `https://bivacco-explorer.pages.dev/`, sans préfixe `/bivacchi/`. Vite utilise sa base `/` ; le manifeste fixe `id`, `start_url` et `scope` à `/`, et les URL des icônes commencent aussi par `/`. Aucun chemin du poste de développement n’est utilisé.

Les fiches utilisent des URL `/#/bivouac/<identifiant>`. Le fragment est traité dans le navigateur, sans route serveur supplémentaire. Pour les chemins inconnus, Pages fournit son **repli SPA natif** tant qu’il n’y a pas de `404.html` à la racine de `dist/`. `_redirects` reste volontairement sans règle : une règle globale `/* /index.html 200` peut intercepter les ressources existantes. [Routage SPA de Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/), [priorité des redirections](https://developers.cloudflare.com/pages/configuration/redirects/).

Après publication :

1. Vérifier les 57 lieux initiaux, la recherche, les filtres, les fiches et les deux marqueurs issus des coordonnées présentes dans la source. Recharger directement l’URL d’une fiche.
2. Dans **DevTools → Network**, vérifier que le JavaScript et le CSS sous `/assets/` sont servis avec leur bon type, et non avec du HTML. `/sw.js` doit être du JavaScript, `/manifest.webmanifest` du JSON de manifeste et les icônes de vraies images.
3. Contrôler les en-têtes de `/`, `/sw.js`, `/registerSW.js` et `/manifest.webmanifest` : `Cache-Control: no-cache`. Les fichiers hashés de `/assets/` ont `Cache-Control: public, max-age=31536000, immutable`. `_headers` est une configuration Pages, pas une page à visiter.
4. Dans **DevTools → Application**, vérifier le manifeste, ses icônes 192/512 px et maskable, puis le service worker actif avec portée `/`.
5. Attendre la fin de la mise en cache, recharger pour être contrôlé par le service worker, passer le navigateur hors connexion et recharger de nouveau. Le carnet doit rester utilisable. Les photos distantes et les tuiles OpenStreetMap demandent Internet ; les tuiles ne sont pas mises en cache par l’application.
6. Tester une envie, une visite et une note, puis recharger. Tester l’export CSV. Installer l’application depuis Chrome/Android ou via **Partager → Sur l’écran d’accueil** sur Safari/iOS.

Exemple de contrôle HTTP, en remplaçant l’URL par celle du déploiement :

```sh
curl -I https://bivacco-explorer.pages.dev/
curl -I https://bivacco-explorer.pages.dev/sw.js
curl -I https://bivacco-explorer.pages.dev/manifest.webmanifest
curl -I https://bivacco-explorer.pages.dev/icons/icon-192.png
```

## 6. Mises à jour, domaine et retour arrière

Avant de passer de `localhost` à Pages, d’un aperçu à la production ou à un domaine personnalisé, exporter le carnet depuis **Mes données**, puis importer le CSV sur la nouvelle adresse. Le stockage du navigateur est propre à chaque origine ; il n’est pas transféré automatiquement. Choisir l’adresse principale avant d’installer la PWA sur les téléphones.

Une mise à jour se prépare avec lint/tests/build, puis un push ou une fusion sur `main`. La PWA attend que les anciens onglets et fenêtres installées soient fermés avant d’activer la nouvelle version. En cas d’affichage ancien, fermer toutes les fenêtres de l’application puis la rouvrir en ligne ; ne pas effacer le stockage du navigateur pour forcer la mise à jour.

Pour un domaine personnel, passer par **Pages → projet → Custom domains → Set up a domain** et suivre les instructions DNS du tableau de bord. Vérifier le HTTPS avant de réinstaller la PWA à cette adresse. [Domaines personnalisés](https://developers.cloudflare.com/pages/configuration/custom-domains/).

Pour revenir à une version publiée précédente : **Pages → projet → Deployments**, choisir un déploiement de production réussi, puis **Rollback to this deployment**. Aligner ensuite le code de `main` avec la correction voulue avant le push suivant. Un retour arrière du site ne restaure ni ne supprime les données locales des navigateurs. [Retours arrière Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/).
