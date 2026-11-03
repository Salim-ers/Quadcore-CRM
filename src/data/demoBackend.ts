/**
 * Mode démo : base locale (localStorage) qui reproduit fidèlement le comportement
 * du schéma Postgres — valeurs par défaut, garde-fous d'archivage, historique des
 * statuts et fil d'activité générés « par trigger ». Les onglets ouverts se
 * synchronisent entre eux (BroadcastChannel) pour simuler le temps réel.
 */
import type { Backend, ChangeEvent, ChangeListener } from './backend'
import type { Activity, ActivityType, DB, Profile, Row, TableName, UUID } from '../lib/types'
import { buildSeed } from './seed'

const KEY = 'qc-demo-db-v2'
const USER_KEY = 'qc-demo-user'

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

const safeGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* stockage indisponible : mémoire seule */ } }
const safeDel = (k: string) => { try { localStorage.removeItem(k) } catch { /* noop */ } }

const DEFAULTS: { [T in TableName]?: Record<string, unknown> } = {
  prospects: {
    logo_path: null, category: null, contact_name: null, phone: null, email: null, address: null, city: null,
    instagram_handle: null, instagram_url: null, facebook_url: null, tiktok_url: null, linkedin_url: null,
    website_url: null, source: null, service: null, notes: null, owner_id: null, priority: 'normale',
    status: 'a_prospecter', lost_reason: null, next_follow_up: null, archived: false,
  },
  projects: {
    prospect_id: null, type: 'vitrine', description: null, owner_id: null, start_date: null, due_date: null,
    demo_url: null, final_url: null, github_url: null, price_proposed: null, price_accepted: null,
    billing_status: 'non_facture', status: 'a_preparer', revision_round: 1, archived: false,
  },
  revisions: { round: 1, status: 'a_faire', assignee_id: null, due_date: null, position: 0, completed_at: null },
  tasks: {
    description: null, assignee_id: null, due_date: null, priority: 'normale', status: 'a_faire',
    prospect_id: null, project_id: null, is_follow_up: false, completed_at: null,
  },
  tickets: {
    project_id: null, description: null, type: 'demande', channel: null, priority: 'normale', status: 'nouveau',
    assignee_id: null, due_date: null, resolved_at: null,
  },
  comments: { channel: null },
  attachments: { mime_type: null, size_bytes: null },
}
const CREATOR_FIELD: { [T in TableName]?: string } = {
  prospects: 'created_by', projects: 'created_by', revisions: 'created_by', tasks: 'created_by', tickets: 'created_by',
  comments: 'author_id', attachments: 'uploaded_by',
}
const TOUCHED: TableName[] = ['prospects', 'projects', 'revisions', 'tasks', 'tickets']
const DONE = ['resolu', 'ferme']
const POLYMORPHIC: { [T in TableName]?: string } = { prospects: 'prospect', projects: 'project', revisions: 'revision', tasks: 'task', tickets: 'ticket' }

type AnyRow = Record<string, unknown> & { id: UUID }

export class DemoEngine {
  db: DB
  actor: UUID | null = null
  clock: (() => Date) | null = null
  emitted: { table: TableName; event: ChangeEvent; row: AnyRow }[] = []

  constructor(db: DB) { this.db = db }

  now() { return (this.clock ? this.clock() : new Date()).toISOString() }
  table(t: TableName) { return this.db[t] as unknown as AnyRow[] }
  isAdmin() { return this.db.profiles.some((p) => p.id === this.actor && p.role === 'admin' && p.active) }
  emit(table: TableName, event: ChangeEvent, row: AnyRow) { this.emitted.push({ table, event, row: { ...row } }) }

  private push(table: TableName, row: AnyRow) {
    this.table(table).push(row)
    this.emit(table, 'INSERT', row)
  }
  private activity(type: ActivityType, prospect_id: UUID | null, project_id: UUID | null, meta: Record<string, unknown>, ticket_id: UUID | null = null) {
    const a: Activity = { id: uuid(), type, actor_id: this.actor, prospect_id, project_id, ticket_id, meta, created_at: this.now() }
    this.push('activities', a as unknown as AnyRow)
  }
  private history(entity_type: 'prospect' | 'project' | 'ticket', entity_id: UUID, from: string | null, to: string, note: string | null = null) {
    this.push('status_history', {
      id: uuid(), entity_type, entity_id, from_status: from, to_status: to, note, changed_by: this.actor, created_at: this.now(),
    })
  }

  insert(table: TableName, input: Record<string, unknown>): AnyRow {
    const ts = this.now()
    const row: AnyRow = { ...(DEFAULTS[table] ?? {}), ...input, id: (input.id as UUID) ?? uuid() } as AnyRow
    if (!row.created_at) row.created_at = ts
    if (TOUCHED.includes(table)) row.updated_at = row.created_at
    const cf = CREATOR_FIELD[table]
    if (cf && row[cf] === undefined) row[cf] = this.actor
    if ((table === 'tasks' || table === 'revisions') && row.status === 'termine' && !row.completed_at) row.completed_at = ts
    if (table === 'prospects' && !String(row.name ?? '').trim()) throw new Error('Le nom du commerce est obligatoire.')
    if (table === 'tickets') {
      if (!String(row.subject ?? '').trim()) throw new Error('L’objet du ticket est obligatoire.')
      if (!this.table('prospects').some((p) => p.id === row.prospect_id)) throw new Error('Un ticket doit être rattaché à un client.')
      row.number = Math.max(1000, ...this.table('tickets').map((t) => t.number as number)) + 1
      row.status_changed_at = ts
      if (DONE.includes(row.status as string)) row.resolved_at = ts
    }
    this.push(table, row)
    this.afterInsert(table, row)
    return row
  }

  update(table: TableName, id: UUID, patch: Record<string, unknown>): AnyRow {
    const list = this.table(table)
    const i = list.findIndex((r) => r.id === id)
    if (i < 0) throw new Error('Élément introuvable (supprimé entre-temps ?)')
    const old = list[i]
    if ('archived' in patch && patch.archived !== old.archived && !this.isAdmin())
      throw new Error('Seul un administrateur peut archiver un dossier.')
    if (table === 'profiles' && (('role' in patch && patch.role !== old.role) || ('active' in patch && patch.active !== old.active))) {
      if (!this.isAdmin()) throw new Error('Seul un administrateur peut modifier les rôles et les accès.')
      const admins = this.db.profiles.filter((p) => p.role === 'admin' && p.active && p.id !== id)
      if (old.role === 'admin' && (patch.role === 'member' || patch.active === false) && admins.length === 0)
        throw new Error('QUADCORE doit conserver au moins un administrateur actif.')
    }
    const row: AnyRow = { ...old, ...patch, id }
    if (TOUCHED.includes(table)) row.updated_at = this.now()
    if ((table === 'tasks' || table === 'revisions') && 'status' in patch) {
      if (row.status === 'termine' && old.status !== 'termine') row.completed_at = this.now()
      if (row.status !== 'termine') row.completed_at = null
    }
    if (table === 'tickets') {
      row.number = old.number
      if (row.status !== old.status) row.status_changed_at = this.now()
      if (DONE.includes(row.status as string)) { if (!DONE.includes(old.status as string)) row.resolved_at = this.now() }
      else row.resolved_at = null
    }
    list[i] = row
    this.emit(table, 'UPDATE', row)
    this.afterUpdate(table, old, row)
    return row
  }

  remove(table: TableName, id: UUID) {
    if ((table === 'prospects' || table === 'projects' || table === 'tickets') && !this.isAdmin())
      throw new Error('Seul un administrateur peut supprimer définitivement un dossier.')
    const list = this.table(table)
    const i = list.findIndex((r) => r.id === id)
    if (i < 0) return
    const [row] = list.splice(i, 1)
    this.emit(table, 'DELETE', row)
    // cascades
    const cascade = (t: TableName, pred: (r: AnyRow) => boolean) => {
      for (const r of this.table(t).filter(pred)) this.remove(t, r.id)
    }
    if (table === 'projects') {
      cascade('revisions', (r) => r.project_id === id)
      cascade('tasks', (r) => r.project_id === id)
      for (const t of this.table('tickets').filter((t) => t.project_id === id)) this.update('tickets', t.id, { project_id: null })
    }
    if (table === 'prospects') {
      cascade('tasks', (r) => r.prospect_id === id)
      cascade('tickets', (r) => r.prospect_id === id)
      for (const p of this.table('projects').filter((p) => p.prospect_id === id)) this.update('projects', p.id, { prospect_id: null })
    }
    const kind = POLYMORPHIC[table]
    if (kind) for (const t of ['comments', 'attachments', 'status_history'] as const) cascade(t, (r) => r.entity_type === kind && r.entity_id === id)
  }

  // ———————————————— « triggers » (miroir de db/migrations) ————————————————
  private afterInsert(table: TableName, r: AnyRow) {
    if (table === 'tickets') {
      const client = this.table('prospects').find((x) => x.id === r.prospect_id)
      this.history('ticket', r.id, null, r.status as string)
      this.activity('ticket_opened', r.prospect_id as UUID, (r.project_id as UUID) ?? null, { name: client?.name, number: r.number, subject: r.subject }, r.id)
    }
    if (table === 'comments' && r.channel && (r.entity_type === 'ticket' || r.entity_type === 'prospect')) {
      const ticket = r.entity_type === 'ticket' ? this.table('tickets').find((x) => x.id === r.entity_id) : undefined
      const prospectId = (ticket ? ticket.prospect_id : r.entity_id) as UUID
      const client = this.table('prospects').find((x) => x.id === prospectId)
      if (client) {
        this.activity('contact_logged', prospectId, (ticket?.project_id as UUID) ?? null, { name: client.name, channel: r.channel, number: ticket?.number ?? null }, ticket?.id ?? null)
      }
    }
    if (table === 'prospects') {
      this.history('prospect', r.id, null, r.status as string)
      this.activity('prospect_added', r.id, null, { name: r.name })
    }
    if (table === 'projects') {
      this.history('project', r.id, null, r.status as string)
      this.activity('project_created', (r.prospect_id as UUID) ?? null, r.id, { name: r.name })
    }
    if (table === 'revisions') {
      const p = this.table('projects').find((x) => x.id === r.project_id)
      const since = new Date(new Date(this.now()).getTime() - 15 * 60_000).toISOString()
      const recent = this.table('activities').find(
        (a) => a.type === 'revision_requested' && a.project_id === r.project_id && a.actor_id === this.actor && (a.created_at as string) > since,
      )
      if (recent) {
        const meta = recent.meta as Record<string, number>
        this.update('activities', recent.id, { meta: { ...meta, count: (meta.count ?? 1) + 1 } })
      } else {
        this.activity('revision_requested', (p?.prospect_id as UUID) ?? null, r.project_id as UUID, {
          name: p?.name, count: 1, description: r.description, round: r.round,
        })
      }
    }
  }

  private afterUpdate(table: TableName, old: AnyRow, r: AnyRow) {
    if (table === 'tickets') {
      const client = this.table('prospects').find((x) => x.id === r.prospect_id)
      const meta = { name: client?.name, number: r.number, subject: r.subject }
      if (old.status !== r.status) {
        this.history('ticket', r.id, old.status as string, r.status as string)
        const t: ActivityType =
          r.status === 'resolu' ? 'ticket_resolved' : DONE.includes(old.status as string) && !DONE.includes(r.status as string) ? 'ticket_reopened' : 'ticket_status'
        this.activity(t, r.prospect_id as UUID, (r.project_id as UUID) ?? null, { ...meta, from: old.status, to: r.status }, r.id)
      }
      if (old.assignee_id !== r.assignee_id) {
        const dest = this.db.profiles.find((p) => p.id === r.assignee_id)
        this.activity('ticket_assigned', r.prospect_id as UUID, (r.project_id as UUID) ?? null, { ...meta, to: r.assignee_id, to_name: dest?.first_name ?? null }, r.id)
      }
    }
    if (table === 'prospects' && old.status !== r.status) {
      this.history('prospect', r.id, old.status as string, r.status as string, r.status === 'perdu' ? (r.lost_reason as string) : null)
      const t: ActivityType =
        r.status === 'contacte' ? 'prospect_contacted' : r.status === 'gagne' ? 'prospect_won' : r.status === 'perdu' ? 'prospect_lost' : 'prospect_status'
      this.activity(t, r.id, null, { name: r.name, from: old.status, to: r.status, reason: r.lost_reason })
    }
    if (table === 'projects' && old.status !== r.status) {
      this.history('project', r.id, old.status as string, r.status as string)
      const t: ActivityType =
        r.status === 'demo_envoyee' ? 'demo_sent' : r.status === 'demo_validee' ? 'demo_validated' : r.status === 'livre' ? 'site_delivered' : 'project_status'
      this.activity(t, (r.prospect_id as UUID) ?? null, r.id, { name: r.name, from: old.status, to: r.status })
    }
    if (table === 'revisions' && r.status === 'termine' && old.status !== 'termine') {
      const same = this.table('revisions').filter((x) => x.project_id === r.project_id && x.round === r.round)
      if (same.every((x) => x.status === 'termine')) {
        const p = this.table('projects').find((x) => x.id === r.project_id)
        this.activity('revisions_done', (p?.prospect_id as UUID) ?? null, r.project_id as UUID, { name: p?.name, total: same.length, round: r.round })
      }
    }
    if (table === 'tasks' && r.status === 'termine' && old.status !== 'termine') {
      this.activity(r.is_follow_up ? 'follow_up_done' : 'task_done', (r.prospect_id as UUID) ?? null, (r.project_id as UUID) ?? null, { title: r.title })
    }
  }
}

export function createDemoBackend(): Backend {
  let engine: DemoEngine
  safeDel('qc-demo-db-v1') // ancienne démo : autre équipe, pas de tickets
  const stored = safeGet(KEY)
  try {
    engine = new DemoEngine(stored ? (JSON.parse(stored) as DB) : buildSeed())
  } catch {
    engine = new DemoEngine(buildSeed())
  }
  engine.emitted = []
  const persist = () => safeSet(KEY, JSON.stringify(engine.db))
  persist()

  const listeners = new Set<ChangeListener>()
  const authListeners = new Set<(id: UUID | null) => void>()
  let channel: BroadcastChannel | null = null
  try { channel = new BroadcastChannel('qc-demo') } catch { channel = null }

  let userId: UUID | null = safeGet(USER_KEY)
  if (userId && !engine.db.profiles.some((p) => p.id === userId)) userId = null
  engine.actor = userId

  const flush = () => {
    const events = engine.emitted
    engine.emitted = []
    persist()
    for (const e of events) {
      listeners.forEach((l) => l(e.table, e.event, e.row))
      channel?.postMessage(e)
    }
  }
  channel?.addEventListener('message', (m: MessageEvent) => {
    const e = m.data as { table: TableName; event: ChangeEvent; row: AnyRow }
    const list = engine.table(e.table)
    const i = list.findIndex((r) => r.id === e.row.id)
    if (e.event === 'DELETE') { if (i >= 0) list.splice(i, 1) }
    else if (i >= 0) list[i] = e.row
    else list.push(e.row)
    listeners.forEach((l) => l(e.table, e.event, e.row))
  })

  const run = <R>(fn: () => R): Promise<R> =>
    new Promise((resolve, reject) => {
      // léger délai réseau simulé pour un comportement réaliste
      setTimeout(() => {
        try { const r = fn(); flush(); resolve(r) } catch (err) { engine.emitted = []; reject(err) }
      }, 60)
    })

  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

  return {
    mode: 'demo',
    async currentUserId() { return userId },
    onAuthChange(cb) { authListeners.add(cb); return () => authListeners.delete(cb) },
    async signIn(email) {
      const p = engine.db.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
      if (!p) throw new Error('Compte de démonstration introuvable.')
      userId = p.id; engine.actor = p.id; safeSet(USER_KEY, p.id)
      authListeners.forEach((l) => l(userId))
    },
    async signOut() {
      userId = null; engine.actor = null; safeDel(USER_KEY)
      authListeners.forEach((l) => l(null))
    },
    async sendPasswordReset() { /* démo */ },
    async updatePassword() { /* démo */ },
    needsPasswordSetup: () => false,
    cancelPasswordSetup() { /* démo */ },

    async loadAll() { return clone(engine.db) },
    insert: <T extends TableName>(table: T, row: Partial<Row<T>>) =>
      run(() => clone(engine.insert(table, row as Record<string, unknown>)) as unknown as Row<T>),
    update: <T extends TableName>(table: T, id: UUID, patch: Partial<Row<T>>) =>
      run(() => clone(engine.update(table, id, patch as Record<string, unknown>)) as unknown as Row<T>),
    remove: (table, id) => run(() => engine.remove(table, id)),
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },

    async uploadFile(path, file) {
      // En démo, les fichiers (≤ 1,5 Mo) sont conservés en data URL dans le navigateur
      if (file.size > 1.5 * 1024 * 1024) throw new Error('En mode démo, les fichiers sont limités à 1,5 Mo.')
      const data = await new Promise<string>((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(file)
      })
      safeSet('qc-demo-file:' + path, data)
      memFiles.set(path, data)
      return path
    },
    async fileUrl(path) { return memFiles.get(path) ?? safeGet('qc-demo-file:' + path) ?? '' },
    async removeFile(path) { memFiles.delete(path); safeDel('qc-demo-file:' + path) },

    async inviteMember(input) {
      await run(() => {
        if (engine.db.profiles.some((p) => p.email.toLowerCase() === input.email.toLowerCase()))
          throw new Error('Ce collaborateur fait déjà partie de l’équipe.')
        if (!engine.isAdmin()) throw new Error('Réservé aux administrateurs.')
        const p: Profile = {
          id: uuid(), email: input.email.trim().toLowerCase(), first_name: input.first_name, last_name: input.last_name,
          avatar_url: null, role: input.role, color: input.color, active: true, created_at: engine.now(),
        }
        engine.table('profiles').push(p as unknown as AnyRow)
        engine.emit('profiles', 'INSERT', p as unknown as AnyRow)
      })
    },
    async syncAuthRole() { /* démo : un seul système de rôles */ },
    demoAccounts: () => clone(engine.db.profiles.filter((p) => p.active)),
  }
}

const memFiles = new Map<string, string>()

export function resetDemo() {
  safeDel(KEY)
  safeDel(USER_KEY)
}
