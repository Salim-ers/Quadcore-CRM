// Services Neon de QUADCORE, appliqués par `npx neon deploy` (voir README).
import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  auth: { enabled: true },
  dataApi: true,
  buckets: {
    'quadcore-fichiers': { access: 'private' },
  },
  functions: {
    fichiers: {
      name: 'Fichiers QUADCORE',
      source: './neon-functions/fichiers.ts',
    },
  },
})
