# Feuille de route — Bivacco Explorer

Le plan. Comme tous nos plans, il sera suivi dans le désordre et avec du retard, mais on finira par arriver au bout.

## Phase 1 · Carnet local

*Fait. Contre toute attente.*

Première version : interface française responsive React / TypeScript, données du classeur conservées dans un CSV, exploration par cartes et liste, fiches détaillées, filtres, carte Leaflet / OpenStreetMap, envies et visites, édition locale, import/export CSV et installation PWA. Hébergement statique configuré sur Cloudflare Workers, avec Pages en alternative.

Les deux CSV enrichis fournis complètent désormais les 57 lieux avec leurs coordonnées et 56 URL de photos. Les sources, contrôles et incertitudes restent consultables ; les anciens carnets locaux sont mis à jour sans réinitialiser les modifications personnelles.

Les données manquantes restent explicites. Les scores et les accès du backlog gardent leur provenance et leur saison. Une occurrence dans une feuille saisonnière n’est pas une observation datée des conditions de terrain.

## Phase 2 · Persistance partagée

*Ou la fin des CSV qui circulent par messagerie.*

- Introduire Supabase PostgreSQL, Auth et Storage derrière le contrat de persistance existant.
- Migrer les sauvegardes locales sans perdre les données sources ni les modifications personnelles.
- Ajouter comptes, règles d’accès par groupe, historique des modifications et gestion des conflits.
- Enrichir progressivement les coordonnées, la capacité et l’équipement avec leurs sources ; ne pas déduire ces faits d’un simple nom ou secteur.
- Définir la stratégie hors ligne et la synchronisation avant d’activer les écritures collaboratives.

## Phase 3 · Choisir et partir ensemble

*Le plus dur restera de décider qui porte la fondue.*

- Listes partagées et sélections de bivouacs entre amis.
- Votes et notes personnelles distincts des scores importés.
- Planification de sorties, participants et historique des visites.
- Comparaison de lieux avec provenance explicite des données manquantes ou contradictoires.

## Phase 4 · Collecte de récits de sorties

*Lire ce que d’autres ont vécu, avant de le revivre plus lentement.*

- Développer des agents Python séparés du frontend.
- Collecter les récits de sources autorisées avec URL, auteur, date de sortie, date de publication et date de collecte.
- Préserver l’extrait source et les éventuelles restrictions d’utilisation.
- Ajouter une validation humaine, la déduplication et un suivi des erreurs avant publication.

## Phase 5 · Observations structurées

*Savoir s’il reste de la neige avant d’y aller. Pour une fois.*

- Utiliser xAI pour proposer des extractions liées à chaque récit, avec confiance et provenance.
- Séparer neige, accès routier, occupation, eau et état des itinéraires des caractéristiques permanentes d’un bivouac.
- Dater chaque observation et rendre visibles les contradictions et informations périmées.
- Ne jamais convertir silencieusement une estimation ou un témoignage en état actuel garanti.

## Phase 6 · Historique et recherche

*Demander à la machine où il reste de la place. Et de l’eau.*

- Explorer l’évolution saisonnière et historique des observations.
- Mettre en place une recherche sémantique et des questions en langage naturel avec citations des récits.
- Combiner filtres structurés et recherche textuelle sans masquer les limites des sources.
- Évaluer la qualité des réponses et des extractions sur des exemples vérifiés.

Rien de tout ça n’existe encore dans la version locale. L’ordre et le périmètre évolueront selon l’usage réel du carnet, et probablement selon la météo.
