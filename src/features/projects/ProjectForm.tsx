import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { BILLING, PROJECT_TYPES } from '../../lib/constants'
import type { Project, ProjectType, UUID } from '../../lib/types'
import { createProject, projectDraftFrom, updateProject } from '../../data/actions'
import { parsePrice } from '../../lib/derive'
import { normalizeUrl } from '../../lib/links'
import { OfferPrice, type Deal } from '../documents/OfferPrice'
import { useStore } from '../../data/store'

export function NewProjectSheet({ open, onClose, prospectId }: { open: boolean; onClose: () => void; prospectId?: UUID }) {
  const prospects = useStore((s) => s.db.prospects)
  const nav = useNavigate()
  const [client, setClient] = useState<string>('')
  const [name, setName] = useState('')
  const [link, setLink] = useState('')
  const [deal, setDeal] = useState<Deal>({ offerId: '', price: '' })
  const [touched, setTouched] = useState(false)
  const price = parsePrice(deal.price)

  const sorted = useMemo(() => prospects.filter((p) => !p.archived).sort((a, b) =>
    (a.status === 'gagne' ? 0 : 1) - (b.status === 'gagne' ? 0 : 1) || a.name.localeCompare(b.name, 'fr')), [prospects])

  useEffect(() => {
    if (!open) return
    setClient(prospectId ?? ''); setName(''); setLink(''); setDeal({ offerId: '', price: '' }); setTouched(false)
  }, [open, prospectId])

  useEffect(() => {
    // pré-remplit depuis la fiche du client tant que le nom n'a pas été modifié à la main
    const p = prospects.find((x) => x.id === client)
    if (p && !touched) setName(projectDraftFrom(p).name!)
  }, [client]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const p = prospects.find((x) => x.id === client)
    const base = p ? projectDraftFrom(p) : {}
    const pr = await createProject({ ...base, name, prospect_id: client || null, demo_url: normalizeUrl(link) ?? base.demo_url ?? null, price_proposed: price })
    if (pr) { onClose(); nav(`/projets/${pr.id}`) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouveau site" size="sm"
      footer={<button className="btn-primary w-full" disabled={!name.trim() || Number.isNaN(price)} onClick={save}>Ajouter le site</button>}>
      <div className="flex flex-col gap-4">
        <Field label="Client">
          <Select value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">Sans client</option>
            {sorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Nom du site *"><Input value={name} onChange={(e) => { setName(e.target.value); setTouched(true) }} placeholder="Ex. Site Coffee Concept" /></Field>
        <Field label="Lien du site"><Input inputMode="url" autoCapitalize="none" autoCorrect="off" autoComplete="off" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…vercel.app" /></Field>
        <OfferPrice value={deal} onChange={setDeal} optional />
        <p className="text-[13px] text-muted -mt-1">Il arrive dans les sites livrés. Vous pourrez le passer en cours.</p>
      </div>
    </Sheet>
  )
}

const FIELDS = ['name', 'type', 'description', 'owner_id', 'start_date', 'due_date', 'demo_url', 'final_url', 'github_url', 'price_proposed', 'price_accepted', 'billing_status', 'prospect_id'] as const
type Draft = Pick<Project, (typeof FIELDS)[number]>

export function ProjectEditSheet({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const prospects = useStore((s) => s.db.prospects)
  const [d, setD] = useState<Draft>(() => pick(project))
  const [more, setMore] = useState(false)
  useEffect(() => { if (open) { setD(pick(project)); setMore(false) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  const txt = (k: keyof Draft) => ({ value: (d[k] as string | null) ?? '', onChange: (e: { target: { value: string } }) => set(k, (e.target.value || null) as never) })
  const num = (k: 'price_proposed' | 'price_accepted') => ({
    value: d[k] === null || d[k] === undefined ? '' : String(d[k]),
    onChange: (e: { target: { value: string } }) => { const v = e.target.value.replace(',', '.'); set(k, v === '' ? null : Number(v)) },
  })

  async function save() {
    if (!d.name?.trim()) return
    const patch: Partial<Project> = {}
    for (const k of FIELDS) {
      let v = d[k] as unknown
      if (typeof v === 'string') v = v.trim() || null
      if (typeof v === 'number' && Number.isNaN(v)) v = null
      if (v !== project[k]) (patch as Record<string, unknown>)[k] = v
    }
    if (Object.keys(patch).length) await updateProject(project.id, patch)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Modifier le site"
      footer={<div className="flex gap-2"><button className="btn-soft flex-1" onClick={onClose}>Annuler</button><button className="btn-primary flex-[1.4]" disabled={!d.name?.trim()} onClick={save}>Enregistrer</button></div>}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom du site *" className="sm:col-span-2"><Input {...txt('name')} /></Field>
          <Field label="Client">
            <Select {...txt('prospect_id')}><option value="">Aucun</option>{prospects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          </Field>
          <Field label="Livraison prévue"><Input type="date" {...txt('due_date')} /></Field>
          <Field label="Lien de la démo"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://…vercel.app" {...txt('demo_url')} /></Field>
          <Field label="Lien du site"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://" {...txt('final_url')} /></Field>
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex items-center gap-1.5 text-[14px] font-semibold text-muted self-start min-h-[40px]">
          <ChevronDown size={17} className={cx('transition', more && 'rotate-180')} /> Plus de détails
        </button>

        {more && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
            <Field label="Type de site">
              <Select value={d.type} onChange={(e) => set('type', e.target.value as ProjectType)}>{PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
            </Field>
            <Field label="Responsable"><OwnerButton value={d.owner_id} onChange={(v) => set('owner_id', v)} /></Field>
            <Field label="Démarrage"><Input type="date" {...txt('start_date')} /></Field>
            <Field label="Dépôt GitHub"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://github.com/…" {...txt('github_url')} /></Field>
            <Field label="Besoin du client" className="sm:col-span-2"><TextArea rows={3} {...txt('description')} /></Field>
            <Field label="Prix proposé (€ TTC)"><Input inputMode="decimal" placeholder="700" {...num('price_proposed')} /></Field>
            <Field label="Prix accepté (€ TTC)"><Input inputMode="decimal" placeholder="—" {...num('price_accepted')} /></Field>
            <div className="sm:col-span-2">
              <span className="field-label">Facturation</span>
              <div className="flex flex-wrap gap-2">
                {BILLING.map((b) => <button key={b.value} type="button" onClick={() => set('billing_status', b.value)} className={cx('chip h-10', d.billing_status === b.value && 'chip-on')}>{b.label}</button>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function pick(p: Project): Draft { return Object.fromEntries(FIELDS.map((k) => [k, p[k]])) as Draft }
