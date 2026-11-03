import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock, Check, ChevronRight, History, Hourglass, MessageCircle, PencilRuler, Phone, Plus, RefreshCw, Sparkles, Ticket,
} from 'lucide-react'
import { Page, useUi } from '../../components/Shell'
import { Avatar, Fold, Section, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { toggleTask } from '../../data/actions'
import { TONES, type Tone } from '../../lib/constants'
import { stepCounts, ticketRef, todayItems, type TodayItem } from '../../lib/derive'
import { dueLabel, greeting, relTime, todayLong } from '../../lib/dates'
import { telLink, whatsappLink } from '../../lib/links'
import { describeActivity, FEED_TYPES } from '../shared/activity'

export function Dashboard() {
  const db = useStore((s) => s.db)
  const userId = useStore((s) => s.userId)
  const me = useMe()
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const [feedLimit, setFeedLimit] = useState(12)
  const c = useMemo(() => stepCounts(db), [db])
  const items = useMemo(() => todayItems(db, userId), [db, userId])
  const feed = useMemo(() => db.activities.filter((a) => FEED_TYPES.has(a.type)), [db.activities])
  const byId = useMemo(() => new Map(db.profiles.map((p) => [p.id, p])), [db.profiles])
  const empty = c.prospect + c.vu + c.accepte + c.refuse + c.en_cours + c.livre === 0

  // Le parcours, dans l'ordre
  const tiles: { label: string; value: number; to: string; tone: Tone }[] = [
    { label: 'Prospects', value: c.prospect, to: '/prospects', tone: 'stone' },
    { label: 'Clients vus', value: c.vu, to: '/prospects?f=vu', tone: 'sky' },
    { label: 'Acceptés', value: c.accepte, to: '/prospects?f=accepte', tone: 'green' },
    { label: 'Refusés', value: c.refuse, to: '/prospects?f=refuse', tone: 'rose' },
    { label: 'Sites en cours', value: c.en_cours, to: '/projets', tone: 'amber' },
    { label: 'Sites livrés', value: c.livre, to: '/projets?g=livres', tone: 'green' },
  ]

  return (
    <Page className="pt-[max(var(--safe-top),16px)] lg:pt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] text-muted font-medium">{todayLong()}</p>
          <h1 className="h-display text-[28px] lg:text-[32px] leading-tight">{greeting()}, {me?.first_name}</h1>
        </div>
        <Link to="/equipe" className="lg:hidden" aria-label="Mon profil"><Avatar profile={me} size={40} /></Link>
      </div>

      {empty && (
        <div className="card p-6 mb-3 text-center animate-fade-up">
          <Sparkles size={24} className="mx-auto text-copper-ink" />
          <p className="h-display text-[22px] mt-2">On commence ?</p>
          <p className="text-[14px] text-muted mt-1 mb-4">Ajoutez votre premier prospect : seul le nom suffit.</p>
          <button className="btn-primary" onClick={() => setQuickAdd(true)}><Plus size={18} />Nouveau prospect</button>
        </div>
      )}

      <nav aria-label="Parcours" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="card p-4 hover:border-copper/40 transition active:scale-[.98]">
            <p className="h-display text-[38px] leading-none tabular">{t.value}</p>
            <p className="text-[13.5px] font-semibold text-muted mt-2.5 flex items-center gap-1.5">
              <span className={cx('w-2 h-2 rounded-full shrink-0', TONES[t.tone].dot)} />{t.label}
            </p>
          </Link>
        ))}
      </nav>

      {items.length > 0 && (
        <Section title={`À faire aujourd’hui (${items.length})`}>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {items.slice(0, 6).map((i) => <TodayRow key={i.id} item={i} />)}
          </div>
          {items.length > 6 && <Link to="/taches" className="btn-ghost w-full mt-2 text-muted">Voir les {items.length - 6} autres <ChevronRight size={16} /></Link>}
        </Section>
      )}

      {feed.length > 0 && (
        <div className="mt-7">
          <Fold title="Activité de l’équipe" icon={<History size={19} />}>
            <ol className="divide-y divide-line -mx-1">
              {feed.slice(0, feedLimit).map((a) => {
                const d = describeActivity(a, a.actor_id ? byId.get(a.actor_id) : undefined)
                const to = a.ticket_id ? `/suivi/${a.ticket_id}` : a.project_id ? `/projets/${a.project_id}` : a.prospect_id ? `/prospects/${a.prospect_id}` : null
                const body = (
                  <div className="flex items-start gap-3 px-1 py-3">
                    <span className={cx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', d.tone)}>{d.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-snug">{d.text}</p>
                      <p className="text-[12px] text-faint mt-0.5">{relTime(a.created_at)}</p>
                    </div>
                  </div>
                )
                return <li key={a.id}>{to ? <Link to={to} className="block hover:bg-sunken/50 transition rounded-lg">{body}</Link> : body}</li>
              })}
            </ol>
            {feed.length > feedLimit && <button className="btn-ghost w-full mt-2 text-muted" onClick={() => setFeedLimit((n) => n + 15)}>Voir plus</button>}
          </Fold>
        </div>
      )}
    </Page>
  )
}

function TodayRow({ item }: { item: TodayItem }) {
  const clients = useStore((s) => s.db.prospects)
  const base = 'card flex items-center gap-3 p-3 min-h-[64px]'
  const meta = (txt: string, late?: boolean) => <span className={cx('text-[12.5px] font-semibold', late ? 'text-danger' : 'text-muted')}>{txt}</span>

  if (item.kind === 'task') {
    const t = item.task
    const done = t.status === 'termine'
    return (
      <div className={base}>
        <button onClick={() => toggleTask(t)} aria-label="Terminer la tâche" className="w-10 h-10 -m-1 shrink-0 flex items-center justify-center">
          <span className={cx('w-[22px] h-[22px] rounded-[7px] border-2 flex items-center justify-center', done ? 'bg-copper border-copper text-onCopper' : 'border-faint')}>{done && <Check size={14} strokeWidth={3} />}</span>
        </button>
        <Link to={t.project_id ? `/projets/${t.project_id}` : t.prospect_id ? `/prospects/${t.prospect_id}` : '/taches'} className="flex-1 min-w-0">
          <p className="font-semibold text-[14.5px] truncate">{t.is_follow_up && <RefreshCw size={13} className="inline -mt-0.5 mr-1 text-copper-ink" />}{t.title}</p>
          {meta(item.late ? dueLabel(t.due_date) : t.priority === 'haute' ? "Aujourd'hui · priorité haute" : "Aujourd'hui", item.late)}
        </Link>
      </div>
    )
  }
  if (item.kind === 'followup') {
    const p = item.prospect
    return (
      <div className={base}>
        <span className="w-9 h-9 rounded-xl bg-copper/12 text-copper-ink flex items-center justify-center shrink-0"><RefreshCw size={17} /></span>
        <Link to={`/prospects/${p.id}`} className="flex-1 min-w-0">
          <p className="font-semibold text-[14.5px] truncate">Relancer {p.name}</p>
          {meta(p.next_follow_up ? dueLabel(p.next_follow_up) : 'À relancer', item.late)}
        </Link>
        {telLink(p.phone) && <a href={telLink(p.phone)!} className="icon-btn w-10 h-10 bg-sunken" aria-label={`Appeler ${p.name}`}><Phone size={17} /></a>}
        {whatsappLink(p.phone) && <a href={whatsappLink(p.phone)!} target="_blank" rel="noopener noreferrer" className="icon-btn w-10 h-10 bg-sunken" aria-label="WhatsApp"><MessageCircle size={17} /></a>}
      </div>
    )
  }
  if (item.kind === 'ticket' || item.kind === 'ticket_wait') {
    const t = item.ticket
    const client = clients.find((x) => x.id === t.prospect_id)
    const sub = item.kind === 'ticket_wait' ? `Sans réponse depuis ${item.days} j`
      : !t.assignee_id ? 'À prendre en charge' : item.late ? dueLabel(t.due_date) : t.priority === 'urgente' ? 'Urgent' : "Aujourd'hui"
    return (
      <Link to={`/suivi/${t.id}`} className={cx(base, 'hover:border-copper/30')}>
        <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', t.priority === 'urgente' ? 'bg-rose-600/12 text-rose-700 dark:text-rose-300' : 'bg-copper/12 text-copper-ink')}>
          {item.kind === 'ticket_wait' ? <Hourglass size={17} /> : <Ticket size={17} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14.5px] truncate">{item.kind === 'ticket_wait' ? `Relancer ${client?.name ?? 'le client'}` : t.subject}</p>
          {meta(`${ticketRef(t)}${client && item.kind === 'ticket' ? ` · ${client.name}` : ''} · ${sub}`, item.kind === 'ticket' && item.late)}
        </div>
        <ChevronRight size={18} className="text-faint" />
      </Link>
    )
  }
  const p = item.project
  const icon = item.kind === 'revisions' ? <PencilRuler size={17} /> : <CalendarClock size={17} />
  const title = item.kind === 'revisions' ? `${item.remaining} retouche${item.remaining > 1 ? 's' : ''} à faire` : `Livraison ${dueLabel(p.due_date).toLowerCase()}`
  const sub = item.kind === 'revisions' ? `${p.name} · ${item.total - item.remaining}/${item.total} terminées` : p.name
  return (
    <Link to={`/projets/${p.id}`} className={cx(base, 'hover:border-copper/30')}>
      <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.kind === 'revisions' ? 'bg-orange-500/12 text-orange-700 dark:text-orange-300' : 'bg-sunken text-muted')}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14.5px] truncate">{title}</p>
        {meta(sub, item.kind === 'delivery' && item.late)}
      </div>
      <ChevronRight size={18} className="text-faint" />
    </Link>
  )
}
