import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base relativa: funziona sia in locale sia su GitHub Pages (/Diagramma-ER/)
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0') },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'ER Studio',
        short_name: 'ER Studio',
        description: 'Diagrammi ER in notazione Chen, esportati in PDF A4 riapribile',
        lang: 'it',
        start_url: '.',
        display: 'standalone',
        background_color: '#f8f8f8',
        theme_color: '#005fb8',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'], maximumFileSizeToCacheInBytes: 6_000_000 }
    })
  ],
  build: { chunkSizeWarningLimit: 700 },
  test: { include: ['tests/unit/**/*.test.ts'] }
});
