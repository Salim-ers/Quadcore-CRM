import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, FileText, Globe, Home, MoreHorizontal, Plus, Store, Ticket, Users, WifiOff } from 'lucide-react'
import { create } from 'zustand'
import { useMe, useStore, backend } from '../data/store'
import { todayStr } from '../lib/dates'
import { isAssigned } from '../lib/appointments'
import { Avatar, Logo, Sheet, cx } from './ui'
import { QuickAddProspect } from '../features/prospects/QuickAddProspect'
import { TicketSheet, type TicketDraft } from '../features/tickets/TicketSheet'
import { PROSPECT_STEPS } from '../lib/constants'
import { fullName, isTicketOpen, liveTickets, stepCounts } from '../lib/derive'

export const useUi = create<{
  quickAdd: boolean; setQuickAdd: (v: boolean) => void
  ticketDraft: TicketDraft | null; newTicket: (draft?: TicketDraft) => void; closeTicket: () => void
}>((set) => ({
  quickAdd: false,
  setQuickAdd: (quickAdd) => set({ quickAdd }),
  ticketDraft: null,
  newTicket: (draft = {}) => set({ ticketDraft: draft }),
  closeTicket: () => set({ ticketDraft: null }),
}))

// Le parcours en premier ; le reste est rangé dans « Plus »
const NAV = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/prospects', label: 'Prospects', icon: Store },
  { to: '/calendrier', label: 'Calendrier', icon: CalendarDays },
  { to: '/projets', label: 'Sites', icon: Globe },
]
const MORE = [
  { to: '/documents', label: 'Devis et CGV', icon: FileText },
  { to: '/brochure', label: 'Brochure', icon: BookOpen },
  { to: '/suivi', label: 'Tickets clients', icon: Ticket },
  { to: '/taches', label: 'Tâches', icon: CheckSquare },
  { to: '/equipe', label: 'Équipe', icon: Users },
]

function useTaskBadge() {
  return useStore((s) => {
    const t = todayStr()
    return s.db.tasks.filter((x) => isAssigned(x, s.userId) && x.status !== 'termine' && x.due_date && x.due_date <= t).length
  })
}

/** Tickets à prendre, ou les miens arrivés à échéance */
function useTicketBadge() {
  return useStore((s) => {
    const t = todayStr()
    return liveTickets(s.db).filter((x) => isTicketOpen(x) && x.status !== 'attente_client' &&
      (!x.assignee_id || (x.assignee_id === s.userId && !!x.due_date && x.due_date <= t))).length
  })
}

export function Shell({ children }: { children: ReactNode }) {
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const quickAdd = useUi((s) => s.quickAdd)
  const ticketDraft = useUi((s) => s.ticketDraft)
  const newTicket = useUi((s) => s.newTicket)
  const closeTicket = useUi((s) => s.closeTicket)
  const online = useStore((s) => s.online)
  const taskBadge = useTaskBadge()
  const ticketBadge = useTicketBadge()
  const badgeOf = (to: string) => (to === '/taches' ? taskBadge : to === '/suivi' ? ticketBadge : 0)
  const moreBadge = taskBadge + ticketBadge
  const me = useMe()
  const loc = useLocation()
  const nav = useNavigate()
  const onSuivi = loc.pathname.startsWith('/suivi')
  const inMore = MORE.some((m) => loc.pathname.startsWith(m.to))
  const [moreOpen, setMoreOpen] = useState(inMore)
  const [moreSheet, setMoreSheet] = useState(false)
  useEffect(() => { if (inMore) setMoreOpen(true) }, [inMore])
  const db = useStore((s) => s.db)
  const counts = useMemo(() => stepCounts(db), [db])
  // Les sous-menus des deux grandes entrées, avec leur compte
  const subItems: Record<string, { to: string; label: string; count: number; active: boolean }[]> = {
    '/prospects': PROSPECT_STEPS.map((s) => {
      const f = new URLSearchParams(loc.search).get('f')
      return { to: s.value === 'prospect' ? '/prospects' : `/prospects?f=${s.value}`, label: s.plural, count: counts[s.value], active: s.value === 'prospect' ? !f : f === s.value }
    }),
    '/projets': [
      { to: '/projets?g=livres', label: 'Livrés', count: counts.livre, active: new URLSearchParams(loc.search).get('g') === 'livres' },
      { to: '/projets?g=en_cours', label: 'En cours', count: counts.en_cours, active: new URLSearchParams(loc.search).get('g') === 'en_cours' },
    ],
  }

  // raccourcis PWA « Ajouter un prospect » et « Nouveau ticket » (?new=1)
  useEffect(() => {
    const q = new URLSearchParams(loc.search)
    if (q.get('new') === '1') {
      if (loc.pathname.startsWith('/suivi')) newTicket()
      else setQuickAdd(true)
      nav(loc.pathname, { replace: true })
    }
  }, [loc.search, loc.pathname, nav, setQuickAdd, newTicket])

  // raccourcis clavier desktop : N = nouveau prospect, T = nouveau ticket
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.metaKey || e.ctrlKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.querySelector('[role=dialog]')) return
      const key = e.key.toLowerCase()
      if (key === 'n') { e.preventDefault(); setQuickAdd(true) }
      if (key === 't') { e.preventDefault(); newTicket() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setQuickAdd, newTicket])

  // Pas de bouton flottant sur une fiche, ni par-dessus la brochure ; le calendrier a le sien
  const hideFab = /^\/(prospects|projets|suivi)\/[^/]+/.test(loc.pathname) || loc.pathname === '/brochure' || loc.pathname === '/calendrier'

  return (
    <div className="min-h-[100dvh] lg:flex">
      {/* ——— Barre latérale (ordinateur) ——— */}
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 border-r border-line bg-surface/60 px-4 py-5">
        <div className="px-2 mb-7"><Logo size={30} /></div>
        <button className="btn-primary w-full mb-5 whitespace-nowrap justify-start px-3.5 text-[14.5px]" onClick={() => setQuickAdd(true)}>
          <Plus size={18} /> Nouveau prospect
        </button>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <div key={to}>
              <NavLink to={to} end={end}
                className={({ isActive }) => cx('flex items-center gap-3 h-11 px-3 rounded-xl font-semibold text-[14.5px] transition',
                  isActive ? 'bg-ink text-bg' : 'text-muted hover:bg-sunken hover:text-ink')}>
                <Icon size={19} strokeWidth={2} />
                <span className="flex-1">{label}</span>
              </NavLink>
              {subItems[to] && loc.pathname.startsWith(to) && (
                <div className="flex flex-col gap-0.5 mt-0.5 mb-1 ml-[22px] pl-3 border-l border-line animate-fade-up">
                  {subItems[to].map((s) => (
                    <Link key={s.to} to={s.to} aria-current={s.active ? 'page' : undefined}
                      className={cx('flex items-center h-9 px-2.5 rounded-lg text-[13.5px] font-semibold transition', s.active ? 'text-ink bg-sunken' : 'text-muted hover:text-ink hover:bg-sunken/60')}>
                      <span className="flex-1">{s.label}</span>
                      <span className="tabular text-[12px] text-faint">{s.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}
            className="flex items-center gap-3 h-11 px-3 rounded-xl font-semibold text-[14.5px] text-muted hover:bg-sunken hover:text-ink transition">
            <MoreHorizontal size={19} />
            <span className="flex-1 text-left">Plus</span>
            {!moreOpen && moreBadge > 0 && <span className="tabular text-[12px] font-bold min-w-[22px] h-[22px] px-1.5 rounded-full bg-copper text-onCopper flex items-center justify-center">{moreBadge}</span>}
            <ChevronDown size={16} className={cx('transition-transform', moreOpen && 'rotate-180')} />
          </button>
          {moreOpen && (
            <div className="flex flex-col gap-0.5 animate-fade-up">
              {MORE.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => cx('flex items-center gap-3 h-10 pl-6 pr-3 rounded-xl font-semibold text-[14px] transition',
                    isActive ? 'bg-ink text-bg' : 'text-muted hover:bg-sunken hover:text-ink')}>
                  <Icon size={17} strokeWidth={2} />
                  <span className="flex-1">{label}</span>
                  {badgeOf(to) > 0 && <span className="tabular text-[12px] font-bold min-w-[22px] h-[22px] px-1.5 rounded-full bg-copper text-onCopper flex items-center justify-center">{badgeOf(to)}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2 pt-4 border-t border-line">
          <Avatar profile={me} size={34} />
          <div className="min-w-0">
            <p className="font-bold text-[14px] truncate">{fullName(me)}</p>
            <p className="text-[12px] text-muted">{me?.role === 'admin' ? 'Administrateur' : 'Collaborateur'}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {backend.mode === 'demo' && <DemoRibbon />}
        {!online && (
          <div className="sticky top-0 z-40 bg-ink text-bg text-[13px] font-semibold flex items-center justify-center gap-2 py-2 pt-[max(var(--safe-top),8px)]">
            <WifiOff size={15} /> Hors ligne — rien ne sera enregistré avant le retour du réseau
          </div>
        )}
        <main className="pb-nav">{children}</main>
      </div>

      {/* ——— Bouton flottant (mobile) ——— */}
      {!hideFab && (
        <button
          onClick={() => (onSuivi ? newTicket() : setQuickAdd(true))}
          aria-label={onSuivi ? 'Nouveau ticket' : 'Ajouter un prospect'}
          className="lg:hidden fixed z-30 right-4 bottom-[calc(var(--nav-h)+var(--safe-bottom)+16px)] w-14 h-14 rounded-2xl bg-copper text-onCopper shadow-float flex items-center justify-center active:scale-95 transition"
        >
          <Plus size={26} strokeWidth={2.4} />
        </button>
      )}

      {/* ——— Navigation inférieure (mobile) ——— */}
      <nav className="lg:hidden fixed z-30 bottom-0 inset-x-0 bg-surface/92 backdrop-blur-xl border-t border-line pb-safe">
        <div className="grid grid-cols-5 h-[var(--nav-h)]">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => cx('relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-faint')}>
              {({ isActive }) => (
                <>
                  <span className={cx('flex items-center justify-center w-12 h-7 rounded-full transition', isActive && 'bg-copper/12 text-copper-ink')}>
                    <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMoreSheet(true)} className={cx('relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors', inMore ? 'text-ink' : 'text-faint')}>
            <span className={cx('flex items-center justify-center w-12 h-7 rounded-full transition', inMore && 'bg-copper/12 text-copper-ink')}>
              <MoreHorizontal size={21} strokeWidth={inMore ? 2.3 : 1.9} />
            </span>
            Plus
            {moreBadge > 0 && (
              <span className="absolute top-1.5 left-1/2 ml-2 tabular text-[10.5px] font-bold min-w-[18px] h-[18px] px-1 rounded-full bg-copper text-onCopper flex items-center justify-center">{moreBadge}</span>
            )}
          </button>
        </div>
      </nav>

      <Sheet open={moreSheet} onClose={() => setMoreSheet(false)} title="Plus" size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          {MORE.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMoreSheet(false)} className="flex items-center gap-3 min-h-[56px] px-3 rounded-xl font-semibold text-[15.5px] hover:bg-sunken transition">
              <Icon size={20} className="text-muted" />
              <span className="flex-1">{label}</span>
              {badgeOf(to) > 0 && <span className="tabular text-[12px] font-bold min-w-[22px] h-[22px] px-1.5 rounded-full bg-copper text-onCopper flex items-center justify-center">{badgeOf(to)}</span>}
              <ChevronRight size={18} className="text-faint" />
            </Link>
          ))}
        </div>
      </Sheet>
      <QuickAddProspect open={quickAdd} onClose={() => setQuickAdd(false)} />
      <TicketSheet open={!!ticketDraft} onClose={closeTicket} draft={ticketDraft} onCreated={(t) => nav(`/suivi/${t.id}`)} />
    </div>
  )
}

function DemoRibbon() {
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('qc-ribbon') === '1' } catch { return false } })
  if (hidden) return null
  return (
    <div className="bg-copper/10 text-copper-ink text-[12.5px] font-semibold px-4 py-2 pt-[max(var(--safe-top),8px)] flex items-center gap-2 lg:pt-2">
      <span className="flex-1">Mode démonstration — données fictives enregistrées dans ce navigateur.</span>
      <button className="underline underline-offset-2" onClick={() => { setHidden(true); try { sessionStorage.setItem('qc-ribbon', '1') } catch { /* noop */ } }}>Masquer</button>
    </div>
  )
}

/** En-tête de page : grand titre mobile, barre collante, retour. */
export function PageHeader({ title, subtitle, back, actions, children }: {
  title: ReactNode; subtitle?: ReactNode; back?: string | true; actions?: ReactNode; children?: ReactNode
}) {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={cx('sticky top-0 z-20 bg-bg/88 backdrop-blur-xl transition-[border-color] border-b', scrolled ? 'border-line' : 'border-transparent')}>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-[max(var(--safe-top),12px)] lg:pt-6 pb-3">
        <div className="flex items-center gap-2 min-h-[44px]">
          {back && (
            <button className="icon-btn -ml-3" aria-label="Retour"
              onClick={() => (typeof back === 'string' ? (window.history.length > 1 ? nav(-1) : nav(back)) : nav(-1))}>
              <ChevronLeft size={26} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className={cx('h-display truncate', back ? 'text-[21px]' : 'text-[28px] lg:text-[30px]')}>{title}</h1>
            {subtitle && <p className="text-[13.5px] text-muted -mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1 -mr-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('max-w-6xl mx-auto px-4 lg:px-8 animate-fade-up', className)}>{children}</div>
}
