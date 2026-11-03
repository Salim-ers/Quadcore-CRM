import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { CATEGORIES, PRIORITIES, SERVICES, SOURCES } from '../../lib/constants'
import type { Prospect } from '../../lib/types'
import { createProject, projectDraftFrom, updateProspect } from '../../data/actions'
import { useStore } from '../../data/store'

const FIELDS = [
  'name', 'category', 'contact_name', 'phone', 'email', 'address', 'city', 'instagram_handle', 'facebook_url', 'tiktok_url',
  'linkedin_url', 'website_url', 'source', 'service', 'notes', 'owner_id', 'priority', 'next_follow_up', 'lost_reason',
] as const
type Draft = Pick<Prospect, (typeof FIELDS)[number]>

/** Fiche complète — seuls les champs réellement modifiés sont enregistrés (pas d'écrasement entre collaborateurs). */
export function ProspectForm({ prospect, open, onClose }: { prospect: Prospect; open: boolean; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => pick(prospect))
  const [more, setMore] = useState(false)
  // une fois le site créé, c'est lui qui porte le lien
  const hasSite = useStore((s) => s.db.projects.some((x) => x.prospect_id === prospect.id && !x.archived))
  useEffect(() => { if (open) { setD(pick(prospect)); setMore(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  const txt = (k: keyof Draft) => ({
    value: (d[k] as string | null) ?? '',
    onChange: (e: { target: { value: string } }) => set(k, (e.target.value === '' ? null : e.target.value) as never),
  })

  async function save() {
    if (!d.name?.trim()) return
    const patch: Partial<Prospect> = {}
    for (const k of FIELDS) {
      const v = typeof d[k] === 'string' ? ((d[k] as string).trim() || null) : d[k]
      if (v !== prospect[k]) (patch as Record<string, unknown>)[k] = v
    }
    if (Object.keys(patch).length) await updateProspect(prospect.id, patch)
    // Le lien ajouté après coup crée le site, comme à la création de la fiche
    if (patch.website_url && !hasSite) await createProject(projectDraftFrom({ ...prospect, ...patch }))
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Modifier la fiche"
      footer={<div className="flex gap-2"><button className="btn-soft flex-1" onClick={onClose}>Annuler</button><button className="btn-primary flex-[1.4]" disabled={!d.name?.trim()} onClick={save}>Enregistrer</button></div>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom du commerce *" className="sm:col-span-2"><Input {...txt('name')} /></Field>
          {!hasSite && <Field label="Lien du site" className="sm:col-span-2"><Input inputMode="url" autoCapitalize="none" autoCorrect="off" {...txt('website_url')} placeholder="https://…vercel.app" /></Field>}
          <Field label="Nom du contact"><Input {...txt('contact_name')} autoComplete="off" /></Field>
          <Field label="Téléphone"><Input type="tel" inputMode="tel" {...txt('phone')} /></Field>
          <Field label="E-mail"><Input type="email" inputMode="email" autoCapitalize="none" {...txt('email')} /></Field>
          <Field label="Ville"><Input {...txt('city')} autoComplete="address-level2" /></Field>
          <Field label="Instagram" className="sm:col-span-2"><Input autoCapitalize="none" autoCorrect="off" {...txt('instagram_handle')} placeholder="@commerce" /></Field>
          {prospect.status === 'perdu' && <Field label="Motif du refus" className="sm:col-span-2"><Input {...txt('lost_reason')} /></Field>}
          <Field label="Notes" className="sm:col-span-2"><TextArea rows={3} {...txt('notes')} /></Field>
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex items-center gap-1.5 text-[14px] font-semibold text-muted self-start min-h-[40px]">
          <ChevronDown size={17} className={cx('transition', more && 'rotate-180')} /> Plus de détails
        </button>

        {more && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
            <div className="sm:col-span-2">
              <span className="field-label">Catégorie</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => set('category', d.category === c.value ? null : c.value)} className={cx('chip h-10', d.category === c.value && 'chip-on')}>{c.label}</button>
                ))}
              </div>
            </div>
            <Field label="Adresse" className="sm:col-span-2"><Input {...txt('address')} autoComplete="street-address" /></Field>
            <Field label="Responsable"><OwnerButton value={d.owner_id} onChange={(v) => set('owner_id', v)} /></Field>
            <Field label="Prochaine relance"><Input type="date" {...txt('next_follow_up')} /></Field>
            <Field label="Facebook"><Input type="url" inputMode="url" autoCapitalize="none" {...txt('facebook_url')} placeholder="https://facebook.com/…" /></Field>
            <Field label="TikTok"><Input type="url" inputMode="url" autoCapitalize="none" {...txt('tiktok_url')} placeholder="https://tiktok.com/@…" /></Field>
            <Field label="LinkedIn"><Input type="url" inputMode="url" autoCapitalize="none" {...txt('linkedin_url')} placeholder="https://linkedin.com/…" /></Field>
            <Field label="Source">
              <Select {...txt('source')}><option value="">—</option>{[...new Set([...SOURCES, d.source].filter(Boolean))].map((s) => <option key={s!}>{s}</option>)}</Select>
            </Field>
            <Field label="Service proposé">
              <Select {...txt('service')}><option value="">—</option>{[...new Set([...SERVICES, d.service].filter(Boolean))].map((s) => <option key={s!}>{s}</option>)}</Select>
            </Field>
            <div className="sm:col-span-2">
              <span className="field-label">Priorité</span>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => <button key={p.value} type="button" onClick={() => set('priority', p.value)} className={cx('chip justify-center h-11', d.priority === p.value && 'chip-on')}>{p.label}</button>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function pick(p: Prospect): Draft {
  return Object.fromEntries(FIELDS.map((k) => [k, p[k]])) as Draft
}
