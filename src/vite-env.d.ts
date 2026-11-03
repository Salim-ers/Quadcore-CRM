/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEON_DATA_API_URL?: string
  readonly VITE_NEON_FILES_URL?: string
  readonly VITE_DEMO?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
