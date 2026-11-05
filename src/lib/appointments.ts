import { prospectStep } from './constants'
import { todayStr } from './dates'
import type { DB, Profile, Prospect, Task, UUID } from './types'

// Un rendez-vous est une tâche datée : la base n'a pas de champ pour l'heure, elle tient donc dans la description.
// La phrase reste lisible si quelqu'un l'ouvre comme une tâche.
// Le responsable est celui de la tâche ; les autres commerciaux qui y vont suivent « avec ».
const MARK = /^Rendez-vous (\d{2}:\d{2}), (\d+) min(?:, avec ([\w-]+(?: [\w-]+)*))?(?:\n([\s\S]*))?$/

/** team : tous ceux qui y vont, le responsable en premier. */
export interface Appointment { task: Task; date: string; time: string; minutes: number; notes: string; done: boolean; team: UUID[] }

export function appointmentOf(task: Task): Appointment | null {
  const m = task.description ? MARK.exec(task.description) : null
  if (!m || !task.due_date) return null
  const team = [...new Set([task.assignee_id, ...(m[3]?.split(' ') ?? [])].filter((id): id is UUID => !!id))]
  return { task, date: task.due_date, time: m[1], minutes: Number(m[2]), notes: m[4] ?? '', done: task.status === 'termine', team }
}

/** others : les commerciaux qui accompagnent le responsable de la tâche. */
export const appointmentDescription = (time: string, minutes: number, notes: string, others: UUID[] = []) =>
  `Rendez-vous ${time}, ${minutes} min${others.length ? `, avec ${others.join(' ')}` : ''}${notes.trim() ? `\n${notes.trim()}` : ''}`

/** La tâche est pour cette personne : elle en est responsable, ou elle va au rendez-vous. */
export const isAssigned = (task: Task, userId: UUID | null) =>
  !!userId && (task.assignee_id === userId || !!appointmentOf(task)?.team.includes(userId))

export const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
export const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function allAppointments(db: DB) {
  const archived = new Set(db.prospects.filter((p) => p.archived).map((p) => p.id))
  return db.tasks.flatMap((t) => {
    const a = appointmentOf(t)
    return a && !(t.prospect_id && archived.has(t.prospect_id)) ? [a] : []
  })
}

/** Le prochain rendez-vous à venir d'un client. */
export function nextAppointment(db: DB, prospectId: UUID) {
  const today = todayStr()
  return db.tasks.flatMap((t) => {
    const a = t.prospect_id === prospectId ? appointmentOf(t) : null
    return a && !a.done && a.date >= today ? [a] : []
  }).sort((x, y) => `${x.date}${x.time}`.localeCompare(`${y.date}${y.time}`))[0]
}

const SCHEDULE_ORDER = { prospect: 0, attente: 1, vu: 2 } as const

/** Les fiches à planifier : pas encore décidées, sans rendez-vous à venir. */
export function toSchedule(db: DB): Prospect[] {
  const today = todayStr()
  const planned = new Set(db.tasks.flatMap((t) => {
    const a = appointmentOf(t)
    return a && !a.done && a.date >= today && t.prospect_id ? [t.prospect_id] : []
  }))
  const rank = (p: Prospect) => SCHEDULE_ORDER[prospectStep(p.status) as keyof typeof SCHEDULE_ORDER] ?? 9
  return db.prospects
    .filter((p) => !p.archived && !planned.has(p.id) && rank(p) < 9)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'fr'))
}

// Toute l'équipe active peut aller voir un client, Salim compris
export const salesTeam = (profiles: Profile[]) => profiles.filter((p) => p.active)
