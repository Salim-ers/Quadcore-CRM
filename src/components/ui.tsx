import { forwardRef, useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, X } from 'lucide-react'
import { TONES, type Tone } from '../lib/constants'
import type { Profile } from '../lib/types'
import { fullName, initials } from '../lib/derive'
import { dismissToast, useStore } from '../data/store'
import markUrl from '../assets/mark-128.png'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ———————————————————————— Marque ————————————————————————
export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <img src={markUrl} width={size} height={size} alt="" className="shrink-0" style={{ width: size, height: size }} />
      {withText && (
        <span className="font-display leading-none tracking-[.02em]" style={{ fontSize: size * 0.56 }}>
          <span className="font-semibold">Quad</span>
          <span className="font-semibold text-copper-ink">Core</span>
        </span>
      )}
    </span>
  )
}

// ———————————————————————— Badges & avatars ————————————————————————
export function Badge({ tone, children, className, dot = true }: { tone: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-semibold whitespace-nowrap', TONES[tone].badge, className)}>
      {dot && <span className={cx('w-1.5 h-1.5 rounded-full', TONES[tone].dot)} />}
      {children}
    </span>
  )
}

export function Avatar({ profile, size = 28, ring = false }: { profile?: Profile | null; size?: number; ring?: boolean }) {
  const style = { width: size, height: size, fontSize: size * 0.4, background: profile?.color ?? '#9C948A' }
  return (
    <span
      title={fullName(profile)}
      className={cx('inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 overflow-hidden', ring && 'ring-2 ring-surface')}
      style={style}
    >
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials(profile)}
    </span>
  )
}

export function ProgressBar({ value, total, tone = 'copper' }: { value: number; total: number; tone?: Tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-1.5 rounded-full bg-sunken overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', TONES[tone].bar)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ———————————————————————— Formulaires ————————————————————————
export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[12px] text-faint">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return <input ref={ref} {...props} onFocus={(e) => { keepVisible(e.currentTarget); props.onFocus?.(e) }} className={cx('input', props.className)} />
})
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} onFocus={(e) => { keepVisible(e.currentTarget); props.onFocus?.(e) }} className={cx('input resize-none', props.className)} />
}
export function Select({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={cx('input appearance-none pr-10', className)}>{children}</select>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint" />
    </span>
  )
}

/** Garde le champ visible au-dessus du clavier mobile */
function keepVisible(el: HTMLElement) {
  if (window.matchMedia('(min-width: 1024px)').matches) return
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280)
}

export function Chips<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; className?: string
}) {
  return (
    <div className={cx('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx('chip', value === o.value && 'chip-on')}>
          {o.label}
          {o.count !== undefined && <span className={cx('tabular text-[12px]', value === o.value ? 'opacity-70' : 'text-faint')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ———————————————————————— Feuille (bottom sheet mobile / dialogue desktop) ————————————————————————
let openSheets = 0
export function Sheet({ open, onClose, title, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg'
}) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    openSheets++
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => panel.current?.focus(), 30)
    return () => {
      openSheets--
      if (openSheets === 0) document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  // glisser vers le bas pour fermer (mobile)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  if (!open) return null
  const w = size === 'sm' ? 'lg:max-w-md' : size === 'lg' ? 'lg:max-w-3xl' : 'lg:max-w-xl'
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-[rgb(10_8_6/0.42)] animate-fade-in backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative w-full bg-bg lg:bg-surface rounded-t-3xl lg:rounded-3xl shadow-sheet outline-none flex flex-col',
          'max-h-[calc(100dvh-max(var(--safe-top),12px)-8px)] lg:max-h-[86vh] animate-sheet-in lg:animate-pop-in',
          w,
        )}
        onTouchStart={(e) => { if ((e.target as HTMLElement).closest('[data-sheet-handle]')) drag.current = { y: e.touches[0].clientY, dy: 0 } }}
        onTouchMove={(e) => {
          if (!drag.current || !panel.current) return
          drag.current.dy = Math.max(0, e.touches[0].clientY - drag.current.y)
          panel.current.style.transform = `translateY(${drag.current.dy}px)`
        }}
        onTouchEnd={() => {
          if (!drag.current || !panel.current) return
          const close = drag.current.dy > 110
          panel.current.style.transform = ''
          drag.current = null
          if (close) onClose()
        }}
      >
        <div data-sheet-handle className="lg:hidden pt-2.5 pb-1 flex justify-center cursor-grab"><span className="w-10 h-1.5 rounded-full bg-line" /></div>
        {title !== undefined && (
          <div data-sheet-handle className="flex items-center gap-3 px-5 pt-2 pb-3 lg:pt-5">
            <h2 className="flex-1 text-[19px] font-bold tracking-[-0.01em] min-w-0">{title}</h2>
            <button className="icon-btn -mr-2 text-muted" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(var(--safe-bottom),16px)] lg:pb-5 border-t border-line bg-bg lg:bg-surface rounded-b-3xl">{footer}</div>}
        {!footer && <div className="pb-safe lg:hidden" />}
      </div>
    </div>,
    document.body,
  )
}

/** Liste d'options plein écran au pouce (statuts, responsables…) */
export function Picker<T extends string>({ open, onClose, title, options, value, onPick }: {
  open: boolean; onClose: () => void; title: string; value?: T | null
  options: { value: T; label: string; tone?: Tone; hint?: string; icon?: ReactNode }[]
  onPick: (v: T) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-1 -mx-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => { onPick(o.value); onClose() }}
            className={cx('flex items-center gap-3 min-h-[52px] px-3 rounded-xl text-left hover:bg-sunken active:bg-sunken transition', value === o.value && 'bg-sunken')}
          >
            {o.icon ?? (o.tone && <span className={cx('w-2.5 h-2.5 rounded-full shrink-0', TONES[o.tone].dot)} />)}
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-[15px]">{o.label}</span>
              {o.hint && <span className="block text-[12.5px] text-muted">{o.hint}</span>}
            </span>
            {value === o.value && <Check size={18} className="text-copper-ink" />}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

// ———————————————————————— Confirmation ————————————————————————
type ConfirmOpts = { title: string; message?: string; confirm?: string; danger?: boolean }
let confirmImpl: ((o: ConfirmOpts) => Promise<boolean>) | null = null
export const confirmDialog = (o: ConfirmOpts) => (confirmImpl ? confirmImpl(o) : Promise.resolve(window.confirm(o.title)))

export function ConfirmHost() {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  useEffect(() => {
    confirmImpl = (o) => new Promise((resolve) => setState({ ...o, resolve }))
    return () => { confirmImpl = null }
  }, [])
  const close = (v: boolean) => { state?.resolve(v); setState(null) }
  return (
    <Sheet open={!!state} onClose={() => close(false)} title={state?.title} size="sm"
      footer={
        <div className="flex gap-2">
          <button className="btn-soft flex-1" onClick={() => close(false)}>Annuler</button>
          <button className={cx('flex-1', state?.danger ? 'btn bg-danger text-white' : 'btn-primary')} onClick={() => close(true)}>{state?.confirm ?? 'Confirmer'}</button>
        </div>
      }>
      {state?.message && <p className="text-muted leading-relaxed">{state.message}</p>}
    </Sheet>
  )
}

// ———————————————————————— Toasts ————————————————————————
export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  return createPortal(
    <div className="fixed z-[60] left-0 right-0 bottom-[calc(var(--nav-h)+var(--safe-bottom)+88px)] lg:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} role="status"
          className={cx('pointer-events-auto max-w-md w-full lg:w-auto flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float animate-fade-up text-[14.5px] font-medium',
            t.tone === 'error' ? 'bg-danger text-white' : 'bg-ink text-bg')}>
          {t.tone === 'success' && <Check size={17} className="shrink-0 text-copper-soft" />}
          <span className="flex-1">{t.message}</span>
          {t.action && <button className="font-bold text-copper-soft" onClick={() => { t.action!.run(); dismissToast(t.id) }}>{t.action.label}</button>}
        </div>
      ))}
    </div>,
    document.body,
  )
}

// ———————————————————————— Divers ————————————————————————
export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-sunken text-faint flex items-center justify-center mb-4">{icon}</div>
      <p className="font-bold text-[16px]">{title}</p>
      {text && <p className="text-muted text-[14px] mt-1 max-w-xs leading-relaxed">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-7', className)}>
      <div className="flex items-center justify-between mb-3 min-h-[32px]">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Sous-menu dépliable : ce qui ne sert pas tous les jours reste replié */
export function Fold({ title, icon, count, defaultOpen = false, children }: {
  title: string; icon?: ReactNode; count?: number; defaultOpen?: boolean; children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="card">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 min-h-[56px] px-4 text-left rounded-2xl">
        {icon && <span className="text-muted shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0 font-semibold text-[15px] truncate">{title}</span>
        {!!count && <span className="tabular text-[12.5px] font-bold text-muted bg-sunken rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center">{count}</span>}
        <ChevronDown size={18} className={cx('text-faint shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-4 pb-4 animate-fade-up">{children}</div>}
    </section>
  )
}

/** Choix de l'étape en un geste : une seule pastille active, toujours visible */
export function StepSwitch<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string; tone: Tone }[]; value: T; onChange: (v: T) => void; label: string
}) {
  // À cinq, deux rangées (3 + 2) : les libellés restent entiers sur téléphone
  const rows = options.length === 5
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 bg-sunken rounded-xl p-1" style={{ gridTemplateColumns: `repeat(${rows ? 6 : options.length}, minmax(0, 1fr))` }}>
      {options.map((o, i) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cx('h-11 px-0.5 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1 transition', rows && (i < 3 ? 'col-span-2' : 'col-span-3'), value === o.value ? 'bg-surface shadow-card text-ink' : 'text-muted hover:text-ink')}>
          {value === o.value && <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', TONES[o.tone].dot)} />}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** Petite fête quand un client accepte ou qu'un site est livré */
export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:70'
  const colors = ['#AA543D', '#D27A60', '#E8C9A8', '#2F6B5E', '#DBD4CA']
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('span')
    piece.style.cssText = `position:absolute;left:50%;top:40%;width:8px;height:12px;border-radius:2px;background:${colors[i % colors.length]}`
    layer.append(piece)
    const angle = Math.random() * Math.PI * 2, reach = 120 + Math.random() * 240
    piece.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach + 260}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' })
  }
  document.body.append(layer)
  setTimeout(() => layer.remove(), 1500)
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block w-5 h-5 rounded-full border-2 border-current border-r-transparent animate-spin', className)} />
}
