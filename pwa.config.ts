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
    description: 'Carnet de bivouacs alpins pour marcheurs lents, sacs trop lourds et apéros en altitude.',
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
    // The largest bundled original photograph (Regondi-Gavazzi) is 5.58 MB.
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    // Never prefetch or persist map tiles, remote photos, or external source pages.
    runtimeCaching: [],
  },
  devOptions: { enabled: false },
}
