import { backend, deleteRow, insertRow, me, newId, toast, updateRow, useStore } from './store'
import type {
  Channel, EntityType, Project, ProjectStatus, Prospect, ProspectStatus, Revision, Task, Ticket, TicketStatus, UUID, WorkStatus,
} from '../lib/types'
import { normalizeInstagram } from '../lib/links'
import { todayStr } from '../lib/dates'

const db = () => useStore.getState().db

// ———————————————————————— Prospects ————————————————————————
export async function createProspect(input: Partial<Prospect>, site: Partial<Project> = {}) {
  const ig = normalizeInstagram(input.instagram_handle ?? input.instagram_url ?? null)
  const row = await insertRow('prospects', {
    owner_id: me()?.id ?? null,
    priority: 'normale',
    status: 'a_prospecter',
    archived: false,
    ...input,
    name: (input.name ?? '').trim(),
    instagram_handle: ig.handle,
    instagram_url: ig.url,
    created_by: me()?.id ?? null,
  })
  // Un lien, c'est un site déjà prêt : il arrive tout de suite dans les sites livrés
  if (row?.website_url) await createProject({ ...projectDraftFrom(row), ...site })
  return row
}

export function updateProspect(id: UUID, patch: Partial<Prospect>) {
  if ('instagram_handle' in patch || 'instagram_url' in patch) {
    const ig = normalizeInstagram(patch.instagram_handle ?? patch.instagram_url ?? null)
    patch = { ...patch, instagram_handle: ig.handle, instagram_url: ig.url }
  }
  return updateRow('prospects', id, patch)
}

export function setProspectStatus(id: UUID, status: ProspectStatus, extra: Partial<Prospect> = {}) {
  const patch: Partial<Prospect> = { ...extra, status }
  if (status !== 'perdu') patch.lost_reason = null
  return updateRow('prospects', id, patch)
}

// ———————————————————————— Projets ————————————————————————
export async function createProject(input: Partial<Project>) {
  return insertRow('projects', {
    owner_id: me()?.id ?? null,
    type: 'vitrine',
    status: 'livre',
    billing_status: 'non_facture',
    revision_round: 1,
    archived: false,
    start_date: todayStr(),
    ...input,
    name: (input.name ?? '').trim(),
    created_by: me()?.id ?? null,
  })
}

/** Pré-remplit un site à partir d'une fiche prospect. */
export function projectDraftFrom(p: Prospect): Partial<Project> {
  const service = (p.service ?? '').toLowerCase()
  const type: Project['type'] = service.includes('e-commerce') ? 'ecommerce' : service.includes('click') ? 'click_collect' : service.includes('outil') ? 'application' : 'vitrine'
  return {
    name: `Site ${p.name}`,
    prospect_id: p.id,
    owner_id: p.owner_id ?? me()?.id ?? null,
    type,
    demo_url: p.website_url, // le site est préparé avant de voir le client : il garde son lien
    description: [p.service, p.notes].filter(Boolean).join(' — ') || null,
  }
}

export const updateProject = (id: UUID, patch: Partial<Project>) => updateRow('projects', id, patch)

export async function setProjectStatus(id: UUID, status: ProjectStatus) {
  const project = db().projects.find((p) => p.id === id)
  if (!project) return false
  const patch: Partial<Project> = { status }
  // Retour en « modifications demandées » après une validation : nouvelle série de retouches
  if (status === 'modifs_demandees' && project.status !== 'modifs_demandees') {
    const current = db().revisions.filter((r) => r.project_id === id && r.round === project.revision_round)
    if (current.length > 0 && current.every((r) => r.status === 'termine')) patch.revision_round = project.revision_round + 1
  }
  return updateRow('projects', id, patch)
}

// ———————————————————————— Retouches ————————————————————————
export async function addRevision(project: Project, description: string, extra: Partial<Revision> = {}) {
  let round = project.revision_round
  const current = db().revisions.filter((r) => r.project_id === project.id && r.round === round)
  if (current.length > 0 && current.every((r) => r.status === 'termine') && project.status !== 'modifs_demandees') {
    // la série précédente est soldée : les nouvelles demandes ouvrent une nouvelle série (historique conservé)
    round += 1
    await updateRow('projects', project.id, { revision_round: round, status: 'modifs_demandees' })
  } else if (project.status !== 'modifs_demandees') {
    await updateRow('projects', project.id, { status: 'modifs_demandees' })
  }
  return insertRow('revisions', {
    project_id: project.id,
    round,
    description: description.trim(),
    status: 'a_faire',
    assignee_id: extra.assignee_id ?? project.owner_id ?? me()?.id ?? null,
    position: current.length,
    created_by: me()?.id ?? null,
    ...extra,
  })
}

export async function startNewRound(project: Project) {
  await updateRow('projects', project.id, { revision_round: project.revision_round + 1, status: 'modifs_demandees' })
}

export const updateRevision = (id: UUID, patch: Partial<Revision>) => updateRow('revisions', id, patch)
export const setRevisionStatus = (id: UUID, status: WorkStatus) => updateRow('revisions', id, { status })
export const deleteRevision = (id: UUID) => deleteRow('revisions', id)

// ———————————————————————— Tâches ————————————————————————
export function createTask(input: Partial<Task>) {
  return insertRow('tasks', {
    assignee_id: me()?.id ?? null,
    priority: 'normale',
    status: 'a_faire',
    is_follow_up: false,
    ...input,
    title: (input.title ?? '').trim(),
    created_by: me()?.id ?? null,
  })
}
export const updateTask = (id: UUID, patch: Partial<Task>) => updateRow('tasks', id, patch)
export const deleteTask = (id: UUID) => deleteRow('tasks', id)

export async function toggleTask(task: Task) {
  const done = task.status !== 'termine'
  const ok = await updateRow('tasks', task.id, { status: done ? 'termine' : 'a_faire' })
  if (ok && done && task.is_follow_up && task.prospect_id) {
    const p = db().prospects.find((x) => x.id === task.prospect_id)
    // la relance est faite : on libère la date de relance si elle correspondait
    if (p && p.next_follow_up && task.due_date && p.next_follow_up <= task.due_date) await updateRow('prospects', p.id, { next_follow_up: null })
    toast('Relance enregistrée dans l’historique commercial', 'success')
  }
  return ok
}

/** Programme une relance : date sur la fiche + tâche de relance assignée. */
export async function scheduleFollowUp(p: Prospect, date: string, note?: string, assignee?: UUID | null) {
  await updateRow('prospects', p.id, { next_follow_up: date, ...(p.status === 'contacte' ? { status: 'a_relancer' as const } : {}) })
  await createTask({
    title: `Relancer ${p.name}`,
    description: note || null,
    due_date: date,
    prospect_id: p.id,
    is_follow_up: true,
    assignee_id: assignee ?? p.owner_id ?? me()?.id ?? null,
  })
  toast('Relance programmée', 'success')
}

// ———————————————————————— Tickets ————————————————————————
export function createTicket(input: Partial<Ticket>) {
  return insertRow('tickets', {
    priority: 'normale',
    type: 'demande',
    status: 'nouveau',
    status_changed_at: new Date().toISOString(),
    ...input,
    subject: (input.subject ?? '').trim(),
    created_by: me()?.id ?? null,
  })
}
export const updateTicket = (id: UUID, patch: Partial<Ticket>) => updateRow('tickets', id, patch)
export const setTicketStatus = (id: UUID, status: TicketStatus) => updateRow('tickets', id, { status })
export const deleteTicket = (id: UUID) => deleteRow('tickets', id)

/** « Je m'en occupe » : le ticket m'est attribué et passe en cours. */
export const takeTicket = (t: Ticket) =>
  updateRow('tickets', t.id, { assignee_id: me()?.id ?? null, status: t.status === 'nouveau' ? 'en_cours' : t.status })

// ———————————————————————— Commentaires & fichiers ————————————————————————
export const addComment = (entity_type: EntityType, entity_id: UUID, body: string, channel: Channel | null = null) =>
  insertRow('comments', { entity_type, entity_id, body: body.trim(), author_id: me()?.id ?? null, channel })
export const deleteComment = (id: UUID) => deleteRow('comments', id)

export async function uploadAttachment(entity_type: EntityType, entity_id: UUID, file: File) {
  const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '_').slice(-80)
  const path = `${entity_type}/${entity_id}/${newId()}-${safe}`
  try {
    await backend.uploadFile(path, file)
  } catch (e) {
    toast((e as Error).message || 'Envoi du fichier impossible', 'error')
    return null
  }
  return insertRow('attachments', {
    entity_type, entity_id, file_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size, uploaded_by: me()?.id ?? null,
  })
}

export async function deleteAttachment(id: UUID) {
  const a = db().attachments.find((x) => x.id === id)
  if (!a) return
  // La ligne d'abord : c'est sa suppression qui vérifie le droit de retirer le fichier
  if (await deleteRow('attachments', id)) await backend.removeFile(a.file_path).catch(() => { /* fichier orphelin, sans effet visible */ })
}

export async function uploadLogo(prospect: Prospect, file: File) {
  const path = `prospect/${prospect.id}/logo-${newId()}`
  try {
    await backend.uploadFile(path, file)
    await updateRow('prospects', prospect.id, { logo_path: path })
  } catch (e) {
    toast((e as Error).message || 'Envoi du logo impossible', 'error')
  }
}

// ———————————————————————— Archivage (admin) ————————————————————————
export async function archive(kind: 'prospects' | 'projects', id: UUID, archived = true) {
  const ok = await updateRow(kind, id, { archived })
  if (ok) toast(archived ? 'Dossier archivé' : 'Dossier restauré', 'success')
  return ok
}
