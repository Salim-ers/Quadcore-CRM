import type { DB, Project, Prospect, Task, Ticket, UUID } from './types'
import { CLIENT_QUIET_DAYS, PROSPECT_CLOSED, TICKET_DONE, TICKET_WAIT_DAYS, prospectStep, siteStep, ticketPriority } from './constants'
import { addDaysStr, endOfWeekStr, todayStr } from './dates'

export const liveProjects = (db: DB) => db.projects.filter((p) => !p.archived)

export const needsFollowUp = (p: Prospect, today = todayStr()) =>
  !p.archived && !PROSPECT_CLOSED.includes(p.status) && (p.status === 'a_relancer' || (!!p.next_follow_up && p.next_follow_up <= today))

/** Combien de dossiers à chaque étape du parcours */
export function stepCounts(db: DB) {
  const c = { prospect: 0, vu: 0, accepte: 0, refuse: 0, en_cours: 0, livre: 0 }
  for (const p of db.prospects) if (!p.archived) c[prospectStep(p.status)]++
  for (const p of liveProjects(db)) c[siteStep(p.status)]++
  return c
}

export type TodayItem =
  | { kind: 'task'; id: string; task: Task; late: boolean }
  | { kind: 'followup'; id: string; prospect: Prospect; late: boolean }
  | { kind: 'revisions'; id: string; project: Project; remaining: number; total: number }
  | { kind: 'delivery'; id: string; project: Project; late: boolean }
  | { kind: 'ticket'; id: string; ticket: Ticket; late: boolean }
  | { kind: 'ticket_wait'; id: string; ticket: Ticket; days: number }

// ———————————————————————— Suivi clients ————————————————————————
export const isTicketOpen = (t: Ticket) => !TICKET_DONE.includes(t.status)
/** Le délai ne court pas pendant qu'on attend le client. */
export const isTicketLate = (t: Ticket, today = todayStr()) =>
  isTicketOpen(t) && t.status !== 'attente_client' && !!t.due_date && t.due_date < today
export const daysSince = (iso: string | null | undefined) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : 0)
export const dueForPriority = (p: Ticket['priority']) => addDaysStr(ticketPriority(p).days)
export const ticketRef = (t: Pick<Ticket, 'number'>) => (t.number ? `#${t.number}` : '#…')

/** Les tickets d'un client archivé sont masqués, comme sa fiche. */
export function liveTickets(db: DB) {
  const archived = new Set(db.prospects.filter((p) => p.archived).map((p) => p.id))
  return db.tickets.filter((t) => !archived.has(t.prospect_id))
}

export type TicketView = 'ouverts' | 'mine' | 'unassigned' | 'late' | 'attente' | 'termines'

export function filterTickets(tickets: Ticket[], view: TicketView, userId: UUID | null) {
  const today = todayStr()
  const f = tickets.filter((t) => {
    switch (view) {
      case 'ouverts': return isTicketOpen(t)
      case 'mine': return isTicketOpen(t) && t.assignee_id === userId
      case 'unassigned': return isTicketOpen(t) && !t.assignee_id
      case 'late': return isTicketLate(t, today)
      case 'attente': return t.status === 'attente_client'
      case 'termines': return !isTicketOpen(t)
    }
  })
  if (view === 'termines') return f.sort((a, b) => ((a.resolved_at ?? '') < (b.resolved_at ?? '') ? 1 : -1))
  const pr = { urgente: 0, haute: 1, normale: 2, basse: 3 }
  return f.sort((a, b) =>
    Number(isTicketLate(b, today)) - Number(isTicketLate(a, today)) ||
    pr[a.priority] - pr[b.priority] ||
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
    (a.created_at < b.created_at ? -1 : 1))
}

/** Dernier échange noté avec chaque client : sur sa fiche, sur ses tickets, ou la demande elle-même. */
export function lastContacts(db: DB) {
  const owner = new Map(db.tickets.map((t) => [t.id, t.prospect_id]))
  const last = new Map<UUID, string>()
  const note = (id: UUID | undefined, at: string) => { if (id && at > (last.get(id) ?? '')) last.set(id, at) }
  for (const t of db.tickets) if (t.channel) note(t.prospect_id, t.created_at)
  for (const c of db.comments) {
    if (!c.channel) continue
    if (c.entity_type === 'prospect') note(c.entity_id, c.created_at)
    if (c.entity_type === 'ticket') note(owner.get(c.entity_id), c.created_at)
  }
  return last
}

export interface ClientSummary {
  client: Prospect
  open: number
  late: number
  total: number
  lastContact: string | null
  quiet: boolean
  projects: Project[]
}

/** Un client est une fiche gagnée. Ceux qui demandent de l'attention passent en premier. */
export function clientSummaries(db: DB): ClientSummary[] {
  const contacts = lastContacts(db)
  const tickets = liveTickets(db)
  return db.prospects
    .filter((p) => !p.archived && p.status === 'gagne')
    .map((client) => {
      const mine = tickets.filter((t) => t.prospect_id === client.id)
      const lastContact = contacts.get(client.id) ?? null
      const open = mine.filter(isTicketOpen).length
      return {
        client,
        open,
        late: mine.filter((t) => isTicketLate(t)).length,
        total: mine.length,
        lastContact,
        quiet: open === 0 && daysSince(lastContact ?? client.updated_at) >= CLIENT_QUIET_DAYS,
        projects: db.projects.filter((x) => x.prospect_id === client.id && !x.archived),
      }
    })
    .sort((a, b) =>
      b.late - a.late || b.open - a.open || Number(b.quiet) - Number(a.quiet) ||
      (a.lastContact ?? '').localeCompare(b.lastContact ?? '') || a.client.name.localeCompare(b.client.name, 'fr'))
}

/** Actions prioritaires du jour — pour une personne (ou toute l'équipe si userId = null). */
export function todayItems(db: DB, userId: UUID | null): TodayItem[] {
  const today = todayStr()
  const mine = (owner: UUID | null) => userId === null || owner === userId
  const items: TodayItem[] = []

  const openTasks = db.tasks.filter((t) => t.status !== 'termine' && t.due_date && t.due_date <= today && mine(t.assignee_id))
  for (const t of openTasks) items.push({ kind: 'task', id: 't' + t.id, task: t, late: t.due_date! < today })

  const coveredByTask = new Set(db.tasks.filter((t) => t.status !== 'termine' && t.is_follow_up && t.prospect_id).map((t) => t.prospect_id))
  for (const p of db.prospects) {
    if (!mine(p.owner_id) || coveredByTask.has(p.id) || !needsFollowUp(p, today)) continue
    items.push({ kind: 'followup', id: 'f' + p.id, prospect: p, late: !!p.next_follow_up && p.next_follow_up < today })
  }

  for (const pr of liveProjects(db)) {
    if (pr.status === 'modifs_demandees') {
      const revs = db.revisions.filter((r) => r.project_id === pr.id && r.round === pr.revision_round)
      const mineRevs = revs.filter((r) => mine(r.assignee_id) && r.status !== 'termine')
      if (mineRevs.length) items.push({ kind: 'revisions', id: 'r' + pr.id, project: pr, remaining: mineRevs.length, total: revs.length })
    }
    if (mine(pr.owner_id) && pr.due_date && pr.due_date <= addDaysStr(2) && siteStep(pr.status) === 'en_cours') {
      items.push({ kind: 'delivery', id: 'd' + pr.id, project: pr, late: pr.due_date < today })
    }
  }

  for (const t of liveTickets(db)) {
    if (!isTicketOpen(t)) continue
    if (t.status === 'attente_client') {
      const days = daysSince(t.status_changed_at)
      if (mine(t.assignee_id) && days >= TICKET_WAIT_DAYS) items.push({ kind: 'ticket_wait', id: 'w' + t.id, ticket: t, days })
      continue
    }
    // un ticket sans responsable concerne tout le monde, sinon personne ne le prend
    if (!t.assignee_id || (mine(t.assignee_id) && (t.priority === 'urgente' || (!!t.due_date && t.due_date <= today)))) {
      items.push({ kind: 'ticket', id: 'k' + t.id, ticket: t, late: isTicketLate(t, today) })
    }
  }

  const rank = (i: TodayItem) =>
    ('late' in i && i.late ? 0 : 10) +
    ((i.kind === 'task' && i.task.priority === 'haute') || (i.kind === 'ticket' && i.ticket.priority === 'urgente') ? 0 : 1) +
    ({ ticket: 0, followup: 1, task: 2, revisions: 3, delivery: 4, ticket_wait: 5 } as const)[i.kind]
  return items.sort((a, b) => rank(a) - rank(b))
}

export type TaskView = 'today' | 'late' | 'week' | 'mine' | 'all'

export function filterTasks(tasks: Task[], view: TaskView, userId: UUID | null, showDone: boolean) {
  const today = todayStr()
  const eow = endOfWeekStr()
  const open = (t: Task) => showDone || t.status !== 'termine'
  const f = tasks.filter((t) => {
    switch (view) {
      case 'today': return t.status !== 'termine' ? t.due_date === today : showDone && t.due_date === today
      case 'late': return t.status !== 'termine' && !!t.due_date && t.due_date < today
      case 'week': return open(t) && !!t.due_date && t.due_date >= today && t.due_date <= eow
      case 'mine': return open(t) && t.assignee_id === userId
      case 'all': return open(t)
    }
  })
  return f.sort((a, b) => {
    if ((a.status === 'termine') !== (b.status === 'termine')) return a.status === 'termine' ? 1 : -1
    const da = a.due_date ?? '9999', dbb = b.due_date ?? '9999'
    if (da !== dbb) return da < dbb ? -1 : 1
    const pr = { haute: 0, normale: 1, basse: 2 }
    return pr[a.priority] - pr[b.priority]
  })
}

export function revisionProgress(db: DB, project: Project) {
  const revs = db.revisions.filter((r) => r.project_id === project.id && r.round === project.revision_round)
  return { done: revs.filter((r) => r.status === 'termine').length, total: revs.length }
}

export const fullName = (p?: { first_name: string; last_name: string } | null) => (p ? `${p.first_name} ${p.last_name}`.trim() : '—')
export const initials = (p?: { first_name: string; last_name: string } | null) =>
  p ? ((p.first_name[0] ?? '') + (p.last_name[0] ?? '')).toUpperCase() || '?' : '?'

export function searchMatch(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const n = norm(q.trim())
  return fields.some((f) => f && norm(f).includes(n))
}
