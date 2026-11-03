import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { boot } from './data/store'
import { applyTheme, watchSystemTheme } from './lib/theme'

declare const __SINGLE_FILE__: boolean

applyTheme()
watchSystemTheme()
boot()

// Service worker (PWA) — uniquement pour l'application déployée
if (!__SINGLE_FILE__ && import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
