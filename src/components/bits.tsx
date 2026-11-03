import { useState, type ReactNode } from 'react'
import {
  Coffee, Copy, Croissant, ExternalLink, Globe, Hammer, Camera, Mail, MapPin, MessageCircle, MessagesSquare, Phone, Plus, Scissors, Shapes, ShoppingBag, UtensilsCrossed,
} from 'lucide-react'
import type { Category, Channel, Profile, UUID } from '../lib/types'
import { mailLink, normalizeUrl, prettyUrl, telLink, whatsappLink } from '../lib/links'
import { toast, useProfiles } from '../data/store'
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

/** Actions de contact via liens natifs (tel:, wa.me, mailto:, instagram.com) — seules celles qu'on peut utiliser sont montrées */
export function ContactActions({ phone, email, instagramUrl, website }: {
  phone: string | null; email: string | null; instagramUrl: string | null; website: string | null
}) {
  const items: { label: string; icon: ReactNode; href: string | null; external?: boolean }[] = [
    { label: 'Appeler', icon: <Phone size={20} />, href: telLink(phone) },
    { label: 'WhatsApp', icon: <MessageCircle size={20} />, href: whatsappLink(phone), external: true },
    { label: 'Instagram', icon: <Camera size={20} />, href: instagramUrl, external: true },
    { label: 'E-mail', icon: <Mail size={20} />, href: mailLink(email) },
    { label: 'Site', icon: <Globe size={20} />, href: normalizeUrl(website), external: true },
  ]
  const usable = items.filter((it) => it.href)
  if (!usable.length) return null
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${usable.length}, minmax(0, 1fr))` }}>
      {usable.map((it) => (
        <a key={it.label} href={it.href!} {...(it.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[64px] rounded-2xl border border-line bg-surface text-ink text-[12px] font-semibold transition hover:border-copper/40 active:scale-[.97]">
          {it.icon}{it.label}
        </a>
      ))}
    </div>
  )
}

/** Un lien de site : l'ouvrir, le copier, ou l'ajouter s'il manque */
export function UrlTile({ icon, label, url, onAdd }: { icon: ReactNode; label: string; url: string | null; onAdd: () => void }) {
  const href = normalizeUrl(url)
  if (!href) {
    return (
      <button onClick={onAdd} className="flex items-center gap-3 min-h-[56px] px-3.5 rounded-2xl border border-dashed border-line text-faint text-[14px] font-semibold hover:text-muted">
        {icon}<span className="flex-1 text-left">{label}</span><Plus size={16} />
      </button>
    )
  }
  return (
    <div className="card flex items-center gap-3 min-h-[56px] pl-3.5 pr-1.5">
      <span className="text-copper-ink">{icon}</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
        <p className="text-[12px] text-muted font-semibold">{label}</p>
        <p className="text-[14px] font-semibold truncate">{prettyUrl(href)}</p>
      </a>
      <button className="icon-btn w-10 h-10 text-muted" aria-label={`Copier le lien ${label}`}
        onClick={async () => { try { await navigator.clipboard.writeText(href); toast('Lien copié') } catch { toast('Copie impossible', 'error') } }}><Copy size={16} /></button>
      <a href={href} target="_blank" rel="noopener noreferrer" className="icon-btn w-10 h-10 text-muted" aria-label={`Ouvrir ${label}`}><ExternalLink size={16} /></a>
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
