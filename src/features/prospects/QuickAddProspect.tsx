import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, AtSign, Globe, Phone, MapPin } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { CategoryIcon, OwnerButton } from '../../components/bits'
import { CATEGORIES, PRIORITIES, SERVICES, SOURCES } from '../../lib/constants'
import type { Category, Priority, UUID } from '../../lib/types'
import { createProspect } from '../../data/actions'
import { normalizeUrl } from '../../lib/links'
import { toast, useStore } from '../../data/store'

const blank = () => ({
  name: '', website_url: '', instagram: '', phone: '', city: '', category: null as Category | null,
  contact_name: '', email: '', source: '', service: '', priority: 'normale' as Priority, notes: '',
})

/** Ajout express : seul le nom est obligatoire, le reste se complète plus tard. */
export function QuickAddProspect({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState(blank)
  const [owner, setOwner] = useState<UUID | null>(null)
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const userId = useStore((s) => s.userId)
  const nameRef = useRef<HTMLInputElement>(null)
  const nav = useNavigate()

  useEffect(() => {
    if (open) {
      setF(blank()); setOwner(userId); setMore(false)
      setTimeout(() => nameRef.current?.focus(), 120)
    }
  }, [open, userId])

  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => setF((s) => ({ ...s, [k]: v }))
  const dup = useStore((s) => {
    const n = f.name.trim().toLowerCase()
    return n.length >= 3 ? s.db.prospects.find((p) => p.name.toLowerCase() === n) : undefined
  })

  async function submit() {
    if (!f.name.trim()) { nameRef.current?.focus(); return }
    setSaving(true)
    const ig = f.instagram.trim()
    const row = await createProspect({
      name: f.name,
      website_url: normalizeUrl(f.website_url),
      instagram_handle: ig || null,
      phone: f.phone.trim() || null,
      city: f.city.trim() || null,
      category: f.category,
      contact_name: f.contact_name.trim() || null,
      email: f.email.trim() || null,
      source: f.source || (ig ? 'Instagram' : null),
      service: f.service || null,
      priority: f.priority,
      notes: f.notes.trim() || null,
      owner_id: owner,
    })
    setSaving(false)
    if (!row) return
    onClose()
    toast(`${row.name} ajouté aux prospects`, 'success', { label: 'Ouvrir', run: () => nav(`/prospects/${row.id}`) })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouveau prospect" size="sm"
      footer={<button className="btn-primary w-full" disabled={saving || !f.name.trim()} onClick={submit}>Ajouter</button>}>
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex flex-col gap-3">
        <div>
          <Input ref={nameRef} aria-label="Nom du commerce" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Nom du commerce" autoComplete="off" enterKeyHint="done" />
          {dup && <span className="block mt-1.5 text-[12.5px] font-semibold text-copper-ink">« {dup.name} » existe déjà.</span>}
        </div>
        <label className="relative block">
          <span className="sr-only">Lien du site</span>
          <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-10" inputMode="url" value={f.website_url} onChange={(e) => set('website_url', e.target.value)} placeholder="Lien du site" autoCapitalize="none" autoCorrect="off" autoComplete="off" />
        </label>
        <label className="relative block">
          <span className="sr-only">Téléphone</span>
          <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-10" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Téléphone" />
        </label>
        <label className="relative block">
          <span className="sr-only">Ville</span>
          <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-10" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Ville" />
        </label>
        <label className="relative block">
          <span className="sr-only">Instagram</span>
          <AtSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input className="pl-10" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="Instagram" autoCapitalize="none" autoCorrect="off" />
        </label>

        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex items-center gap-1.5 text-[14px] font-semibold text-muted self-start min-h-[40px]">
          <ChevronDown size={17} className={cx('transition', more && 'rotate-180')} /> Plus de détails
        </button>

        {more && (
          <div className="flex flex-col gap-4 animate-fade-up">
            <div>
              <span className="field-label">Catégorie</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => set('category', f.category === c.value ? null : c.value)}
                    className={cx('chip h-10', f.category === c.value && 'chip-on')}>
                    <CategoryIcon category={c.value} size={16} />{c.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Nom du contact"><Input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} autoComplete="off" /></Field>
            <Field label="E-mail"><Input type="email" inputMode="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
            <Field label="Responsable"><OwnerButton value={owner} onChange={setOwner} /></Field>
            <Field label="Source">
              <Select value={f.source} onChange={(e) => set('source', e.target.value)}>
                <option value="">—</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Service proposé">
              <Select value={f.service} onChange={(e) => set('service', e.target.value)}>
                <option value="">—</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <div>
              <span className="field-label">Priorité</span>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button" onClick={() => set('priority', p.value)} className={cx('chip justify-center h-11', f.priority === p.value && 'chip-on')}>{p.label}</button>
                ))}
              </div>
            </div>
            <Field label="Notes"><TextArea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ce qui a attiré votre attention…" /></Field>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
