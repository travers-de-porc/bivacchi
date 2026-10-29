import type { VitePWAOptions } from 'vite-plugin-pwa'

/** Cache application assets only. OpenStreetMap tiles remain network requests. */
export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'prompt',
  injectRegister: 'auto',
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    id: '/',
    name: 'Bivacco Explorer',
    short_name: 'Bivacco',
    description: 'Votre carnet de bivouacs alpins : explorer, choisir et préparer la prochaine échappée.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#173e34',
    background_color: '#f7f7f2',
    categories: ['travel', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2,csv,json}'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    // Never prefetch or persist map tiles, remote photos, or external source pages.
    runtimeCaching: [],
  },
  devOptions: { enabled: false },
}
