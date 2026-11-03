import { useLayoutEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, Plus, Send, Trash2 } from 'lucide-react'
import { Field, Input, Sheet, cx } from '../../components/ui'
import { euros } from '../../components/bits'
import { toast, useStore } from '../../data/store'
import { updateProject, updateProspect, uploadAttachment } from '../../data/actions'
import { parsePrice } from '../../lib/derive'
import { OFFERS, PAYMENTS, PLANS, TERMS, offerById, offerFor, paymentText, planOf, quoteNumber, quoteTotals, type PaymentId, type PlanId } from '../../lib/offers'
import type { Project, Prospect } from '../../lib/types'
import { canShareFile, downloadFile, shareFile } from './deliver'
import { OfferPrice, type Deal } from './OfferPrice'

/** Tout ce qu'il faut pour vendre un site : le devis, les options de maintenance, les CGV et le formulaire de rétractation, en un PDF. */
export function QuoteSheet({ project, open, onClose }: { project: Project | null; open: boolean; onClose: () => void }) {
  const client = useStore((s) => s.db.prospects.find((p) => p.id === project?.prospect_id))
  const already = useStore((s) => s.db.attachments.filter((a) => a.entity_type === 'project' && a.entity_id === project?.id && a.file_name.startsWith('Devis-')).length)

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [deal, setDeal] = useState<Deal>({ offerId: OFFERS[0].id, price: String(OFFERS[0].price) })
  const [extras, setExtras] = useState<{ label: string; price: string }[]>([])
  const [plan, setPlan] = useState<PlanId>('essentielle')
  const [managed, setManaged] = useState(true)
  const [domain, setDomain] = useState('')
  const [yearlyText, setYearlyText] = useState('')
  const [payment, setPayment] = useState<PaymentId>('acompte')
  const [delay, setDelay] = useState(TERMS.delay)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  // Avant l'affichage : la feuille s'ouvre déjà remplie
  useLayoutEffect(() => {
    if (!open || !project) return
    const offer = offerFor(project, client)
    setName(client?.name ?? ''); setContact(client?.contact_name ?? ''); setEmail(client?.email ?? '')
    setAddress([client?.address, client?.city].filter(Boolean).join(', '))
    setDeal({ offerId: offer.id, price: String(project.price_proposed ?? offer.price) }); setExtras([])
    setPlan(offer.id === 'complete' || offer.id === 'gestion' ? 'premium' : 'essentielle')
    setManaged(true); setDomain(''); setYearlyText(''); setPayment('acompte'); setDelay(TERMS.delay)
    setBusy(false); setFile(null)
  }, [open, project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const offer = offerById(deal.offerId) ?? OFFERS[0]
  const price = parsePrice(deal.price)
  const yearly = parsePrice(yearlyText)
  const parsedExtras = extras.map((e) => ({ label: e.label.trim(), price: parsePrice(e.price) }))
  const extrasOk = parsedExtras.every((e) => e.label && e.price !== null && !Number.isNaN(e.price))
  const hostingOk = !managed || (yearly !== null && !Number.isNaN(yearly))
  const ready = !!name.trim() && price !== null && !Number.isNaN(price) && extrasOk && hostingOk && !!delay.trim()
  const totals = useMemo(() => quoteTotals({
    price: price !== null && !Number.isNaN(price) ? price : 0,
    extras: parsedExtras.filter((e) => e.price !== null && !Number.isNaN(e.price)) as { label: string; price: number }[],
  }), [price, extras]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Complète la fiche avec ce qui manquait, sans jamais écraser ce qu'elle contient. */
  function fillClient(c: Prospect) {
    const patch: Partial<Prospect> = {}
    if (!c.contact_name && contact.trim()) patch.contact_name = contact.trim()
    if (!c.email && email.trim()) patch.email = email.trim()
    if (!c.address && !c.city && address.trim()) patch.address = address.trim()
    if (c.service !== offer.label) patch.service = offer.label
    if (Object.keys(patch).length) return updateProspect(c.id, patch)
  }

  async function create() {
    if (!project || !ready || price === null) return
    setBusy(true)
    try {
      const date = new Date()
      const { quotePdf } = await import('./pdf')
      const pdf = await quotePdf({
        number: quoteNumber(project.id, already, date),
        date,
        client: { name: name.trim(), contact: contact.trim(), address: address.trim(), email: email.trim() },
        offer,
        price,
        extras: parsedExtras as { label: string; price: number }[],
        plan,
        hosting: { managed, domain: domain.trim(), yearly },
        payment,
        delay: delay.trim(),
      })
      setFile(pdf)
      const patch: Partial<Project> = {}
      if (price !== project.price_proposed) patch.price_proposed = price
      if (project.billing_status === 'non_facture') patch.billing_status = 'devis_envoye'
      if (Object.keys(patch).length) await updateProject(project.id, patch)
      if (client) await fillClient(client)
      // Une copie reste sur le site : si l'envoi échoue, le PDF est quand même là, prêt à partir
      await uploadAttachment('project', project.id, pdf)
    } catch (e) {
      toast((e as Error).message || 'Création du devis impossible', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (file) {
    return (
      <Sheet open={open} onClose={onClose} title="Devis prêt" size="sm">
        <div className="text-center py-3">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600 dark:text-emerald-400" />
          <p className="font-bold text-[16px] mt-3 break-words">{file.name}</p>
          <p className="text-[14px] text-muted mt-1">Le devis, les CGV et le formulaire de rétractation sont dans ce PDF. Une copie est rangée dans les fichiers du site.</p>
        </div>
        <div className="flex flex-col gap-2 mt-3">
          {canShareFile(file) && <button className="btn-primary" onClick={() => shareFile(file, file.name)}><Send size={17} />Envoyer au client</button>}
          <button className="btn-soft" onClick={() => downloadFile(file)}><Download size={17} />Télécharger</button>
          <button className="btn-ghost text-muted" onClick={() => setFile(null)}>Modifier le devis</button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title="Devis et CGV"
      footer={
        <div>
          <div className="flex items-baseline justify-between text-[14px] mb-2.5">
            <span className="text-muted">Total TTC</span>
            <span className="h-display text-[22px]">{euros(totals.ttc)}</span>
          </div>
          <button className="btn-primary w-full" disabled={!ready || busy} onClick={create}>{busy ? 'Création…' : 'Créer le devis PDF'}</button>
        </div>
      }>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h3 className="section-title">Client</h3>
          <Field label="Nom du commerce *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Contact"><Input value={contact} autoComplete="off" onChange={(e) => setContact(e.target.value)} /></Field>
            <Field label="E-mail"><Input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          </div>
          <Field label="Adresse"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="section-title">Offre</h3>
          <OfferPrice value={deal} onChange={setDeal} />
          {extras.map((x, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input aria-label="Ligne en plus" placeholder="Ex. Création du logo" value={x.label} onChange={(e) => setExtras((all) => all.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))} className="flex-1 min-w-0" />
              <Input aria-label="Prix de la ligne en euros" placeholder="€ TTC" inputMode="decimal" autoComplete="off" value={x.price} onChange={(e) => setExtras((all) => all.map((o, j) => (j === i ? { ...o, price: e.target.value } : o)))} className="!w-24 shrink-0" />
              <button type="button" className="icon-btn w-10 h-10 shrink-0 text-muted" aria-label="Retirer la ligne" onClick={() => setExtras((all) => all.filter((_, j) => j !== i))}><Trash2 size={17} /></button>
            </div>
          ))}
          <button type="button" className="btn-soft self-start h-10 min-h-0 text-[14px]" onClick={() => setExtras((all) => [...all, { label: '', price: '' }])}><Plus size={16} />Ajouter une ligne</button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="section-title mb-1">Maintenance</h3>
          <div role="radiogroup" aria-label="Maintenance" className="flex flex-col gap-2">
            {PLANS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={plan === p.id} onClick={() => setPlan(p.id)}
                className={cx('text-left p-3 rounded-xl border transition', plan === p.id ? 'border-copper bg-copper/8' : 'border-line bg-surface')}>
                <span className="flex items-baseline justify-between gap-3 font-semibold text-[14.5px]">
                  <span>{p.label}</span>
                  <span className="whitespace-nowrap">{p.price ? `${euros(p.price)}/mois` : '0 €'}</span>
                </span>
                <span className="block text-[12.5px] text-muted mt-0.5">{planOf(p.id).target}</span>
              </button>
            ))}
          </div>
          <p className="text-[12.5px] text-muted mt-1">Le devis montre les trois formules, avec celle-ci cochée.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="section-title">Hébergement et nom de domaine</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={managed} onClick={() => setManaged(true)} className={cx('chip justify-center h-11', managed && 'chip-on')}>Géré par QuadCore</button>
            <button type="button" aria-pressed={!managed} onClick={() => setManaged(false)} className={cx('chip justify-center h-11', !managed && 'chip-on')}>Géré par le client</button>
          </div>
          <Field label="Nom de domaine"><Input autoCapitalize="none" autoCorrect="off" autoComplete="off" placeholder="Ex. boulangerie-martin.fr" value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
          {managed && (
            <>
              <Field label="Prix par an (€ TTC) *" hint="Mettez 0 si c’est inclus. Le domaine reste au nom du client."><Input inputMode="decimal" autoComplete="off" placeholder="Ex. 60" value={yearlyText} onChange={(e) => setYearlyText(e.target.value)} /></Field>
              {Number.isNaN(yearly) && <p className="text-[12.5px] font-semibold text-danger -mt-1">Entrez un montant, par exemple 60.</p>}
            </>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="section-title">Paiement et délai</h3>
          <div>
            <span className="field-label">Paiement</span>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENTS.map((m) => <button key={m.id} type="button" aria-pressed={payment === m.id} onClick={() => setPayment(m.id)} className={cx('chip justify-center h-11 px-2', payment === m.id && 'chip-on')}>{m.label}</button>)}
            </div>
            <p className="text-[12.5px] text-muted mt-1.5">{paymentText(payment, totals.ttc, euros)}</p>
          </div>
          <p className="text-[12.5px] leading-snug rounded-xl bg-amber-500/12 text-amber-900 dark:text-amber-200 p-3">
            Signature en boutique avec un client de 5 salariés ou moins : n’encaissez rien pendant 7 jours. Il peut se rétracter pendant 14 jours.
          </p>
          <Field label="Mise en ligne prévue *"><Input value={delay} onChange={(e) => setDelay(e.target.value)} /></Field>
        </section>
      </div>
    </Sheet>
  )
}
