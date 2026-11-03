import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, CalendarClock, Check, ChevronRight, Hourglass, MessageCircle, PackageCheck, PencilRuler, Phone, RefreshCw, Send, Sparkles, Store, Target, Users, Wrench,
} from 'lucide-react'
import { Page } from '../../components/Shell'
import { Avatar, Section, cx } from '../../components/ui'
import { useMe, useStore } from '../../data/store'
import { toggleTask } from '../../data/actions'
import { dashboardCounts, todayItems, type TodayItem } from '../../lib/derive'
import { dueLabel, greeting, relTime, todayLong } from '../../lib/dates'
import { telLink, whatsappLink } from '../../lib/links'
import { describeActivity, FEED_TYPES } from '../shared/activity'
import { NotificationCard } from '../team/notifications'

export function Dashboard() {
  const db = useStore((s) => s.db)
  const userId = useStore((s) => s.userId)
  const me = useMe()
  const [scope, setScope] = useState<'me' | 'team'>('me')
  const [feedLimit, setFeedLimit] = useState(12)
  const c = useMemo(() => dashboardCounts(db), [db])
  const items = useMemo(() => todayItems(db, scope === 'me' ? userId : null), [db, userId, scope])
  const late = items.filter((i) => 'late' in i && i.late).length
  const feed = useMemo(() => db.activities.filter((a) => FEED_TYPES.has(a.type)), [db.activities])
  const byId = useMemo(() => new Map(db.profiles.map((p) => [p.id, p])), [db.profiles])

  const kpis: { label: string; value: number; to: string; icon: React.ReactNode; accent?: boolean; sub?: string }[] = [
    { label: 'Prospects actifs', value: c.active, to: '/prospects', icon: <Store size={17} /> },
    { label: 'À contacter', value: c.toContact, to: '/prospects?f=a_prospecter', icon: <Target size={17} /> },
    { label: 'À relancer', value: c.toFollowUp, to: '/prospects?f=relance', icon: <RefreshCw size={17} />, accent: c.toFollowUp > 0 },
    { label: 'Démos envoyées', value: c.demosSent, to: '/projets?s=demo_envoyee', icon: <Send size={17} /> },
    { label: 'Sites en création', value: c.inCreation, to: '/projets?s=demo_creation,dev_final', icon: <Wrench size={17} /> },
    { label: 'Attente validation', value: c.awaitingValidation, to: '/projets?g=validation', icon: <Hourglass size={17} /> },
    { label: 'Retouches', value: c.needsRevisions, to: '/projets?g=retouches', icon: <PencilRuler size={17} />, accent: c.needsRevisions > 0 },
    { label: 'Validés & livrés', value: c.validated + c.delivered, to: '/projets?s=demo_validee,pret_livrer,livre,maintenance', icon: <PackageCheck size={17} />, sub: `${c.validated} validés · ${c.delivered} livrés` },
  ]

  return (
    <Page className="pt-[max(var(--safe-top),16px)] lg:pt-8">
      {/* ——— Salutation ——— */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] text-muted font-medium">{todayLong()}</p>
          <h1 className="h-display text-[28px] lg:text-[32px] leading-tight">{greeting()}, {me?.first_name}</h1>
        </div>
        <Link to="/equipe" className="lg:hidden" aria-label="Mon profil"><Avatar profile={me} size={40} /></Link>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        {/* ——— Indicateurs ——— */}
        <section className="order-2 lg:order-none lg:col-span-2" aria-label="Indicateurs">
          <h2 className="section-title mb-3 mt-7 lg:mt-0">Vue d’ensemble</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {kpis.map((k) => (
              <Link key={k.label} to={k.to} className="card p-3.5 group hover:border-copper/35 transition active:scale-[.98]">
                <div className="flex items-center justify-between text-muted">
                  <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center', k.accent ? 'bg-copper/12 text-copper-ink' : 'bg-sunken')}>{k.icon}</span>
                  <ArrowUpRight size={15} className="text-faint opacity-0 group-hover:opacity-100 transition" />
                </div>
                <p className={cx('h-display text-[30px] leading-none mt-3 tabular', k.accent && 'text-copper-ink')}>{k.value}</p>
                <p className="text-[13px] font-semibold text-muted mt-1.5 leading-tight">{k.label}</p>
                {k.sub && <p className="text-[11.5px] text-faint mt-0.5">{k.sub}</p>}
              </Link>
            ))}
          </div>
        </section>

        {/* ——— À faire aujourd'hui ——— */}
        <section className="order-1 lg:order-none lg:mt-8" aria-label="À faire aujourd’hui">
          <div className="card p-4 lg:p-5 bg-ink text-bg border-ink dark:bg-surface dark:text-ink dark:border-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[.14em] opacity-60">À faire aujourd’hui</p>
                <p className="h-display text-[34px] leading-none mt-2 tabular">{items.length}<span className="text-[15px] font-sans font-semibold opacity-60 ml-2">action{items.length > 1 ? 's' : ''}</span></p>
                {late > 0 && <p className="text-[13px] font-semibold mt-1.5 text-copper-soft">{late} en retard</p>}
              </div>
              <div className="flex bg-white/10 dark:bg-sunken rounded-xl p-1">
                {(['me', 'team'] as const).map((s) => (
                  <button key={s} onClick={() => setScope(s)} className={cx('h-9 px-3 rounded-lg text-[13px] font-semibold transition', scope === s ? 'bg-bg text-ink dark:bg-surface dark:shadow-card' : 'opacity-70')}>
                    {s === 'me' ? 'Moi' : 'Équipe'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {items.length === 0 ? (
              <div className="card p-5 text-center">
                <Sparkles size={22} className="mx-auto text-copper-ink" />
                <p className="font-bold mt-2">Tout est à jour</p>
                <p className="text-[13.5px] text-muted mt-0.5">Aucune action en attente. Le bon moment pour prospecter.</p>
              </div>
            ) : items.slice(0, 8).map((i) => <TodayRow key={i.id} item={i} showOwner={scope === 'team'} />)}
            {items.length > 8 && <Link to="/taches" className="btn-ghost text-muted">Voir les {items.length - 8} autres <ChevronRight size={16} /></Link>}
          </div>
          <div className="mt-4"><NotificationCard /></div>
        </section>

        {/* ——— Activité ——— */}
        <section className="order-3 lg:order-none lg:mt-8" aria-label="Activité récente">
          <Section title="Activité de l’équipe" className="lg:mt-0" action={<Users size={16} className="text-faint" />}>
            <ol className="card divide-y divide-line">
              {feed.slice(0, feedLimit).map((a) => {
                const d = describeActivity(a, a.actor_id ? byId.get(a.actor_id) : undefined)
                const to = a.project_id ? `/projets/${a.project_id}` : a.prospect_id ? `/prospects/${a.prospect_id}` : null
                const body = (
                  <div className="flex items-start gap-3 px-3.5 py-3">
                    <span className={cx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', d.tone)}>{d.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] leading-snug">{d.text}</p>
                      <p className="text-[12px] text-faint mt-0.5">{relTime(a.created_at)}</p>
                    </div>
                  </div>
                )
                return <li key={a.id}>{to ? <Link to={to} className="block hover:bg-sunken/50 transition first:rounded-t-2xl">{body}</Link> : body}</li>
              })}
              {feed.length === 0 && <li className="p-5 text-center text-[14px] text-muted">L’activité de l’équipe apparaîtra ici.</li>}
            </ol>
            {feed.length > feedLimit && <button className="btn-ghost w-full mt-2 text-muted" onClick={() => setFeedLimit((n) => n + 15)}>Voir plus</button>}
          </Section>
        </section>
      </div>
    </Page>
  )
}

function TodayRow({ item, showOwner }: { item: TodayItem; showOwner: boolean }) {
  const profiles = useStore((s) => s.db.profiles)
  const owner = (id: string | null) => profiles.find((p) => p.id === id)
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
        {showOwner && <Avatar profile={owner(t.assignee_id)} size={24} />}
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
          {meta(p.next_follow_up ? dueLabel(p.next_follow_up) : 'Statut « À relancer »', item.late)}
        </Link>
        {telLink(p.phone) && <a href={telLink(p.phone)!} className="icon-btn w-10 h-10 bg-sunken" aria-label={`Appeler ${p.name}`}><Phone size={17} /></a>}
        {whatsappLink(p.phone) && <a href={whatsappLink(p.phone)!} target="_blank" rel="noopener noreferrer" className="icon-btn w-10 h-10 bg-sunken" aria-label="WhatsApp"><MessageCircle size={17} /></a>}
        {showOwner && <Avatar profile={owner(p.owner_id)} size={24} />}
      </div>
    )
  }
  const p = item.project
  const icon = item.kind === 'revisions' ? <PencilRuler size={17} /> : item.kind === 'delivery' ? <CalendarClock size={17} /> : <Hourglass size={17} />
  const title = item.kind === 'revisions' ? `${item.remaining} retouche${item.remaining > 1 ? 's' : ''} à faire` : item.kind === 'delivery' ? `Livraison ${dueLabel(p.due_date).toLowerCase()}` : `Relancer pour validation`
  const sub = item.kind === 'revisions' ? `${p.name} · ${item.total - item.remaining}/${item.total} terminées` : item.kind === 'validation' ? `${p.name} · en attente depuis ${item.days} j` : p.name
  return (
    <Link to={`/projets/${p.id}`} className={cx(base, 'hover:border-copper/30')}>
      <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', item.kind === 'revisions' ? 'bg-orange-500/12 text-orange-700 dark:text-orange-300' : 'bg-sunken text-muted')}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14.5px] truncate">{title}</p>
        {meta(sub, item.kind === 'delivery' && item.late)}
      </div>
      {showOwner && <Avatar profile={owner(p.owner_id)} size={24} />}
      <ChevronRight size={18} className="text-faint" />
    </Link>
  )
}
