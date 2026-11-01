
# Bivacco Explorer — Agent Instructions

## Project overview

Bivacco Explorer is a mobile-first collaborative PWA for discovering, documenting, comparing and selecting alpine bivouacs.

The long-term goal is to build an intelligent bivouac database enriched by AI agents collecting and analyzing trip reports from external websites.

## Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Leaflet + OpenStreetMap
- Supabase (PostgreSQL, Auth, Storage) — future phases
- Cloudflare Pages — hosting
- Python + xAI — future AI ingestion agents

Prefer simple, widely adopted libraries and minimal dependencies.

## Architecture principles

- Keep the application modular and maintainable.
- Separate UI components, business logic, data models and persistence.
- Use strict TypeScript types.
- Avoid overengineering and unnecessary abstractions.
- Design the persistence layer so local storage can later be replaced by Supabase.
- Keep external data ingestion separate from the frontend.
- Preserve source provenance for future AI-extracted observations.

## Data

- The original dataset is in `data/`.
- Inspect its actual structure before defining mappings.
- Preserve existing attributes and information.
- Never fabricate geographical coordinates, route descriptions, ratings or conditions.
- Represent missing information explicitly.
- Keep bivouac metadata separate from dated trip reports.
- Preserve imported data during schema changes.

## UI/UX

- Mobile-first responsive design.
- French user-facing interface.
- Clean, modern alpine/outdoor aesthetic.
- Prioritize usability, maps, filtering and information density.
- Avoid generic enterprise dashboard styling.
- Ensure the application remains usable on desktop.

## Voice and tone

- French copy with dry, self-deprecating, tongue-in-cheek humour in the spirit of Top Gear / Jeremy Clarkson. Never generic, corporate or poetic-inspirational.
- The crew are amateurs: slow, not very efficient, often doing things backwards or sideways, but they always get there in the end. They carry far too much so they can eat and drink well at the top, and arrive later and more tired for it.
- Keep the humour in headings, descriptions, empty states, help text and errors. Buttons, form labels and accessibility names stay short and unambiguous; errors still say what went wrong and what to do.
- Jokes never invent facts or blur provenance: no made-up conditions, ratings, coordinates or reviews. Keep the existing disclaimers (imported ratings are not current reviews, seasonal access is not a live report, missing data is shown explicitly).
- Vary the running gags (slowness, getting lost, heavy packs, food and drink) instead of repeating the same joke on every screen.

## Development workflow

- Inspect existing code before making changes.
- Reuse existing components and patterns.
- Implement requested features directly rather than only proposing plans.
- Make reasonable technical decisions autonomously.
- Keep changes focused and avoid unrelated refactoring.
- Run lint and production build after significant changes.
- Fix errors introduced by changes.
- Update README and ROADMAP when relevant.
- Never commit API keys, credentials or secrets.

## Current development phase

Phase 1: Local-first PWA.

- Use the supplied spreadsheet as the initial dataset.
- Use localStorage for local changes.
- No backend, authentication or external AI calls yet.
- Prepare for future collaboration without implementing it prematurely.

## Future phases

1. Supabase integration and collaborative editing.
2. Shared wishlists, ratings, votes and trip planning.
3. AI-powered collection of external trip reports.
4. Structured extraction of snow, access, occupancy and route conditions.
5. Historical analysis and semantic search.

Do not implement future phases unless explicitly requested.

## Phase 1 repository conventions

- `data/Bivacco Backlog.xlsx` is the supplied original. Do not overwrite it. The initially requested CSV did not exist; `scripts/convert_workbook.py` generates `data/bivouacs.csv` from the four seasonal sheets using Python's standard library.
- The current bundled dataset is `data/Bivacco_Explorer_enrichi.csv`, joined with `data/Bivacco_Explorer_sources_et_controles.csv` by normalized name and sector. Preserve both supplied files. The original conversion remains a historical baseline for upgrading existing local storage; do not regenerate it from the enriched files.
- `src/lib/enrichment.ts` preserves the full controls row in source attributes without adding a seasonal profile. Display declared GPS/photo provenance, including uncertainty, separately from local coordinate corrections. `src/lib/seed-update.ts` compares old, current and new values to preserve personal changes; the repository records the applied seed revision when saving. Future dataset revisions need an explicit migration, not a storage reset. `data/Bivacco_Explorer_complements.csv` holds dated, sourced complements: each row completes one supplied source row (`Complète [source]`/`[feuille]`/`[ligne]`) and is applied by `src/lib/complements.ts`; never edit the supplied CSVs for corrections. Changing the bundled seed means a new revision in `src/hooks/useBivouacs.ts` that keeps the previous seed for migration (current: `complements-2026-11`).
- Read `docs/DATA_MAPPING.md` before changing mappings or import/export behavior. Preserve the original fields, seasonal rows, formulas, link labels and targets even when the UI uses normalized values.
- `src/types/` owns strict domain types; `src/lib/` owns CSV conversion and shared business rules; `src/components/` owns React presentation. Keep persistence isolated from UI so a future Supabase adapter can replace localStorage.
- Keep one place distinct from its seasonal access records. Seasonal ratings are imported assessments, not live conditions. Future trip reports must be separately dated and source-backed.
- Do not geocode names or treat Google Maps search URLs as coordinates. Render map markers only from explicit, valid latitude/longitude pairs. Missing coordinates must not hide a place from list or detail views.
- Keep imported scores separate from personal wishlist/visited state and editing. Source ratings must never be presented as current community reviews.
- French applies to labels, errors, empty states, forms and accessibility names. Maintain keyboard access and visible focus indicators.
- Use existing shadcn/ui primitives and Tailwind conventions. Prefer native browser APIs and small, focused modules over new dependencies.
- Preserve unknown imported columns during editing and CSV export. Malformed CSV or storage must fail visibly without silently overwriting existing data.
- Before significant changes are finished, run `npm run lint`, `npm test` for data/persistence changes, and `npm run build`. Inspect responsive layouts when browser preview is available.
- `pwa.config.ts` precaches application and local data assets only. Do not add bulk download or persistent caching of OpenStreetMap tiles. Keep the OSM attribution visible.
- Bundled photographs are original downloaded files in `public/images/bivouacs/`; `data/photos.json` records source URLs, replacements, credits, dimensions, checksums and verification dates. Keep their hashed filenames and provenance. `src/lib/photos.ts` resolves these known photos for display without changing `Bivouac.imageUrl`, CSV evidence or personal imports. Run `python3 scripts/verify_photos.py` after changing assets; all bundled photos must remain in the PWA precache. See `docs/PHOTO_AUDIT.md`.
- The map is the default view. `src/components/PhotoCarousel.tsx` (map popup, mosaic cards, detail dialog) shows the cover then the entries of `data/photo-gallery.json` through `src/lib/gallery.ts`; popup and details show each photo's credit, the mosaic keeps it as the image tooltip. Gallery photos come only from openly licensed, attributable sources (camptocamp, refuges.info, Wikimedia Commons), are visually checked to show that place, keep author, licence, source page and dates, and are stored as served by the source. A place whose cover is not the catalogued one shows no gallery. Label a photo interior, exterior or surroundings only after looking at it.
- `public/_headers` and `public/_redirects` target a static Cloudflare Pages deployment at the domain root. Keep the manifest and service worker revalidatable; hashed assets can be immutable.
- Do not introduce backend calls, authentication, remote AI calls, scraping or deployment credentials into phase 1.
