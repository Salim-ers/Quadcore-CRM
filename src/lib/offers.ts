import { COMPANY } from './company'
import type { Project, Prospect } from './types'

// La plaquette QuadCore : ces prix sont repris partout. Prix en euros TTC.
export interface Offer { id: string; label: string; price: number; includes: string[] }
export const OFFERS: Offer[] = [
  { id: 'vitrine', label: 'Site vitrine premium', price: 899, includes: ['Design moderne et personnalisé', 'Site responsive mobile, tablette, desktop', 'Jusqu’à 5 pages', 'Formulaire de contact'] },
  { id: 'seo', label: 'Site vitrine + SEO', price: 1199, includes: ['Site premium + optimisation SEO', 'Référencement local', 'Performance technique', 'Base Google Business et visibilité'] },
  { id: 'gestion', label: 'Espace de gestion sur mesure', price: 1999, includes: ['Outil interne pour gérer votre activité', 'Tableau de bord, clients, devis, suivi', 'Interface web ou mobile', 'Adapté à vos besoins métier'] },
  { id: 'complete', label: 'Solution complète sur mesure', price: 2499, includes: ['Site web + espace de gestion', 'Commandes, espace client ou réservation', 'Fonctionnalités avancées', 'Solution connectée et évolutive'] },
  { id: 'carte', label: 'Carte de visite digitale', price: 149, includes: ['Page unique sur mesure', 'Infos de contact, horaires, réseaux', 'Optimisée pour mobile'] },
  { id: 'fidelite', label: 'Carte de fidélité digitale', price: 349, includes: ['Carte dématérialisée', 'Programme de fidélité personnalisé', 'Suivi et statistiques'] },
]

export type PlanId = 'aucune' | 'essentielle' | 'premium'
export const PLANS: { id: PlanId; label: string; price: number; target: string; includes: string[] }[] = [
  { id: 'aucune', label: 'Sans maintenance', price: 0, target: 'Vous gérez votre site', includes: ['Mises à jour et sécurité à votre charge', 'Interventions sur devis'] },
  { id: 'essentielle', label: 'Maintenance Essentielle', price: 39.99, target: 'Pour un site vitrine', includes: ['Mises à jour de sécurité', 'Sauvegardes', 'Petites modifications'] },
  { id: 'premium', label: 'Maintenance Premium', price: 79.99, target: 'Pour une solution complète', includes: ['Tout le contenu de la formule Essentielle', 'Support prioritaire', 'Optimisation', 'Évolutions mineures'] },
]

// Conditions par défaut : modifiables ici pour tous les devis
export const TERMS = { deposit: 50, validityDays: 30, revisions: 2, noticeDays: 30, hostingYearly: 300, delay: '7 jours après la commande et la réception de vos contenus' }

export type PaymentId = 'acompte' | '3x' | '4x' | 'comptant'
export const PAYMENTS: { id: PaymentId; label: string }[] = [
  { id: 'acompte', label: `Acompte ${TERMS.deposit} %` },
  { id: '3x', label: '3 fois sans frais' },
  { id: '4x', label: '4 fois sans frais' },
  { id: 'comptant', label: 'En une fois' },
]

export interface QuoteLine { label: string; price: number }
export interface QuoteDraft {
  number: string
  date: Date
  client: { name: string; contact: string; address: string; email: string }
  offer: Offer
  price: number
  extras: QuoteLine[]
  plan: PlanId
  hosting: { managed: boolean; domain: string; yearly: number | null }
  payment: PaymentId
  delay: string
}

const cents = (v: number) => Math.round(v * 100) / 100
export const withoutVat = (ttc: number) => cents(ttc / (1 + COMPANY.vatRate))
export const planOf = (id: PlanId) => PLANS.find((p) => p.id === id)!
export const offerById = (id: string | null | undefined) => OFFERS.find((o) => o.id === id)
export const offerByPrice = (price: number | null | undefined) => OFFERS.find((o) => o.price === price)

/** Des versements égaux au centime près : le dernier rattrape l'arrondi. */
export function installments(total: number, count: number) {
  const part = cents(total / count)
  return Array.from({ length: count }, (_, i) => (i < count - 1 ? part : cents(total - part * (count - 1))))
}

/** Ce que le client paie, en euros TTC, et la TVA comprise dedans. */
export function quoteTotals(q: Pick<QuoteDraft, 'price' | 'extras'>) {
  const amounts = [q.price, ...q.extras.map((e) => e.price)]
  const ttc = cents(amounts.reduce((n, v) => n + v, 0))
  const ht = cents(amounts.reduce((n, v) => n + withoutVat(v), 0))
  return { ttc, ht, vat: cents(ttc - ht) }
}

/** Le paiement en une phrase, identique dans l'appli et sur le devis. */
export function paymentText(payment: PaymentId, ttc: number, money: (v: number) => string) {
  if (payment === 'comptant') return `Paiement à la commande : ${money(ttc)} TTC.`
  if (payment === 'acompte') {
    const deposit = cents((ttc * TERMS.deposit) / 100)
    return `Acompte à la commande : ${money(deposit)} TTC (${TERMS.deposit} %). Solde à la mise en ligne : ${money(cents(ttc - deposit))} TTC.`
  }
  const count = payment === '3x' ? 3 : 4
  const parts = installments(ttc, count)
  const last = parts[count - 1]
  const amounts = last === parts[0] ? `${count} versements de ${money(last)} TTC` : `${count - 1} versements de ${money(parts[0])} TTC et un de ${money(last)} TTC`
  return `Paiement en ${count} fois sans frais : ${amounts}, le premier à la commande, puis un par mois.`
}

/** L'offre la plus proche de ce qu'on sait déjà du site et de sa fiche. */
export function offerFor(project: Pick<Project, 'type' | 'price_proposed'>, client?: Pick<Prospect, 'service'>) {
  const byPrice = offerByPrice(project.price_proposed)
  if (byPrice) return byPrice
  const service = (client?.service ?? '').toLowerCase()
  const byService = OFFERS.find((o) => o.label.toLowerCase() === service)
  if (byService) return byService
  if (service.includes('outil') || service.includes('gestion') || project.type === 'application') return offerById('gestion')!
  if (service.includes('e-commerce') || service.includes('click') || project.type === 'ecommerce' || project.type === 'click_collect') return offerById('complete')!
  if (service.includes('seo')) return offerById('seo')!
  return offerById('vitrine')!
}

export function quoteNumber(projectId: string, already: number, date: Date) {
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `D-${day}-${projectId.replace(/-/g, '').slice(0, 4).toUpperCase()}${already ? `-${already + 1}` : ''}`
}
