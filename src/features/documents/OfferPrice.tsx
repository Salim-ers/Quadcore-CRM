import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Field, Input, Select } from '../../components/ui'
import { euros } from '../../components/bits'
import { parsePrice } from '../../lib/derive'
import { OFFERS, offerById } from '../../lib/offers'

export interface Deal { offerId: string; price: string }

/** Choisir une offre met son prix de la plaquette ; le crayon permet de le changer, on ne sait jamais. */
export function OfferPrice({ value, onChange, optional = false }: { value: Deal; onChange: (next: Deal) => void; optional?: boolean }) {
  const [editing, setEditing] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const offer = offerById(value.offerId)
  const parsed = parsePrice(value.price)
  const invalid = Number.isNaN(parsed)

  useEffect(() => {
    if (!editing) return
    const t = setTimeout(() => input.current?.select(), 60)
    return () => clearTimeout(t)
  }, [editing])

  return (
    <div className="flex flex-col gap-3">
      <Field label="Offre">
        <Select value={value.offerId} onChange={(e) => {
          const next = offerById(e.target.value)
          setEditing(false)
          onChange({ offerId: e.target.value, price: next ? String(next.price) : value.price })
        }}>
          {optional && <option value="">Choisir une offre</option>}
          {OFFERS.map((o) => <option key={o.id} value={o.id}>{o.label} · {euros(o.price)}</option>)}
        </Select>
      </Field>
      {editing || invalid ? (
        <div>
          <Field label="Prix (€ TTC)">
            <Input ref={input} inputMode="decimal" autoComplete="off" placeholder="900" value={value.price} onChange={(e) => onChange({ ...value, price: e.target.value })} onBlur={() => { if (!Number.isNaN(parsePrice(value.price))) setEditing(false) }} />
          </Field>
          {invalid && <p className="text-[12.5px] font-semibold text-danger mt-1.5">Entrez un montant, par exemple 900.</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3 min-h-[46px] pl-3.5 pr-1 rounded-xl bg-sunken">
          <span className="flex-1 min-w-0">
            <span className="block text-[12.5px] font-semibold text-muted">Prix TTC</span>
            <span className="block font-bold text-[16px]">{parsed === null ? 'Pas de prix' : euros(parsed)}</span>
            {offer && parsed !== null && parsed !== offer.price && <span className="block text-[12px] text-muted">Prix de la plaquette : {euros(offer.price)}</span>}
          </span>
          <button type="button" className="icon-btn w-11 h-11 text-muted shrink-0" aria-label="Modifier le prix" title="Modifier le prix" onClick={() => setEditing(true)}><Pencil size={17} /></button>
        </div>
      )}
    </div>
  )
}
