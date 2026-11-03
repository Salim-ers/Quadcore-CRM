import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, confirmDialog, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { PRIORITIES, WORK_STATUSES } from '../../lib/constants'
import type { Priority, Task, UUID, WorkStatus } from '../../lib/types'
import { createTask, deleteTask, updateTask } from '../../data/actions'
import { useStore } from '../../data/store'
import { addDaysStr, todayStr } from '../../lib/dates'
import { LinkedEntity } from './TaskRow'

export interface TaskDraft { prospect_id?: UUID | null; project_id?: UUID | null; title?: string; is_follow_up?: boolean; due_date?: string | null }

/** Création / édition d'une tâche (task = existante, draft = nouvelle) */
export function TaskSheet({ open, onClose, task, draft }: { open: boolean; onClose: () => void; task?: Task | null; draft?: TaskDraft }) {
  const userId = useStore((s) => s.userId)
  const prospects = useStore((s) => s.db.prospects)
  const projects = useStore((s) => s.db.projects)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState<string>('')
  const [priority, setPriority] = useState<Priority>('normale')
  const [status, setStatus] = useState<WorkStatus>('a_faire')
  const [assignee, setAssignee] = useState<UUID | null>(null)
  const [link, setLink] = useState<string>('')
  const [followUp, setFollowUp] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? draft?.title ?? '')
    setDescription(task?.description ?? '')
    setDue(task ? task.due_date ?? '' : draft?.due_date ?? todayStr())
    setPriority(task?.priority ?? 'normale')
    setStatus(task?.status ?? 'a_faire')
    setAssignee(task ? task.assignee_id : userId)
    const pid = task?.prospect_id ?? draft?.prospect_id, jid = task?.project_id ?? draft?.project_id
    setLink(jid ? 'j:' + jid : pid ? 'p:' + pid : '')
    setFollowUp(task?.is_follow_up ?? draft?.is_follow_up ?? false)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const linkOptions = useMemo(() => ({
    p: prospects.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    j: projects.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  }), [prospects, projects])

  async function save() {
    if (!title.trim()) return
    const [kind, id] = link ? link.split(':') : ['', '']
    let prospect_id: UUID | null = kind === 'p' ? id : null
    const project_id: UUID | null = kind === 'j' ? id : null
    if (project_id) prospect_id = projects.find((p) => p.id === project_id)?.prospect_id ?? null
    const data: Partial<Task> = {
      title: title.trim(), description: description.trim() || null, due_date: due || null, priority, status,
      assignee_id: assignee, prospect_id, project_id, is_follow_up: followUp && !!prospect_id,
    }
    if (task) await updateTask(task.id, data)
    else await createTask(data)
    onClose()
  }

  const quick = [{ l: "Aujourd'hui", v: todayStr() }, { l: 'Demain', v: addDaysStr(1) }, { l: 'Dans 3 j', v: addDaysStr(3) }, { l: '1 sem.', v: addDaysStr(7) }]

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Tâche' : 'Nouvelle tâche'}
      footer={
        <div className="flex gap-2">
          {task && (
            <button className="btn-danger px-3" aria-label="Supprimer"
              onClick={async () => { if (await confirmDialog({ title: 'Supprimer cette tâche ?', confirm: 'Supprimer', danger: true })) { await deleteTask(task.id); onClose() } }}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={!title.trim()} onClick={save}>{task ? 'Enregistrer' : 'Créer la tâche'}</button>
        </div>
      }>
      <div className="flex flex-col gap-4">
        <Field label="Titre *"><Input autoFocus={!task} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Envoyer la démo à Julie" enterKeyHint="done" /></Field>
        <div>
          <span className="field-label">Échéance</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-2">
            {quick.map((q) => <button key={q.l} type="button" onClick={() => setDue(q.v)} className={cx('chip', due === q.v && 'chip-on')}>{q.l}</button>)}
            <button type="button" onClick={() => setDue('')} className={cx('chip', !due && 'chip-on')}>Sans date</button>
          </div>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Responsable"><OwnerButton value={assignee} onChange={setAssignee} /></Field>
          <Field label="Priorité">
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITIES.map((p) => <button key={p.value} type="button" onClick={() => setPriority(p.value)} className={cx('chip justify-center h-[46px] px-2', priority === p.value && 'chip-on')}>{p.label}</button>)}
            </div>
          </Field>
        </div>
        {task && (
          <Field label="Statut">
            <div className="grid grid-cols-3 gap-1.5">
              {WORK_STATUSES.map((s) => <button key={s.value} type="button" onClick={() => setStatus(s.value)} className={cx('chip justify-center h-11 px-2', status === s.value && 'chip-on')}>{s.label}</button>)}
            </div>
          </Field>
        )}
        <Field label="Lié à">
          <Select value={link} onChange={(e) => setLink(e.target.value)}>
            <option value="">Aucun dossier</option>
            <optgroup label="Prospects">{linkOptions.p.map((p) => <option key={p.id} value={'p:' + p.id}>{p.name}</option>)}</optgroup>
            <optgroup label="Sites">{linkOptions.j.map((p) => <option key={p.id} value={'j:' + p.id}>{p.name}</option>)}</optgroup>
          </Select>
        </Field>
        {link.startsWith('p:') && (
          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
            <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="w-5 h-5 accent-[rgb(var(--copper))]" />
            <span className="text-[14.5px] font-medium">C’est une relance commerciale <span className="text-muted">(enregistrée dans l’historique du prospect)</span></span>
          </label>
        )}
        <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails, contexte…" /></Field>
        {task && <LinkedEntity task={task} />}
      </div>
    </Sheet>
  )
}
