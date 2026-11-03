import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Input, Sheet, cx } from '../../components/ui'
import { euros } from '../../components/bits'
import { updateProject, updateProspect } from '../../data/actions'
import { useStore } from '../../data/store'
import { parsePrice } from '../../lib/derive'
import { OFFERS, offerByPrice, type Offer } from '../../lib/offers'
import type { Project } from '../../lib/types'

/** Le prix proposé, à côté de chaque site : toucher une offre met son prix, le crayon permet de le changer. */
export function PriceButton({ project }: { project: Project }) {
  const client = useStore((s) => s.db.prospects.find((p) => p.id === project.prospect_id))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const price = project.price_proposed
  const current = offerByPrice(price)
  const parsed = parsePrice(value)
  const valid = !Number.isNaN(parsed)

  useEffect(() => {
    if (!open) return
    setValue(String(price ?? ''))
    setEditing(price != null && !current) // un prix hors plaquette s'ouvre directement sur sa saisie
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => input.current?.select(), 120)
    return () => clearTimeout(t)
  }, [editing])

  async function apply(next: number | null, offer?: Offer) {
    setOpen(false)
    if (next !== price) await updateProject(project.id, { price_proposed: next })
    if (offer && client && client.service !== offer.label) await updateProspect(client.id, { service: offer.label })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={price == null ? `Ajouter le prix de ${project.name}` : `Prix de ${project.name} : ${euros(price)}, modifier`}
        className={cx('relative z-10 shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[13.5px] font-bold whitespace-nowrap transition active:scale-[.97]',
          price == null ? 'border border-dashed border-line text-muted hover:text-ink' : 'bg-sunken text-ink hover:bg-line/60')}>
        {price == null ? <><Plus size={14} />Prix</> : <>{euros(price)}<Pencil size={11} className="text-muted" /></>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Prix proposé" size="sm"
        footer={editing ? <button className="btn-primary w-full" disabled={!valid} onClick={() => valid && apply(parsed)}>Enregistrer</button> : undefined}>
        <p className="text-[14px] text-muted mb-3 truncate">{project.name}</p>
        <div className="flex flex-col gap-1.5">
          {OFFERS.map((o) => (
            <button key={o.id} type="button" aria-pressed={current?.id === o.id} onClick={() => apply(o.price, o)}
              className={cx('flex items-center justify-between gap-3 min-h-[50px] px-3.5 rounded-xl border text-left transition active:scale-[.99]', current?.id === o.id ? 'border-copper bg-copper/8' : 'border-line bg-surface hover:bg-sunken')}>
              <span className="font-semibold text-[14.5px] min-w-0">{o.label}</span>
              <span className="font-bold text-[14.5px] whitespace-nowrap">{euros(o.price)}</span>
            </button>
          ))}
        </div>
        {editing ? (
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); if (valid) apply(parsed) }}>
            <label className="relative block">
              <span className="sr-only">Prix proposé en euros</span>
              <Input ref={input} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="900" className="h-14 pr-10 text-[22px] font-semibold" />
              <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold">€</span>
            </label>
            {!valid && <span className="block mt-1.5 text-[12.5px] font-semibold text-danger">Entrez un montant, par exemple 900.</span>}
          </form>
        ) : (
          <button type="button" className="btn-ghost w-full mt-2 text-muted text-[14px]" onClick={() => setEditing(true)}><Pencil size={15} />Modifier le prix</button>
        )}
      </Sheet>
    </>
  )
}
