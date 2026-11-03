import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input, Sheet, TextArea, celebrate, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { LOST_REASONS, PROSPECT_STEPS, prospectStep, type ProspectStep } from '../../lib/constants'
import type { Prospect, UUID } from '../../lib/types'
import { createProject, projectDraftFrom, scheduleFollowUp, setProspectStatus } from '../../data/actions'
import { addDaysStr, longDate } from '../../lib/dates'
import { toast, useStore } from '../../data/store'

/** Avancer une fiche dans le parcours : un seul geste, le reste se fait tout seul. */
export function useProspectFlow() {
  const nav = useNavigate()
  const [lost, setLost] = useState<Prospect | null>(null)
  const [follow, setFollow] = useState<Prospect | null>(null)

  async function moveTo(p: Prospect, step: ProspectStep) {
    if (step === prospectStep(p.status)) return
    if (step === 'refuse') { setLost(p); return }
    const target = PROSPECT_STEPS.find((s) => s.value === step)!
    if (!(await setProspectStatus(p.id, target.status))) return
    if (step !== 'accepte') {
      toast(`${p.name} : ${target.label.toLowerCase()}`, 'default', { label: 'Annuler', run: () => setProspectStatus(p.id, p.status, { lost_reason: p.lost_reason }) })
      return
    }
    // Accepté : le site est lancé d'office, on ne pose pas de question
    celebrate()
    const existing = useStore.getState().db.projects.find((x) => x.prospect_id === p.id && !x.archived)
    const site = existing ?? await createProject(projectDraftFrom(p))
    toast(existing ? `${p.name} a accepté` : `${p.name} a accepté : site lancé`, 'success', site ? { label: 'Voir le site', run: () => nav(`/projets/${site.id}`) } : undefined)
  }

  const ui: ReactNode = (
    <>
      <LostReasonSheet prospect={lost} onClose={() => setLost(null)} />
      <FollowUpSheet prospect={follow} onClose={() => setFollow(null)} />
    </>
  )
  return { moveTo, scheduleFor: setFollow, ui }
}

function LostReasonSheet({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
  const refuse = async (reason: string | null) => {
    if (!prospect) return
    onClose()
    if (await setProspectStatus(prospect.id, 'perdu', { lost_reason: reason })) {
      toast(`${prospect.name} : refusé`, 'default', { label: 'Annuler', run: () => setProspectStatus(prospect.id, prospect.status) })
    }
  }
  return (
    <Sheet open={!!prospect} onClose={onClose} title="Pourquoi ce refus ?" size="sm"
      footer={<button className="btn-soft w-full" onClick={() => refuse(null)}>Passer</button>}>
      <div className="flex flex-wrap gap-2">
        {LOST_REASONS.map((r) => <button key={r} type="button" onClick={() => refuse(r)} className="chip h-11">{r}</button>)}
      </div>
    </Sheet>
  )
}

function FollowUpSheet({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
  const presets = [
    { label: 'Demain', v: addDaysStr(1) },
    { label: 'Dans 3 jours', v: addDaysStr(3) },
    { label: 'Dans 1 semaine', v: addDaysStr(7) },
    { label: 'Dans 2 semaines', v: addDaysStr(14) },
  ]
  const [date, setDate] = useState(presets[1].v)
  const [note, setNote] = useState('')
  const [who, setWho] = useState<UUID | null | undefined>(undefined)
  const assignee = who === undefined ? prospect?.owner_id ?? null : who
  return (
    <Sheet open={!!prospect} onClose={() => { setWho(undefined); onClose() }} title="Programmer une relance" size="sm"
      footer={
        <button className="btn-primary w-full" disabled={!date} onClick={async () => {
          if (!prospect) return
          await scheduleFollowUp(prospect, date, note, assignee)
          setNote(''); setWho(undefined); onClose()
        }}>Programmer pour {date ? longDate(date).replace(/ \d{4}$/, '') : '…'}</button>
      }>
      <p className="text-muted text-[14px] mb-4">Relancer <b className="text-ink">{prospect?.name}</b> — une tâche est créée et la date apparaît sur la fiche.</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => setDate(p.v)} className={cx('chip h-11 justify-center', date === p.v && 'chip-on')}>{p.label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Ou choisir une date"><Input type="date" value={date} min={addDaysStr(0)} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Qui relance ?"><OwnerButton value={assignee} onChange={setWho} allowNone={false} /></Field>
        <Field label="Note (facultatif)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Rappeler après le service du midi" /></Field>
      </div>
    </Sheet>
  )
}
