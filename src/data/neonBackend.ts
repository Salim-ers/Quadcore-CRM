import { createClient } from '@neon/neon-js'
import type { Backend, ChangeEvent, ChangeListener } from './backend'
import type { DB, Row, TableName, UUID } from '../lib/types'

const TABLES: TableName[] = [
  'profiles', 'prospects', 'projects', 'revisions', 'tasks', 'tickets', 'comments', 'attachments', 'status_history', 'activities',
]
const PAGE_SIZE = 1000
const SYNC_EVERY_MS = 10_000
// Deux écritures simultanées peuvent se valider dans le désordre : on relit un peu en arrière pour ne rien manquer
const SYNC_OVERLAP = 25
export const MAX_FILE_BYTES = 20 * 1024 * 1024

// Capturé au chargement : arrivée par le lien « choisir mon mot de passe » reçu par e-mail
const linkToken = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('token')

interface Change { seq: number; table_name: TableName; op: ChangeEvent; data: Record<string, unknown> }
type AuthError = { message?: string; code?: string } | null | undefined
// Le plugin Admin est actif dans le kit Neon, mais absent des types de son client par défaut
interface AdminApi {
  createUser(input: { email: string; password: string; name: string; role: string }): Promise<{ data?: { user: { id: UUID } } | null; error?: AuthError }>
  setRole(input: { userId: UUID; role: string }): Promise<{ error?: AuthError }>
}

export function createNeonBackend(dataApiUrl: string, filesUrl: string): Backend {
  // L'authentification passe par le domaine de l'app (functions/api/auth) : hébergé chez Neon,
  // son cookie de session serait un cookie tiers, que Safari et iPhone bloquent.
  const client = createClient({ auth: { url: `${window.location.origin}/api/auth` }, dataApi: { url: dataApiUrl } })
  const auth = client.auth
  const admin = (auth as unknown as { admin: AdminApi }).admin
  const listeners = new Set<(id: UUID | null) => void>()
  let passwordToken = linkToken
  let lastSeq = 0

  const notify = (id: UUID | null) => listeners.forEach((l) => l(id))
  const fail = (e: AuthError) => {
    if (e) throw new Error(translate(e.message ?? e.code ?? 'Erreur inconnue'))
  }
  // Le kit d'authentification signale ses erreurs tantôt dans `error`, tantôt en les levant
  const authCall = async <T extends { error?: AuthError }>(call: () => Promise<T>) => {
    let result: T
    try { result = await call() } catch (e) { throw new Error(translate((e as Error).message)) }
    fail(result.error)
    return result
  }

  async function sessionUserId() {
    try {
      const { data } = await auth.getSession()
      return data?.user?.id ?? null
    } catch {
      return null
    }
  }

  async function bearer() {
    const { data } = await auth.getSession()
    if (!data?.session?.token) throw new Error('Session expirée : reconnectez-vous.')
    return `Bearer ${data.session.token}`
  }

  async function callFiles<T>(route: string, body: unknown): Promise<T> {
    let res: Response
    try {
      res = await fetch(`${filesUrl}${route}`, {
        method: 'POST',
        headers: { Authorization: await bearer(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (e) {
      throw new Error(translate((e as Error).message))
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Le service de fichiers ne répond pas.')
    return data
  }

  const sendReset = (email: string) =>
    authCall(() => auth.requestPasswordReset({ email: email.trim(), redirectTo: window.location.origin }))

  return {
    mode: 'neon',

    currentUserId: sessionUserId,
    onAuthChange(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    async signIn(email, password) {
      await authCall(() => auth.signIn.email({ email: email.trim(), password }))
      notify(await sessionUserId())
    },
    async signOut() {
      try { await auth.signOut() } finally { notify(null) }
    },
    async sendPasswordReset(email) {
      await sendReset(email)
    },
    async updatePassword(password) {
      await authCall(() => auth.resetPassword({ newPassword: password, token: passwordToken ?? '' }))
      this.cancelPasswordSetup()
    },
    needsPasswordSetup: () => !!passwordToken,
    cancelPasswordSetup() {
      passwordToken = null
      const url = new URL(window.location.href)
      url.searchParams.delete('token')
      window.history.replaceState(null, '', url)
    },

    async loadAll() {
      // Relevé avant la lecture : un changement survenu pendant le chargement sera rejoué, jamais perdu
      const latest = await client.from('db_changes').select('seq').order('seq', { ascending: false }).limit(1)
      fail(latest.error)
      lastSeq = (latest.data?.[0] as { seq: number } | undefined)?.seq ?? 0

      const fetchAll = async (t: TableName) => {
        const rows: unknown[] = []
        // On s'arrête sur une page vide, pas sur une page courte : la limite du serveur peut être réglée plus bas
        for (;;) {
          const { data, error } = await client.from(t).select('*').order('id').range(rows.length, rows.length + PAGE_SIZE - 1)
          fail(error)
          if (!data?.length) return rows
          rows.push(...data)
        }
      }
      const results = await Promise.all(TABLES.map(fetchAll))
      const db = {} as DB
      results.forEach((rows, i) => {
        ;(db as unknown as Record<string, unknown[]>)[TABLES[i]] = rows
      })
      return db
    },

    async insert(table, row) {
      const { data, error } = await client.from(table).insert(row as never).select().single()
      fail(error)
      return data as Row<typeof table>
    },
    async update(table, id, patch) {
      // Seuls les champs modifiés sont envoyés : deux personnes peuvent éditer
      // des champs différents d'une même fiche sans s'écraser.
      const { data, error } = await client.from(table).update(patch as never).eq('id', id).select().single()
      fail(error)
      return data as Row<typeof table>
    },
    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id)
      fail(error)
    },

    subscribe(cb: ChangeListener) {
      const seen = new Set<number>()
      let stopped = false
      let timer: ReturnType<typeof setTimeout>
      const tick = async () => {
        // Application en arrière-plan : on laisse la base s'endormir, tout est rechargé au retour
        if (!document.hidden) {
          try {
            const { data, error } = await client.from('db_changes').select('seq,table_name,op,data')
              .gt('seq', Math.max(0, lastSeq - SYNC_OVERLAP)).order('seq').limit(500)
            if (!error && !stopped) {
              for (const c of (data ?? []) as Change[]) {
                lastSeq = Math.max(lastSeq, c.seq)
                if (seen.has(c.seq)) continue
                seen.add(c.seq)
                cb(c.table_name, c.op, c.data)
              }
              for (const s of seen) if (s < lastSeq - SYNC_OVERLAP * 4) seen.delete(s)
            }
          } catch { /* réseau coupé : on réessaie au prochain passage */ }
        }
        if (!stopped) timer = setTimeout(tick, SYNC_EVERY_MS)
      }
      timer = setTimeout(tick, SYNC_EVERY_MS)
      return () => { stopped = true; clearTimeout(timer) }
    },

    async uploadFile(path, file) {
      if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop lourd : 20 Mo maximum.')
      const { url } = await callFiles<{ url: string }>('/sign', { op: 'put', path, contentType: file.type || 'application/octet-stream', size: file.size })
      const res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } })
      if (!res.ok) throw new Error('Envoi du fichier impossible.')
      return path
    },
    async fileUrl(path) {
      const { url } = await callFiles<{ url: string }>('/sign', { op: 'get', path })
      return url
    },
    async removeFile(path) {
      await callFiles('/delete', { path })
    },

    async inviteMember(input) {
      const email = input.email.trim().toLowerCase()
      // Mot de passe jetable que personne ne connaît : l'invité choisit le sien via le lien reçu
      const { data } = await authCall(() => admin.createUser({
        email,
        password: crypto.randomUUID() + crypto.randomUUID(),
        name: `${input.first_name} ${input.last_name}`.trim() || email,
        role: input.role === 'admin' ? 'admin' : 'user',
      }))
      const { error } = await client.from('profiles').insert({
        id: data?.user.id, email, first_name: input.first_name, last_name: input.last_name, role: input.role, color: input.color,
      } as never)
      fail(error)
      await sendReset(email)
    },
    async syncAuthRole(id, role) {
      await authCall(() => admin.setRole({ userId: id, role: role === 'admin' ? 'admin' : 'user' }))
    },
  }
}

function translate(msg: string) {
  if (/invalid email or password|invalid_credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.'
  if (/(invalid|expired).*token|token.*(expired|invalid)/i.test(msg)) return 'Ce lien a expiré (il est valable 15 minutes). Demandez-en un nouveau avec « Mot de passe oublié ».'
  if (/already exists/i.test(msg)) return 'Ce compte existe déjà.'
  if (/too many|rate limit/i.test(msg)) return 'Trop de tentatives, réessayez dans quelques minutes.'
  if (/password.*short/i.test(msg)) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (/row-level security/i.test(msg)) return 'Vous n’avez pas le droit de faire cette action.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Connexion impossible : rien n’a été enregistré. Vérifiez le réseau et réessayez.'
  return msg
}

export type { UUID }
