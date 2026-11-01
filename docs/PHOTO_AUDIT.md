# Vérification des photos — 1er novembre 2026

## Résultat

Les 56 URL de photographies du CSV enrichi ont été testées par **GET avec suivi des redirections et validation TLS**, puis les réponses ont été décodées comme images. La photo de Resegotti fournie séparément a été contrôlée de la même façon.

- 53 URL historiques fonctionnent au téléchargement ; 3 renvoient une erreur HTTP reproductible.
- Resegotti : la photo fournie fonctionne et complète les 56 photos historiques.
- Trois photos de remplacement ont été identifiées sur des pages nommant explicitement le lieu, téléchargées, décodées et inspectées.
- **57 fichiers locaux**, soit **24 647 415 octets** (environ 24,65 Mo), sont maintenant inclus dans le site. Les fichiers téléchargés sont conservés sans recadrage, recompression ni transformation.

Le nombre de six échecs observés dans le navigateur n'a pas été reproduit à l'identique : trois erreurs HTTP sont confirmées par téléchargement. Le contrôle distant dans le Chromium de cet environnement rencontre des erreurs de certificats qui ne sont pas attribuées aux sites ; la validation TLS n'a pas été désactivée. Le test navigateur du site local vérifie quant à lui les **57 images décodées avec les requêtes externes bloquées**, puis leur disponibilité hors connexion.

## Remplacements

| Lieu | Erreur de l'ancienne URL | Photo retenue et provenance |
| --- | --- | --- |
| Bivacco Matteo Corradini | 400, service d'image refuge.camp | [CAI UGET Torino](https://www.caiuget.it/cai/trekking-ad-anello-fra-i-bivacchi-dellalta-val-susa/), crédit « Foto Arch. E. Barni ». |
| Bivacco Camposecco | 404, Aree Protette Ossola | [CAI Villadossola](https://organizzazione.cai.it/sez-villadossola/sottosezioni/rifugi-e-bivacchi/), photo sous « Bivacco di Camposecco ». |
| Refuge du Pigeonnier | 410, Altituderando | [Site officiel FFCAM](https://refugedupigeonnier.ffcam.fr/home.html), image intitulée « Refuge du pigeonnier ». |
| Capanna Luigina Resegotti | Photo absente du CSV | [Photo Loscarpone fournie par l'utilisateur](https://www.loscarpone.cai.it/Sites/435/Media/2025/04/Resegotti%20%28118%29.jpg). |

Les URL originales, les résultats HTTP et leurs dates restent dans `data/photos.json`. Les CSV fournis sont inchangés. Aucune autorisation de réutilisation n'est déduite d'une URL ; les crédits connus et les sources sont conservés.

## Galerie photo

Un petit carrousel montre la photo principale ci-dessus, puis jusqu'à trois photos supplémentaires, dont l'intérieur lorsqu'une photo fiable existe. Il apparaît dans la popup de la carte (vue par défaut), sur chaque carte de la mosaïque et en tête de la fiche d'un lieu. Ces photos ont leur propre catalogue, `data/photo-gallery.json` ; `data/photos.json` et ses 57 entrées n'ont pas changé.

- **134 photos pour 52 lieux** : 51 intérieurs, 71 extérieurs et 12 vues des alentours, soit 11 321 010 octets (environ 11,32 Mo).
- Sources ouvertes et attribuables uniquement : camptocamp.org (images collaboratives CC BY-SA 3.0, personnelles CC BY-NC-ND 3.0), refuges.info (CC BY-SA 2.0 FR) et Wikimedia Commons (licence propre à chaque fichier). Répartition : 60 photos refuges.info, 52 camptocamp (39 collaboratives, 13 personnelles) et 22 Commons (8 CC BY-SA 4.0, 6 CC BY-SA 3.0, 2 CC BY-SA 2.5, 1 CC BY-SA 2.0 FR, 2 CC BY 3.0, 1 CC BY 4.0, 2 CC0).
- Recherche par proximité des coordonnées déclarées : fiches camptocamp et refuges.info voisines, fichiers Commons géolocalisés à quelques centaines de mètres, puis recherche Commons par nom. Chaque candidate a été regardée : elle doit montrer ce lieu, sans topo annoté ni portrait au premier plan. Le classement intérieur, extérieur ou alentours vient de cet examen ; la légende de la source est conservée dans `sourceTitle`.
- Homonymes et voisins écartés : le Refuge du Pigeonnier de Wissembourg (Commons), le Bivacco dal Bianco voisin de la Punta Penia (camptocamp), le Bivouac Leonessa du Valnontey pour Leonesi, et l'ancien ricovero de l'Alpetto devenu musée, pour ne pas le présenter comme l'intérieur du refuge actuel.
- Fichiers servis tels que la source les fournit, sans recadrage ni recompression : déclinaison `MI` de camptocamp (400 px), image `reduite` de refuges.info (700 px) et vignette Commons de 960 px. `url` est l'adresse téléchargée ; `sourceUrl`, la page de la photo, avec l'ancre du commentaire pour refuges.info.
- `takenOn` est une date de prise de vue fournie par la source. `publishedOn` est la date du commentaire refuges.info : la photo peut être plus ancienne. La popup affiche l'année disponible. Une photo montre l'état du jour où elle a été prise, pas l'état actuel.
- Trois commentaires refuges.info anonymes restent sans auteur : aucun nom n'est inventé. Le crédit Commons « The original uploader was Orobicon at Italian Wikipedia » est abrégé en « Orobicon (Wikipédia en italien) ».
- Cinq lieux n'ont pas de galerie : Capanna Luigina Resegotti (seule photo trouvée centrée sur une personne), rifugio Vittorio Raffaele Leonesi (seulement une carte), Bivouac Fanton, Bivacco Beltrando et Bivacco Camposecco (aucune photo trouvée). Leur photo principale s'affiche seule.
- La popup et la fiche affichent sous chaque photo son auteur, sa licence, l'année connue et un lien vers la source. Dans la mosaïque, où la place manque, ce crédit est l'info-bulle de la photo, et il est complet dès qu'on ouvre la popup ou la fiche.
- La galerie n'apparaît que si la photo principale est la photo cataloguée du lieu. Un import personnel avec une autre photo garde la sienne, sans galerie.
- Les images personnelles camptocamp (CC BY-NC-ND) sont utilisées sans modification dans ce carnet non commercial. Un usage commercial du site imposerait de les retirer ou d'obtenir l'accord des auteurs.

## Intégration et maintenance

- `data/photos.json` relie l'identifiant du lieu, l'URL d'origine, l'URL téléchargée, la page source et le chemin local. Il contient aussi dimensions, taille, SHA-256, date et crédit connu. `data/photo-gallery.json` contient les mêmes informations de fichier pour la galerie, avec la vue, l'auteur, la licence et les dates.
- `src/lib/gallery.ts` assemble les photos du carrousel et `src/components/PhotoCarousel.tsx` les affiche. Depuis que la mosaïque et les fiches l'utilisent aussi, le catalogue de galerie est inclus dans le bundle principal (environ 20 Ko compressés).
- Les noms sous `public/images/bivouacs/` contiennent les 12 premiers caractères du SHA-256 ; Cloudflare peut les servir avec un cache immutable. Une autre image reçoit un autre nom.
- `src/lib/photos.ts` résout la photo pour l'affichage sans changer `Bivouac.imageUrl`, les données originales ou les sauvegardes. Les carnets existants bénéficient donc des photos locales sans réinitialisation. Une photo importée avec une autre URL garde sa propre source.
- Vite copie les fichiers dans `dist/images/bivouacs/`. Le build n'effectue aucun téléchargement réseau et aucune variable d'environnement n'est nécessaire.
- La PWA précache les 191 fichiers (57 photos principales et 134 de galerie). La limite par fichier est de 6 Mio pour inclure l'original Regondi-Gavazzi de 5,58 Mo, un JPEG contenant des métadonnées MPO et décodable par Chromium. Le premier cache télécharge environ 35,97 Mo de photos (24,65 Mo de photos principales, 11,32 Mo de galerie) ; elles sont disponibles hors connexion lorsque ce cache est terminé. Les tuiles OpenStreetMap et les photos externes des imports restent hors de ce cache.

Vérifier les fichiers locaux, avec Python 3 et sa bibliothèque standard :

```sh
python3 scripts/verify_photos.py
```

Restaurer un fichier manquant ou endommagé depuis son URL auditée :

```sh
python3 scripts/verify_photos.py --restore
```

La restauration exige le même SHA-256 et la même taille. Si la photo distante a changé, elle échoue sans remplacer le fichier local ; il faut revoir la photo, sa provenance et son entrée de catalogue. Les téléchargements de travail dans `local-data/` sont ignorés par Git. Les fichiers sous `public/images/bivouacs/` et le catalogue doivent être versionnés.

Validation de l'application :

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

## Inventaire des fichiers servis

Toutes les URL retenues ci-dessous ont retourné HTTP 200 et une image décodable lors du contrôle. L'empreinte complète et l'heure de chaque contrôle sont dans le catalogue.

| Lieu | HTTP initial | Dimensions | Taille (octets) | Source de la photo locale |
| --- | ---: | --- | ---: | --- |
| Bivouac au Col de la Dent Blanche CAS | 200 | 1200 × 628 | 117218 | [Source](<https://www.sac-cas.ch/processed/sa2020assetsprod/c/f/csm_1530092624_976780551master_fa3a549d12.jpg>) |
| Arbenbiwak SAC | 200 | 800 × 600 | 109948 | [Source](<https://www.myswitzerland.com/-/media/st/gadmin/images/destinations/summer/huts/sac_arbenbiwak_2008_227662.jpg>) |
| Stockhornbiwak SAC | 200 | 1334 × 1000 | 238978 | [Source](<https://www.bergsteigen.com/fileadmin/_processed_/d/1/csm_stockhronbiwak-9_1de5692693.jpg>) |
| Capanna Luigina Resegotti | Absente | 5345 × 3563 | 2934518 | [Source](<https://www.loscarpone.cai.it/Sites/435/Media/2025/04/Resegotti%20(118).jpg>) |
| Schalijochbiwak SAC | 200 | 1280 × 800 | 164250 | [Source](<https://www.sac-cas.ch/de/huetten-und-touren/sac-tourenportal/schalijochbiwak-sac-2147000238/hochtouren/>) |
| Bivacco Matteo Corradini | 400 | 768 × 576 | 185912 | [Source](<https://www.caiuget.it/cai/trekking-ad-anello-fra-i-bivacchi-dellalta-val-susa/>) |
| rifugio Vittorio Raffaele Leonesi | 200 | 1086 × 506 | 101296 | [Source](<https://www.caitorino.it/rifugi/leonesi/>) |
| Bivacco Ivrea | 200 | 768 × 576 | 56228 | [Source](<https://d2exd72xrrp1s7.cloudfront.net/www/000/1k1/19/191l043nejeq41hwxm02gejrlv20ow8p3d-uhi652725/0?crop=true&height=576&width=768>) |
| Refuge des Bouquetins CAS | 200 | 1200 × 750 | 181706 | [Source](<https://www.sac-cas.ch/en/huts-and-tours/sac-route-portal/refuge-des-bouquetins-cas-2147000041/mountain-hiking/>) |
| Rifugio Carmagnola (Bivacco) | 200 | 710 × 400 | 72641 | [Source](<https://www.google.com/search?tbm=isch&q=Rifugio+Carmagnola+%28Bivacco%29+refuge+bivouac+montagne+photo>) |
| Bivacco Città di Varese | 200 | 800 × 600 | 145250 | [Source](<https://www.parks.it/parco.alta.valle.antrona/gallery_dettaglio.php?id=6812>) |
| Bivacco Carpano | 200 | 414 × 620 | 271477 | [Source](<https://www.saliinvetta.com/images/TREKKING/BivaccoCarpanoDalRifugioPontese/BivaccoCarpanoInterno.JPG>) |
| Bivouac Fanton | 200 | 1217 × 694 | 162764 | [Source](<https://siviaggia.it/wp-content/uploads/sites/2/2021/11/Bivouac-fanton-DEMOGO-1020-min.jpg>) |
| Refuge des Grands Mulets | 200 | 1920 × 1080 | 314450 | [Source](<https://www.alpinewelten.com/cdn/uploads/refuge-des-grands-moulets-aussen.jpg>) |
| Capanna Punta Penia | 200 | 1280 × 960 | 148077 | [Source](<https://www.fassa.com/en/services/rifugio-capanna-punta-penia>) |
| Bivacco Sommeiller | 200 | 1200 × 554 | 104237 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Sommeiller+refuge+bivouac+montagne+photo>) |
| Bivacco Rivolta | 200 | 400 × 400 | 35474 | [Source](<https://www.inalto.org/en/reports/hiking/bivouac-turned-etirol>) |
| Bivacco Passera all’Alta Luce | 200 | 642 × 481 | 90195 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Passera+all%E2%80%99Alta+Luce+refuge+bivouac+montagne+photo>) |
| Cabane de Bertol CAS | 200 | 2448 × 1800 | 616120 | [Source](<https://media.myswitzerland.com/image/fetch/c_lfill%2Cg_auto%2Cw_3200%2Ch_1800/f_auto%2Cq_80%2Cfl_keep_iptc/https%3A/www.myswitzerland.com/-/media/st/gadmin/images/destinations/summer/huts/sac_bertol_2009_226886.jpg>) |
| Rifugio Chiarella Amiante | 200 | 900 × 430 | 119509 | [Source](<https://www.caitorino.it/rifugi/chiarella/>) |
| Bivacco Antigine | 200 | 1200 × 750 | 278601 | [Source](<https://www.sac-cas.ch/de/huetten-und-touren/sac-tourenportal/bivacco-antigine-2147436126/>) |
| Refuge Bivouac de Chalance | 200 | 1200 × 900 | 532710 | [Source](<https://www.google.com/search?tbm=isch&q=Refuge+Bivouac+de+Chalance+refuge+bivouac+montagne+photo>) |
| Bivacco Walter Blais | 200 | 2560 × 1707 | 789276 | [Source](<https://hellyandthemountains.fr/2023/10/10/lac-dambin-et-bivacco-walter-blais-2930m/>) |
| Rifugio Monzino | 200 | 1600 × 1063 | 311171 | [Source](<https://dhc423.blogspot.com/2010/07/rifugio-monzino-part-ii.html>) |
| Refuge des Dents du Midi | 200 | 1200 × 628 | 165168 | [Source](<https://www.sac-cas.ch/en/huts-and-tours/sac-route-portal/refuge-des-dents-du-midi-2147000075/mountain-hiking/>) |
| Bivacco Penne Nere | 200 | 1000 × 563 | 77007 | [Source](<https://www.abitarelestremo.it/bivacco-penne-nere/>) |
| Mischabelhütte AACZ | 200 | 1200 × 628 | 250470 | [Source](<https://www.sac-cas.ch/processed/sa2020assetsprod/1/6/csm_1552317828_553814119master_eac9d85b02.jpg>) |
| Bivacco Fiorio | 200 | 640 × 480 | 276296 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Fiorio+refuge+bivouac+montagne+photo>) |
| Bivouac du Dolent CAS | 200 | 1600 × 1200 | 497890 | [Source](<https://cdn.prod.rexby.com/image/6d46892854d1422291b303faa3669de5>) |
| Cabane de Valsorey CAS | 200 | 1600 × 1071 | 337763 | [Source](<https://www.camptocamp.org/waypoints/113058/fr/cabane-de-valsorey-cas>) |
| Bivacco Ulrich Lateltin | 200 | 1600 × 1200 | 349531 | [Source](<https://www.rexby.com/penultimaparada/ttd/aventura-no-bivacco-ulrich-lateltin>) |
| Baltschiederklause SAC | 200 | 1280 × 800 | 297491 | [Source](<https://www.sac-cas.ch/processed/sa2020assetsprod/0/2/csm_1623330332_1114747699master_4f4b2a7851.jpg>) |
| Bivacco Elio Bonfante alle Camoscere | 200 | 1024 × 512 | 202384 | [Source](<https://www.alpicuneesi.it/rifugi/vallemaira/bivaccobonfante.htm>) |
| Bivacco Salvasera | 200 | 1078 × 718 | 224024 | [Source](<https://www.bivouak.net/refuges/refuge-625-bivacco-salvasera.html>) |
| Bivacco Reboulaz | 200 | 768 × 576 | 77840 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Reboulaz+refuge+bivouac+montagne+photo>) |
| Bivacco Regondi-Gavazzi | 200 | 5184 × 3456 | 5584222 | [Source](<https://www.caidesio.net/j3/index.php/la-sezione/rifugi/bivacco-regondi-gavazzi-2590-m>) |
| Refuge Nacamuli au col Collon | 200 | 900 × 430 | 156335 | [Source](<https://www.caitorino.it/rifugi/nacamuli/>) |
| Bivacco Beltrando | 200 | 800 × 451 | 59107 | [Source](<https://www.google.com/search?tbm=isch&q=Punta+Rama+refuge+bivouac+montagne+photo>) |
| Bivacco Camposecco | 404 | 2560 × 1920 | 934725 | [Source](<https://organizzazione.cai.it/sez-villadossola/sottosezioni/rifugi-e-bivacchi/>) |
| Bivacco Menabreaz | 200 | 480 × 320 | 194357 | [Source](<https://www.theflintstones.it/montagna/escursionismo/bivacchi.aspx?COD=58>) |
| Bivacco Varrone | 200 | 800 × 600 | 207414 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Varrone+refuge+bivouac+montagne+photo>) |
| Bivouac Luca Vuerich | 200 | 818 × 543 | 105852 | [Source](<https://static.designboom.com/wp-content/uploads/2013/12/giovannipesamosca_bivacco-luca-vuerich_db_07.jpg>) |
| Bivacco Tzan | 200 | 1200 × 630 | 136749 | [Source](<https://cms.outtrip.fr/assets/_1200x630_crop_center-center_82_none/Bivacco-Tzan.jpeg?mtime=1676631907>) |
| Bivacco Bonelli | 200 | 2048 × 1365 | 602006 | [Source](<https://www.komoot.com/it-it/highlight/1610776>) |
| Refuge du Pigeonnier | 410 | 640 × 480 | 34353 | [Source](<https://refugedupigeonnier.ffcam.fr/home.html>) |
| Bivacco Farello | 200 | 1600 × 900 | 309642 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Farello+refuge+bivouac+montagne+photo>) |
| Laggin Biwak | 200 | 1280 × 800 | 125768 | [Source](<https://www.sac-cas.ch/processed/sa2020assetsprod/f/0/csm_1504766991_1684337261master_e08184a299.jpg>) |
| Cabane du Fenestral | 200 | 600 × 600 | 106073 | [Source](<https://www.suisseterroir.ch/common/showPhoto.asp?Fieldname=File1&ID=4593&Objectname=_Mod_adresseFiles>) |
| Bivacco Mario Perona (Cima del Bosco) | 200 | 768 × 576 | 48989 | [Source](<https://d2exd72xrrp1s7.cloudfront.net/www/000/1k9/1w/1wnw0cb3ia6s2emp92glcxmmo5d4fqs3l-uhi86205615/0?crop=true&height=576&width=768>) |
| Rifugio Alpetto | 200 | 2048 × 1536 | 1857884 | [Source](<https://img2.oastatic.com/img2/62566998/max/rif--alpetto.jpg>) |
| Cabane du berger de Chillol (coord.) | 200 | 720 × 540 | 66127 | [Source](<https://www.iso-maps.com/en/mountain-huts/france/alpes-de-haute-provence/cabane-du-berger-de-chillol>) |
| Bivacco Aldo Frattini | 200 | 700 × 394 | 54315 | [Source](<https://www.google.com/search?tbm=isch&q=Bivacco+Aldo+Frattini+refuge+bivouac+montagne+photo>) |
| Rifugio Mario Bezzi | 200 | 4000 × 3000 | 2746912 | [Source](<https://de-academic.com/dic.nsf/dewiki/2560569>) |
| Rifugio Fauniera | 200 | 640 × 480 | 147846 | [Source](<https://www.1001puertos.com/2020/11/colle-fauniera-por-pradleves.html>) |
| Bivacco Grivola | 200 | 480 × 320 | 201474 | [Source](<https://www.theflintstones.it/montagna/escursionismo/bivacchi.aspx?Cod=36&RIF=bivacco-grivola>) |
| Bivacco Franco Boerio | 200 | 600 × 450 | 63046 | [Source](<https://www.fred-38.fr/medias/images/bric-de-rubren-photo.jpg>) |
| Bivacco Luciano Gratton | 200 | 760 × 505 | 66349 | [Source](<https://www.inalto.org/relazioni/escursionismo/bivacco-gratton-da-cretaz>) |
