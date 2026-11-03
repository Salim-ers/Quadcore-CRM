import { useState, type ReactNode } from 'react'
import {
  Coffee, Croissant, Globe, Hammer, Camera, Mail, MapPin, MessageCircle, MessagesSquare, Phone, Scissors, Shapes, ShoppingBag, UtensilsCrossed, BellPlus,
} from 'lucide-react'
import type { Category, Channel, Profile, UUID } from '../lib/types'
import { mailLink, normalizeUrl, telLink, whatsappLink } from '../lib/links'
import { useProfiles } from '../data/store'
import { fullName } from '../lib/derive'
import { Avatar, Picker, cx } from './ui'
import { dueLabel, dueTone } from '../lib/dates'
import { CalendarClock } from 'lucide-react'

const CAT_ICONS: Record<Category, typeof Coffee> = {
  restaurant: UtensilsCrossed, cafe: Coffee, boulangerie: Croissant, barber: Scissors, artisan: Hammer, commerce: ShoppingBag, autre: Shapes,
}
export function CategoryIcon({ category, size = 18 }: { category: Category | null; size?: number }) {
  const I = CAT_ICONS[category ?? 'autre']
  return <I size={size} strokeWidth={1.9} />
}

const CHANNEL_ICONS: Record<Channel, typeof Phone> = {
  telephone: Phone, whatsapp: MessageCircle, email: Mail, instagram: Camera, sur_place: MapPin, autre: MessagesSquare,
}
export function ChannelIcon({ channel, size = 15 }: { channel: Channel; size?: number }) {
  const I = CHANNEL_ICONS[channel]
  return <I size={size} strokeWidth={1.9} />
}

/** Vignette du commerce : logo s'il existe, sinon icône de catégorie */
export function ProspectThumb({ name, category, logoUrl, size = 44 }: { name: string; category: Category | null; logoUrl?: string | null; size?: number }) {
  return (
    <span className="shrink-0 rounded-xl bg-sunken border border-line text-muted flex items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
      {logoUrl ? <img src={logoUrl} alt={name} className="w-full h-full object-cover" /> : <CategoryIcon category={category} size={size * 0.42} />}
    </span>
  )
}

/** Actions de contact via liens natifs (tel:, wa.me, mailto:, instagram.com) */
export function ContactActions({ phone, email, instagramUrl, website, onFollowUp, compact }: {
  phone: string | null; email: string | null; instagramUrl: string | null; website: string | null; onFollowUp?: () => void; compact?: boolean
}) {
  const items: { label: string; icon: ReactNode; href: string | null; onClick?: () => void; external?: boolean }[] = [
    { label: 'Appeler', icon: <Phone size={20} />, href: telLink(phone) },
    { label: 'WhatsApp', icon: <MessageCircle size={20} />, href: whatsappLink(phone), external: true },
    { label: 'Instagram', icon: <Camera size={20} />, href: instagramUrl, external: true },
    { label: 'E-mail', icon: <Mail size={20} />, href: mailLink(email) },
    { label: 'Site', icon: <Globe size={20} />, href: normalizeUrl(website), external: true },
  ]
  if (onFollowUp) items.push({ label: 'Relance', icon: <BellPlus size={20} />, href: null, onClick: onFollowUp })
  return (
    <div className={cx('grid gap-2', compact ? 'grid-cols-6' : 'grid-cols-3 sm:grid-cols-6')}>
      {items.map((it) => {
        const disabled = !it.href && !it.onClick
        const cls = cx('flex flex-col items-center justify-center gap-1.5 min-h-[64px] rounded-2xl border text-[12px] font-semibold transition active:scale-[.97]',
          disabled ? 'border-dashed border-line text-faint/70 pointer-events-none' : 'border-line bg-surface text-ink hover:border-copper/40',
          it.label === 'Relance' && !disabled && 'bg-copper/8 border-copper/25 text-copper-ink')
        return it.href ? (
          <a key={it.label} href={it.href} className={cls} {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{it.icon}{it.label}</a>
        ) : (
          <button key={it.label} type="button" onClick={it.onClick} className={cls} disabled={disabled} aria-disabled={disabled}>{it.icon}{it.label}</button>
        )
      })}
    </div>
  )
}

/** Sélecteur de collaborateur responsable (feuille au pouce) */
export function OwnerButton({ value, onChange, label = 'Responsable', allowNone = true, className }: {
  value: UUID | null; onChange: (id: UUID | null) => void; label?: string; allowNone?: boolean; className?: string
}) {
  const profiles = useProfiles().filter((p) => p.active)
  const [open, setOpen] = useState(false)
  const cur = profiles.find((p) => p.id === value)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cx('input flex items-center gap-2.5 text-left', className)}>
        {cur ? <Avatar profile={cur} size={26} /> : <span className="w-[26px] h-[26px] rounded-full border border-dashed border-faint" />}
        <span className={cx('flex-1 truncate', !cur && 'text-faint')}>{cur ? fullName(cur) : 'Non attribué'}</span>
      </button>
      <Picker
        open={open} onClose={() => setOpen(false)} title={label} value={value ?? '__none'}
        options={[
          ...profiles.map((p: Profile) => ({ value: p.id, label: fullName(p), hint: p.role === 'admin' ? 'Administrateur' : 'Collaborateur', icon: <Avatar profile={p} size={30} /> })),
          ...(allowNone ? [{ value: '__none', label: 'Non attribué', icon: <span className="w-[30px] h-[30px] rounded-full border border-dashed border-faint" /> }] : []),
        ]}
        onPick={(v) => onChange(v === '__none' ? null : v)}
      />
    </>
  )
}

export function DueChip({ date, done, className }: { date: string | null; done?: boolean; className?: string }) {
  if (!date) return null
  const t = done ? 'none' : dueTone(date)
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12.5px] font-semibold whitespace-nowrap',
      t === 'late' ? 'text-danger' : t === 'today' ? 'text-copper-ink' : 'text-muted', className)}>
      <CalendarClock size={13.5} />{dueLabel(date)}
    </span>
  )
}

export function MoneyLabel({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-faint">—</span>
  return <span className="tabular">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)}</span>
}
