import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Modes :
//  - default        : application réelle (Neon), PWA installable
//  - demo-single    : aperçu autonome en un seul fichier HTML (données de démo locales)
export default defineConfig(({ mode, command }) => {
  const single = mode === 'demo-single'
  const env = loadEnv(mode, process.cwd(), '')
  // Sans Neon, l'app bascule en démo et chaque navigateur garde ses données dans son coin :
  // une mise en ligne mal configurée doit échouer au lieu de faire perdre des saisies réelles.
  if (command === 'build' && !single && env.VITE_DEMO !== '1' && !(env.VITE_NEON_DATA_API_URL && env.VITE_NEON_FILES_URL)) {
    throw new Error('VITE_NEON_DATA_API_URL et VITE_NEON_FILES_URL sont requises pour la version en ligne (voir .env.example). Pour un aperçu : npm run build:demo')
  }
  return {
    define: {
      __SINGLE_FILE__: JSON.stringify(single),
    },
    build: single
      ? { outDir: 'dist-demo', assetsInlineLimit: 100_000_000, cssCodeSplit: false }
      : { outDir: 'dist', sourcemap: false },
    // En local comme en ligne (functions/api/auth), l'authentification passe par le domaine de l'app
    server: env.NEON_AUTH_URL ? {
      proxy: { '/api/auth': { target: env.NEON_AUTH_URL.replace(/\/$/, ''), changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/auth/, '') } },
    } : undefined,
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
              // la session ne doit jamais venir d'un cache
              navigateFallbackDenylist: [/^\/api\//],
              globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
            },
          }),
    ],
  }
})
