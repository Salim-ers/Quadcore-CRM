import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, GripVertical, MapPin, Search, X } from 'lucide-react'
import { Chips, Input, Sheet, cx } from '../../components/ui'
import { euros } from '../../components/bits'
import { moveAppointment } from '../../data/actions'
import { toast, useStore } from '../../data/store'
import { allAppointments, salesTeam, toMinutes, toSchedule, toTime, type Appointment } from '../../lib/appointments'
import { PROSPECT_STEPS, TONES, prospectStep } from '../../lib/constants'
import { dayLabel, dayShort, monthDays, monthLabel, sameMonth, shiftDays, shiftMonths, todayStr, weekDays, weekLabel } from '../../lib/dates'
import { searchMatch } from '../../lib/derive'
import type { Profile, Prospect } from '../../lib/types'
import { AppointmentSheet, type AppointmentDraft } from './AppointmentSheet'

type View = 'jour' | 'semaine' | 'mois'
const START = 8 * 60, END = 20 * 60, STEP = 30, SLOT_H = 28
const SLOTS = Array.from({ length: (END - START) / STEP }, (_, i) => START + i * STEP)
const DEFAULT_TIME = '10:00'

const startDrag = (e: DragEvent, payload: string) => {
  e.dataTransfer.setData('text/plain', payload)
  e.dataTransfer.effectAllowed = 'move'
}

/** Place les rendez-vous qui se chevauchent côte à côte, pour que chacun reste lisible. */
function layoutDay(items: Appointment[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
  const placed = new Map<string, { col: number; cols: number }>()
  let cluster: Appointment[] = [], ends: number[] = [], clusterEnd = -1
  const flush = () => { cluster.forEach((a) => { placed.get(a.task.id)!.cols = ends.length }); cluster = []; ends = [] }
  for (const a of sorted) {
    const from = toMinutes(a.time), to = from + a.minutes
    if (from >= clusterEnd) { flush(); clusterEnd = to }
    let col = ends.findIndex((end) => end <= from)
    if (col < 0) { col = ends.length; ends.push(to) } else ends[col] = to
    placed.set(a.task.id, { col, cols: 1 })
    cluster.push(a)
    clusterEnd = Math.max(clusterEnd, to)
  }
  flush()
  return placed
}

function EventCard({ a, owner, client, style, compact, onOpen }: { a: Appointment; owner?: Profile; client?: Prospect; style?: React.CSSProperties; compact?: boolean; onOpen: () => void }) {
  const color = owner?.color ?? '#9C948A'
  const late = !a.done && a.date < todayStr()
  return (
    <div role="button" tabIndex={0} draggable aria-label={`${a.time}, ${client?.name ?? a.task.title}${owner ? `, ${owner.first_name}` : ''}`} title={`${a.time}, ${client?.name ?? a.task.title}${owner ? `, ${owner.first_name}` : ''}`}
      onDragStart={(e) => startDrag(e, `rdv:${a.task.id}`)}
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{ ...style, background: `${color}26`, borderLeftColor: color }}
      className={cx('rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11.5px] leading-tight text-ink overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-95 transition', compact ? 'block w-full truncate' : 'absolute z-[1]', a.done && 'opacity-50', late && 'ring-1 ring-danger')}>
      <span className={cx('font-bold', compact && 'mr-1')}>{a.time}</span>
      {compact ? <span className={cx(a.done && 'line-through')}>{client?.name}</span> : (
        <>
          <span className={cx('block font-semibold truncate', a.done && 'line-through')}>{client?.name ?? a.task.title}</span>
          {a.minutes >= 60 && owner && <span className="block text-muted truncate">{owner.first_name}</span>}
        </>
      )}
    </div>
  )
}

function TimeGrid({ days, items, byProfile, byClient, now, onSlot, onOpen, onDropOn }: {
  days: string[]; items: Appointment[]; byProfile: Map<string, Profile>; byClient: Map<string, Prospect>; now: Date
  onSlot: (date: string, time: string) => void; onOpen: (a: Appointment) => void; onDropOn: (e: DragEvent, date: string, time: string) => void
}) {
  const [over, setOver] = useState('')
  const today = todayStr()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const cols = { gridTemplateColumns: `44px repeat(${days.length}, minmax(0, 1fr))` }
  const timeAt = (e: DragEvent<HTMLElement>) => {
    const index = Math.floor((e.clientY - e.currentTarget.getBoundingClientRect().top) / SLOT_H)
    return toTime(SLOTS[Math.min(SLOTS.length - 1, Math.max(0, index))])
  }
  return (
    <div className="overflow-x-auto" data-testid="grille">
      <div className={cx(days.length > 1 && 'min-w-[720px] lg:min-w-0')}>
        <div className="grid border-b border-line bg-bg" style={cols}>
          <span />
          {days.map((d) => {
            const { name, number } = dayShort(d)
            return (
              <div key={d} className="text-center py-1.5 border-l border-line first-of-type:border-l-0">
                <span className="block text-[11.5px] font-semibold text-muted">{name}</span>
                <span className={cx('inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full text-[14px] font-bold', d === today && 'bg-copper text-onCopper')}>{number}</span>
              </div>
            )
          })}
        </div>
        <div className="grid" style={cols}>
          <div>
            {SLOTS.map((m) => (
              <div key={m} style={{ height: SLOT_H }} className="text-[11px] text-faint text-right pr-1.5 tabular -translate-y-1.5">{m % 60 === 0 ? `${m / 60} h` : ''}</div>
            ))}
          </div>
          {days.map((d) => {
            const dayItems = items.filter((a) => a.date === d)
            const places = layoutDay(dayItems)
            return (
              // La colonne reçoit le dépôt : une heure déjà occupée par un collègue reste accessible
              <div key={d} data-date={d} className="relative border-l border-line"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const key = `${d}|${timeAt(e)}`; if (over !== key) setOver(key) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver('') }}
                onDrop={(e) => { e.preventDefault(); setOver(''); onDropOn(e, d, timeAt(e)) }}>
                {SLOTS.map((m) => {
                  const time = toTime(m), key = `${d}|${time}`
                  return (
                    <button key={m} type="button" data-slot={key} aria-label={`${dayLabel(d)} à ${time}`} style={{ height: SLOT_H }}
                      onClick={() => onSlot(d, time)}
                      className={cx('block w-full border-t transition-colors hover:bg-sunken/70', m % 60 === 0 ? 'border-line' : 'border-line/40', over === key && '!bg-copper/25')} />
                  )
                })}
                {d === today && nowMinutes >= START && nowMinutes < END && (
                  <span aria-hidden className="absolute inset-x-0 z-[2] h-0.5 bg-rose-500 pointer-events-none" style={{ top: ((nowMinutes - START) / STEP) * SLOT_H }} />
                )}
                {dayItems.map((a) => {
                  const p = places.get(a.task.id)!
                  const top = Math.max(0, ((toMinutes(a.time) - START) / STEP) * SLOT_H)
                  return (
                    <EventCard key={a.task.id} a={a} owner={byProfile.get(a.task.assignee_id ?? '')} client={byClient.get(a.task.prospect_id ?? '')} onOpen={() => onOpen(a)}
                      style={{ top: top + 1, height: Math.max(SLOT_H - 2, (a.minutes / STEP) * SLOT_H - 2), left: `calc(${(p.col / p.cols) * 100}% + 1px)`, width: `calc(${100 / p.cols}% - 3px)` }} />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthGrid({ anchor, items, byProfile, byClient, onDay, onOpen, onDropOn }: {
  anchor: string; items: Appointment[]; byProfile: Map<string, Profile>; byClient: Map<string, Prospect>
  onDay: (date: string) => void; onOpen: (a: Appointment) => void; onDropOn: (e: DragEvent, date: string) => void
}) {
  const [over, setOver] = useState('')
  const today = todayStr()
  const days = monthDays(anchor)
  return (
    <div className="grid grid-cols-7 border-t border-l border-line" data-testid="mois">
      {days.slice(0, 7).map((d) => <div key={d} className="text-center text-[11.5px] font-semibold text-muted py-1.5 border-r border-b border-line">{dayShort(d).name}</div>)}
      {days.map((d) => {
        const list = items.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time))
        return (
          <div key={d} data-day={d} role="button" tabIndex={0} aria-label={dayLabel(d)} onClick={() => onDay(d)} onKeyDown={(e) => { if (e.key === 'Enter') onDay(d) }}
            onDragOver={(e) => { e.preventDefault(); if (over !== d) setOver(d) }} onDragLeave={() => setOver((o) => (o === d ? '' : o))}
            onDrop={(e) => { e.preventDefault(); setOver(''); onDropOn(e, d) }}
            className={cx('min-h-[76px] lg:min-h-[104px] min-w-0 p-1 border-r border-b border-line text-left align-top cursor-pointer transition-colors hover:bg-sunken/70', !sameMonth(d, anchor) && 'bg-sunken/40', over === d && '!bg-copper/25')}>
            <span className={cx('inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[12px] font-bold', d === today ? 'bg-copper text-onCopper' : !sameMonth(d, anchor) && 'text-faint')}>{dayShort(d).number}</span>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {list.slice(0, 3).map((a) => <EventCard key={a.task.id} compact a={a} owner={byProfile.get(a.task.assignee_id ?? '')} client={byClient.get(a.task.prospect_id ?? '')} onOpen={() => onOpen(a)} />)}
              {list.length > 3 && <span className="text-[11px] font-semibold text-muted px-1">+{list.length - 3}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Les clients à planifier : à glisser sur le calendrier, ou à toucher puis choisir une heure. */
function ToSchedule({ list, placing, onPick }: { list: Prospect[]; placing: Prospect | null; onPick: (p: Prospect) => void }) {
  const [q, setQ] = useState('')
  const projects = useStore((s) => s.db.projects)
  const found = list.filter((p) => searchMatch(q, p.name, p.city, p.contact_name))
  return (
    <div className="flex flex-col gap-2.5 min-h-0">
      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un client…" className="pl-9 bg-surface" type="search" aria-label="Chercher un client à planifier" />
      </div>
      {found.length === 0 ? <p className="text-[13.5px] text-muted px-1 py-3">{q ? 'Aucun résultat.' : 'Tout le monde a son rendez-vous.'}</p> : (
        <ul className="flex flex-col gap-1.5">
          {found.map((p) => {
            const step = PROSPECT_STEPS.find((s) => s.value === prospectStep(p.status))!
            const site = projects.find((x) => x.prospect_id === p.id && !x.archived)
            const price = site?.price_proposed
            return (
              <li key={p.id}>
                <button type="button" draggable data-prospect={p.name} onDragStart={(e) => startDrag(e, `prospect:${p.id}`)} onClick={() => onPick(p)}
                  className={cx('card w-full flex items-center gap-2 p-2.5 text-left cursor-grab active:cursor-grabbing transition hover:border-copper/40', placing?.id === p.id && 'border-copper bg-copper/8')}>
                  <GripVertical size={15} className="hidden lg:block shrink-0 text-faint" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[14px] truncate">{p.name}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-muted mt-0.5 min-w-0">
                      <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', TONES[step.tone].dot)} />
                      <span className="shrink-0">{step.label}</span>
                      {p.city && <span className="inline-flex items-center gap-0.5 truncate"><MapPin size={11} className="shrink-0" />{p.city}</span>}
                    </span>
                  </span>
                  {price != null && <span className="text-[12.5px] font-bold whitespace-nowrap">{euros(price)}</span>}
                  {!site && !p.website_url && <span className="text-[12px] font-semibold text-muted whitespace-nowrap">Sans site</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Header({ title, onPrev, onNext, onToday, children }: { title: string; onPrev: () => void; onNext: () => void; onToday: () => void; children: ReactNode }) {
  return (
    <header className="px-4 lg:px-6 pt-[max(var(--safe-top),12px)] lg:pt-5 pb-2.5">
      <div className="flex items-center gap-1 min-h-[44px]">
        <h1 className="h-display text-[20px] lg:text-[24px] leading-tight flex-1 min-w-0">{title}</h1>
        <button type="button" className="chip h-9 px-3 shrink-0" onClick={onToday}>Aujourd’hui</button>
        <button type="button" className="icon-btn w-10 h-10 shrink-0" aria-label="Précédent" onClick={onPrev}><ChevronLeft size={21} /></button>
        <button type="button" className="icon-btn w-10 h-10 -mr-2 shrink-0" aria-label="Suivant" onClick={onNext}><ChevronRight size={21} /></button>
      </div>
      {children}
    </header>
  )
}

/** Le calendrier des rendez-vous : à droite les clients à planifier, à glisser à l'heure voulue. */
export function CalendarPage() {
  const db = useStore((s) => s.db)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>(() => (window.matchMedia('(min-width: 1024px)').matches ? 'semaine' : 'jour'))
  const [anchor, setAnchor] = useState(() => params.get('d') ?? todayStr())
  const [who, setWho] = useState('tous')
  const [draft, setDraft] = useState<AppointmentDraft | null>(null)
  const [openId, setOpenId] = useState<string | null>(() => params.get('rdv'))
  const [placingId, setPlacingId] = useState<string | null>(() => params.get('planifier'))
  const [panel, setPanel] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  useEffect(() => { if (params.size) setParams({}, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const team = useMemo(() => salesTeam(db.profiles), [db.profiles])
  const byProfile = useMemo(() => new Map(db.profiles.map((p) => [p.id, p])), [db.profiles])
  const byClient = useMemo(() => new Map(db.prospects.map((p) => [p.id, p])), [db.prospects])
  const everything = useMemo(() => allAppointments(db), [db])
  const items = useMemo(() => (who === 'tous' ? everything : everything.filter((a) => a.task.assignee_id === who)), [everything, who])
  const waiting = useMemo(() => toSchedule(db), [db])
  const placing = placingId ? byClient.get(placingId) ?? null : null
  const opened = openId ? everything.find((a) => a.task.id === openId) ?? null : null

  const title = view === 'jour' ? dayLabel(anchor) : view === 'semaine' ? weekLabel(anchor) : monthLabel(anchor)
  const shift = (dir: number) => setAnchor(view === 'jour' ? shiftDays(anchor, dir) : view === 'semaine' ? shiftDays(anchor, 7 * dir) : shiftMonths(anchor, dir))

  async function move(a: Appointment, date: string, time: string) {
    if (a.date === date && a.time === time) return
    if (await moveAppointment(a, date, time)) toast('Rendez-vous déplacé', 'default', { label: 'Annuler', run: () => moveAppointment(a, a.date, a.time) })
  }

  /** Un client ou un rendez-vous lâché sur le calendrier. Sans heure (vue mois), un rendez-vous garde la sienne. */
  function dropped(e: DragEvent, date: string, time?: string) {
    const [kind, id] = e.dataTransfer.getData('text/plain').split(':')
    if (kind === 'prospect') { setPlacingId(null); setDraft({ prospectId: id, date, time: time ?? DEFAULT_TIME }) }
    if (kind === 'rdv') { const a = everything.find((x) => x.task.id === id); if (a) move(a, date, time ?? a.time) }
  }

  function slot(date: string, time: string) {
    setDraft({ prospectId: placing?.id, date, time })
    setPlacingId(null)
  }

  function pick(p: Prospect) {
    setPanel(false)
    setPlacingId(p.id)
  }

  return (
    <div className="lg:flex lg:items-start min-w-0">
      <div className="flex-1 min-w-0">
        <Header title={title} onPrev={() => shift(-1)} onNext={() => shift(1)} onToday={() => setAnchor(todayStr())}>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Chips value={view} onChange={setView} options={[{ value: 'jour' as const, label: 'Jour' }, { value: 'semaine' as const, label: 'Semaine' }, { value: 'mois' as const, label: 'Mois' }]} />
            <Chips value={who} onChange={setWho} className="lg:ml-auto" options={[{ value: 'tous', label: 'Tous' }, ...team.map((m) => ({ value: m.id, label: m.first_name }))]} />
          </div>
        </Header>

        {placing && (
          <div className="sticky top-0 z-10 mx-4 lg:mx-6 mb-2 flex items-center gap-2 rounded-xl bg-ink text-bg px-3 py-2 text-[13.5px] font-semibold">
            <span className="flex-1 min-w-0 truncate">{view === 'mois' ? 'Touchez un jour' : 'Touchez une heure'} pour {placing.name}</span>
            <button type="button" className="shrink-0 w-8 h-8 inline-flex items-center justify-center" aria-label="Annuler" onClick={() => setPlacingId(null)}><X size={17} /></button>
          </div>
        )}

        <div className="px-4 lg:px-6">
          {view === 'mois'
            ? <MonthGrid anchor={anchor} items={items} byProfile={byProfile} byClient={byClient} onOpen={(a) => setOpenId(a.task.id)} onDropOn={(e, d) => dropped(e, d)}
                onDay={(d) => {
                  if (placing) { slot(d, DEFAULT_TIME); return }
                  setAnchor(d); setView('jour')
                }} />
            : <TimeGrid days={view === 'jour' ? [anchor] : weekDays(anchor)} items={items} byProfile={byProfile} byClient={byClient} now={now} onSlot={slot} onOpen={(a) => setOpenId(a.task.id)} onDropOn={(e, d, t) => dropped(e, d, t)} />}
        </div>
      </div>

      <aside className="hidden lg:flex flex-col w-[300px] shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-line bg-surface/60 p-4">
        <h2 className="font-bold text-[16px]">À planifier <span className="text-muted font-semibold">({waiting.length})</span></h2>
        <p className="text-[12.5px] text-muted mt-0.5 mb-3">Glissez un client à l’heure voulue.</p>
        <ToSchedule list={waiting} placing={placing} onPick={pick} />
      </aside>

      <button type="button" onClick={() => setPanel(true)} aria-label={`Clients à planifier : ${waiting.length}`}
        className="lg:hidden fixed z-30 right-4 bottom-[calc(var(--nav-h)+var(--safe-bottom)+16px)] h-14 pl-4 pr-5 rounded-2xl bg-copper text-onCopper shadow-float inline-flex items-center gap-2 font-semibold active:scale-95 transition">
        <CalendarPlus size={21} />À planifier <span className="tabular">{waiting.length}</span>
      </button>
      <Sheet open={panel} onClose={() => setPanel(false)} title={`À planifier (${waiting.length})`} size="sm">
        <p className="text-[13.5px] text-muted mb-3">Touchez un client, puis l’heure du rendez-vous.</p>
        <ToSchedule list={waiting} placing={placing} onPick={pick} />
      </Sheet>

      <AppointmentSheet draft={draft} appointment={opened} onClose={() => { setDraft(null); setOpenId(null) }} />
    </div>
  )
}
