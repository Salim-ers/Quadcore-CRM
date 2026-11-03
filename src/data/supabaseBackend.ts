import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Backend, ChangeListener } from './backend'
import type { DB, Row, TableName, UUID } from '../lib/types'

const TABLES: TableName[] = [
  'profiles', 'prospects', 'projects', 'revisions', 'tasks', 'tickets', 'comments', 'attachments', 'status_history', 'activities',
]
// Supabase renvoie au plus 1000 lignes par requête : au-delà, le reste serait masqué sans erreur
const PAGE_SIZE = 1000

// Capturé avant que supabase-js ne nettoie l'URL : arrivée par invitation ou « mot de passe oublié »
const arrivedForPassword =
  typeof window !== 'undefined' && /type=(invite|recovery)/.test(window.location.hash + window.location.search)

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  })
  let mustSetPassword = arrivedForPassword
  let channelSeq = 0

  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(translate(e.message))
  }

  return {
    mode: 'supabase',

    async currentUserId() {
      const { data } = await sb.auth.getSession()
      return data.session?.user.id ?? null
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') mustSetPassword = true
        // Différé : appeler Supabase depuis ce rappel peut bloquer le client (recommandation de supabase-js)
        setTimeout(() => cb(session?.user.id ?? null), 0)
      })
      return () => data.subscription.unsubscribe()
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
      fail(error)
    },
    async signOut() {
      await sb.auth.signOut()
    },
    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
      fail(error)
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password })
      fail(error)
      mustSetPassword = false
    },
    needsPasswordSetup: () => mustSetPassword,

    async loadAll() {
      const fetchAll = async (t: TableName) => {
        const rows: unknown[] = []
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data, error } = await sb.from(t).select('*').order('id').range(from, from + PAGE_SIZE - 1)
          fail(error)
          rows.push(...(data ?? []))
          if ((data ?? []).length < PAGE_SIZE) return rows
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
      const { data, error } = await sb.from(table).insert(row as never).select().single()
      fail(error)
      return data as Row<typeof table>
    },
    async update(table, id, patch) {
      // Seuls les champs modifiés sont envoyés : deux personnes peuvent éditer
      // des champs différents d'une même fiche sans s'écraser.
      const { data, error } = await sb.from(table).update(patch as never).eq('id', id).select().single()
      fail(error)
      return data as Row<typeof table>
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id)
      fail(error)
    },

    subscribe(cb: ChangeListener) {
      // Nom unique : supabase-js réutilise un canal de même nom, et refuse d'y ajouter un écouteur une fois abonné
      const channel = sb
        .channel(`quadcore-db-${++channelSeq}`)
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Record<string, unknown>
          cb(payload.table as TableName, payload.eventType, row)
        })
        .subscribe()
      return () => {
        sb.removeChannel(channel)
      }
    },

    async uploadFile(path, file) {
      const { error } = await sb.storage.from('attachments').upload(path, file, { contentType: file.type, upsert: false })
      fail(error)
      return path
    },
    async fileUrl(path) {
      const { data, error } = await sb.storage.from('attachments').createSignedUrl(path, 60 * 60)
      fail(error)
      return data!.signedUrl
    },
    async removeFile(path) {
      await sb.storage.from('attachments').remove([path])
    },

    async inviteMember(input) {
      const { data, error } = await sb.functions.invoke('invite-member', {
        body: { ...input, redirect_to: window.location.origin },
      })
      if (error) throw new Error((data as { error?: string })?.error ?? "L'invitation n'a pas pu être envoyée")
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
    },
  }
}

function translate(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(msg)) return "Votre adresse e-mail n'est pas encore confirmée."
  if (/rate limit/i.test(msg)) return 'Trop de tentatives, réessayez dans quelques minutes.'
  if (/Password should be/i.test(msg)) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Connexion impossible : rien n’a été enregistré. Vérifiez le réseau et réessayez.'
  return msg
}

export type { UUID }
