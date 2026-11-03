import { memo, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCheck, Columns3, Globe, List, MapPin, MessageCircleQuestion, Plus, Search, Ticket as TicketIcon, Users, X } from 'lucide-react'
import { Page, PageHeader, useUi } from '../../components/Shell'
import { Avatar, Badge, Chips, Empty, Input, Picker, cx } from '../../components/ui'
import { ProspectThumb } from '../../components/bits'
import { Kanban } from '../../components/Kanban'
import { setTicketStatus } from '../../data/actions'
import { useStore } from '../../data/store'
import { TICKET_DONE, TICKET_STATUSES, projectStatus } from '../../lib/constants'
import { clientSummaries, daysSince, filterTickets, liveTickets, searchMatch, ticketRef, type ClientSummary, type TicketView } from '../../lib/derive'
import { useFileUrl } from '../../lib/useFileUrl'
import type { Ticket } from '../../lib/types'
import { TicketCard } from './TicketCard'

const VIEWS: { value: TicketView; label: string }[] = [
  { value: 'ouverts', label: 'Ouverts' },
  { value: 'mine', label: 'Mes tickets' },
  { value: 'unassigned', label: 'Sans responsable' },
  { value: 'late', label: 'En retard' },
  { value: 'attente', label: 'Attente client' },
  { value: 'termines', label: 'Résolus' },
]

type ClientFilter = 'tous' | 'ouverts' | 'calmes' | 'mine'

const readPref = <T,>(k: string, d: T): T => { try { return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? d } catch { return d } }
const writePref = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }

/** Suivi clients : la file des tickets et la vue d'ensemble des clients */
export function TicketsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('onglet') === 'clients' ? 'clients' : 'tickets'
  const setParam = (k: string, v: string | null) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }) }
  const view = (params.get('v') as TicketView) || 'ouverts'
  const clientFilter = (params.get('c') as ClientFilter) || 'tous'
  const [q, setQ] = useState('')
  const [layout, setLayout] = useState<'list' | 'kanban'>(() => readPref('qc-ticket-view', 'list'))
  const [pick, setPick] = useState<Ticket | null>(null)
  const db = useStore((s) => s.db)
  const userId = useStore((s) => s.userId)
  const newTicket = useUi((s) => s.newTicket)

  const names = useMemo(() => new Map(db.prospects.map((p) => [p.id, p.name])), [db.prospects])
  const tickets = useMemo(() => liveTickets(db).filter((t) => searchMatch(q.replace(/^#/, ''), t.subject, t.description, String(t.number ?? ''), names.get(t.prospect_id))), [db, q, names])
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.value, filterTickets(tickets, v.value, userId).length])), [tickets, userId])
  const list = useMemo(() => filterTickets(tickets, view, userId), [tickets, view, userId])
  // au-delà d'un mois, un ticket résolu ne sert plus à rien sur le tableau
  const board = useMemo(() => tickets.filter((t) => !TICKET_DONE.includes(t.status) || daysSince(t.resolved_at) <= 30), [tickets])

  const summaries = useMemo(() => clientSummaries(db).filter((s) => searchMatch(q, s.client.name, s.client.city, s.client.contact_name, s.client.phone, s.client.email)), [db, q])
  const clients = useMemo(() => summaries.filter((s) =>
    clientFilter === 'ouverts' ? s.open > 0 : clientFilter === 'calmes' ? s.quiet : clientFilter === 'mine' ? s.client.owner_id === userId : true), [summaries, clientFilter, userId])

  const allOpen = counts.ouverts ?? 0
  const subtitle = tab === 'tickets'
    ? `${allOpen} ouvert${allOpen > 1 ? 's' : ''}${counts.late ? ` · ${counts.late} en retard` : ''}`
    : `${summaries.length} client${summaries.length > 1 ? 's' : ''}`

  return (
    <>
      <PageHeader title="Tickets" subtitle={subtitle}
        actions={
          <>
            {tab === 'tickets' && (
              <div className="hidden lg:flex items-center bg-sunken rounded-xl p-1 mr-1">
                {(['list', 'kanban'] as const).map((v) => (
                  <button key={v} onClick={() => { setLayout(v); writePref('qc-ticket-view', v) }}
                    className={cx('h-9 px-3 rounded-lg text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition', layout === v ? 'bg-surface shadow-card text-ink' : 'text-muted')}>
                    {v === 'list' ? <List size={16} /> : <Columns3 size={16} />}{v === 'list' ? 'Liste' : 'Kanban'}
                  </button>
                ))}
              </div>
            )}
            <button className="hidden lg:inline-flex btn-primary ml-1" onClick={() => newTicket()}><Plus size={18} />Ticket</button>
          </>
        }>
        <div className="flex items-center gap-1 mt-3 bg-sunken rounded-xl p-1 w-max" role="tablist">
          {(['tickets', 'clients'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={tab === s} onClick={() => { setParam('onglet', s === 'clients' ? 'clients' : null); setQ('') }}
              className={cx('h-9 px-3.5 rounded-lg text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition', tab === s ? 'bg-surface shadow-card' : 'text-muted')}>
              {s === 'tickets' ? <TicketIcon size={15} /> : <Users size={15} />}{s === 'tickets' ? 'Tickets' : 'Clients'}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'tickets' ? 'Objet, client, n° de ticket…' : 'Nom, ville, contact, téléphone…'} className="pl-10 pr-10 bg-surface" type="search" enterKeyHint="search" />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
        </div>
        {tab === 'tickets' ? (
          <Chips className={cx('mt-3', layout === 'kanban' && 'lg:hidden')} value={view} onChange={(v) => setParam('v', v === 'ouverts' ? null : v)}
            options={VIEWS.map((v) => ({ ...v, count: counts[v.value] }))} />
        ) : (
          <Chips className="mt-3" value={clientFilter} onChange={(v) => setParam('c', v === 'tous' ? null : v)}
            options={[
              { value: 'tous' as const, label: 'Tous', count: summaries.length },
              { value: 'ouverts' as const, label: 'Tickets ouverts', count: summaries.filter((s) => s.open > 0).length },
              { value: 'calmes' as const, label: 'Sans nouvelles', count: summaries.filter((s) => s.quiet).length },
              { value: 'mine' as const, label: 'Mes clients', count: summaries.filter((s) => s.client.owner_id === userId).length },
            ]} />
        )}
      </PageHeader>

      <Page className="pt-3">
        {tab === 'clients' ? (
          clients.length === 0 ? (
            <Empty icon={<Users size={26} />} title={q ? 'Aucun résultat' : 'Aucun client dans cette vue'}
              text={q ? 'Essayez un autre mot-clé.' : 'Une fiche devient cliente dès qu’elle passe en « Accepté » dans Prospects.'} />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{clients.map((s) => <ClientCard key={s.client.id} s={s} />)}</div>
          )
        ) : (
          <>
            {layout === 'kanban' && (
              <div className="hidden lg:block">
                <Kanban columns={TICKET_STATUSES} items={board} statusOf={(t) => t.status} onMove={(t, s) => setTicketStatus(t.id, s)}
                  renderCard={(t: Ticket) => <TicketCard compact ticket={t} />} />
              </div>
            )}
            <div className={cx(layout === 'kanban' && 'lg:hidden')}>
              {list.length === 0 ? (
                <Empty icon={q ? <MessageCircleQuestion size={26} /> : <CheckCheck size={26} />} title={q ? 'Aucun résultat' : 'Rien dans cette vue'}
                  text={q ? 'Essayez un autre mot-clé.' : 'Notez ici chaque demande client : appel, message WhatsApp, e-mail…'}
                  action={!q && <button className="btn-primary" onClick={() => newTicket()}><Plus size={18} />Nouveau ticket</button>} />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{list.map((t) => <TicketCard key={t.id} ticket={t} onStatus={setPick} />)}</div>
              )}
            </div>
          </>
        )}
      </Page>

      <Picker open={!!pick} onClose={() => setPick(null)} title={pick ? `Ticket ${ticketRef(pick)}` : ''} value={pick?.status}
        options={TICKET_STATUSES.map((s) => ({ value: s.value, label: s.label, tone: s.tone }))} onPick={(v) => pick && setTicketStatus(pick.id, v)} />
    </>
  )
}

const ClientCard = memo(function ClientCard({ s }: { s: ClientSummary }) {
  const { client: c } = s
  const owner = useStore((st) => st.db.profiles.find((p) => p.id === c.owner_id))
  const newTicket = useUi((st) => st.newTicket)
  const logo = useFileUrl(c.logo_path)
  const days = s.lastContact ? daysSince(s.lastContact) : null
  const lastLabel = days === null ? 'Aucun échange noté' : days === 0 ? "Dernier échange aujourd'hui" : days === 1 ? 'Dernier échange hier' : `Dernier échange il y a ${days} j`
  const site = s.projects.find((p) => ['livre', 'maintenance'].includes(p.status)) ?? s.projects[0]
  return (
    <div className="card relative p-3.5 transition hover:border-copper/30">
      <Link to={`/prospects/${c.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir la fiche ${c.name}`} />
      <div className="flex items-start gap-3">
        <ProspectThumb name={c.name} category={c.category} logoUrl={logo} size={46} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[16px] truncate">{c.name}</p>
          {c.city && <p className="text-[13px] text-muted mt-0.5 inline-flex items-center gap-1"><MapPin size={13} />{c.city}</p>}
        </div>
        {owner && <Avatar profile={owner} size={28} />}
        <button type="button" className="relative z-10 icon-btn w-10 h-10 -my-1 -mr-1.5 text-copper-ink" aria-label={`Nouveau ticket pour ${c.name}`} onClick={() => newTicket({ prospect_id: c.id })}><Plus size={19} /></button>
      </div>
      <div className="flex items-center gap-x-2.5 gap-y-1.5 mt-3 flex-wrap">
        {s.late > 0 && <Badge tone="rose">{s.late} en retard</Badge>}
        {s.open > 0 ? <Badge tone="amber">{s.open} ticket{s.open > 1 ? 's' : ''} ouvert{s.open > 1 ? 's' : ''}</Badge> : <Badge tone="green">Rien en cours</Badge>}
        {site && <span className="inline-flex items-center gap-1 text-[12.5px] text-muted"><Globe size={13} />{projectStatus(site.status).label}</span>}
      </div>
      <p className={cx('text-[12.5px] mt-2 font-semibold', s.quiet ? 'text-copper-ink' : 'text-faint')}>{s.quiet ? `À recontacter · ${lastLabel.toLowerCase()}` : lastLabel}</p>
    </div>
  )
})
