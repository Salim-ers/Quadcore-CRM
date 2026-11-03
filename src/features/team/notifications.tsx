import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { toast, useStore } from '../../data/store'
import { todayItems } from '../../lib/derive'
import { todayStr } from '../../lib/dates'

/**
 * Rappels navigateur — réellement implémentés, uniquement après accord explicite.
 * Limite assumée : sans serveur de push, ils se déclenchent quand l'application est
 * ouverte ou en arrière-plan (onglet / PWA), pas lorsqu'elle est complètement fermée.
 */
const supported = () => typeof window !== 'undefined' && 'Notification' in window
const PREF = 'qc-notify'
const SEEN = 'qc-notified-'

const getPref = () => { try { return localStorage.getItem(PREF) === '1' } catch { return false } }
const setPref = (v: boolean) => { try { localStorage.setItem(PREF, v ? '1' : '0') } catch { /* noop */ } }

export function useNotificationPermission() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(() => (supported() ? Notification.permission : 'unsupported'))
  const [enabled, setEnabled] = useState(() => supported() && Notification.permission === 'granted' && getPref())
  async function enable() {
    if (!supported()) return
    const p = await Notification.requestPermission()
    setPerm(p)
    setPref(p === 'granted'); setEnabled(p === 'granted')
    if (p === 'granted') { toast('Rappels activés sur cet appareil', 'success'); setTimeout(checkNow, 500) }
    else if (p === 'denied') toast('Notifications refusées — modifiables dans les réglages du navigateur', 'error')
  }
  function disable() { setPref(false); setEnabled(false) }
  return { perm, enabled, enable, disable }
}

async function show(title: string, body: string, tag: string) {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    const opts: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' }
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
  } catch { /* navigateur sans support (ex. iOS hors écran d'accueil) */ }
}

function checkNow() {
  const s = useStore.getState()
  if (s.phase !== 'ready' || !supported() || Notification.permission !== 'granted' || !getPref()) return
  const key = SEEN + todayStr()
  let seen: string[] = []
  try { seen = JSON.parse(localStorage.getItem(key) ?? '[]') } catch { /* noop */ }
  const items = todayItems(s.db, s.userId).filter((i) => !seen.includes(i.id))
  if (!items.length) return
  const label = (i: (typeof items)[number]) =>
    i.kind === 'task' ? i.task.title : i.kind === 'followup' ? `Relancer ${i.prospect.name}` : i.kind === 'revisions' ? `${i.remaining} retouche(s) — ${i.project.name}` : i.kind === 'delivery' ? `Livraison : ${i.project.name}`
      : i.kind === 'ticket' ? `Ticket #${i.ticket.number} : ${i.ticket.subject}` : i.kind === 'ticket_wait' ? `Sans réponse du client : ticket #${i.ticket.number}` : `Validation en attente : ${i.project.name}`
  if (items.length === 1) show('QUADCORE — à faire', label(items[0]), items[0].id)
  else show(`QUADCORE — ${items.length} actions aujourd’hui`, items.slice(0, 3).map(label).join(' · '), 'qc-daily')
  try {
    localStorage.setItem(key, JSON.stringify([...seen, ...items.map((i) => i.id)]))
    // nettoyage des jours précédents
    for (let k = 0; k < localStorage.length; k++) { const n = localStorage.key(k); if (n?.startsWith(SEEN) && n !== key) localStorage.removeItem(n) }
  } catch { /* noop */ }
}

/** Boucle de rappels (toutes les 10 min) + rappel in-app à l'ouverture */
export function useReminders() {
  const phase = useStore((s) => s.phase)
  useEffect(() => {
    if (phase !== 'ready') return
    const s = useStore.getState()
    const n = todayItems(s.db, s.userId).length
    let shown = false
    try { shown = sessionStorage.getItem('qc-inapp-reminder') === todayStr() } catch { /* noop */ }
    if (n > 0 && !shown) {
      setTimeout(() => toast(`${n} action${n > 1 ? 's' : ''} à faire aujourd’hui`), 900)
      try { sessionStorage.setItem('qc-inapp-reminder', todayStr()) } catch { /* noop */ }
    }
    const first = setTimeout(checkNow, 3000)
    const id = setInterval(checkNow, 10 * 60_000)
    const onVis = () => document.visibilityState === 'visible' && checkNow()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearTimeout(first); clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [phase])
}

export function NotificationCard() {
  const { perm, enabled, enable } = useNotificationPermission()
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('qc-notify-card') === '0' } catch { return false } })
  if (perm === 'unsupported' || perm === 'denied' || enabled || hidden) return null
  return (
    <div className="card p-4 mb-4 flex items-start gap-3 bg-copper/[0.05] border-copper/20">
      <span className="w-10 h-10 rounded-xl bg-copper/12 text-copper-ink flex items-center justify-center shrink-0"><BellRing size={19} /></span>
      <div className="flex-1">
        <p className="font-bold text-[14.5px]">Recevoir les rappels</p>
        <p className="text-[13px] text-muted mt-0.5">Une notification pour les relances et tâches du jour, sur cet appareil.</p>
        <button className="btn-primary h-10 min-h-0 mt-3 text-[14px]" onClick={enable}>Activer</button>
      </div>
      <button className="icon-btn w-9 h-9 -mt-1 -mr-1 text-faint" aria-label="Masquer" onClick={() => { setHidden(true); try { localStorage.setItem('qc-notify-card', '0') } catch { /* noop */ } }}><X size={17} /></button>
    </div>
  )
}
