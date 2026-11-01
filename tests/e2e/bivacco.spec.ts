import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { exportBivouacsCsv, parseBivouacsCsv } from '../../src/lib/csv'

const runtimeErrors = new WeakMap<Page, string[]>()
const galleryCount: number = JSON.parse(readFileSync(new URL('../../data/photo-gallery.json', import.meta.url), 'utf8')).photos.length

// Bundled photos must work without their original hosts. Map tiles and any
// photographs from future custom imports remain external network requests.
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // The map is the default view; most scenarios then work from the mosaic.
  await expect(page.getByRole('button', { name: 'Carte géographique', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(57)
  await showCards(page)
})

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([])
})

async function showCards(page: Page, count = 57) {
  await page.getByRole('button', { name: 'Cartes', exact: true }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(count)
}

async function openArben(page: Page) {
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Arbenbiwak')
  await page.getByRole('link', { name: 'Arbenbiwak SAC', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function importFixture(page: Page, content: string, filename = 'fixture.csv') {
  await page.getByLabel('Fichier CSV à importer').setInputFiles({ name: filename, mimeType: 'text/csv', buffer: Buffer.from(content) })
}

async function expectAllLocalPhotos(page: Page) {
  // Covers and gallery photos alike: every slide of every mosaic carousel.
  const images = page.locator('.bivouac-card .photo-carousel img')
  await expect(images).toHaveCount(57 + galleryCount)
  const results = await images.evaluateAll(async elements => Promise.all(elements.map(async element => {
    const image = element as HTMLImageElement
    image.loading = 'eager'
    let decoded = true
    try { await image.decode() } catch { decoded = false }
    return {
      name: image.alt,
      path: image.getAttribute('src'),
      local: new URL(image.src).origin === window.location.origin,
      loaded: decoded && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0,
    }
  })))
  expect(results.filter(result => !result.local || !result.path?.startsWith('/images/bivouacs/') || !result.loaded)).toEqual([])
  await expect(page.locator('.bivouac-card .image-placeholder')).toHaveCount(0)
}

test('every cover and gallery photograph decodes locally, including the supplied Resegotti image, with external hosts blocked', async ({ page }) => {
  await expectAllLocalPhotos(page)
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Resegotti')
  await page.getByRole('link', { name: 'Capanna Luigina Resegotti', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const image = dialog.getByRole('region', { name: 'Photos de Capanna Luigina Resegotti' }).locator('img').first()
  await expect(image).toHaveAttribute('src', /^\/images\/bivouacs\//)
  expect(await image.evaluate(async element => {
    const photo = element as HTMLImageElement
    await photo.decode()
    return photo.naturalWidth > 0 && photo.naturalHeight > 0
  })).toBe(true)
  await expect(dialog.getByRole('link', { name: 'Source de la photo locale', exact: true })).toHaveAttribute(
    'href', 'https://www.loscarpone.cai.it/Sites/435/Media/2025/04/Resegotti%20(118).jpg',
  )
})

test('search is accent-insensitive and seasonal cards agree with the list', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('herens')
  await expect(page.locator('.bivouac-card').first()).toContainText('Hérens')
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click()
  await page.getByRole('button', { name: 'Hiver', exact: true }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(18)
  await expect(page.locator('.season-caption').first()).toHaveText('Accès hiver')
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await expect(page.locator('.bivouac-table tbody tr')).toHaveCount(18)
  await page.getByRole('button', { name: 'Toutes les saisons', exact: true }).click()
  await expect(page.locator('.bivouac-table tbody tr')).toHaveCount(57)
})

test('details navigation and personal edits survive reload with valid paired coordinates', async ({ page }) => {
  await openArben(page)
  await expect(page).toHaveURL(/#\/bivouac\/arbenbiwak-sac-/)
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: 'Arbenbiwak SAC', exact: true }).click()
  await page.getByRole('button', { name: 'Ajouter à mes envies', exact: true }).click()
  await page.getByRole('button', { name: 'Marquer comme fait', exact: true }).click()
  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  await page.getByLabel('Nom du bivouac', { exact: true }).fill('Arbenbiwak — carnet de test')
  await page.getByLabel('Mes notes personnelles', { exact: true }).fill('Note de test\nPréserver les sources.')
  await page.getByLabel('Latitude', { exact: true }).fill('45')
  await page.getByLabel('Longitude', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('ensemble la latitude et la longitude')
  await page.getByLabel('Longitude', { exact: true }).fill('7')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Arbenbiwak — carnet de test', exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Dans mes envies', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Fait, et bien mangé', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Note de test\nPréserver les sources.', { exact: true })).toBeVisible()
  await expect(page.getByText('Coordonnées : 45, 7', { exact: true })).toBeVisible()
  await expect(page.getByText('Coordonnées modifiées par vos soins. La fiabilité GPS déclarée, elle, concerne la position du fichier source.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('button', { name: 'Carte géographique', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(57)
})

test('map displays only supplied coordinates and explains unlocated selections', async ({ page }) => {
  await page.getByRole('button', { name: 'Carte géographique', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(57)
  await expect(page.locator('.map-missing-note')).toHaveCount(0)
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap')
  await page.getByRole('button', { name: 'Mes données', exact: true }).click()
  await importFixture(page, 'Cabane / lieu,Secteur,Saison\nAbri sans position (fixture),Secteur de test,Été')
  await page.getByRole('button', { name: 'Confirmer l’import', exact: true }).click()
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Abri sans position (fixture)')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0)
  await expect(page.locator('.map-missing-note')).toContainText('1 bivouac sans coordonnées')
  await expect(page.getByRole('heading', { name: 'Rien à placer sur la carte' })).toBeVisible()
})

test('Beltrando shows its sourced summit ascent while keeping the supplied rows', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Beltrando')
  await expect(page.locator('.bivouac-card')).toContainText('3 h 22')
  await page.getByRole('link', { name: 'Bivacco Beltrando', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/sommet même de la Punta Rama/).first()).toBeVisible()
  await expect(dialog.locator('.detail-stats')).toContainText('3 h 22')
  await expect(dialog.getByRole('heading', { name: 'L’itinéraire', exact: true })).toBeVisible()
  await expect(dialog.getByRole('paragraph').filter({ hasText: /cotation EEA/ })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'comune.frassinetto.to.it' })).toHaveAttribute('href', /^https:\/\/www\.comune\.frassinetto\.to\.it\//)
  await expect(dialog.locator('.source-record summary', { hasText: 'Bivacco_Explorer_complements.csv' })).toHaveCount(2)
  await expect(dialog.locator('.source-record summary', { hasText: 'Bivacco Backlog.xlsx' })).toHaveCount(2)
})

test('map popup shows a local photo carousel with interior views and credits', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Bivouac du Dolent')
  await page.getByRole('button', { name: 'Carte géographique', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1)
  await page.locator('.leaflet-marker-icon').click()
  const carousel = page.getByRole('region', { name: 'Photos de Bivouac du Dolent CAS' })
  await expect(carousel).toBeVisible()
  await expect(carousel.getByText('1 / 4', { exact: true })).toBeVisible()
  const images = carousel.locator('img')
  await expect(images).toHaveCount(4)
  const decoded = await images.evaluateAll(async elements => Promise.all(elements.map(async element => {
    const image = element as HTMLImageElement
    image.loading = 'eager'
    try { await image.decode() } catch { return false }
    return new URL(image.src).origin === window.location.origin && image.getAttribute('src')!.startsWith('/images/bivouacs/') && image.naturalWidth > 0
  })))
  expect(decoded).toEqual([true, true, true, true])
  await carousel.getByRole('button', { name: 'Photo suivante' }).click()
  await expect(carousel.getByText('2 / 4', { exact: true })).toBeVisible()
  await expect(carousel.locator('.photo-carousel-view').nth(0)).toHaveText('Intérieur')
  await expect(carousel.locator('.photo-carousel-credit')).toContainText('Photo')
  await expect(carousel.locator('.photo-carousel-credit a[rel~="license"]')).toHaveAttribute('href', /^https:\/\/creativecommons\.org\//)
  await page.getByRole('button', { name: 'Jeter un œil', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('mosaic cards and details opened from the mosaic or the list show the photo carousel', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Bivouac du Dolent')
  const card = page.locator('.bivouac-card')
  await expect(card).toHaveCount(1)
  const cardCarousel = card.getByRole('region', { name: 'Photos de Bivouac du Dolent CAS' })
  await expect(cardCarousel.getByText('1 / 4', { exact: true })).toBeVisible()
  await card.hover()
  await cardCarousel.getByRole('button', { name: 'Photo suivante' }).click()
  await expect(cardCarousel.getByText('2 / 4', { exact: true })).toBeVisible()
  await expect(cardCarousel.locator('.photo-carousel-view')).toHaveText('Intérieur')
  await expect(cardCarousel.locator('img').nth(1)).toHaveAttribute('title', /^Photo : .+ · CC BY/)
  // The photo itself still opens the details, as the single mosaic image did.
  await cardCarousel.locator('figure:not([inert]) .photo-carousel-open').click()
  const details = page.getByRole('dialog').getByRole('region', { name: 'Photos de Bivouac du Dolent CAS' })
  await expect(details.getByText('1 / 4', { exact: true })).toBeVisible()
  await expect(details.locator('.photo-carousel-credit')).toContainText('Photo')
  await details.getByRole('button', { name: 'Photo suivante' }).click()
  await expect(details.getByText('2 / 4', { exact: true })).toBeVisible()
  await expect(details.locator('.photo-carousel-credit a[rel~="license"]')).toHaveAttribute('href', /^https:\/\/creativecommons\.org\//)
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('button', { name: 'Liste', exact: true }).click()
  await page.locator('.table-name').click()
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Photos de Bivouac du Dolent CAS' }).locator('img')).toHaveCount(4)
})

test('enriched GPS reliability and source controls remain visible in the details', async ({ page }) => {
  for (const [name, reliability] of [
    ['Bivacco Carpano', 'à vérifier : sources discordantes'],
    ['Bivacco Antigine', 'indicative'],
  ]) {
    await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill(name)
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByText(`Fiabilité GPS déclarée : ${reliability}`, { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Source des coordonnées GPS', exact: true })).toHaveAttribute('href', /^https?:\/\//)
    const controls = page.locator('.source-record').filter({ has: page.locator('summary', { hasText: 'Sources et contrôles' }) })
    await controls.locator('summary').click()
    await expect(controls.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'GPS [fiabilité]', exact: true }) })).toContainText(reliability)
    await expect(controls).toContainText('Bivacco_Explorer_sources_et_controles.csv')
    // The photo status is no longer summarised in the details, but its source value stays in the controls row.
    await expect(page.getByText(/Photo — statut dans le fichier source :/)).toHaveCount(0)
    await expect(controls.getByRole('rowheader', { name: 'Photo [statut]', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  }
})

test('a previous local notebook receives enrichment without losing edits or imported places', async ({ page }) => {
  const source = await readFile(new URL('../../data/bivouacs.csv', import.meta.url), 'utf8')
  const legacy = parseBivouacsCsv(source, 'Bivacco Backlog.xlsx').bivouacs
  const arben = legacy.find(item => item.name === 'Arbenbiwak SAC')!
  arben.name = 'Arbenbiwak — mon carnet existant'
  arben.wishlist = true
  arben.visited = true
  arben.personalNotes = 'Note conservée avant enrichissement.'
  arben.coordinates = { lat: 45.5, lng: 7.25 }
  legacy.push(...parseBivouacsCsv('Cabane / lieu,Secteur,Saison\nAbri ajouté avant enrichissement,Mon secteur,Été', 'import-personnel.csv').bivouacs)
  const backup = JSON.stringify({ version: 1, csv: exportBivouacsCsv(legacy), savedAt: '2026-10-01T00:00:00.000Z' })
  await page.evaluate(value => localStorage.setItem('bivacco-explorer:v1', value), backup)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await showCards(page, 58)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Abri ajouté avant enrichissement', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Carte géographique', exact: true }).click()
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(57)
  await page.getByRole('button', { name: 'Cartes', exact: true }).click()
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Arbenbiwak')
  await page.getByRole('link', { name: arben.name, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Dans mes envies', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Fait, et bien mangé', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(arben.personalNotes, { exact: true })).toBeVisible()
  await expect(page.getByText('Coordonnées : 45.5, 7.25', { exact: true })).toBeVisible()
  await expect(page.getByText('Coordonnées modifiées par vos soins. La fiabilité GPS déclarée, elle, concerne la position du fichier source.', { exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Saison des données affichées' }).getByRole('button')).toHaveCount(arben.seasons.length)
  await expect(page.locator('summary').filter({ hasText: 'Sources et contrôles' })).toBeVisible()
})

test('CSV import is previewed, malformed input is rejected, and the download restores personal state', async ({ page }) => {
  await openArben(page)
  await page.getByRole('button', { name: 'Ajouter à mes envies', exact: true }).click()
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('button', { name: 'Mes données', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter en CSV', exact: true }).click()
  const download = await downloadPromise
  const filePath = await download.path()
  expect(filePath).toBeTruthy()
  const backup = await readFile(filePath!, 'utf8')
  expect(backup).toContain('__bivacco_raw')
  expect(backup).toContain('__bivacco_edits')
  await importFixture(page, 'Cabane / lieu,Latitude,Longitude\nAbri de test,91,7')
  await expect(page.getByRole('alert')).toContainText('paire valide')
  await expect(page.getByRole('button', { name: 'Confirmer l’import' })).toHaveCount(0)
  await importFixture(page, 'Cabane / lieu,Secteur,Saison,Alt. cabane (m),Colonne personnelle\nAbri de test (fixture),Secteur de test,Été,2000,À conserver')
  await expect(page.locator('.import-preview')).toContainText('1 lignes · 1 lieux détectés')
  await page.getByRole('button', { name: 'Confirmer l’import', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('1 lieux importés')
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(58)
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await showCards(page)
  await page.getByRole('button', { name: 'Mes données', exact: true }).click()
  await importFixture(page, backup, 'sauvegarde.csv')
  await expect(page.locator('.import-preview')).toContainText('restaure aussi vos envies')
  await page.getByRole('button', { name: 'Confirmer l’import', exact: true }).click()
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: /Mes envies/ }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(1)
  await expect(page.locator('.bivouac-card')).toContainText('Arbenbiwak SAC')
})

test('phone navigation, filters, and details fit a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('navigation', { name: 'Navigation mobile' })).toBeVisible()
  await expect(page.locator('.header-actions > button').last()).toHaveAccessibleName('Mes données')
  await expect(page.locator('.install-button')).toHaveAccessibleName('Installer l’application')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Filtres', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Hiver', exact: true }).click()
  await page.getByRole('button', { name: 'Afficher 18 bivouacs', exact: true }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(18)
  await page.locator('.card-content h3 a').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const bounds = await page.getByRole('dialog').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('button', { name: /Mes envies/ }).click()
  await expect(page.getByRole('heading', { name: 'Aucune envie ? Vraiment ?' })).toBeVisible()
})

test('production service worker makes all local photographs and saved wishes available after an offline reload', async ({ page, context }) => {
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await openArben(page)
  await page.getByRole('button', { name: 'Ajouter à mes envies', exact: true }).click()
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await showCards(page)
  // Most photos have never been displayed in this test: they must come from
  // the service worker's precache, not from requests made while scrolling online.
  await expectAllLocalPhotos(page)
  await page.getByRole('textbox', { name: 'Rechercher un bivouac' }).fill('Resegotti')
  await page.getByRole('link', { name: 'Capanna Luigina Resegotti', exact: true }).click()
  const offlinePhoto = page.getByRole('dialog').getByRole('region', { name: 'Photos de Capanna Luigina Resegotti' }).locator('img').first()
  expect(await offlinePhoto.evaluate(async element => {
    const image = element as HTMLImageElement
    await image.decode()
    return image.naturalWidth > 0 && image.naturalHeight > 0
  })).toBe(true)
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click()
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: /Mes envies/ }).click()
  await expect(page.locator('.bivouac-card')).toHaveCount(1)
  await expect(page.locator('.bivouac-card')).toContainText('Arbenbiwak SAC')
})
