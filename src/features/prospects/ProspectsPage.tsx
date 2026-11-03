import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, MapPin, Plus, Search, Store, X } from 'lucide-react'
import { Page, PageHeader, useUi } from '../../components/Shell'
import { Chips, cx, Empty, Input, Section } from '../../components/ui'
import { ProspectCard } from './ProspectCard'
import { useProspectFlow } from './flows'
import { useStore } from '../../data/store'
import { PROSPECT_STEPS, prospectStep, type ProspectStep } from '../../lib/constants'
import { cityKey, cityOptions, prospectsWithSite, searchMatch } from '../../lib/derive'

const EMPTY: Record<ProspectStep, { title: string; text: string }> = {
  prospect: { title: 'Aucun prospect à voir', text: 'Ajoutez un commerce repéré sur Instagram ou Google : seul le nom suffit.' },
  vu: { title: 'Aucun client vu', text: 'Touchez « Client vu » sur un prospect dès que vous l’avez rencontré.' },
  attente: { title: 'Personne en attente', text: 'Touchez « En attente » quand un client doit encore réfléchir.' },
  accepte: { title: 'Pas encore d’acceptation', text: 'Quand un client accepte, son site arrive dans les sites livrés.' },
  refuse: { title: 'Aucun refus', text: 'C’est bon signe.' },
}

/** La pastille reste petite à côté de la recherche ; le choix passe par le menu natif du téléphone. */
function CityFilter({ value, label, total, choices, onChange }: {
  value: string; label?: string; total: number; choices: { key: string; label: string; count: number }[]; onChange: (key: string) => void
}) {
  return (
    <label className={cx('chip relative h-[46px] max-w-[42%] shrink-0 rounded-xl focus-within:border-copper/60 focus-within:ring-4 focus-within:ring-copper/10', value && 'chip-on')}>
      <MapPin size={15} className="shrink-0" />
      <span className="min-w-0 truncate">{label ?? 'Ville'}</span>
      <ChevronDown size={15} className="shrink-0 opacity-60" />
      <select aria-label="Filtrer par ville" value={value} onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full cursor-pointer opacity-0 bg-surface text-ink text-[16px]">
        <option value="">Toutes les villes ({total})</option>
        {choices.map((c) => <option key={c.key} value={c.key}>{c.label} ({c.count})</option>)}
      </select>
    </label>
  )
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

  const live = useMemo(() => prospects.filter((p) => !p.archived), [prospects])
  const cities = useMemo(() => cityOptions(live), [live])
  const city = cities.find((c) => c.key === params.get('ville'))
  const cityId = city?.key ?? ''
  const matching = useMemo(() => live.filter((p) => searchMatch(q, p.name, p.city, p.contact_name, p.instagram_handle, p.phone, p.email, p.notes, p.website_url)), [live, q])
  const inStep = useMemo(() => matching.filter((p) => prospectStep(p.status) === step), [matching, step])
  // Le nombre annoncé pour une ville est celui qu'on verra en la choisissant
  const cityChoices = useMemo(() => {
    const here = new Map(cityOptions(inStep).map((c) => [c.key, c.count]))
    return cities.map((c) => ({ ...c, count: here.get(c.key) ?? 0 })).filter((c) => c.count > 0 || c.key === cityId)
  }, [cities, inStep, cityId])
  const found = useMemo(() => (cityId ? matching.filter((p) => cityKey(p.city) === cityId) : matching), [matching, cityId])
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
  const setParam = (key: string, value: string) => {
    const n = new URLSearchParams(params)
    if (value) n.set(key, value); else n.delete(key)
    setParams(n, { replace: true })
  }

  return (
    <>
      <PageHeader title="Prospects"
        actions={<button className="hidden lg:inline-flex btn-primary ml-1" onClick={() => setQuickAdd(true)}><Plus size={18} />Ajouter</button>}>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, téléphone…" className={cx('pl-10 bg-surface', q && 'pr-10')} type="search" enterKeyHint="search" />
            {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
          </div>
          <CityFilter value={cityId} label={city?.label} total={inStep.length} choices={cityChoices} onChange={(key) => setParam('ville', key)} />
        </div>
        <Chips className="mt-3" value={step} onChange={(v) => setParam('f', v === 'prospect' ? '' : v)}
          options={PROSPECT_STEPS.map((s) => ({ value: s.value, label: s.plural, count: counts[s.value] }))} />
      </PageHeader>

      <Page className="pt-3">
        {list.length === 0 ? (
          <Empty icon={<Store size={26} />} title={q || city ? 'Aucun résultat' : EMPTY[step].title}
            text={q ? 'Essayez un autre mot.' : city ? `Rien pour « ${city.label} » à cette étape.` : EMPTY[step].text}
            action={city
              ? <button className="btn-ghost" onClick={() => setParam('ville', '')}>Voir toutes les villes</button>
              : !q && step === 'prospect' && <button className="btn-primary" onClick={() => setQuickAdd(true)}><Plus size={18} />Nouveau prospect</button>} />
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
