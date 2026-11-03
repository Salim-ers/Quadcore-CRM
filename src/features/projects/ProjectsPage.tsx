import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Globe, Plus, Search, X } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Chips, Empty, Input } from '../../components/ui'
import { ProjectCard } from './ProjectCard'
import { NewProjectSheet } from './ProjectForm'
import { useStore } from '../../data/store'
import { siteStep, type SiteStep } from '../../lib/constants'
import { searchMatch } from '../../lib/derive'

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const step: SiteStep = params.get('g') === 'livres' ? 'livre' : 'en_cours'
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const projects = useStore((s) => s.db.projects)
  const prospects = useStore((s) => s.db.prospects)

  const clientName = useMemo(() => new Map(prospects.map((p) => [p.id, p.name])), [prospects])
  const found = useMemo(() => projects.filter((p) => !p.archived &&
    searchMatch(q, p.name, p.prospect_id ? clientName.get(p.prospect_id) : '', p.demo_url, p.final_url)), [projects, q, clientName])
  const count = (s: SiteStep) => found.filter((p) => siteStep(p.status) === s).length
  const list = useMemo(() => found.filter((p) => siteStep(p.status) === step)
    .sort((a, b) => (step === 'en_cours' ? (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') : 0) || (a.updated_at < b.updated_at ? 1 : -1)), [found, step])

  return (
    <>
      <PageHeader title="Sites"
        actions={<button className="btn-soft h-10 min-h-0 px-3" onClick={() => setCreating(true)}><Plus size={17} />Site</button>}>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Site ou client…" className="pl-10 pr-10 bg-surface" type="search" />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
        </div>
        <Chips className="mt-3" value={step} onChange={(v) => { const n = new URLSearchParams(params); if (v === 'livre') n.set('g', 'livres'); else n.delete('g'); setParams(n, { replace: true }) }}
          options={[{ value: 'en_cours' as const, label: 'En cours', count: count('en_cours') }, { value: 'livre' as const, label: 'Livrés', count: count('livre') }]} />
      </PageHeader>

      <Page className="pt-3">
        {list.length === 0 ? (
          <Empty icon={<Globe size={26} />} title={q ? 'Aucun résultat' : step === 'en_cours' ? 'Aucun site en cours' : 'Aucun site livré pour l’instant'}
            text={q ? 'Essayez un autre mot.' : step === 'en_cours' ? 'Un site se lance tout seul quand un client accepte.' : 'Touchez « Site livré » sur un site en cours quand il est terminé.'} />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </Page>
      <NewProjectSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
