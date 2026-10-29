# Origine et correspondance des données

## Fichier réellement fourni

Le dépôt initial contenait **`data/Bivacco Backlog.xlsx`**, et aucun `data/bivouacs.csv`. Le classeur est conservé sans modification. Le CSV utilisé par l'application est sa conversion reproductible :

```sh
python3 scripts/convert_workbook.py
```

Le script utilise seulement la bibliothèque standard Python. Il n'exécute aucune formule et n'effectue aucune requête réseau. Il extrait les valeurs calculées mises en cache dans le classeur, les expressions des formules, leurs attributs Excel (dont les formules partagées), les liens et les commentaires. `data/workbook-metadata.json` conserve les en-têtes, les commentaires de colonnes et les colonnes masquées.

| Feuille | Lignes de données | Colonnes originales |
| --- | ---: | ---: |
| Été | 38 | 25 |
| Automne | 55 | 28 |
| Hiver | 18 | 28 |
| Printemps | 35 | 30 |
| Total | **146** | **30 distinctes** |

Les lignes correspondent à **57 lieux distincts**. Une même cabane apparaît dans plusieurs feuilles avec des accès, des évaluations et des notes propres à la saison. Les 146 valeurs `État` sont `À faire`. L'altitude renseignée varie de 2 235 à 3 786 m.

## Modèle

`Bivouac` représente le lieu et contient ses métadonnées communes, ses `SeasonalProfile[]`, toutes ses `SourceRecord[]` et l'état personnel local. Les identifiants sont déterministes à partir du nom et du secteur normalisés ; une modification locale du nom ne change pas l'identifiant. Aucune fusion approximative de noms n'est pratiquée.

Chaque `SourceRecord` contient le fichier, la feuille, le numéro de ligne et **toutes les colonnes d'origine**, y compris celles qu'une future version de l'application ne connaîtrait pas. Pour les métadonnées communes, la première valeur disponible est retenue dans l'ordre du fichier (Été, Automne, Hiver, Printemps) ; les autres valeurs restent consultables dans les sources. Les divergences d'altitude ou de coordonnées sont signalées à l'import.

`TripReport` est un contrat TypeScript distinct réservé aux futurs comptes rendus datés. Aucun compte rendu, date de visite, auteur, fait récent ou observation météo n'est déduit du classeur. Ce contrat ne crée aucun backend.

## Correspondance des colonnes

| Colonne originale | Champ / traitement |
| --- | --- |
| État | `seasons[].sourceStatus` ; conservé littéralement. `Fait`/`Visité` peut initialiser `visited` lors d'un futur import. |
| Cabane / lieu | `name` |
| Photo | `imageUrl` seulement pour une URL d'image explicite ; texte, formule et lien originaux conservés. |
| Secteur | `sector`, sans déduction automatique du pays ou du massif. |
| Alt. cabane (m) | `altitudeM`, nombre ou `null`. |
| Départ été | `seasons[].summerDeparture` |
| Altitude départ été (m) | `seasons[].summerDepartureAltitudeM` |
| Départ hiver | `seasons[].winterDeparture` |
| Altitude départ hiver (m) | `seasons[].winterDepartureAltitudeM` |
| Trajet voiture | `seasons[].drivingTime`, texte d'origine. Le lieu de départ en voiture n'est pas fourni. |
| Montée (h) ≈ | `seasons[].ascentHours`, durée décimale en heures, propre à la feuille. |
| D+ (m) ≈ | `seasons[].elevationGainM`, valeur de la feuille, jamais recalculée. |
| Classement saison /5 | `seasons[].seasonRating` |
| Isolement /5 | `seasons[].isolationRating` |
| Probabilité d'être seul /5 | `seasons[].solitudeRating`, estimation relative sur 5, **pas un pourcentage ou une disponibilité**. |
| Ambiance /5 | `seasons[].atmosphereRating` |
| Vue /5 | `seasons[].viewRating` |
| Rating global /5 | `seasons[].globalRating`, entier calculé et mis en cache par Excel. |
| Score global précis | `seasons[].preciseScore`, calcul pondéré à deux décimales, colonne masquée du classeur. |
| Risque hiver | `seasons[].winterRisk`, score structurel de 1 à 5 ; **pas le bulletin d'avalanche du jour**. |
| Difficulté ski (FR) | `seasons[].skiDifficulty`, texte préservé, y compris `~`, `Non coté` et les cotations. |
| Coup de cœur | `highlight`, **texte descriptif**, jamais converti en favori personnel. |
| Description | `description` |
| Fiche officielle | `links.official`, cible HTTP(S) extraite de la formule/lien. |
| Google Maps | `links.maps` ; coordonnées extraites uniquement d'une recherche numérique explicite. |
| Photos / galerie | `links.gallery`, peut être une recherche d'images et non une photographie. |
| Source altitude / accès | `links.accessSource` |
| Source cotation C2C | `links.skiSource` |
| Fiabilité des données | `seasons[].reliability`, formulation d'origine, sans certification supplémentaire. |
| Notes originales | `seasons[].originalNotes`, préservées exactement. |

Les champs numériques absents restent `null`. Les valeurs de notes non numériques ou hors 0–5 et les durées non numériques sont laissées dans les données originales et signalées ; elles ne sont pas remplacées par des valeurs inventées. Une altitude invalide ou une paire de coordonnées invalide interrompt l'import complet.

### Colonnes ajoutées à la conversion

- `Source`, `Feuille`, `Ligne` : provenance de chaque ligne.
- `<colonne> [URL]` : vraie cible de `HYPERLINK`, d'`IMAGE` ou de la relation XML ; le libellé « Ouvrir Maps » reste conservé dans la colonne initiale.
- `<colonne> [formule]` : JSON contenant l'expression Excel et les attributs (`t`, `si`, `ref`, etc.). Les cellules partageant une formule conservent la référence Excel, même si leur expression est vide.
- `<colonne> [commentaire]` : commentaire associé à une cellule, s'il existe. Les commentaires d'en-tête du classeur sont dans `workbook-metadata.json`.

Le CSV converti compte 46 colonnes. Aucune colonne originale n'est abandonnée. Les attributs de présentation Excel (couleurs, tailles, mise en page) ne sont pas des métadonnées de bivouac ; le classeur original les conserve.

## Coordonnées et images

Il n'existe aucune colonne latitude/longitude dans le classeur. Seuls deux liens Google Maps contiennent des coordonnées numériques explicites :

| Lieu | Latitude | Longitude |
| --- | ---: | ---: |
| Cabane du berger de Chillol (coord.) | 44.565 | 6.837222 |
| Bivacco Franco Boerio | 44.61497 | 6.95069 |

Les **55 autres lieux ne sont pas positionnés**. Les identifiants de lieux Google, recherches textuelles et centres de caméra `@lat,lng` ne sont pas transformés en coordonnées. Aucun géocodage ni enrichissement extérieur n'est effectué. L'utilisateur peut renseigner une paire latitude/longitude manuellement. Les imports acceptent `Latitude`/`Longitude` ou `latitude`/`longitude`, `lat`/`lng`/`lon` ; les nombres décimaux avec virgule sont acceptés dans un champ CSV correctement délimité.

Le classeur ne contient **aucune image incorporée**. Il fournit 30 URL distinctes de photographies via des formules `IMAGE`, et des liens de recherche pour les autres lieux. Ces recherches ne sont pas traitées comme des photographies. Les URL sont conservées sans téléchargement au moment de la conversion. Leur accessibilité dépend du site d'origine ; elles ne sont pas garanties hors ligne. Les liens non HTTP(S) ne sont pas rendus cliquables.

## Ambiguïtés conservées

- Présence dans une feuille saisonnière = entrée de planification pour cette saison, sans garantie d'ouverture ni d'accessibilité.
- L'absence d'un lieu dans une saison n'est pas une interdiction ou une fermeture.
- Le score global provient de la formule existante, pas d'avis de visiteurs. Les formules restent consultables mais ne sont pas recalculées dans le frontend.
- Les durées et D+ appartiennent à leur ligne saisonnière. Les deux départs été/hiver peuvent coexister ; aucune nouvelle correspondance itinéraire/durée n'est déduite.
- Les cotations préfixées `~` et les réserves C2C sont conservées. Une cotation issue d'une course passant par la cabane ne devient pas une cotation vérifiée de l'accès.
- Les notes évoquant travaux, réservations ou fermetures en 2025/2026 restent des notes de source non datées comme observations ; elles ne sont pas présentées comme une vérification actuelle.
- Les caractères littéraux `\n` de certaines notes restent exactement ceux du classeur ; ils ne sont pas confondus avec un vrai retour à la ligne dans le CSV.
- Équipements, capacité, pays structuré, difficulté pédestre et dates de visite ne sont pas renseignés de manière homogène. Les mentions éventuelles restent dans les descriptions/notes ; aucune extraction automatique n'est effectuée.
- Aucun favori n'est déduit de « Coup de cœur ». La sélection personnelle et le statut visité sont initialement désactivés dans ce backlog.

## Import, export et fusion

Les fichiers CSV UTF-8, avec ou sans BOM, sont pris en charge. PapaParse reconnaît virgules, points-virgules, champs entre guillemets, guillemets doublés et retours à la ligne. La colonne `Cabane / lieu` est requise (alias `Nom` ou `name`). Limites : 10 000 lignes et 20 millions de caractères. Un fichier vide, une structure invalide, un nom manquant ou des coordonnées invalides sont rejetés **avant toute modification de la collection**.

L'export ajoute des colonnes lisibles pour les modifications actuelles (nom, secteur, altitude, description, latitude/longitude, sélection, visite, notes), ainsi que quatre colonnes réservées :

- `__bivacco_version` : version du format de sauvegarde (`1`).
- `__bivacco_id` : identifiant stable du lieu, même après changement de nom.
- `__bivacco_edits` : métadonnées et état local explicites en JSON.
- `__bivacco_raw` : copie exacte du `SourceRecord`, contenant aussi les colonnes inconnues et les formules originales.

L'export neutralise les cellules pouvant être interprétées comme des formules par un tableur. La copie JSON permet un réimport **sans perte** des caractères originaux. Les expressions Excel sont du texte JSON et ne sont jamais exécutées. Une version future inconnue, des colonnes réservées incomplètes ou un bloc de modifications incomplet/non reconnu sont rejetés, pour éviter une migration destructive silencieuse.

La fusion conserve les lieux existants et ajoute les nouveaux. Elle rapproche d'abord l'identifiant, puis le nom et le secteur normalisés. Les valeurs non vides des données entrantes actualisent les métadonnées affichées ; un champ absent ou vide dans un CSV ordinaire ne supprime pas une valeur existante. Toutes les lignes source distinctes sont conservées, sans dupliquer les mêmes objets source. Une sauvegarde Bivacco peut restaurer une suppression explicite d’altitude, de coordonnées ou de texte modifiable. Un CSV ordinaire conserve la sélection, le statut visité et les notes personnelles déjà présents. Un export Bivacco (`isBackup`) peut restaurer explicitement ces champs via `mergeBivouacs(..., { restorePersonalState: true })`.

Les colonnes inconnues sont toujours conservées dans `rawRecords[].values` et réexportées. Une sauvegarde Bivacco réimportée utilise `__bivacco_raw` et `__bivacco_edits` comme source fidèle ; une édition manuelle des seules colonnes visibles d'une sauvegarde ne remplace pas ces blocs. Pour importer un tableau externe modifié manuellement, retirer les quatre colonnes `__bivacco_*` et conserver la colonne de nom ; les données originales antérieures resteront dans la collection lors de la fusion.

## Vérifications

`tests/csv.test.ts` couvre le classeur réel, les coordonnées explicites, les 30 images, les formules d'origine, le réimport complet avec nom modifié et notes multilignes, les séparateurs, les champs inconnus, les imports invalides, les liens dangereux, la neutralisation de formules et la fusion des données personnelles.
