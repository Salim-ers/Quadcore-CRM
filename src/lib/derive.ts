import type { DB, Project, Prospect, Task, UUID } from './types'
import { PROSPECT_CLOSED } from './constants'
import { addDaysStr, endOfWeekStr, todayStr } from './dates'

export const activeProspects = (db: DB) => db.prospects.filter((p) => !p.archived && !PROSPECT_CLOSED.includes(p.status))
export const liveProjects = (db: DB) => db.projects.filter((p) => !p.archived)

export const needsFollowUp = (p: Prospect, today = todayStr()) =>
  !p.archived && !PROSPECT_CLOSED.includes(p.status) && (p.status === 'a_relancer' || (!!p.next_follow_up && p.next_follow_up <= today))

export function dashboardCounts(db: DB) {
  const act = activeProspects(db)
  const proj = liveProjects(db)
  const by = (...s: Project['status'][]) => proj.filter((p) => s.includes(p.status)).length
  return {
    active: act.length,
    toContact: act.filter((p) => p.status === 'a_prospecter').length,
    toFollowUp: act.filter((p) => needsFollowUp(p)).length,
    demosSent: by('demo_envoyee'),
    inCreation: by('demo_creation', 'dev_final'),
    awaitingValidation: by('attente_validation'),
    needsRevisions: by('modifs_demandees'),
    validated: by('demo_validee', 'pret_livrer'),
    delivered: by('livre', 'maintenance'),
  }
}

export type TodayItem =
  | { kind: 'task'; id: string; task: Task; late: boolean }
  | { kind: 'followup'; id: string; prospect: Prospect; late: boolean }
  | { kind: 'revisions'; id: string; project: Project; remaining: number; total: number }
  | { kind: 'delivery'; id: string; project: Project; late: boolean }
  | { kind: 'validation'; id: string; project: Project; days: number }

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
    if (mine(pr.owner_id) && pr.due_date && pr.due_date <= addDaysStr(2) && !['livre', 'maintenance', 'demo_refusee'].includes(pr.status)) {
      items.push({ kind: 'delivery', id: 'd' + pr.id, project: pr, late: pr.due_date < today })
    }
    if (mine(pr.owner_id) && pr.status === 'attente_validation') {
      const days = Math.floor((Date.now() - new Date(pr.updated_at).getTime()) / 864e5)
      if (days >= 3) items.push({ kind: 'validation', id: 'v' + pr.id, project: pr, days })
    }
  }

  const rank = (i: TodayItem) =>
    ('late' in i && i.late ? 0 : 10) +
    (i.kind === 'task' && i.task.priority === 'haute' ? 0 : 1) +
    ({ followup: 1, task: 2, revisions: 3, delivery: 4, validation: 5 } as const)[i.kind]
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
