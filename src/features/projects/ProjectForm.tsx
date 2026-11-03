import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input, Select, Sheet, TextArea, cx } from '../../components/ui'
import { OwnerButton } from '../../components/bits'
import { BILLING, PROJECT_TYPES } from '../../lib/constants'
import type { Project, ProjectType, UUID } from '../../lib/types'
import { createProject, projectDraftFrom, updateProject } from '../../data/actions'
import { useStore } from '../../data/store'

export function NewProjectSheet({ open, onClose, prospectId }: { open: boolean; onClose: () => void; prospectId?: UUID }) {
  const prospects = useStore((s) => s.db.prospects)
  const userId = useStore((s) => s.userId)
  const nav = useNavigate()
  const [client, setClient] = useState<string>('')
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('vitrine')
  const [owner, setOwner] = useState<UUID | null>(null)
  const [touched, setTouched] = useState(false)

  const sorted = useMemo(() => prospects.filter((p) => !p.archived).sort((a, b) =>
    (a.status === 'gagne' ? 0 : 1) - (b.status === 'gagne' ? 0 : 1) || a.name.localeCompare(b.name, 'fr')), [prospects])

  useEffect(() => {
    if (!open) return
    setClient(prospectId ?? ''); setName(''); setType('vitrine'); setOwner(userId); setTouched(false)
  }, [open, prospectId, userId])

  useEffect(() => {
    // pré-remplit depuis la fiche du client tant que le nom n'a pas été modifié à la main
    const p = prospects.find((x) => x.id === client)
    if (p && !touched) { const d = projectDraftFrom(p); setName(d.name!); setType(d.type!); if (p.owner_id) setOwner(p.owner_id) }
  }, [client]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const p = prospects.find((x) => x.id === client)
    const base = p ? projectDraftFrom(p) : {}
    const pr = await createProject({ ...base, name, type, owner_id: owner, prospect_id: client || null })
    if (pr) { onClose(); nav(`/projets/${pr.id}`) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nouveau projet"
      footer={<button className="btn-primary w-full" disabled={!name.trim()} onClick={save}>Créer le projet</button>}>
      <div className="flex flex-col gap-4">
        <Field label="Client associé" hint="Les informations du prospect sont reprises automatiquement">
          <Select value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">Sans client (projet interne)</option>
            {sorted.map((p) => <option key={p.id} value={p.id}>{p.name}{p.status === 'gagne' ? ' — gagné' : ''}</option>)}
          </Select>
        </Field>
        <Field label="Nom du projet *"><Input value={name} onChange={(e) => { setName(e.target.value); setTouched(true) }} placeholder="Ex. Site Coffee Concept" /></Field>
        <div>
          <span className="field-label">Type de site</span>
          <div className="flex flex-wrap gap-2">
            {PROJECT_TYPES.map((t) => <button key={t.value} type="button" onClick={() => setType(t.value)} className={cx('chip h-10', type === t.value && 'chip-on')}>{t.label}</button>)}
          </div>
        </div>
        <Field label="Responsable"><OwnerButton value={owner} onChange={setOwner} /></Field>
      </div>
    </Sheet>
  )
}

const FIELDS = ['name', 'type', 'description', 'owner_id', 'start_date', 'due_date', 'demo_url', 'final_url', 'github_url', 'price_proposed', 'price_accepted', 'billing_status', 'prospect_id'] as const
type Draft = Pick<Project, (typeof FIELDS)[number]>

export function ProjectEditSheet({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const prospects = useStore((s) => s.db.prospects)
  const [d, setD] = useState<Draft>(() => pick(project))
  useEffect(() => { if (open) setD(pick(project)) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
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
    <Sheet open={open} onClose={onClose} title="Modifier le projet" size="lg"
      footer={<div className="flex gap-2"><button className="btn-soft flex-1" onClick={onClose}>Annuler</button><button className="btn-primary flex-[1.4]" disabled={!d.name?.trim()} onClick={save}>Enregistrer</button></div>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nom du projet *" className="sm:col-span-2"><Input {...txt('name')} /></Field>
        <Field label="Client associé">
          <Select {...txt('prospect_id')}><option value="">Aucun</option>{prospects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </Field>
        <Field label="Type de site">
          <Select value={d.type} onChange={(e) => set('type', e.target.value as ProjectType)}>{PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
        </Field>
        <Field label="Description du besoin" className="sm:col-span-2"><TextArea rows={3} {...txt('description')} /></Field>
        <Field label="Responsable"><OwnerButton value={d.owner_id} onChange={(v) => set('owner_id', v)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Démarrage"><Input type="date" {...txt('start_date')} /></Field>
          <Field label="Livraison prévue"><Input type="date" {...txt('due_date')} /></Field>
        </div>
        <Field label="URL de la démo"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://…vercel.app" {...txt('demo_url')} /></Field>
        <Field label="URL du site définitif"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://" {...txt('final_url')} /></Field>
        <Field label="Dépôt GitHub (facultatif)" className="sm:col-span-2"><Input type="url" inputMode="url" autoCapitalize="none" placeholder="https://github.com/…" {...txt('github_url')} /></Field>
        <Field label="Prix proposé (€ TTC)"><Input inputMode="decimal" placeholder="700" {...num('price_proposed')} /></Field>
        <Field label="Prix accepté (€ TTC)"><Input inputMode="decimal" placeholder="—" {...num('price_accepted')} /></Field>
        <Field label="Facturation" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {BILLING.map((b) => <button key={b.value} type="button" onClick={() => set('billing_status', b.value)} className={cx('chip h-10', d.billing_status === b.value && 'chip-on')}>{b.label}</button>)}
          </div>
        </Field>
      </div>
    </Sheet>
  )
}

function pick(p: Project): Draft { return Object.fromEntries(FIELDS.map((k) => [k, p[k]])) as Draft }
