import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock, Check, ChevronRight, Eye, History, Hourglass, MessageCircle, PencilRuler, Phone, Plus, RefreshCw, Rocket, Sparkles, Store, ThumbsDown, ThumbsUp, Ticket, type LucideIcon,
} from 'lucide-react'
import { Page, useUi } from '../../components/Shell'
import { Avatar, Fold, Section, cx } from '../../components/ui'
import { euros } from '../../components/bits'
import { useMe, useStore } from '../../data/store'
import { toggleTask } from '../../data/actions'
import { PROSPECT_STEPS, TONES, type ProspectStep } from '../../lib/constants'
import { moneySplit, stepCounts, ticketRef, todayItems, type TodayItem } from '../../lib/derive'
import { dueLabel, greeting, relTime, todayLong } from '../../lib/dates'
import { telLink, whatsappLink } from '../../lib/links'
import { describeActivity, FEED_TYPES } from '../shared/activity'

const TODAY_MAX = 3

// Couleurs de la barre vérifiées pour les daltonismes, en clair et en sombre : à garder avec le libellé et l'icône
const STEP_LOOK: Record<ProspectStep, { icon: LucideIcon; bar: string }> = {
  prospect: { icon: Store, bar: 'bg-copper' },
  vu: { icon: Eye, bar: 'bg-sky-600' },
  attente: { icon: Hourglass, bar: 'bg-amber-600' },
  accepte: { icon: ThumbsUp, bar: 'bg-emerald-500 dark:bg-emerald-600' },
  refuse: { icon: ThumbsDown, bar: 'bg-rose-600 dark:bg-rose-500' },
}

export function Dashboard() {
  const db = useStore((s) => s.db)
  const userId = useStore((s) => s.userId)
  const me = useMe()
  const [feedLimit, setFeedLimit] = useState(12)
  const c = useMemo(() => stepCounts(db), [db])
  const money = useMemo(() => moneySplit(db), [db])
  const items = useMemo(() => todayItems(db, userId), [db, userId])
  const feed = useMemo(() => db.activities.filter((a) => FEED_TYPES.has(a.type)), [db.activities])
  const byId = useMemo(() => new Map(db.profiles.map((p) => [p.id, p])), [db.profiles])
  const empty = c.prospect + c.vu + c.accepte + c.refuse + c.en_cours + c.livre === 0

  return (
    <Page className="pt-[max(var(--safe-top),16px)] lg:pt-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] text-muted font-medium">{todayLong()}</p>
          <h1 className="h-display text-[28px] lg:text-[32px] leading-tight">{greeting()}, {me?.first_name}</h1>
        </div>
        <Link to="/equipe" className="lg:hidden" aria-label="Mon profil"><Avatar profile={me} size={40} /></Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <SitesHero livre={c.livre} enCours={c.en_cours} empty={empty} className="lg:col-span-2" />
        {!empty && <Revenue {...money} className="lg:col-span-3" />}
        <Prospection counts={c} className={empty ? 'lg:col-span-3' : 'lg:col-span-5'} />
      </div>

      {items.length > 0 && (
        <Section title={`À faire aujourd’hui (${items.length})`}>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {items.slice(0, TODAY_MAX).map((i) => <TodayRow key={i.id} item={i} />)}
          </div>
          {items.length > TODAY_MAX && <Link to="/taches" className="btn-ghost w-full mt-2 text-muted">Voir les {items.length - TODAY_MAX} autres <ChevronRight size={16} /></Link>}
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

/** La grande carte : les sites livrés, et ceux en cours juste dessous. Sans aucune fiche, elle invite à commencer. */
function SitesHero({ livre, enCours, empty, className }: { livre: number; enCours: number; empty: boolean; className?: string }) {
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  if (empty) {
    return (
      <div className={cx('hero-card', className)}>
        <Sparkles size={24} />
        <p className="h-display text-[26px] leading-tight mt-2">On commence ?</p>
        <p className="text-[14.5px] mt-1 mb-4">Ajoutez votre premier prospect : seul le nom suffit.</p>
        <button className="btn bg-white text-[#7A3624] hover:bg-white/90" onClick={() => setQuickAdd(true)}><Plus size={18} />Nouveau prospect</button>
      </div>
    )
  }
  return (
    <div className={cx('hero-card flex flex-col', className)}>
      <Link to="/projets?g=livres" className="absolute inset-0" aria-label={`Voir les sites livrés (${livre})`} />
      <Rocket aria-hidden size={124} strokeWidth={1.2} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none" />
      <p className="text-[14.5px] font-semibold">Sites livrés</p>
      <p className="h-display text-[68px] leading-none mt-2 mb-5">{livre}</p>
      <Link to="/projets?g=en_cours" className="relative z-10 mt-auto self-start inline-flex items-center gap-2 h-10 pl-3.5 pr-2.5 rounded-full bg-black/20 hover:bg-black/30 transition text-[14px] font-semibold">
        <span className={cx('w-2 h-2 rounded-full bg-amber-300', enCours > 0 && 'animate-pulse')} />
        {enCours} site{enCours > 1 ? 's' : ''} en cours<ChevronRight size={16} />
      </Link>
    </div>
  )
}

/** Le camembert du chiffre d'affaires : le réel et le prévisionnel, avec les montants écrits à côté. */
function Revenue({ reel, previsionnel, className }: { reel: number; previsionnel: number; className?: string }) {
  const total = reel + previsionnel
  const reelShare = total ? Math.round((reel / total) * 100) : 0
  // Couleurs vérifiées pour les daltonismes, en clair et en sombre
  const parts = [
    { label: 'Réel', value: reel, share: reelShare, fill: 'fill-emerald-500 dark:fill-emerald-600', swatch: 'bg-emerald-500 dark:bg-emerald-600' },
    { label: 'Prévisionnel', value: previsionnel, share: 100 - reelShare, fill: 'fill-sky-600', swatch: 'bg-sky-600' },
  ]
  return (
    <section className={cx('card p-4 flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-bold text-[16px]">Chiffre d’affaires</h2>
        {total > 0 && <p className="text-[13.5px] font-semibold text-muted whitespace-nowrap">Total {euros(total)}</p>}
      </div>
      {total === 0 ? (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" aria-hidden className="w-[88px] h-[88px] shrink-0"><circle cx="50" cy="50" r="48" className="fill-sunken" /></svg>
          <div className="min-w-0">
            <p className="text-[14px] text-muted leading-snug">Mettez le prix proposé sur vos sites pour voir le réel et le prévisionnel.</p>
            <Link to="/projets" className="btn-soft h-10 min-h-0 mt-2.5 text-[14px]">Mettre les prix<ChevronRight size={16} /></Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <Pie parts={parts} total={total} />
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {parts.map((p) => (
                <div key={p.label}>
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                    <span className={cx('w-2.5 h-2.5 rounded-sm shrink-0', p.swatch)} />{p.label}<span className="ml-auto tabular text-faint whitespace-nowrap">{p.share} %</span>
                  </p>
                  <p className="h-display text-[24px] leading-tight mt-0.5">{euros(p.value)}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[12px] text-faint mt-3">Réel : clients acceptés. Prévisionnel : les autres prix proposés.</p>
        </>
      )}
    </section>
  )
}

function Pie({ parts, total }: { parts: { label: string; value: number; fill: string }[]; total: number }) {
  const shown = parts.filter((p) => p.value > 0)
  const point = (a: number) => `${50 + 48 * Math.cos(a)} ${50 + 48 * Math.sin(a)}`
  let angle = -Math.PI / 2
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={parts.map((p) => `${p.label} : ${euros(p.value)}`).join(', ')} className="w-[92px] h-[92px] min-[360px]:w-[112px] min-[360px]:h-[112px] shrink-0">
      {shown.map((p) => {
        const title = <title>{`${p.label} : ${euros(p.value)}`}</title>
        if (shown.length === 1) return <circle key={p.label} cx="50" cy="50" r="48" className={p.fill}>{title}</circle>
        const sweep = (p.value / total) * 2 * Math.PI
        const from = point(angle)
        angle += sweep
        return <path key={p.label} d={`M50 50 L${from} A48 48 0 ${sweep > Math.PI ? 1 : 0} 1 ${point(angle)} Z`} strokeWidth="2" strokeLinejoin="round" className={cx(p.fill, 'stroke-surface')}>{title}</path>
      })}
    </svg>
  )
}

/** Où en sont les fiches : la barre montre la répartition d'un coup d'œil, les cases donnent les chiffres et ouvrent la liste. */
function Prospection({ counts, className }: { counts: ReturnType<typeof stepCounts>; className?: string }) {
  const total = PROSPECT_STEPS.reduce((n, s) => n + counts[s.value], 0)
  return (
    <section className={cx('card p-4 flex flex-col', className)}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[16px]">Prospection</h2>
        <Link to="/prospects" className="inline-flex items-center gap-0.5 min-h-[32px] text-[13.5px] font-semibold text-muted hover:text-ink">
          {total} fiche{total > 1 ? 's' : ''}<ChevronRight size={15} />
        </Link>
      </div>
      <div role="img" aria-label={PROSPECT_STEPS.map((s) => `${counts[s.value]} ${s.plural.toLowerCase()}`).join(', ')}
        className={cx('flex gap-0.5 h-2', total === 0 && 'bg-sunken rounded-full')}>
        {PROSPECT_STEPS.filter((s) => counts[s.value] > 0).map((s) => (
          <span key={s.value} className={cx('min-w-[8px] rounded-full transition-[flex-grow] duration-500', STEP_LOOK[s.value].bar)} style={{ flexGrow: counts[s.value], flexBasis: 0 }} />
        ))}
      </div>
      <nav aria-label="Parcours" className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3.5">
        {PROSPECT_STEPS.map((s) => {
          const Icon = STEP_LOOK[s.value].icon
          return (
            <Link key={s.value} to={s.value === 'prospect' ? '/prospects' : `/prospects?f=${s.value}`}
              className={cx('flex items-center sm:flex-col sm:items-start gap-2.5 p-2.5 rounded-xl bg-sunken/60 hover:bg-sunken transition active:scale-[.98]', s.value === 'prospect' && 'col-span-2 sm:col-span-1')}>
              <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TONES[s.tone].badge)}><Icon size={18} /></span>
              <span className="min-w-0">
                <span className="block h-display text-[24px] leading-none">{counts[s.value]}</span>
                <span className="block text-[12.5px] font-semibold text-muted mt-1">{s.plural}</span>
              </span>
            </Link>
          )
        })}
      </nav>
    </section>
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
