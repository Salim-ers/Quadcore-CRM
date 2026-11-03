import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, History, Image as ImageIcon, Loader, MessageSquare, Plus, Trash2, Undo2 } from 'lucide-react'
import type { Project, Revision, WorkStatus } from '../../lib/types'
import { toast, useStore } from '../../data/store'
import { addRevision, deleteRevision, setRevisionStatus, updateRevision } from '../../data/actions'
import { moveSite } from './flows'
import { Avatar, Field, Input, ProgressBar, Sheet, TextArea, confirmDialog, cx } from '../../components/ui'
import { DueChip, OwnerButton } from '../../components/bits'
import { WORK_STATUSES, siteStep } from '../../lib/constants'
import { Attachments, CommentComposer } from '../shared/Timeline'
import { relTime, shortDate } from '../../lib/dates'

const NEXT: Record<WorkStatus, WorkStatus> = { a_faire: 'en_cours', en_cours: 'termine', termine: 'a_faire' }

export function Revisions({ project }: { project: Project }) {
  const all = useStore((s) => s.db.revisions)
  const comments = useStore((s) => s.db.comments)
  const attachments = useStore((s) => s.db.attachments)
  const [text, setText] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const mine = useMemo(() => all.filter((r) => r.project_id === project.id).sort((a, b) => a.round - b.round || a.position - b.position || (a.created_at < b.created_at ? -1 : 1)), [all, project.id])
  const current = mine.filter((r) => r.round === project.revision_round)
  const past = useMemo(() => {
    const m = new Map<number, Revision[]>()
    for (const r of mine) if (r.round < project.revision_round) m.set(r.round, [...(m.get(r.round) ?? []), r])
    return [...m.entries()].sort((a, b) => b[0] - a[0])
  }, [mine, project.revision_round])
  const done = current.filter((r) => r.status === 'termine').length
  const allDone = current.length > 0 && done === current.length
  const count = (id: string) => ({
    c: comments.filter((x) => x.entity_type === 'revision' && x.entity_id === id).length,
    a: attachments.filter((x) => x.entity_type === 'revision' && x.entity_id === id).length,
  })

  async function add() {
    const lines = text.split('\n').map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean)
    if (!lines.length) return
    setText('')
    if (siteStep(project.status) === 'livre') toast('Le site repasse en cours')
    // coller une liste (une retouche par ligne) crée plusieurs retouches d'un coup
    let p = project
    for (const l of lines) { await addRevision(p, l); p = useStore.getState().db.projects.find((x) => x.id === project.id) ?? p }
  }

  const openRev = mine.find((r) => r.id === open) ?? null

  return (
    <div>
      <div>
        {current.length > 0 && (
          <>
            <div className="flex items-end justify-between mb-2">
              <p className="h-display text-[22px] leading-none tabular">{done} <span className="text-faint">/ {current.length}</span> <span className="text-[14px] font-sans font-semibold text-muted">terminée{done > 1 ? 's' : ''}</span></p>
            </div>
            <ProgressBar value={done} total={current.length} tone={allDone ? 'green' : 'orange'} />
          </>
        )}

        {allDone && siteStep(project.status) === 'en_cours' && (
          <div className="mt-4 rounded-xl bg-emerald-600/8 border border-emerald-600/20 p-3.5 animate-fade-up">
            <p className="font-bold text-[14.5px] text-emerald-800 dark:text-emerald-300">Toutes les retouches sont terminées</p>
            <button className="btn-dark w-full mt-3" onClick={() => moveSite(project, 'livre')}>Site livré</button>
          </div>
        )}

        <ul className="mt-3 flex flex-col">
          {current.map((r) => <RevisionItem key={r.id} r={r} counts={count(r.id)} onOpen={() => setOpen(r.id)} />)}
        </ul>

        <div className="mt-3 flex gap-2 items-start">
          <TextArea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={allDone ? 'Nouvelle demande du client… (ouvre une nouvelle série)' : 'Ajouter une retouche…'}
            className="min-h-[46px]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }} />
          <button className="btn-primary w-[46px] px-0 shrink-0" onClick={add} disabled={!text.trim()} aria-label="Ajouter la retouche"><Plus size={20} /></button>
        </div>
        <p className="text-[12px] text-faint mt-1.5">Collez la liste du client : une ligne = une retouche.</p>
      </div>

      {past.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowPast((v) => !v)} className="flex items-center gap-2 text-[13.5px] font-semibold text-muted min-h-[44px]">
            <History size={16} /> Demandes précédentes ({past.reduce((n, [, l]) => n + l.length, 0)})
            <ChevronDown size={16} className={cx('transition', showPast && 'rotate-180')} />
          </button>
          {showPast && past.map(([round, list]) => (
            <div key={round} className="card p-3.5 mb-2 bg-sunken/40 shadow-none animate-fade-up">
              <p className="text-[12.5px] font-bold text-muted mb-2">Série n° {round} · {shortDate(list[0].created_at)} · {list.filter((r) => r.status === 'termine').length}/{list.length} terminées</p>
              <ul className="flex flex-col">{list.map((r) => <RevisionItem key={r.id} r={r} counts={count(r.id)} onOpen={() => setOpen(r.id)} muted />)}</ul>
            </div>
          ))}
        </div>
      )}

      <RevisionSheet r={openRev} onClose={() => setOpen(null)} />
    </div>
  )
}

function StatusDot({ status }: { status: WorkStatus }) {
  if (status === 'termine') return <span className="w-[22px] h-[22px] rounded-full bg-emerald-600 text-white flex items-center justify-center"><Check size={13} strokeWidth={3} /></span>
  if (status === 'en_cours') return <span className="w-[22px] h-[22px] rounded-full border-2 border-amber-500 text-amber-600 flex items-center justify-center"><Loader size={11} strokeWidth={3} /></span>
  return <span className="w-[22px] h-[22px] rounded-full border-2 border-faint" />
}

function RevisionItem({ r, counts, onOpen, muted }: { r: Revision; counts: { c: number; a: number }; onOpen: () => void; muted?: boolean }) {
  const assignee = useStore((s) => s.db.profiles.find((p) => p.id === r.assignee_id))
  const st = WORK_STATUSES.find((s) => s.value === r.status)!
  return (
    <li className="flex items-start border-t border-line first:border-t-0">
      <button className="w-11 h-[50px] -ml-2 shrink-0 flex items-center justify-center" onClick={() => setRevisionStatus(r.id, NEXT[r.status])}
        aria-label={`${st.label} — passer à « ${WORK_STATUSES.find((s) => s.value === NEXT[r.status])!.label} »`}>
        <StatusDot status={r.status} />
      </button>
      <button className="flex-1 min-w-0 text-left py-3" onClick={onOpen}>
        <p className={cx('text-[14.5px] leading-snug font-medium', r.status === 'termine' && 'text-muted line-through decoration-faint', muted && 'text-[13.5px]')}>{r.description}</p>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-faint">
          {r.status === 'en_cours' && <span className="font-semibold text-amber-700 dark:text-amber-400">En cours</span>}
          {r.due_date && r.status !== 'termine' && <DueChip date={r.due_date} className="text-[12px]" />}
          {counts.c > 0 && <span className="inline-flex items-center gap-1"><MessageSquare size={12} />{counts.c}</span>}
          {counts.a > 0 && <span className="inline-flex items-center gap-1"><ImageIcon size={12} />{counts.a}</span>}
        </div>
      </button>
      <span className="pt-3 pl-2">{assignee && <Avatar profile={assignee} size={24} />}</span>
    </li>
  )
}

function RevisionSheet({ r, onClose }: { r: Revision | null; onClose: () => void }) {
  const [desc, setDesc] = useState('')
  const comments = useStore((s) => s.db.comments)
  const profiles = useStore((s) => s.db.profiles)
  useEffect(() => { if (r) setDesc(r.description) }, [r?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const list = comments.filter((c) => c.entity_type === 'revision' && c.entity_id === r.id).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const saveDesc = () => { if (desc.trim() && desc.trim() !== r.description) updateRevision(r.id, { description: desc.trim() }) }
  return (
    <Sheet open={!!r} onClose={() => { saveDesc(); onClose() }} title="Retouche">
      <div className="flex flex-col gap-4">
        <TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={saveDesc} className="text-[16px] font-medium" />
        <div className="grid grid-cols-3 gap-1.5">
          {WORK_STATUSES.map((s) => (
            <button key={s.value} onClick={() => setRevisionStatus(r.id, s.value)} className={cx('chip h-11 justify-center px-2', r.status === s.value && 'chip-on')}>{s.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsable"><OwnerButton value={r.assignee_id} onChange={(v) => updateRevision(r.id, { assignee_id: v })} /></Field>
          <Field label="Date limite"><Input type="date" value={r.due_date ?? ''} onChange={(e) => updateRevision(r.id, { due_date: e.target.value || null })} /></Field>
        </div>
        <div>
          <span className="field-label">Images et captures</span>
          <Attachments entity="revision" id={r.id} compact />
        </div>
        <div>
          <span className="field-label">Commentaires</span>
          {list.length > 0 && (
            <ul className="flex flex-col gap-2 mb-3">
              {list.map((c) => {
                const a = profiles.find((p) => p.id === c.author_id)
                return (
                  <li key={c.id} className="flex gap-2.5">
                    <Avatar profile={a} size={26} />
                    <div className="flex-1 bg-surface border border-line rounded-xl px-3 py-2">
                      <p className="text-[12px] text-faint"><b className="text-ink font-bold">{a?.first_name}</b> · {relTime(c.created_at)}</p>
                      <p className="text-[14px] whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <CommentComposer entity="revision" id={r.id} placeholder="Précision, lien, remarque…" />
        </div>
        <div className="flex gap-2 pt-1">
          {r.status === 'termine' && <button className="btn-soft flex-1" onClick={() => setRevisionStatus(r.id, 'a_faire')}><Undo2 size={17} />Rouvrir</button>}
          <button className="btn-danger flex-1" onClick={async () => {
            if (await confirmDialog({ title: 'Supprimer cette retouche ?', confirm: 'Supprimer', danger: true })) { await deleteRevision(r.id); onClose() }
          }}><Trash2 size={17} />Supprimer</button>
        </div>
      </div>
    </Sheet>
  )
}
