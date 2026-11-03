import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Input, Sheet, cx } from '../../components/ui'
import { euros } from '../../components/bits'
import { updateProject } from '../../data/actions'
import { parsePrice } from '../../lib/derive'
import type { Project } from '../../lib/types'

/** Le prix proposé, à côté de chaque site : un geste pour le mettre ou le changer. */
export function PriceButton({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const price = project.price_proposed
  const parsed = parsePrice(value)
  const valid = !Number.isNaN(parsed)

  useEffect(() => {
    if (!open) return
    setValue(String(price ?? ''))
    const t = setTimeout(() => input.current?.select(), 120)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!valid) return
    setOpen(false)
    if (parsed !== price) await updateProject(project.id, { price_proposed: parsed })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={price == null ? `Ajouter le prix de ${project.name}` : `Prix de ${project.name} : ${euros(price)}, modifier`}
        className={cx('relative z-10 shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[13.5px] font-bold whitespace-nowrap transition active:scale-[.97]',
          price == null ? 'border border-dashed border-line text-muted hover:text-ink' : 'bg-sunken text-ink hover:bg-line/60')}>
        {price == null ? <><Plus size={14} />Prix</> : euros(price)}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Prix proposé" size="sm"
        footer={<button className="btn-primary w-full" disabled={!valid} onClick={save}>Enregistrer</button>}>
        <form onSubmit={(e) => { e.preventDefault(); save() }}>
          <p className="text-[14px] text-muted mb-3 truncate">{project.name}</p>
          <label className="relative block">
            <span className="sr-only">Prix proposé en euros</span>
            <Input ref={input} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder="900" className="h-14 pr-10 text-[22px] font-semibold" />
            <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-muted font-semibold">€</span>
          </label>
          {!valid && <span className="block mt-1.5 text-[12.5px] font-semibold text-danger">Entrez un montant, par exemple 900.</span>}
        </form>
      </Sheet>
    </>
  )
}
