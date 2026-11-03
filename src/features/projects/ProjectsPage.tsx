import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Globe, Plus, Search, X } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Chips, Empty, Input, Section } from '../../components/ui'
import { ProjectCard } from './ProjectCard'
import { NewProjectSheet } from './ProjectForm'
import { useStore } from '../../data/store'
import { SITE_STEPS, siteStep, type SiteStep } from '../../lib/constants'
import { searchMatch } from '../../lib/derive'

type View = 'tous' | SiteStep
const PARAM: Record<View, string | null> = { tous: null, livre: 'livres', en_cours: 'en_cours' }

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const view: View = params.get('g') === PARAM.livre ? 'livre' : params.get('g') === PARAM.en_cours ? 'en_cours' : 'tous'
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const projects = useStore((s) => s.db.projects)
  const prospects = useStore((s) => s.db.prospects)

  const clientName = useMemo(() => new Map(prospects.map((p) => [p.id, p.name])), [prospects])
  const found = useMemo(() => projects.filter((p) => !p.archived &&
    searchMatch(q, p.name, p.prospect_id ? clientName.get(p.prospect_id) : '', p.demo_url, p.final_url)), [projects, q, clientName])
  const count = (s: SiteStep) => found.filter((p) => siteStep(p.status) === s).length
  // Les livrés d'abord, puis les en cours : un site qui change d'étape reste sous les yeux
  const sections = useMemo(() => SITE_STEPS
    .filter((s) => view === 'tous' || view === s.value)
    .map((s) => ({
      ...s,
      list: found.filter((p) => siteStep(p.status) === s.value)
        .sort((a, b) => (s.value === 'en_cours' ? (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') : 0) || (a.updated_at < b.updated_at ? 1 : -1)),
    }))
    .filter((s) => s.list.length > 0), [found, view])

  return (
    <>
      <PageHeader title="Sites"
        actions={<button className="btn-soft h-10 min-h-0 px-3" onClick={() => setCreating(true)}><Plus size={17} />Site</button>}>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Site ou client…" className="pl-10 pr-10 bg-surface" type="search" />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
        </div>
        <Chips className="mt-3" value={view} onChange={(v) => { const n = new URLSearchParams(params); const g = PARAM[v]; if (g) n.set('g', g); else n.delete('g'); setParams(n, { replace: true }) }}
          options={[
            { value: 'tous' as const, label: 'Tous', count: found.length },
            { value: 'livre' as const, label: 'Livrés', count: count('livre') },
            { value: 'en_cours' as const, label: 'En cours', count: count('en_cours') },
          ]} />
      </PageHeader>

      <Page className="pt-3">
        {sections.length === 0 ? (
          <Empty icon={<Globe size={26} />} title={q ? 'Aucun résultat' : view === 'en_cours' ? 'Aucun site en cours' : 'Aucun site pour l’instant'}
            text={q ? 'Essayez un autre mot.' : view === 'en_cours' ? 'Touchez « Passer en cours » sur un site pour le retrouver ici.' : 'Touchez « Site » en haut, ou mettez le lien du site sur un prospect.'} />
        ) : sections.map((s) => (
          <Section key={s.value} title={`${s.plural} (${s.list.length})`} className="first:mt-1">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {s.list.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          </Section>
        ))}
      </Page>
      <NewProjectSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
