import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Columns3, List, Plus, Search, SlidersHorizontal, Store, X } from 'lucide-react'
import { Page, PageHeader, useUi } from '../../components/Shell'
import { Chips, Empty, Field, Input, Select, Sheet, cx } from '../../components/ui'
import { Kanban } from '../../components/Kanban'
import { ProspectCard } from './ProspectCard'
import { useProspectStatusFlow } from './flows'
import { useStore } from '../../data/store'
import { CATEGORIES, PRIORITIES, PROSPECT_STATUSES } from '../../lib/constants'
import { needsFollowUp, searchMatch } from '../../lib/derive'
import type { Prospect, ProspectStatus } from '../../lib/types'

type Filter = 'actifs' | 'relance' | ProspectStatus | 'tous'
type Sort = 'recent' | 'relance' | 'nom' | 'priorite'

const readPref = <T,>(k: string, d: T): T => { try { return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? d } catch { return d } }
const writePref = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* noop */ } }

export function ProspectsPage() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('f') as Filter) || 'actifs'
  const [q, setQ] = useState('')
  const [view, setView] = useState<'list' | 'kanban'>(() => readPref('qc-prospect-view', 'list'))
  const [sheet, setSheet] = useState(false)
  const [owner, setOwner] = useState<string>(() => readPref('qc-prospect-owner', 'all'))
  const [category, setCategory] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [sort, setSort] = useState<Sort>(() => readPref('qc-prospect-sort', 'recent'))
  const prospects = useStore((s) => s.db.prospects)
  const profiles = useStore((s) => s.db.profiles)
  const userId = useStore((s) => s.userId)
  const setQuickAdd = useUi((s) => s.setQuickAdd)
  const flow = useProspectStatusFlow()

  const base = useMemo(() => prospects.filter((p) =>
    !p.archived &&
    (owner === 'all' || (owner === 'me' ? p.owner_id === userId : p.owner_id === owner)) &&
    (!category || p.category === category) &&
    (!priority || p.priority === priority) &&
    searchMatch(q, p.name, p.city, p.contact_name, p.instagram_handle, p.phone, p.email, p.notes),
  ), [prospects, owner, userId, category, priority, q])

  const counts = useMemo(() => {
    const c: Record<string, number> = { actifs: 0, relance: 0, tous: base.length }
    for (const p of base) {
      c[p.status] = (c[p.status] ?? 0) + 1
      if (!['gagne', 'perdu'].includes(p.status)) c.actifs++
      if (needsFollowUp(p)) c.relance++
    }
    return c
  }, [base])

  const list = useMemo(() => {
    const f = base.filter((p) =>
      filter === 'tous' ? true : filter === 'actifs' ? !['gagne', 'perdu'].includes(p.status) : filter === 'relance' ? needsFollowUp(p) : p.status === filter)
    const pr = { haute: 0, normale: 1, basse: 2 }
    return f.sort((a, b) => {
      if (sort === 'nom') return a.name.localeCompare(b.name, 'fr')
      if (sort === 'priorite') return pr[a.priority] - pr[b.priority] || (a.updated_at < b.updated_at ? 1 : -1)
      if (sort === 'relance') return (a.next_follow_up ?? '9999').localeCompare(b.next_follow_up ?? '9999')
      return a.updated_at < b.updated_at ? 1 : -1
    })
  }, [base, filter, sort])

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const setFilter = (f: Filter) => { const n = new URLSearchParams(params); if (f === 'actifs') n.delete('f'); else n.set('f', f); setParams(n, { replace: true }) }
  const activeFilters = (owner !== 'all' ? 1 : 0) + (category ? 1 : 0) + (priority ? 1 : 0)

  const chipOptions: { value: Filter; label: string; count?: number }[] = [
    { value: 'actifs', label: 'Actifs', count: counts.actifs },
    { value: 'relance', label: 'À relancer', count: counts.relance },
    ...PROSPECT_STATUSES.filter((s) => s.value !== 'a_relancer').map((s) => ({ value: s.value as Filter, label: s.short ?? s.label, count: counts[s.value] ?? 0 })),
    { value: 'tous', label: 'Tous', count: counts.tous },
  ]

  return (
    <>
      <PageHeader
        title="Prospects"
        subtitle={`${counts.actifs} actifs · ${counts.gagne ?? 0} gagnés`}
        actions={
          <>
            <div className="hidden lg:flex items-center bg-sunken rounded-xl p-1 mr-1">
              {(['list', 'kanban'] as const).map((v) => (
                <button key={v} onClick={() => { setView(v); writePref('qc-prospect-view', v) }}
                  className={cx('h-9 px-3 rounded-lg text-[13.5px] font-semibold inline-flex items-center gap-1.5 transition', view === v ? 'bg-surface shadow-card text-ink' : 'text-muted')}>
                  {v === 'list' ? <List size={16} /> : <Columns3 size={16} />}{v === 'list' ? 'Liste' : 'Kanban'}
                </button>
              ))}
            </div>
            <button className="icon-btn relative" onClick={() => setSheet(true)} aria-label="Filtres">
              <SlidersHorizontal size={20} />
              {activeFilters > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-copper" />}
            </button>
            <button className="hidden lg:inline-flex btn-primary ml-1" onClick={() => setQuickAdd(true)}><Plus size={18} />Ajouter</button>
          </>
        }
      >
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville, @instagram, téléphone…" className="pl-10 pr-10 bg-surface" type="search" enterKeyHint="search" />
          {q && <button className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" onClick={() => setQ('')} aria-label="Effacer"><X size={17} /></button>}
        </div>
        <Chips className={cx('mt-3', view === 'kanban' && 'lg:hidden')} options={chipOptions} value={filter} onChange={setFilter} />
      </PageHeader>

      <Page className="pt-3">
        {view === 'kanban' && (
          <div className="hidden lg:block">
            <Kanban
              columns={PROSPECT_STATUSES}
              items={base}
              statusOf={(p) => p.status}
              onMove={(p, s) => flow.change(p, s)}
              renderCard={(p: Prospect) => <ProspectCard compact p={p} owner={p.owner_id ? byId.get(p.owner_id) : undefined} />}
            />
          </div>
        )}
        <div className={cx(view === 'kanban' && 'lg:hidden')}>
          {list.length === 0 ? (
            <Empty
              icon={<Store size={26} />}
              title={q || activeFilters ? 'Aucun résultat' : 'Aucun prospect ici'}
              text={q || activeFilters ? 'Essayez un autre mot-clé ou retirez des filtres.' : 'Ajoutez un commerce repéré sur Instagram ou Google en quelques secondes.'}
              action={!q && <button className="btn-primary" onClick={() => setQuickAdd(true)}><Plus size={18} />Nouveau prospect</button>}
            />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => (
                <ProspectCard key={p.id} p={p} owner={p.owner_id ? byId.get(p.owner_id) : undefined} onStatus={flow.openPicker} />
              ))}
            </div>
          )}
        </div>
      </Page>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filtres et tri" size="sm"
        footer={
          <div className="flex gap-2">
            <button className="btn-soft flex-1" onClick={() => { setOwner('all'); setCategory(''); setPriority(''); writePref('qc-prospect-owner', 'all') }}>Réinitialiser</button>
            <button className="btn-dark flex-1" onClick={() => setSheet(false)}>Voir {list.length} prospect{list.length > 1 ? 's' : ''}</button>
          </div>
        }>
        <div className="flex flex-col gap-4">
          <Field label="Responsable">
            <Select value={owner} onChange={(e) => { setOwner(e.target.value); writePref('qc-prospect-owner', e.target.value) }}>
              <option value="all">Toute l’équipe</option>
              <option value="me">Mes prospects</option>
              {profiles.filter((p) => p.active && p.id !== userId).map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </Select>
          </Field>
          <Field label="Catégorie">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Priorité">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Toutes</option>{PRIORITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Trier par">
            <Select value={sort} onChange={(e) => { setSort(e.target.value as Sort); writePref('qc-prospect-sort', e.target.value) }}>
              <option value="recent">Dernière activité</option>
              <option value="relance">Date de relance</option>
              <option value="priorite">Priorité</option>
              <option value="nom">Nom (A → Z)</option>
            </Select>
          </Field>
        </div>
      </Sheet>
      {flow.ui}
    </>
  )
}
