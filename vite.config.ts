import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Modes :
//  - default        : application réelle (Supabase), PWA installable
//  - demo-single    : aperçu autonome en un seul fichier HTML (données de démo locales)
export default defineConfig(({ mode, command }) => {
  const single = mode === 'demo-single'
  const env = loadEnv(mode, process.cwd(), '')
  // Sans Supabase, l'app bascule en démo et chaque navigateur garde ses données dans son coin :
  // une mise en ligne mal configurée doit échouer au lieu de faire perdre des saisies réelles.
  if (command === 'build' && !single && env.VITE_DEMO !== '1' && !(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requis pour la version en ligne (voir .env.example). Pour un aperçu : npm run build:demo')
  }
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
              name: 'QUADCORE',
              short_name: 'QUADCORE',
              description: 'Prospection, suivi des clients, projets web et retouches — outil interne QUADCORE.',
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
                { name: 'Nouveau ticket', url: '/suivi?new=1', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
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
