import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, AtSign, Phone, MapPin } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { CategoryIcon, OwnerButton } from '../../components/bits'
import { CATEGORIES, PRIORITIES, SERVICES, SOURCES } from '../../lib/constants'
import type { Category, Priority, UUID } from '../../lib/types'
import { createProspect } from '../../data/actions'
import { toast, useStore } from '../../data/store'

const blank = () => ({
  name: '', instagram: '', phone: '', city: '', category: null as Category | null,
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

  async function submit(openAfter: boolean) {
    if (!f.name.trim()) { nameRef.current?.focus(); return }
    setSaving(true)
    const ig = f.instagram.trim()
    const row = await createProspect({
      name: f.name,
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
    if (openAfter) nav(`/prospects/${row.id}`)
    else toast(`${row.name} ajouté aux prospects`, 'success', { label: 'Ouvrir', run: () => nav(`/prospects/${row.id}`) })
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouveau prospect"
      footer={
        <div className="flex gap-2">
          <button className="btn-soft flex-1" disabled={saving || !f.name.trim()} onClick={() => submit(true)}>Ajouter et ouvrir</button>
          <button className="btn-primary flex-[1.3]" disabled={saving || !f.name.trim()} onClick={() => submit(false)}>Ajouter</button>
        </div>
      }>
      <form onSubmit={(e) => { e.preventDefault(); submit(false) }} className="flex flex-col gap-4">
        <Field label="Nom du commerce *">
          <Input ref={nameRef} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Coffee Concept" autoComplete="off" enterKeyHint="done" />
          {dup && <span className="block mt-1.5 text-[12.5px] font-semibold text-copper-ink">Un prospect « {dup.name} » existe déjà.</span>}
        </Field>

        <div>
          <span className="field-label">Catégorie</span>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => set('category', f.category === c.value ? null : c.value)}
                className={cx('chip h-10', f.category === c.value && 'chip-on')}>
                <CategoryIcon category={c.value} size={16} />{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="relative block">
            <span className="sr-only">Instagram</span>
            <AtSign size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input className="pl-10" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@identifiant ou lien Instagram" autoCapitalize="none" autoCorrect="off" />
          </label>
          <label className="relative block">
            <span className="sr-only">Téléphone</span>
            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input className="pl-10" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Téléphone" />
          </label>
          <label className="relative block sm:col-span-2">
            <span className="sr-only">Ville</span>
            <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input className="pl-10" value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Ville" />
          </label>
        </div>

        <Field label="Responsable"><OwnerButton value={owner} onChange={setOwner} /></Field>

        <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1.5 text-[14px] font-semibold text-muted self-start min-h-[40px]">
          <ChevronDown size={17} className={cx('transition', more && 'rotate-180')} /> {more ? 'Moins de détails' : 'Plus de détails'}
        </button>

        {more && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
            <Field label="Nom du contact"><Input value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} autoComplete="off" /></Field>
            <Field label="E-mail"><Input type="email" inputMode="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
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
            <Field label="Priorité" className="sm:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button" onClick={() => set('priority', p.value)} className={cx('chip justify-center h-11', f.priority === p.value && 'chip-on')}>{p.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Notes internes" className="sm:col-span-2"><TextArea value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ce qui a attiré votre attention…" /></Field>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  )
}
