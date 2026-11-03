export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'qc-theme'
export const getTheme = (): ThemePref => { try { return (localStorage.getItem(KEY) as ThemePref) || 'system' } catch { return 'system' } }

/** En mode « système », un thème imposé par l'hôte (attribut data-theme, ex. aperçu intégré) prime sur l'OS. */
function systemDark() {
  const host = document.documentElement.getAttribute('data-theme')
  return host === 'dark' || host === 'light' ? host === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(pref: ThemePref = getTheme()) {
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0C0C0D' : '#F6F2EC'))
}

export function setTheme(pref: ThemePref) {
  try { localStorage.setItem(KEY, pref) } catch { /* noop */ }
  applyTheme(pref)
}

export function watchSystemTheme() {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const on = () => getTheme() === 'system' && applyTheme('system')
  mq.addEventListener?.('change', on)
  new MutationObserver(on).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}
