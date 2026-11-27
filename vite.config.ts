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
        theme_color: '#1f6f5c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/recipes/',
        scope: '/recipes/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { navigateFallback: '/recipes/index.html' },
    }),
  ],
});
