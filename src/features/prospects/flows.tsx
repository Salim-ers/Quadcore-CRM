import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input, Picker, Sheet, TextArea, confirmDialog, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { LOST_REASONS, PROSPECT_STATUSES } from '../../lib/constants'
import type { Prospect, ProspectStatus, UUID } from '../../lib/types'
import { createProject, projectDraftFrom, scheduleFollowUp, setProspectStatus } from '../../data/actions'
import { addDaysStr, longDate } from '../../lib/dates'
import { toast, useStore } from '../../data/store'

/** Changement de statut commercial avec ses étapes associées (motif de refus, relance, création de projet). */
export function useProspectStatusFlow() {
  const nav = useNavigate()
  const [lost, setLost] = useState<Prospect | null>(null)
  const [follow, setFollow] = useState<Prospect | null>(null)
  const [pick, setPick] = useState<Prospect | null>(null)

  async function change(p: Prospect, status: ProspectStatus) {
    if (status === p.status) return
    if (status === 'perdu') { setLost(p); return }
    const ok = await setProspectStatus(p.id, status)
    if (!ok) return
    if (status === 'a_relancer' && !p.next_follow_up) setFollow({ ...p, status })
    if (status === 'gagne') {
      const hasProject = useStore.getState().db.projects.some((x) => x.prospect_id === p.id && !x.archived)
      const yes = await confirmDialog({
        title: `${p.name} est gagné`,
        message: hasProject
          ? 'Un projet existe déjà pour ce client. Voulez-vous en créer un nouveau à partir de sa fiche ?'
          : 'Créer le projet du site maintenant ? Les informations du prospect seront reprises automatiquement.',
        confirm: 'Créer le projet',
      })
      if (yes) {
        const pr = await createProject(projectDraftFrom(p))
        if (pr) nav(`/projets/${pr.id}`)
      }
    }
  }

  const ui: ReactNode = (
    <>
      <LostReasonSheet prospect={lost} onClose={() => setLost(null)} />
      <FollowUpSheet prospect={follow} onClose={() => setFollow(null)} />
      <Picker
        open={!!pick} onClose={() => setPick(null)} title="Statut commercial" value={pick?.status}
        options={PROSPECT_STATUSES.map((s) => ({ value: s.value, label: s.label, tone: s.tone }))}
        onPick={(v) => pick && change(pick, v)}
      />
    </>
  )
  return { change, openPicker: setPick, scheduleFor: setFollow, ui }
}

function LostReasonSheet({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')
  const value = reason === '__autre' ? custom.trim() : reason
  return (
    <Sheet open={!!prospect} onClose={onClose} title="Motif du refus" size="sm"
      footer={
        <button className="btn-dark w-full" onClick={async () => {
          if (!prospect) return
          await setProspectStatus(prospect.id, 'perdu', { lost_reason: value || null })
          toast('Fiche conservée dans « Refusé / perdu »')
          setReason(''); setCustom(''); onClose()
        }}>Marquer comme perdu</button>
      }>
      <p className="text-muted text-[14px] mb-4">La fiche de <b className="text-ink">{prospect?.name}</b> est conservée : vous pourrez la relancer plus tard.</p>
      <div className="flex flex-wrap gap-2">
        {[...LOST_REASONS, '__autre'].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={cx('chip h-10', reason === r && 'chip-on')}>{r === '__autre' ? 'Autre…' : r}</button>
        ))}
      </div>
      {reason === '__autre' && <Input className="mt-3" autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Précisez le motif" />}
    </Sheet>
  )
}

export function FollowUpSheet({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
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
