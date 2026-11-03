import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { ChevronRight, Plus, Search, Store } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { ChannelIcon, OwnerButton, ProspectThumb } from '../../components/bits'
import { CHANNELS, TICKET_PRIORITIES, TICKET_TYPES, prospectStatus } from '../../lib/constants'
import type { Channel, Prospect, Ticket, TicketPriority, TicketType, UUID } from '../../lib/types'
import { createProspect, createTicket, updateTicket } from '../../data/actions'
import { useStore } from '../../data/store'
import { addDaysStr, todayStr } from '../../lib/dates'
import { dueForPriority, searchMatch } from '../../lib/derive'

export interface TicketDraft { prospect_id?: UUID; project_id?: UUID | null }

/** Création / édition d'un ticket (ticket = existant, draft = nouveau) */
export function TicketSheet({ open, onClose, ticket, draft, onCreated }: {
  open: boolean; onClose: () => void; ticket?: Ticket | null; draft?: TicketDraft | null; onCreated?: (t: Ticket) => void
}) {
  const userId = useStore((s) => s.userId)
  const prospects = useStore((s) => s.db.prospects)
  const allProjects = useStore((s) => s.db.projects)
  const [clientId, setClientId] = useState<UUID | null>(null)
  const [picking, setPicking] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TicketType>('demande')
  const [channel, setChannel] = useState<Channel | null>(null)
  const [priority, setPriority] = useState<TicketPriority>('normale')
  const [due, setDue] = useState('')
  const [dueTouched, setDueTouched] = useState(false)
  const [assignee, setAssignee] = useState<UUID | null>(null)
  const [assigneeTouched, setAssigneeTouched] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [busy, setBusy] = useState(false)

  const client = prospects.find((p) => p.id === clientId)
  const projects = useMemo(() => allProjects.filter((p) => p.prospect_id === clientId && !p.archived), [allProjects, clientId])

  // avant le premier affichage : la feuille ne doit pas apparaître vide puis se remplir
  useLayoutEffect(() => {
    if (!open) return
    setClientId(ticket?.prospect_id ?? draft?.prospect_id ?? null)
    setSubject(ticket?.subject ?? '')
    setDescription(ticket?.description ?? '')
    setType(ticket?.type ?? 'demande')
    setChannel(ticket?.channel ?? null)
    setPriority(ticket?.priority ?? 'normale')
    setDue(ticket ? ticket.due_date ?? '' : dueForPriority('normale'))
    setDueTouched(false)
    setAssignee(ticket ? ticket.assignee_id : userId)
    setAssigneeTouched(false)
    setProjectId(ticket?.project_id ?? draft?.project_id ?? '')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Nouveau ticket : le responsable du client et son unique projet sont proposés d'office
  useEffect(() => {
    if (!open || ticket || !client) return
    if (!assigneeTouched && client.owner_id) setAssignee(client.owner_id)
    if (!draft?.project_id) setProjectId(projects.length === 1 ? projects[0].id : '')
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  function pickPriority(p: TicketPriority) {
    setPriority(p)
    if (!ticket && !dueTouched) setDue(dueForPriority(p))
  }

  async function save() {
    if (!subject.trim() || !clientId || busy) return
    setBusy(true)
    const data: Partial<Ticket> = {
      prospect_id: clientId, project_id: projectId || null, subject: subject.trim(), description: description.trim() || null,
      type, channel, priority, due_date: due || null, assignee_id: assignee,
    }
    if (ticket) {
      await updateTicket(ticket.id, data)
      onClose()
    } else {
      const saved = await createTicket(data)
      if (saved) { onClose(); onCreated?.(saved) }
    }
    setBusy(false)
  }

  const quick = [{ l: "Aujourd'hui", v: todayStr() }, { l: 'Demain', v: addDaysStr(1) }, { l: 'Dans 3 j', v: addDaysStr(3) }, { l: '1 sem.', v: addDaysStr(7) }]

  return (
    <>
      <Sheet open={open} onClose={onClose} title={ticket ? 'Modifier le ticket' : 'Nouveau ticket'}
        footer={<button className="btn-primary w-full" disabled={!subject.trim() || !clientId || busy} onClick={save}>{ticket ? 'Enregistrer' : 'Créer le ticket'}</button>}>
        <div className="flex flex-col gap-4">
          <div>
            <span className="field-label">Client *</span>
            <button type="button" onClick={() => setPicking(true)} className="input flex items-center gap-2.5 text-left">
              <Store size={18} className="text-faint shrink-0" />
              <span className={cx('flex-1 truncate', !client && 'text-faint')}>{client?.name ?? 'Choisir ou créer un client'}</span>
              <ChevronRight size={17} className="text-faint shrink-0" />
            </button>
          </div>
          <Field label="Objet *"><Input autoFocus={!ticket} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Le formulaire de contact ne fonctionne plus" enterKeyHint="done" /></Field>
          <div>
            <span className="field-label">Type</span>
            <div className="flex gap-2 flex-wrap">
              {TICKET_TYPES.map((t) => <button key={t.value} type="button" onClick={() => setType(t.value)} className={cx('chip', type === t.value && 'chip-on')}>{t.label}</button>)}
            </div>
          </div>
          <div>
            <span className="field-label">Reçu par</span>
            <div className="flex gap-2 flex-wrap">
              {CHANNELS.map((c) => (
                <button key={c.value} type="button" onClick={() => setChannel(channel === c.value ? null : c.value)} className={cx('chip', channel === c.value && 'chip-on')}>
                  <ChannelIcon channel={c.value} />{c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Priorité</span>
            <div className="grid grid-cols-4 gap-1.5">
              {TICKET_PRIORITIES.map((p) => <button key={p.value} type="button" onClick={() => pickPriority(p.value)} className={cx('chip justify-center h-[46px] px-1.5', priority === p.value && 'chip-on')}>{p.label}</button>)}
            </div>
          </div>
          <div>
            <span className="field-label">À traiter avant</span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-2">
              {quick.map((q) => <button key={q.l} type="button" onClick={() => { setDue(q.v); setDueTouched(true) }} className={cx('chip', due === q.v && 'chip-on')}>{q.l}</button>)}
              <button type="button" onClick={() => { setDue(''); setDueTouched(true) }} className={cx('chip', !due && 'chip-on')}>Sans date</button>
            </div>
            <Input type="date" value={due} onChange={(e) => { setDue(e.target.value); setDueTouched(true) }} />
          </div>
          <Field label="Responsable"><OwnerButton value={assignee} onChange={(v) => { setAssignee(v); setAssigneeTouched(true) }} /></Field>
          {projects.length > 0 && (
            <Field label="Projet concerné">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Aucun</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Détail"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ce que le client a demandé, avec ses mots…" /></Field>
        </div>
      </Sheet>
      <ClientPicker open={picking} onClose={() => setPicking(false)} value={clientId} onPick={setClientId} />
    </>
  )
}

/** Recherche d'un client parmi les fiches ; un nom inconnu peut être créé sur place. */
function ClientPicker({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: UUID | null; onPick: (id: UUID) => void }) {
  const prospects = useStore((s) => s.db.prospects)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setQ('') }, [open])

  const list = useMemo(() => prospects
    .filter((p) => !p.archived && searchMatch(q, p.name, p.city, p.contact_name, p.phone))
    .sort((a, b) => Number(b.status === 'gagne') - Number(a.status === 'gagne') || a.name.localeCompare(b.name, 'fr')), [prospects, q])
  const exact = prospects.some((p) => p.name.trim().toLowerCase() === q.trim().toLowerCase())

  async function createClient() {
    setBusy(true)
    const saved = await createProspect({ name: q.trim(), status: 'gagne' })
    setBusy(false)
    if (saved) { onPick(saved.id); onClose() }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Client" size="sm">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville, contact, téléphone…" className="pl-10" type="search" />
        </div>
        {q.trim() && !exact && (
          <button type="button" className="btn-soft justify-start" disabled={busy} onClick={createClient}><Plus size={17} />Créer le client « {q.trim()} »</button>
        )}
        <div className="flex flex-col gap-1 -mx-2">
          {list.slice(0, 40).map((p: Prospect) => (
            <button key={p.id} type="button" onClick={() => { onPick(p.id); onClose() }}
              className={cx('flex items-center gap-3 min-h-[52px] px-2 rounded-xl text-left hover:bg-sunken transition', value === p.id && 'bg-sunken')}>
              <ProspectThumb name={p.name} category={p.category} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[15px] truncate">{p.name}</span>
                <span className="block text-[12.5px] text-muted truncate">{p.status === 'gagne' ? 'Client' : `Prospect · ${prospectStatus(p.status).short ?? prospectStatus(p.status).label}`}{p.city ? ` · ${p.city}` : ''}</span>
              </span>
            </button>
          ))}
          {list.length === 0 && !q.trim() && <p className="px-2 py-3 text-[14px] text-muted">Aucune fiche pour l’instant.</p>}
        </div>
      </div>
    </Sheet>
  )
}
