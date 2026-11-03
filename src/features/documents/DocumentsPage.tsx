import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Download, FileText, Globe, Scale, Search, Send, Tags } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Empty, Fold, Input, Section } from '../../components/ui'
import { euros } from '../../components/bits'
import { useStore } from '../../data/store'
import { liveProjects, searchMatch } from '../../lib/derive'
import type { Project } from '../../lib/types'
import { OFFERS, PLANS, TABLET_LABEL, installments } from '../../lib/offers'
import { CGV_VERSION } from './cgv'
import { canShareFile, downloadFile, shareFile } from './deliver'
import { QuoteSheet } from './QuoteSheet'

const RECENT = 6

/** Les documents de vente : un devis pour chaque site, et les CGV à envoyer seules si besoin. */
export function DocumentsPage() {
  const db = useStore((s) => s.db)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Project | null>(null)
  const [cgv, setCgv] = useState<File | null>(null)
  const clientName = useMemo(() => new Map(db.prospects.map((p) => [p.id, p.name])), [db.prospects])
  const sites = useMemo(() => liveProjects(db)
    .filter((p) => searchMatch(q, p.name, p.prospect_id ? clientName.get(p.prospect_id) : ''))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)), [db, q, clientName])

  // Prêt d'avance : sur téléphone, le partage doit partir du geste, sans attente
  useEffect(() => {
    let live = true
    import('./pdf').then(({ cgvPdf }) => cgvPdf()).then((f) => { if (live) setCgv(f) }).catch(() => { /* les boutons restent inactifs */ })
    return () => { live = false }
  }, [])

  return (
    <>
      <PageHeader title="Devis et CGV" />
      <Page className="pt-1">
        <Section title="Créer un devis" className="first:mt-0">
          <div className="relative mb-2.5">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Site ou client…" className="pl-10 bg-surface" type="search" />
          </div>
          {sites.length === 0 ? (
            <Empty icon={<Globe size={26} />} title={q ? 'Aucun résultat' : 'Aucun site pour l’instant'} text={q ? 'Essayez un autre mot.' : 'Un devis se crée à partir d’un site : ajoutez un prospect avec son lien.'} />
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {sites.slice(0, q ? sites.length : RECENT).map((p) => (
                <button key={p.id} type="button" onClick={() => setSelected(p)} className="w-full flex items-center gap-3 min-h-[58px] px-3.5 py-2 text-left hover:bg-sunken transition">
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-[15px] truncate">{p.prospect_id ? clientName.get(p.prospect_id) ?? p.name : p.name}</span>
                    <span className="block text-[13px] text-muted">{p.price_proposed == null ? 'Sans prix' : euros(p.price_proposed)}</span>
                  </span>
                  <ChevronRight size={18} className="text-faint shrink-0" />
                </button>
              ))}
            </div>
          )}
          {!q && sites.length > RECENT && <p className="text-[12.5px] text-muted mt-2">Les {RECENT} derniers sites. Cherchez pour retrouver les autres.</p>}
        </Section>

        <Section title="Conditions générales de vente">
          <div className="card p-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-copper/12 text-copper-ink flex items-center justify-center shrink-0"><Scale size={19} /></span>
              <div className="min-w-0">
                <p className="font-semibold text-[15px]">CGV QUADCORE</p>
                <p className="text-[13px] text-muted mt-0.5">Version de {CGV_VERSION}, avec le formulaire de rétractation. Elles sont déjà jointes à chaque devis.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {cgv && canShareFile(cgv) && <button className="btn-primary flex-1 text-[14px]" onClick={() => shareFile(cgv, cgv.name)}><Send size={16} />Envoyer</button>}
              <button className="btn-soft flex-1 text-[14px]" disabled={!cgv} onClick={() => cgv && downloadFile(cgv)}><Download size={16} />Télécharger</button>
            </div>
          </div>
        </Section>

        <div className="mt-7">
          <Fold title="Vos tarifs" icon={<Tags size={19} />}>
            <ul className="divide-y divide-line -mx-1 text-[14px]">
              {OFFERS.map((o) => (
                <li key={o.id} className="px-1 py-2.5">
                  <span className="flex items-baseline justify-between gap-3"><span>{o.label}</span><span className="font-semibold whitespace-nowrap">{euros(o.price)}</span></span>
                  <span className="block text-[12.5px] text-muted mt-0.5">3 × {euros(installments(o.price, 3)[0])} ou 4 × {euros(installments(o.price, 4)[0])} sans frais</span>
                </li>
              ))}
              {PLANS.filter((p) => p.price > 0).map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3 px-1 py-2.5"><span>{p.label}</span><span className="font-semibold whitespace-nowrap">{euros(p.price)}/mois</span></li>
              ))}
              <li className="flex items-baseline justify-between gap-3 px-1 py-2.5"><span>{TABLET_LABEL}</span><span className="font-semibold whitespace-nowrap">À chaque devis</span></li>
            </ul>
            <p className="text-[12.5px] text-muted mt-2 flex items-center gap-1.5"><FileText size={14} className="shrink-0" />Prix TTC de votre plaquette, modifiables avec le crayon sur chaque site ou devis.</p>
          </Fold>
        </div>
      </Page>
      <QuoteSheet project={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  )
}
