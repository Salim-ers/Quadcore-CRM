import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Modes :
//  - default        : application réelle (Supabase), PWA installable
//  - demo-single    : aperçu autonome en un seul fichier HTML (données de démo locales)
export default defineConfig(({ mode }) => {
  const single = mode === 'demo-single'
  return {
    define: {
      __SINGLE_FILE__: JSON.stringify(single),
    },
    build: single
      ? { outDir: 'dist-demo', assetsInlineLimit: 100_000_000, cssCodeSplit: false }
      : { outDir: 'dist', sourcemap: false },
    plugins: [
      react(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
            manifest: {
              name: 'QUADCORE CRM',
              short_name: 'QUADCORE',
              description: 'Prospection, projets web et retouches — outil interne QUADCORE.',
              lang: 'fr',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#F6F2EC',
              theme_color: '#0C0C0D',
              icons: [
                { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
              shortcuts: [
                { name: 'Ajouter un prospect', url: '/prospects?new=1', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
                { name: 'Mes tâches', url: '/taches', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
              ],
            },
            workbox: {
              navigateFallback: '/index.html',
              globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
            },
          }),
    ],
  }
})
