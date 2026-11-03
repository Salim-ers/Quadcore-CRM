import { create } from 'zustand'
import type { Backend, ChangeEvent } from './backend'
import { createNeonBackend } from './neonBackend'
import { createDemoBackend } from './demoBackend'
import type { DB, Profile, Row, TableName, UUID } from '../lib/types'

declare const __SINGLE_FILE__: boolean

const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL as string | undefined
const FILES_URL = import.meta.env.VITE_NEON_FILES_URL as string | undefined
const FORCE_DEMO = __SINGLE_FILE__ || import.meta.env.VITE_DEMO === '1'

export const backend: Backend = !FORCE_DEMO && DATA_API_URL && FILES_URL ? createNeonBackend(DATA_API_URL, FILES_URL) : createDemoBackend()

const empty = (): DB => ({
  profiles: [], prospects: [], projects: [], revisions: [], tasks: [], tickets: [], comments: [], attachments: [], status_history: [], activities: [],
})

export interface Toast { id: number; message: string; tone: 'default' | 'error' | 'success'; action?: { label: string; run: () => void } }

interface State {
  phase: 'boot' | 'signedOut' | 'loading' | 'ready' | 'setPassword' | 'error'
  error: string | null
  userId: UUID | null
  db: DB
  online: boolean
  toasts: Toast[]
}

export const useStore = create<State>(() => ({
  phase: 'boot', error: null, userId: null, db: empty(), online: typeof navigator === 'undefined' ? true : navigator.onLine, toasts: [],
}))

const set = useStore.setState
const get = useStore.getState

// ———————————————————————— Application des changements (local + temps réel) ————————
function sortActivity(list: Row<'activities'>[]) {
  return list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export function applyChange(table: TableName, event: ChangeEvent, row: Record<string, unknown>) {
  set((s) => {
    const list = s.db[table] as unknown as Record<string, unknown>[]
    const id = row.id
    let next: Record<string, unknown>[]
    if (event === 'DELETE') next = list.filter((r) => r.id !== id)
    else {
      const i = list.findIndex((r) => r.id === id)
      if (i >= 0) {
        // ignore un écho plus ancien que la version déjà reçue du serveur
        const cur = list[i]
        if (cur.updated_at && row.updated_at && (row.updated_at as string) < (cur.updated_at as string)) return s
        next = list.slice(); next[i] = { ...cur, ...row }
      } else next = [...list, row]
    }
    if (table === 'activities') next = sortActivity(next as unknown as Row<'activities'>[]) as unknown as Record<string, unknown>[]
    return { db: { ...s.db, [table]: next } }
  })
}

// ———————————————————————— Session ————————————————————————
let unsubscribe: (() => void) | null = null
// La session peut être annoncée plusieurs fois (démarrage, connexion) : un seul chargement
// par compte, et seul le dernier demandé a le droit d'écrire l'état et de lancer la synchronisation.
let loadingFor: UUID | null = null
let sessionRun = 0

async function loadSession(userId: UUID | null) {
  if (userId && userId === loadingFor) return
  const run = ++sessionRun
  loadingFor = null
  unsubscribe?.(); unsubscribe = null
  // Avant le test de session : le lien « choisir mon mot de passe » s'ouvre sans être connecté
  if (backend.needsPasswordSetup()) { set({ phase: 'setPassword', userId }); return }
  if (!userId) { set({ phase: 'signedOut', userId: null, db: empty() }); return }
  loadingFor = userId
  set({ phase: 'loading', userId })
  try {
    const db = await backend.loadAll()
    if (run !== sessionRun) return
    sortActivity(db.activities)
    const me = db.profiles.find((p) => p.id === userId)
    if (!me || !me.active) {
      set({ phase: 'error', error: "Votre compte n'a pas (ou plus) accès à QUADCORE. Contactez un administrateur." })
      return
    }
    set({ db, phase: 'ready', error: null })
    unsubscribe = backend.subscribe(applyChange)
  } catch (e) {
    if (run === sessionRun) set({ phase: 'error', error: (e as Error).message })
  } finally {
    if (run === sessionRun) loadingFor = null
  }
}

export async function boot() {
  backend.onAuthChange((id) => {
    if (id !== get().userId || get().phase === 'signedOut') loadSession(id)
  })
  loadSession(await backend.currentUserId())
  if (typeof window !== 'undefined') {
    // resynchronise tout ce qui a pu changer pendant la coupure
    const resync = async () => {
      if (get().phase === 'ready') { try { const db = await backend.loadAll(); sortActivity(db.activities); set({ db }) } catch { /* noop */ } }
    }
    window.addEventListener('online', () => { set({ online: true }); resync() })
    window.addEventListener('offline', () => set({ online: false }))
    // un téléphone coupe le temps réel quand l'app passe en arrière-plan, sans événement « offline »
    let hiddenAt = 0
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 30_000) resync()
    })
  }
}

// Le lien ne connecte pas forcément : on repart de la session réelle, sinon de l'écran de connexion
export const passwordDone = async () => loadSession(await backend.currentUserId())

// ———————————————————————— Notifications in-app ————————————————————————
let toastId = 0
export function toast(message: string, tone: Toast['tone'] = 'default', action?: Toast['action']) {
  const id = ++toastId
  set((s) => ({ toasts: [...s.toasts, { id, message, tone, action }] }))
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 6000 : 3200)
}
export const dismissToast = (id: number) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))

// ———————————————————————— Écritures optimistes ————————————————————————
const nowIso = () => new Date().toISOString()
export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

export async function insertRow<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T> | null> {
  const id = (row as { id?: string }).id ?? newId()
  const optimistic = { ...row, id, created_at: nowIso() } as Record<string, unknown>
  applyChange(table, 'INSERT', optimistic)
  try {
    const saved = await backend.insert(table, { ...row, id } as Partial<Row<T>>)
    applyChange(table, 'UPDATE', saved as unknown as Record<string, unknown>)
    return saved
  } catch (e) {
    applyChange(table, 'DELETE', { id })
    toast((e as Error).message || 'Enregistrement impossible', 'error')
    return null
  }
}

export async function updateRow<T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>): Promise<boolean> {
  const list = get().db[table] as unknown as Record<string, unknown>[]
  const before = list.find((r) => r.id === id)
  if (!before) return false
  const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => before[k] !== v))
  if (Object.keys(changed).length === 0) return true
  set((s) => ({
    db: { ...s.db, [table]: (s.db[table] as unknown as Record<string, unknown>[]).map((r) => (r.id === id ? { ...r, ...changed } : r)) },
  }))
  try {
    const saved = await backend.update(table, id, changed as Partial<Row<T>>)
    applyChange(table, 'UPDATE', saved as unknown as Record<string, unknown>)
    return true
  } catch (e) {
    // retour à l'état serveur pour les seuls champs modifiés
    const restore = Object.fromEntries(Object.keys(changed).map((k) => [k, before[k]]))
    set((s) => ({ db: { ...s.db, [table]: (s.db[table] as unknown as Record<string, unknown>[]).map((r) => (r.id === id ? { ...r, ...restore } : r)) } }))
    toast((e as Error).message || 'Modification impossible', 'error')
    return false
  }
}

export async function deleteRow(table: TableName, id: UUID): Promise<boolean> {
  const list = get().db[table] as unknown as Record<string, unknown>[]
  const before = list.find((r) => r.id === id)
  applyChange(table, 'DELETE', { id })
  try {
    await backend.remove(table, id)
    return true
  } catch (e) {
    if (before) applyChange(table, 'INSERT', before)
    toast((e as Error).message || 'Suppression impossible', 'error')
    return false
  }
}

// ———————————————————————— Sélecteurs ————————————————————————
export const useMe = (): Profile | undefined => useStore((s) => s.db.profiles.find((p) => p.id === s.userId))
export const useProfiles = () => useStore((s) => s.db.profiles)
export const useIsAdmin = () => useStore((s) => s.db.profiles.some((p) => p.id === s.userId && p.role === 'admin'))
export const me = () => get().db.profiles.find((p) => p.id === get().userId)
