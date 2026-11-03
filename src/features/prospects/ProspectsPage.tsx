import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Store, X } from 'lucide-react'
import { Page, PageHeader, useUi } from '../../components/Shell'
import { Chips, Empty, Input, Section } from '../../components/ui'
import { ProspectCard } from './ProspectCard'
import { useProspectFlow } from './flows'
import { useStore } from '../../data/store'
import { PROSPECT_STEPS, prospectStep, type ProspectStep } from '../../lib/constants'
import { prospectsWithSite, searchMatch } from '../../lib/derive'

const EMPTY: Record<ProspectStep, { title: string; text: string }> = {
  prospect: { title: 'Aucun prospect à voir', text: 'Ajoutez un commerce repéré sur Instagram ou Google : seul le nom suffit.' },
  vu: { title: 'Aucun client vu', text: 'Touchez « Client vu » sur un prospect dès que vous l’avez rencontré.' },
  attente: { title: 'Personne en attente', text: 'Touchez « En attente » quand un client doit encore réfléchir.' },
  accepte: { title: 'Pas encore d’acceptation', text: 'Quand un client accepte, son site arrive dans les sites livrés.' },
  refuse: { title: 'Aucun refus', text: 'C’est bon signe.' },
}

export function ProspectsPage() {
  const [params, setParams] = useSearchParams()
  const asked = params.get('f') as ProspectStep | null
  const step: ProspectStep = PROSPECT_STEPS.some((s) => s.value === asked) ? asked! : 'prospect'
  const [q, setQ] = useState('')
  const prospects = useStore((s) => s.db.prospects)
  const profiles = useStore((s) => s.db.profiles)
  const projects = useStore((s) => s.db.projects)
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const flow = useProspectFlow()

  const found = useMemo(() => prospects.filter((p) => !p.archived && searchMatch(q, p.name, p.city, p.contact_name, p.instagram_handle, p.phone, p.email, p.notes, p.website_url)), [prospects, q])
  const counts = useMemo(() => {
    const c: Record<ProspectStep, number> = { prospect: 0, vu: 0, attente: 0, accepte: 0, refuse: 0 }
    for (const p of found) c[prospectStep(p.status)]++
    return c
  }, [found])
  const list = useMemo(() => found.filter((p) => prospectStep(p.status) === step).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)), [found, step])
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  // Ceux dont le site est prêt d'abord : ce sont les premiers à aller voir
  const groups = useMemo(() => {
    const withSite = prospectsWithSite({ projects, prospects })
    return [
      { title: 'Avec site', list: list.filter((p) => withSite.has(p.id)) },
      { title: 'Sans site', list: list.filter((p) => !withSite.has(p.id)) },
    ].filter((g) => g.list.length > 0)
  }, [list, projects, prospects])

  return (
    <>
      <PageHeader title="Prospects"
        actions={<button className="hidden lg:inline-flex btn-primary ml-1" onClick={() => setQuickAdd(true)}><Plus size={18} />Ajouter</button>}>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville, téléphone…" className="pl-10 pr-10 bg-surface" type="search" enterKeyHint="search" />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
        </div>
        <Chips className="mt-3" value={step} onChange={(v) => { const n = new URLSearchParams(params); if (v === 'prospect') n.delete('f'); else n.set('f', v); setParams(n, { replace: true }) }}
          options={PROSPECT_STEPS.map((s) => ({ value: s.value, label: s.plural, count: counts[s.value] }))} />
      </PageHeader>

      <Page className="pt-3">
        {list.length === 0 ? (
          <Empty icon={<Store size={26} />} title={q ? 'Aucun résultat' : EMPTY[step].title} text={q ? 'Essayez un autre mot.' : EMPTY[step].text}
            action={!q && step === 'prospect' && <button className="btn-primary" onClick={() => setQuickAdd(true)}><Plus size={18} />Nouveau prospect</button>} />
        ) : groups.map((g) => (
          <Section key={g.title} title={`${g.title} (${g.list.length})`} className="first:mt-1">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.list.map((p) => <ProspectCard key={p.id} p={p} owner={p.owner_id ? byId.get(p.owner_id) : undefined} onStep={flow.moveTo} />)}
            </div>
          </Section>
        ))}
      </Page>
      {flow.ui}
    </>
  )
}
