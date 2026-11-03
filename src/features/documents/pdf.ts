// Chargé à la demande : la bibliothèque PDF ne pèse pas sur l'ouverture de l'application.
import { jsPDF } from 'jspdf'
import markUrl from '../../assets/mark-128.png'
import { COMPANY, companyLegalLine } from '../../lib/company'
import { CGV_VERSION, cgvSections, withdrawalForm } from './cgv'
import { PLANS, TERMS, paymentText, quoteTotals, withoutVat, type QuoteDraft } from '../../lib/offers'

type RGB = [number, number, number]
const COPPER: RGB = [164, 79, 57], INK: RGB = [23, 22, 24], MUTED: RGB = [108, 101, 93], LINE: RGB = [228, 220, 209], TINT: RGB = [246, 242, 236]
const W = 210, H = 297, M = 16, CW = W - 2 * M, BOTTOM = H - 17

// Les espaces fines d'Intl ne sont pas dans la police du PDF
const plain = (s: string) => s.replace(/[  ]/g, ' ')
const money = (v: number) => plain(new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v))
const longDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const safeName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')

async function loadLogo() {
  const blob = await (await fetch(markUrl)).blob()
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

class Writer {
  d = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  y = M

  constructor() {
    this.d.setLanguage('fr-FR')
  }

  style(size: number, weight: 'normal' | 'bold' = 'normal', color: RGB = INK) {
    this.d.setFont('helvetica', weight)
    this.d.setFontSize(size)
    this.d.setTextColor(...color)
  }

  lineHeight(size: number) {
    return size * 0.3528 * 1.34
  }

  lines(text: string, width: number): string[] {
    return this.d.splitTextToSize(plain(text), width)
  }

  need(height: number) {
    if (this.y + height > BOTTOM) { this.d.addPage(); this.y = M }
  }

  /** Écrit un paragraphe et avance le curseur, sur une nouvelle page si besoin. */
  text(text: string, opts: { size?: number; weight?: 'normal' | 'bold'; color?: RGB; x?: number; width?: number; after?: number } = {}) {
    const { size = 9.5, weight = 'normal', color = INK, x = M, width = CW, after = 0 } = opts
    this.style(size, weight, color)
    const lh = this.lineHeight(size)
    for (const line of this.lines(text, width)) {
      this.need(lh)
      this.d.text(line, x, this.y + lh * 0.75)
      this.y += lh
    }
    this.y += after
  }

  heading(text: string) {
    this.need(14)
    this.y += 4
    this.text(text, { size: 11, weight: 'bold', color: COPPER, after: 1.8 })
  }

  rule(y = this.y, x1 = M, x2 = M + CW) {
    this.d.setDrawColor(...LINE)
    this.d.setLineWidth(0.25)
    this.d.line(x1, y, x2, y)
  }

  checkbox(x: number, y: number, checked: boolean, size = 3.4) {
    const { d } = this
    d.setDrawColor(...(checked ? COPPER : MUTED))
    d.setLineWidth(0.3)
    if (checked) { d.setFillColor(...COPPER); d.roundedRect(x, y, size, size, 0.5, 0.5, 'FD') } else d.roundedRect(x, y, size, size, 0.5, 0.5, 'S')
    if (checked) {
      d.setDrawColor(255, 255, 255)
      d.setLineWidth(0.5)
      d.line(x + size * 0.22, y + size * 0.52, x + size * 0.42, y + size * 0.72)
      d.line(x + size * 0.42, y + size * 0.72, x + size * 0.78, y + size * 0.28)
    }
  }

  footer() {
    const { d } = this
    const total = d.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      d.setPage(i)
      this.rule(H - 13)
      this.style(6.8, 'normal', MUTED)
      d.text(this.lines(companyLegalLine(), CW - 18), M, H - 10)
      d.text(`Page ${i} / ${total}`, M + CW, H - 10, { align: 'right' })
    }
  }
}

/** Une colonne de chiffres : aligne le montant à droite. */
function amounts(w: Writer, y: number, values: string[], size = 9.5, weight: 'normal' | 'bold' = 'normal') {
  const right = [M + CW - 50, M + CW - 25, M + CW]
  w.style(size, weight)
  values.forEach((v, i) => w.d.text(v, right[i], y, { align: 'right' }))
}

function quotePage(w: Writer, q: QuoteDraft, logo: string) {
  const { d } = w
  const totals = quoteTotals(q)

  // En-tête
  d.addImage(logo, 'PNG', M, M - 1, 13, 13)
  w.style(14, 'bold')
  d.text('QUADCORE', M + 16, M + 4.5)
  w.style(8.5, 'normal', MUTED)
  d.text(`${COMPANY.web} · ${COMPANY.email} · ${COMPANY.phone}`, M + 16, M + 9.5)
  w.style(22, 'bold', COPPER)
  d.text('Devis', M + CW, M + 6, { align: 'right' })
  w.style(9, 'normal', MUTED)
  d.text(`N° ${q.number}`, M + CW, M + 11, { align: 'right' })
  w.y = M + 18

  // Les deux parties
  const cardY = w.y, cardW = (CW - 6) / 2
  const validity = new Date(q.date.getTime() + TERMS.validityDays * 864e5)
  const left = [`${COMPANY.address}, ${COMPANY.city}`, `SIRET ${COMPANY.siret}`, `TVA ${COMPANY.vat}`, `Devis du ${longDate(q.date)}`, `Valable jusqu’au ${longDate(validity)}`]
  const right = [q.client.contact, q.client.address, q.client.email].filter(Boolean)
  const rightLines = right.flatMap((l) => w.lines(l, cardW - 8))
  const cardH = 9 + Math.max(left.length, rightLines.length + 1) * 4.2 + 3
  d.setFillColor(...TINT)
  d.roundedRect(M + cardW + 6, cardY, cardW, cardH, 2, 2, 'F')
  w.style(9.5, 'bold')
  d.text(COMPANY.name, M, cardY + 5)
  w.style(8.8, 'normal', MUTED)
  left.forEach((l, i) => d.text(plain(l), M, cardY + 9.7 + i * 4.2))
  w.style(7.8, 'bold', COPPER)
  d.text('POUR', M + cardW + 10, cardY + 5)
  w.style(9.5, 'bold')
  const nameLine = w.lines(q.client.name, cardW - 8)[0]
  d.text(nameLine, M + cardW + 10, cardY + 9.7)
  w.style(8.8, 'normal', MUTED)
  rightLines.forEach((l, i) => d.text(l, M + cardW + 10, cardY + 13.9 + i * 4.2))
  w.y = cardY + cardH + 7

  // Les lignes du devis
  w.style(8, 'bold', MUTED)
  d.text('DÉSIGNATION', M, w.y)
  amounts(w, w.y, ['Prix HT', 'TVA', 'Prix TTC'], 8, 'bold')
  w.y += 2
  w.rule()
  w.y += 4.6
  const row = (label: string, ttc: number, details: string[]) => {
    const ht = withoutVat(ttc)
    w.need(8 + details.length * 3.8)
    amounts(w, w.y, [money(ht), money(Math.round((ttc - ht) * 100) / 100), money(ttc)])
    w.style(9.8, 'bold')
    w.lines(label, CW - 82).forEach((line) => { d.text(line, M, w.y); w.y += 4.3 })
    details.forEach((t) => w.text(t, { size: 8.5, color: MUTED, width: CW - 82 }))
    w.y += 2.2
    w.rule()
    w.y += 4.6
  }
  row(q.offer.label, q.price, q.offer.includes.map((i) => `- ${i}`))
  q.extras.forEach((e) => row(e.label, e.price, []))

  // Les totaux
  w.y += 0.6
  const totalRow = (label: string, value: string, strong = false) => {
    w.need(6)
    w.style(strong ? 11 : 9.5, strong ? 'bold' : 'normal', strong ? COPPER : INK)
    d.text(label, M + CW - 60, w.y)
    d.text(value, M + CW, w.y, { align: 'right' })
    w.y += strong ? 6 : 4.8
  }
  totalRow('Total HT', money(totals.ht))
  totalRow(`TVA ${Math.round(COMPANY.vatRate * 100)} %`, money(totals.vat))
  totalRow('Total TTC', money(totals.ttc), true)

  // Le paiement
  w.heading('Paiement et délai')
  w.text(paymentText(q.payment, totals.ttc, money), { size: 9.5 })
  w.text(`Mise en ligne prévue : ${q.delay}. ${TERMS.revisions} séries de retouches comprises.`, { size: 9.5 })
  w.text('Si le droit de rétractation s’applique à vous (contrat signé hors de nos locaux, cinq salariés au plus), aucun paiement n’est dû avant le 8e jour suivant la signature.', { size: 8.2, color: MUTED, after: 1 })

  // La maintenance
  w.heading('Maintenance : votre formule')
  const planW = (CW - 8) / 3
  const planLines = PLANS.map((p) => p.includes.map((t) => w.lines(`- ${t}`, planW - 7)))
  const planH = 17 + Math.max(...planLines.map((g) => g.flat().length)) * 3.55
  w.need(planH + 4)
  const top = w.y
  PLANS.forEach((p, i) => {
    const x = M + i * (planW + 4), chosen = q.plan === p.id
    d.setDrawColor(...(chosen ? COPPER : LINE))
    d.setLineWidth(chosen ? 0.5 : 0.25)
    d.roundedRect(x, top, planW, planH, 2, 2, 'S')
    w.checkbox(x + 3, top + 3, chosen)
    w.style(9, 'bold')
    const name = w.lines(p.label.replace('Maintenance ', ''), planW - 11)[0]
    d.text(name, x + 8, top + 5.8)
    w.style(9.5, 'bold', COPPER)
    d.text(p.price ? `${money(p.price)} TTC / mois` : '0 €', x + 3, top + 10.8)
    w.style(7.8, 'normal', MUTED)
    d.text(p.target, x + 3, top + 14.4)
    let ly = top + 18
    w.style(7.8, 'normal', INK)
    planLines[i].flat().forEach((l) => { d.text(l, x + 3, ly); ly += 3.55 })
  })
  w.y = top + planH + 2
  w.text(`Sans durée minimale : la maintenance s’arrête quand vous le décidez, avec ${TERMS.noticeDays} jours de préavis.`, { size: 8.2, color: MUTED })

  // Hébergement et domaine
  w.heading('Hébergement et nom de domaine')
  if (q.hosting.managed) {
    const cost = q.hosting.yearly ? `${money(q.hosting.yearly)} TTC par an` : 'inclus dans ce devis'
    w.text(`Nous gérons l’hébergement et le nom de domaine pour vous${q.hosting.domain ? ` (${q.hosting.domain})` : ''} : ${cost}. Hébergement sécurisé et performant, renouvellement du nom de domaine compris dans cette gestion.`, { size: 9.5 })
  } else {
    w.text(`Vous gardez la gestion de votre hébergement et de votre nom de domaine${q.hosting.domain ? ` (${q.hosting.domain})` : ''}, et leurs frais. Nous y installons votre site.`, { size: 9.5 })
  }

  // Ce qui lui appartient
  const own = [
    'Votre nom de domaine est enregistré à votre nom. Il vous appartient, même si vous arrêtez de travailler avec nous.',
    'Vos comptes et accès vous sont fournis : vous restez propriétaire.',
    'Votre site vous appartient dès que ce devis est entièrement payé. Vos textes, photos et logo restent les vôtres.',
    'Aucun engagement forcé : la maintenance s’arrête quand vous le décidez, et vous gardez votre nom de domaine.',
  ]
  const ownLines = own.map((t) => w.lines(t, CW - 13))
  const ownH = 10 + ownLines.flat().length * 4.05 + 2.5
  w.y += 3
  w.need(ownH)
  d.setFillColor(...TINT)
  d.roundedRect(M, w.y, CW, ownH, 2, 2, 'F')
  w.style(10, 'bold', COPPER)
  d.text('Ce qui vous appartient', M + 4, w.y + 6)
  let oy = w.y + 11
  ownLines.forEach((group) => {
    w.style(9, 'bold', COPPER)
    d.text('-', M + 4, oy)
    w.style(9, 'normal')
    group.forEach((l) => { d.text(l, M + 8, oy); oy += 4.05 })
  })
  w.y += ownH + 2

  // L'accord
  w.need(50)
  w.heading('Bon pour accord')
  const consent = [
    'J’ai lu et j’accepte le présent devis et les conditions générales de vente jointes.',
    'Je demande que les travaux commencent sans attendre la fin du délai de rétractation de 14 jours, si ce délai s’applique à moi. Si je me rétracte ensuite, je paierai le travail déjà réalisé.',
  ]
  consent.forEach((t) => {
    const lines = w.lines(t, CW - 7)
    w.checkbox(M, w.y + 0.3, false)
    w.style(9, 'normal')
    lines.forEach((l) => { d.text(l, M + 6, w.y + 3); w.y += 4.05 })
    w.y += 1.6
  })
  w.y += 1.5
  const boxY = w.y, boxH = 27
  d.setDrawColor(...LINE)
  d.setLineWidth(0.25)
  d.roundedRect(M, boxY, CW, boxH, 2, 2, 'S')
  w.style(8.5, 'normal', MUTED)
  d.text('Nom, fonction, date et lieu :', M + 3, boxY + 5)
  d.text('Signature, précédée de la mention « Bon pour accord » :', M + CW / 2, boxY + 5)
  w.y = boxY + boxH
}

function cgvPages(w: Writer) {
  const { d } = w
  d.addPage()
  w.y = M
  w.text('Conditions générales de vente', { size: 16, weight: 'bold', color: COPPER, after: 0.5 })
  w.text(`${COMPANY.name} · version de ${CGV_VERSION}`, { size: 8.5, color: MUTED, after: 3 })
  const gap = 7, colW = (CW - gap) / 2, top = w.y
  let col = 0
  const nextColumn = () => {
    if (col === 0) { col = 1; w.y = top } else { d.addPage(); col = 0; w.y = M }
  }
  const SIZE = 7.9, lh = w.lineHeight(SIZE)
  // Une colonne remplie passe à la suivante, puis à la page suivante
  let columnTop = top
  const place = () => M + col * (colW + gap)
  cgvSections().forEach((section, i) => {
    const title = w.lines(`${i + 1}. ${section.title}`, colW)
    const firstLines = w.lines(section.paragraphs[0], colW).length
    if (w.y + title.length * 4 + Math.min(firstLines, 3) * lh + 2 > BOTTOM) { nextColumn(); columnTop = w.y }
    w.y += w.y === columnTop ? 0 : 2.2
    w.style(8.6, 'bold', COPPER)
    title.forEach((l) => { d.text(l, place(), w.y + 3); w.y += 3.9 })
    w.y += 0.5
    section.paragraphs.forEach((p) => {
      w.style(SIZE, 'normal')
      w.lines(p, colW).forEach((l) => {
        if (w.y + lh > BOTTOM) { nextColumn(); columnTop = w.y; w.style(SIZE, 'normal') }
        d.text(l, place(), w.y + lh * 0.75)
        w.y += lh
      })
      w.y += 1
    })
  })
}

function withdrawalPage(w: Writer) {
  const { d } = w
  const form = withdrawalForm()
  d.addPage()
  w.y = M
  w.text(form.title, { size: 16, weight: 'bold', color: COPPER, after: 3 })
  w.text(form.intro, { size: 9.5, color: MUTED, after: 6 })
  w.text(form.to, { size: 10, weight: 'bold', after: 5 })
  w.text(form.body, { size: 10, after: 7 })
  form.fields.forEach((f) => {
    w.text(f + ' :', { size: 9.5, color: MUTED, after: 8 })
    w.rule()
    w.y += 5
  })
}

function toFile(w: Writer, name: string, title: string) {
  w.footer()
  w.d.setProperties({ title, author: COMPANY.name, creator: COMPANY.name })
  return new File([w.d.output('blob')], name, { type: 'application/pdf' })
}

/** Le devis, suivi des CGV et du formulaire de rétractation : tout ce que le client doit recevoir. */
export async function quotePdf(q: QuoteDraft) {
  const w = new Writer()
  quotePage(w, q, await loadLogo())
  cgvPages(w)
  withdrawalPage(w)
  return toFile(w, `Devis-${q.number}-${safeName(q.client.name)}.pdf`, `Devis ${q.number} - ${q.client.name}`)
}

export async function cgvPdf() {
  const w = new Writer()
  cgvPages(w)
  w.d.deletePage(1)
  withdrawalPage(w)
  return toFile(w, 'CGV-QUADCORE.pdf', `Conditions générales de vente - ${COMPANY.name}`)
}
