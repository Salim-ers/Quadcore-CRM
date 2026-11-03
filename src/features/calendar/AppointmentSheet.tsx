import { useLayoutEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle2, Circle, FileText, Globe, MapPin, MonitorSmartphone, Store, Trash2 } from 'lucide-react'
import { Avatar, Field, Input, Select, Sheet, StepSwitch, TextArea, confirmDialog, cx } from '../../components/ui'
import { ContactActions, UrlTile } from '../../components/bits'
import { createAppointment, deleteTask, updateAppointment, updateTask } from '../../data/actions'
import { toast, useMe, useStore } from '../../data/store'
import { salesTeam, toMinutes, toTime, type Appointment } from '../../lib/appointments'
import { PROSPECT_STEPS, prospectStep } from '../../lib/constants'
import { todayStr } from '../../lib/dates'
import { mapsLink } from '../../lib/links'
import { offerFor } from '../../lib/offers'
import type { Prospect, Project, UUID } from '../../lib/types'
import { QuoteSheet } from '../documents/QuoteSheet'
import { PriceButton } from '../projects/PriceButton'
import { useProspectFlow } from '../prospects/flows'

const DURATIONS = [{ value: 30, label: '30 min' }, { value: 60, label: '1 h' }, { value: 90, label: '1 h 30' }]
const TIMES = Array.from({ length: 49 }, (_, i) => toTime(8 * 60 + i * 15))

export interface AppointmentDraft { prospectId?: UUID; date: string; time: string }

/** Tout ce qu'il faut au commercial sur place : le contact, l'adresse, les sites, le prix, le devis et la brochure. */
function ProspectBrief({ prospect, site, onLeave }: { prospect: Prospect; site?: Project; onLeave: () => void }) {
  const [quote, setQuote] = useState(false)
  const nav = useNavigate()
  const address = [prospect.address, prospect.city].filter(Boolean).join(', ')
  const maps = mapsLink(address)
  const demo = site?.demo_url ?? prospect.website_url
  // Un lien manquant se complète sur la page du site, ou sur la fiche s'il n'y a pas encore de site
  const addLink = () => { onLeave(); nav(site ? `/projets/${site.id}` : `/prospects/${prospect.id}`) }
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="section-title">Dossier</h3>
        <Link to={`/prospects/${prospect.id}`} onClick={onLeave} className="inline-flex items-center gap-1 text-[13px] font-semibold text-copper-ink"><Store size={14} />Ouvrir la fiche</Link>
      </div>
      <div className="card p-3.5">
        <p className="font-bold text-[16px]">{prospect.name}</p>
        {prospect.contact_name && <p className="text-[14px] text-muted mt-0.5">{prospect.contact_name}</p>}
        {address && (maps
          ? <a href={maps} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-[14px] font-semibold text-copper-ink mt-2"><MapPin size={16} className="shrink-0 mt-0.5" />{address}</a>
          : <p className="text-[14px] mt-2">{address}</p>)}
        {prospect.notes && <p className="text-[13.5px] text-muted leading-snug mt-2 whitespace-pre-wrap">{prospect.notes}</p>}
      </div>
      <ContactActions phone={prospect.phone} email={prospect.email} instagramUrl={prospect.instagram_url} website={null} />
      <UrlTile icon={<MonitorSmartphone size={18} />} label="Site de démo" url={demo} onAdd={addLink} />
      <UrlTile icon={<Globe size={18} />} label="Site réel" url={site?.final_url ?? null} onAdd={addLink} />
      {site ? (
        <div className="card flex items-center gap-3 min-h-[56px] px-3.5 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-muted font-semibold">Prix proposé</p>
            <p className="text-[14px] font-semibold truncate">{offerFor(site, prospect).label}</p>
          </div>
          <PriceButton project={site} />
        </div>
      ) : <p className="text-[13.5px] text-muted px-1">Pas encore de site pour ce client.</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-soft text-[14px] px-2" disabled={!site} onClick={() => setQuote(true)}><FileText size={16} />Devis et CGV</button>
        <Link to="/brochure" onClick={onLeave} className="btn-soft text-[14px] px-2"><BookOpen size={16} />Brochure</Link>
      </div>
      {site && <QuoteSheet project={site} open={quote} onClose={() => setQuote(false)} />}
    </section>
  )
}

/** Créer ou suivre un rendez-vous : qui y va, quand, et ce qui s'est décidé. */
export function AppointmentSheet({ draft, appointment, onClose }: { draft: AppointmentDraft | null; appointment: Appointment | null; onClose: () => void }) {
  const open = !!draft || !!appointment
  const db = useStore((s) => s.db)
  const me = useMe()
  const flow = useProspectFlow()
  const team = useMemo(() => salesTeam(db.profiles), [db.profiles])
  const choices = useMemo(() => db.prospects.filter((p) => !p.archived && !['accepte', 'refuse'].includes(prospectStep(p.status))).sort((a, b) => a.name.localeCompare(b.name, 'fr')), [db.prospects])

  const [prospectId, setProspectId] = useState('')
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('10:00')
  const [minutes, setMinutes] = useState(60)
  const [who, setWho] = useState<UUID | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const defaultWho = (p?: Prospect): UUID | '' => {
    if (me && team.some((m) => m.id === me.id)) return me.id
    return p?.owner_id && team.some((m) => m.id === p.owner_id) ? p.owner_id : ''
  }

  // Avant l'affichage : la feuille s'ouvre déjà remplie
  useLayoutEffect(() => {
    if (appointment) {
      setProspectId(appointment.task.prospect_id ?? ''); setDate(appointment.date); setTime(appointment.time)
      setMinutes(appointment.minutes); setWho(appointment.task.assignee_id ?? ''); setNotes(appointment.notes)
    } else if (draft) {
      setProspectId(draft.prospectId ?? ''); setDate(draft.date); setTime(draft.time); setMinutes(60); setNotes('')
      setWho(defaultWho(db.prospects.find((p) => p.id === draft.prospectId)))
    }
    setSaving(false)
  }, [open, appointment?.task.id, draft]) // eslint-disable-line react-hooks/exhaustive-deps

  const prospect = db.prospects.find((p) => p.id === prospectId)
  const site = db.projects.find((p) => p.prospect_id === prospectId && !p.archived)
  const ready = !!prospect && !!who && !!date && !saving
  const timeOptions = TIMES.includes(time) ? TIMES : [...TIMES, time].sort((a, b) => toMinutes(a) - toMinutes(b))

  async function save() {
    if (!prospect || !who) return
    setSaving(true)
    const input = { date, time, minutes, assignee_id: who, notes }
    const ok = appointment ? await updateAppointment(appointment.task.id, input) : await createAppointment(prospect, input)
    setSaving(false)
    if (ok) { toast(appointment ? 'Rendez-vous modifié' : 'Rendez-vous planifié', 'success'); onClose() }
  }

  async function remove() {
    if (!appointment) return
    if (await confirmDialog({ title: 'Supprimer ce rendez-vous ?', message: 'Le client revient dans la liste à planifier.', confirm: 'Supprimer', danger: true })) {
      await deleteTask(appointment.task.id)
      onClose()
    }
  }

  const markDone = (done: boolean) => appointment && updateTask(appointment.task.id, { status: done ? 'termine' : 'a_faire' })

  return (
    <>
      <Sheet open={open} onClose={onClose} title={appointment ? 'Rendez-vous' : 'Nouveau rendez-vous'}
        footer={
          <div className="flex gap-2">
            {appointment && <button type="button" className="icon-btn shrink-0 text-danger" aria-label="Supprimer le rendez-vous" onClick={remove}><Trash2 size={19} /></button>}
            <button type="button" className="btn-primary flex-1" disabled={!ready} onClick={save}>{appointment ? 'Enregistrer' : 'Planifier le rendez-vous'}</button>
          </div>
        }>
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            {!appointment && !draft?.prospectId && (
              <Field label="Client *">
                <Select value={prospectId} onChange={(e) => { setProspectId(e.target.value); setWho(who || defaultWho(db.prospects.find((p) => p.id === e.target.value))) }}>
                  <option value="">Choisir un client</option>
                  {choices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Heure">
                <Select value={time} onChange={(e) => setTime(e.target.value)}>{timeOptions.map((t) => <option key={t}>{t}</option>)}</Select>
              </Field>
            </div>
            <div>
              <span className="field-label">Durée</span>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => <button key={d.value} type="button" aria-pressed={minutes === d.value} onClick={() => setMinutes(d.value)} className={cx('chip justify-center h-11 px-1', minutes === d.value && 'chip-on')}>{d.label}</button>)}
              </div>
            </div>
            <div>
              <span className="field-label">Quel commercial y va ? *</span>
              <div role="radiogroup" aria-label="Commercial" className="flex flex-wrap gap-2">
                {team.map((m) => (
                  <button key={m.id} type="button" role="radio" aria-checked={who === m.id} onClick={() => setWho(m.id)} className={cx('chip h-11 pl-1.5', who === m.id && 'chip-on')}>
                    <Avatar profile={m} size={28} />{m.first_name}
                  </button>
                ))}
              </div>
              {!who && <p className="text-[12.5px] font-semibold text-copper-ink mt-1.5">Choisissez qui va voir ce client.</p>}
            </div>
            <Field label="Notes pour le commercial"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. Passer après le service du midi" /></Field>
          </section>

          {appointment && prospect && (
            <section className="flex flex-col gap-2.5">
              <h3 className="section-title">Résultat du rendez-vous</h3>
              <StepSwitch label="Étape du client" value={prospectStep(prospect.status)} options={PROSPECT_STEPS} onChange={(v) => {
                flow.moveTo(prospect, v)
                if (v !== 'prospect' && !appointment.done) markDone(true)
              }} />
              <button type="button" className="btn-soft" onClick={() => markDone(!appointment.done)}>
                {appointment.done ? <><CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />Rendez-vous fait</> : <><Circle size={17} />Marquer comme fait</>}
              </button>
            </section>
          )}

          {prospect && <ProspectBrief prospect={prospect} site={site} onLeave={onClose} />}
        </div>
      </Sheet>
      {flow.ui}
    </>
  )
}
