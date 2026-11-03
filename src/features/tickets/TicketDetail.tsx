import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight, FolderKanban, MoreHorizontal, Pencil, Ticket as TicketIcon, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Badge, Empty, Field, Input, Picker, Section, Sheet, confirmDialog, cx } from '../../components/ui'
import { ChannelIcon, ContactActions, DueChip, OwnerButton, ProspectThumb } from '../../components/bits'
import { deleteTicket, setTicketStatus, takeTicket, updateTicket } from '../../data/actions'
import { toast, useIsAdmin, useStore } from '../../data/store'
import { CHANNELS, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_TYPES, labelOf, ticketPriority, ticketStatus } from '../../lib/constants'
import { daysSince, isTicketLate, isTicketOpen, ticketRef } from '../../lib/derive'
import { relTime } from '../../lib/dates'
import { useFileUrl } from '../../lib/useFileUrl'
import { Attachments, Timeline } from '../shared/Timeline'
import { MenuItem } from '../prospects/ProspectDetail'
import type { Ticket, TicketStatus } from '../../lib/types'
import { TicketSheet } from './TicketSheet'

export function TicketDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const t = useStore((s) => s.db.tickets.find((x) => x.id === id))
  const client = useStore((s) => s.db.prospects.find((x) => x.id === t?.prospect_id))
  const project = useStore((s) => s.db.projects.find((x) => x.id === t?.project_id))
  const author = useStore((s) => s.db.profiles.find((x) => x.id === t?.created_by))
  const userId = useStore((s) => s.userId)
  const admin = useIsAdmin()
  const logo = useFileUrl(client?.logo_path)
  const [edit, setEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [statusPick, setStatusPick] = useState(false)
  const [priorityPick, setPriorityPick] = useState(false)

  if (!t) {
    return (
      <>
        <PageHeader title="Ticket" back="/suivi" />
        <Page><Empty icon={<TicketIcon size={26} />} title="Ticket introuvable" text="Il a peut-être été supprimé par un administrateur." action={<Link className="btn-soft" to="/suivi">Retour aux tickets</Link>} /></Page>
      </>
    )
  }

  const st = ticketStatus(t.status)
  const pr = ticketPriority(t.priority)
  const open = isTicketOpen(t)

  // Un échange noté pendant l'attente : le ticket redevient probablement à traiter
  function onExchange() {
    if (t?.status === 'attente_client') toast('Échange noté', 'success', { label: 'Repasser en cours', run: () => setTicketStatus(t.id, 'en_cours') })
  }

  return (
    <>
      <PageHeader title={`Ticket ${ticketRef(t)}`} back="/suivi"
        subtitle={client && <Link to={`/prospects/${client.id}`} className="hover:text-ink">{client.name}</Link>}
        actions={
          <>
            <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={19} /></button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Plus d’actions"><MoreHorizontal size={21} /></button>
          </>
        } />

      <Page className="pt-2">
        {/* sur téléphone, les échanges passent avant les fichiers ; sur ordinateur, ils occupent la colonne de droite */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="lg:col-start-1 lg:row-start-1">
            {/* ——— État du ticket ——— */}
            <div className="card p-4">
              <h2 className="font-bold text-[18px] leading-snug mb-3">{t.subject}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setStatusPick(true)} className="inline-flex" aria-label={`Changer le statut (${st.label})`}>
                  <Badge tone={st.tone} className="h-8 px-3 text-[13px]">{st.label}<ChevronDown size={14} className="-mr-1 opacity-60" /></Badge>
                </button>
                <button onClick={() => setPriorityPick(true)} className="inline-flex" aria-label={`Changer la priorité (${pr.label})`}>
                  <Badge tone={pr.tone} dot={false} className="h-8 px-3 text-[13px]">{pr.label}<ChevronDown size={14} className="-mr-1 opacity-60" /></Badge>
                </button>
                {open && t.status !== 'attente_client' && <DueChip date={t.due_date} className="ml-1" />}
              </div>
              {t.status === 'attente_client' && <p className="text-[13.5px] text-muted mt-3">En attente depuis {daysSince(t.status_changed_at)} j : le délai est suspendu.</p>}
              {isTicketLate(t) && <p className="text-[13.5px] font-semibold text-danger mt-3">Ce ticket a dépassé sa date de traitement.</p>}
              {!open && t.resolved_at && <p className="text-[13.5px] text-muted mt-3">Résolu {relTime(t.resolved_at).toLowerCase()}.</p>}
              <NextStep ticket={t} isMine={t.assignee_id === userId} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-line">
                <Field label="Responsable"><OwnerButton value={t.assignee_id} onChange={(v) => updateTicket(t.id, { assignee_id: v })} /></Field>
                <Field label="À traiter avant"><Input type="date" value={t.due_date ?? ''} onChange={(e) => updateTicket(t.id, { due_date: e.target.value || null })} /></Field>
              </div>
              <dl className="grid grid-cols-2 gap-3 mt-4 text-[13.5px]">
                <div><dt className="text-muted">Type</dt><dd className="font-semibold mt-0.5">{labelOf(TICKET_TYPES, t.type)}</dd></div>
                <div>
                  <dt className="text-muted">Reçu par</dt>
                  <dd className="font-semibold mt-0.5 inline-flex items-center gap-1.5">{t.channel && <ChannelIcon channel={t.channel} />}{labelOf(CHANNELS, t.channel)}</dd>
                </div>
                <div><dt className="text-muted">Ouvert</dt><dd className="font-semibold mt-0.5">{relTime(t.created_at)}{author ? ` · ${author.first_name}` : ''}</dd></div>
                {project && (
                  <div><dt className="text-muted">Site</dt><dd className="font-semibold mt-0.5"><Link to={`/projets/${project.id}`} className="inline-flex items-center gap-1.5 hover:text-copper-ink"><FolderKanban size={14} />{project.name}</Link></dd></div>
                )}
              </dl>
            </div>

            {t.description && (
              <Section title="Demande du client">
                <div className="card p-4"><p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{t.description}</p></div>
              </Section>
            )}

            {/* ——— Client ——— */}
            {client && (
              <Section title="Client">
                <Link to={`/prospects/${client.id}`} className="card p-3.5 flex items-center gap-3 hover:border-copper/30 transition mb-2">
                  <ProspectThumb name={client.name} category={client.category} logoUrl={logo} size={44} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[15px] truncate">{client.name}</span>
                    <span className="block text-[13px] text-muted truncate">{[client.contact_name, client.city].filter(Boolean).join(' · ') || 'Voir la fiche'}</span>
                  </span>
                  <ChevronRight size={18} className="text-faint" />
                </Link>
                <ContactActions phone={client.phone} email={client.email} instagramUrl={client.instagram_url} website={client.website_url} />
              </Section>
            )}
          </div>
          <aside className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <Section title="Échanges et historique" className="lg:mt-0"><Timeline entity="ticket" id={t.id} activityKey="ticket_id" onExchange={onExchange} /></Section>
          </aside>
          <div className="lg:col-start-1 lg:row-start-2">
            <Section title="Fichiers et captures"><Attachments entity="ticket" id={t.id} /></Section>
          </div>
        </div>
      </Page>

      <TicketSheet open={edit} onClose={() => setEdit(false)} ticket={t} />
      <Picker open={statusPick} onClose={() => setStatusPick(false)} title="Statut du ticket" value={t.status}
        options={TICKET_STATUSES.map((s) => ({ value: s.value, label: s.label, tone: s.tone }))} onPick={(v) => setTicketStatus(t.id, v)} />
      <Picker open={priorityPick} onClose={() => setPriorityPick(false)} title="Priorité" value={t.priority}
        options={TICKET_PRIORITIES.map((p) => ({ value: p.value, label: p.label, tone: p.tone }))} onPick={(v) => updateTicket(t.id, { priority: v })} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={ticketRef(t)} size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          <MenuItem icon={<Pencil size={19} />} label="Modifier le ticket" onClick={() => { setMenu(false); setEdit(true) }} />
          {admin && <MenuItem danger icon={<Trash2 size={19} />} label="Supprimer définitivement" hint="Préférez « Fermé » : le ticket reste dans l’historique du client" onClick={async () => {
            setMenu(false)
            if (await confirmDialog({ title: `Supprimer le ticket ${ticketRef(t)} ?`, message: 'Ses échanges et ses fichiers seront supprimés. Action irréversible.', confirm: 'Supprimer', danger: true })) {
              if (await deleteTicket(t.id)) nav('/suivi')
            }
          }} />}
          {!admin && <p className="px-3 py-2 text-[13px] text-muted">La suppression est réservée aux administrateurs. Fermez le ticket : il reste dans l’historique du client.</p>}
        </div>
      </Sheet>
    </>
  )
}

/** Les gestes logiques selon l'état du ticket */
function NextStep({ ticket, isMine }: { ticket: Ticket; isMine: boolean }) {
  const go = (s: TicketStatus) => setTicketStatus(ticket.id, s)
  const steps: { label: string; run: () => void; soft?: boolean }[] = {
    nouveau: [{ label: 'Je m’en occupe', run: () => takeTicket(ticket) }, { label: 'Résoudre', run: () => go('resolu'), soft: true }],
    en_cours: [
      ...(isMine ? [] : [{ label: 'Je m’en occupe', run: () => takeTicket(ticket) }]),
      { label: 'Résoudre', run: () => go('resolu'), soft: !isMine },
      { label: 'Attendre le client', run: () => go('attente_client'), soft: true },
    ],
    attente_client: [{ label: 'Le client a répondu', run: () => go('en_cours') }, { label: 'Résoudre', run: () => go('resolu'), soft: true }],
    resolu: [{ label: 'Fermer', run: () => go('ferme') }, { label: 'Rouvrir', run: () => go('en_cours'), soft: true }],
    ferme: [{ label: 'Rouvrir', run: () => go('en_cours'), soft: true }],
  }[ticket.status]
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {steps.map((s, i) => (
        <button key={s.label} onClick={s.run} className={cx('h-11 text-[14px] px-2', s.soft ? 'btn-soft' : 'btn-dark', (steps.length !== 2 && i === 0) && 'col-span-2')}>{s.label}</button>
      ))}
    </div>
  )
}
