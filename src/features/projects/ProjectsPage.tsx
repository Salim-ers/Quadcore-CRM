import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Columns3, FolderKanban, List, Plus, Search, X } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Chips, Empty, Input, cx } from '../../components/ui'
import { Kanban } from '../../components/Kanban'
import { ProjectCard } from './ProjectCard'
import { useProjectStatusFlow } from './flows'
import { NewProjectSheet } from './ProjectForm'
import { useStore } from '../../data/store'
import { PROJECT_STATUSES } from '../../lib/constants'
import { searchMatch } from '../../lib/derive'
import type { ProjectStatus } from '../../lib/types'

/** Regroupements lisibles des 12 étapes de production */
const GROUPS: { value: string; label: string; statuses: ProjectStatus[] }[] = [
  { value: 'encours', label: 'En cours', statuses: ['a_preparer', 'demo_creation', 'demo_prete', 'demo_envoyee', 'attente_validation', 'modifs_demandees', 'demo_validee', 'dev_final', 'pret_livrer'] },
  { value: 'demos', label: 'Démos', statuses: ['a_preparer', 'demo_creation', 'demo_prete', 'demo_envoyee'] },
  { value: 'validation', label: 'Attente validation', statuses: ['attente_validation'] },
  { value: 'retouches', label: 'Retouches', statuses: ['modifs_demandees'] },
  { value: 'final', label: 'Site final', statuses: ['demo_validee', 'dev_final', 'pret_livrer'] },
  { value: 'livres', label: 'Livrés & maintenance', statuses: ['livre', 'maintenance'] },
  { value: 'refuses', label: 'Refusés', statuses: ['demo_refusee'] },
  { value: 'tous', label: 'Tous', statuses: PROJECT_STATUSES.map((s) => s.value) },
]

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const group = params.get('g') || 'encours'
  const [q, setQ] = useState('')
  const [mine, setMine] = useState(false)
  const [view, setView] = useState<'list' | 'kanban'>(() => { try { return (localStorage.getItem('qc-project-view') as 'list') || 'list' } catch { return 'list' } })
  const [creating, setCreating] = useState(false)
  const projects = useStore((s) => s.db.projects)
  const prospects = useStore((s) => s.db.prospects)
  const userId = useStore((s) => s.userId)
  const flow = useProjectStatusFlow()

  const clientName = useMemo(() => new Map(prospects.map((p) => [p.id, p.name])), [prospects])
  const base = useMemo(() => projects.filter((p) => !p.archived && (!mine || p.owner_id === userId) &&
    searchMatch(q, p.name, p.prospect_id ? clientName.get(p.prospect_id) : '', p.demo_url, p.final_url)), [projects, mine, userId, q, clientName])

  const counts = Object.fromEntries(GROUPS.map((g) => [g.value, base.filter((p) => g.statuses.includes(p.status)).length]))
  // filtre précis par statut(s) depuis le tableau de bord : ?s=demo_envoyee,dev_final
  const exact = (params.get('s') ?? '').split(',').filter((x) => PROJECT_STATUSES.some((s) => s.value === x)) as ProjectStatus[]
  const g = exact.length ? { value: '__exact', label: exact.map((x) => PROJECT_STATUSES.find((s) => s.value === x)!.short ?? PROJECT_STATUSES.find((s) => s.value === x)!.label).join(' + '), statuses: exact }
    : GROUPS.find((x) => x.value === group) ?? GROUPS[0]
  const order = Object.fromEntries(PROJECT_STATUSES.map((s, i) => [s.value, i]))
  const list = base.filter((p) => g.statuses.includes(p.status))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || order[a.status] - order[b.status])

  return (
    <>
      <PageHeader title="Projets" subtitle={`${counts.encours} site${counts.encours > 1 ? 's' : ''} en cours · ${counts.livres} livré${counts.livres > 1 ? 's' : ''}`}
        actions={
          <>
            <div className="hidden lg:flex items-center bg-sunken rounded-xl p-1 mr-1">
              {(['list', 'kanban'] as const).map((v) => (
                <button key={v} onClick={() => { setView(v); try { localStorage.setItem('qc-project-view', v) } catch { /* noop */ } }}
                  className={cx('h-9 px-3 rounded-lg text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition', view === v ? 'bg-surface shadow-card text-ink' : 'text-muted')}>
                  {v === 'list' ? <List size={16} /> : <Columns3 size={16} />}{v === 'list' ? 'Liste' : 'Kanban'}
                </button>
              ))}
            </div>
            <button className="btn-soft h-10 min-h-0 px-3" onClick={() => setCreating(true)}><Plus size={17} /><span className="hidden sm:inline">Nouveau projet</span><span className="sm:hidden">Projet</span></button>
          </>
        }>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Projet, client, URL…" className="pl-10 pr-10 bg-surface" type="search" />
            {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
          </div>
          <button onClick={() => setMine((m) => !m)} className={cx('chip h-[46px] px-4', mine && 'chip-on')}>Mes projets</button>
        </div>
        {exact.length > 0 ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="chip chip-on">{g.label}<span className="opacity-70 tabular">{list.length}</span></span>
            <button className="chip" onClick={() => { const n = new URLSearchParams(params); n.delete('s'); setParams(n, { replace: true }) }}><X size={14} />Tous les filtres</button>
          </div>
        ) : (
          <Chips className={cx('mt-3', view === 'kanban' && 'lg:hidden')} value={group}
            onChange={(v) => { const n = new URLSearchParams(params); if (v === 'encours') n.delete('g'); else n.set('g', v); setParams(n, { replace: true }) }}
            options={GROUPS.map((x) => ({ value: x.value, label: x.label, count: counts[x.value] }))} />
        )}
      </PageHeader>

      <Page className="pt-3">
        {view === 'kanban' && (
          <div className="hidden lg:block">
            <Kanban columns={PROJECT_STATUSES} items={base} statusOf={(p) => p.status} onMove={(p, s) => flow.change(p, s)}
              renderCard={(p) => <ProjectCard compact project={p} />} />
          </div>
        )}
        <div className={cx(view === 'kanban' && 'lg:hidden')}>
          {list.length === 0 ? (
            <Empty icon={<FolderKanban size={26} />} title="Aucun projet ici" text="Les projets se créent depuis une fiche prospect, ou directement ici."
              action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={18} />Nouveau projet</button>} />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => <ProjectCard key={p.id} project={p} onStatus={flow.openPicker} />)}
            </div>
          )}
        </div>
      </Page>
      <NewProjectSheet open={creating} onClose={() => setCreating(false)} />
      {flow.ui}
    </>
  )
}
