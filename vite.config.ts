import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/recipes/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MyRecipes',
        short_name: 'MyRecipes',
        description: 'Personal recipe box that works offline and syncs with Google Drive.',
        theme_color: '#f4f4f2',
        background_color: '#f4f4f2',
        display: 'standalone',
        start_url: '/recipes/',
        scope: '/recipes/',
        share_target: { action: '/recipes/', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/recipes/index.html',
        // The photo-reading engine (~7 MB) is only fetched when first used, then kept for offline use.
        globIgnores: ['**/ocr/**'],
        runtimeCaching: [{ urlPattern: /\/recipes\/ocr\//, handler: 'CacheFirst', options: { cacheName: 'ocr', expiration: { maxEntries: 10 } } }],
      },
    }),
  ],
});
