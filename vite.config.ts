import { defineConfig } from 'vite';

// base relativa: funziona sia in locale sia su GitHub Pages (/Diagramma-ER/).
// Niente PWA: l'app si usa solo online, non si installa e non resta in cache per l'uso offline.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0') },
  build: { chunkSizeWarningLimit: 700, sourcemap: false },
  test: { include: ['tests/unit/**/*.test.ts'] }
});
