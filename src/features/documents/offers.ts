import { COMPANY } from '../../lib/company'
import type { Project, Prospect } from '../../lib/types'

// Le catalogue de quad-core.fr/creation-digitale. Prix en euros TTC.
export interface Offer { id: string; label: string; from: number; summary: string; includes: string[] }
export const OFFERS: Offer[] = [
  { id: 'vitrine', label: 'Site vitrine premium', from: 700, summary: 'Un site élégant pour valoriser votre activité, vos services et votre image.', includes: ['Design moderne et sur mesure', 'Pages illimitées', 'Optimisation SEO incluse'] },
  { id: 'seo', label: 'Site vitrine + SEO', from: 900, summary: 'Un site optimisé pour améliorer votre visibilité sur Google et attirer plus de clients.', includes: ['Référencement local et technique', 'Fiches Google Business', 'Suivi des performances'] },
  { id: 'outil', label: 'Outil de gestion sur mesure', from: 1200, summary: 'Un outil simple pour gérer votre activité au quotidien : clients, commandes, devis, rendez-vous.', includes: ['Fonctionnalités adaptées à vos besoins', 'Interface web ou mobile (PWA)', 'Automatisations et notifications'] },
  { id: 'complete', label: 'Solution web complète', from: 1500, summary: 'Site web, commandes en ligne, paiement, espace client, outils de gestion et fonctionnalités avancées.', includes: ['Tout-en-un adapté à votre activité', 'Application web et mobile (PWA)', 'Formations incluses'] },
  { id: 'carte', label: 'Carte de visite digitale', from: 149, summary: 'Une présentation professionnelle simple, moderne et accessible sur mobile.', includes: ['Page unique sur mesure', 'Infos de contact, horaires, réseaux', 'Optimisée pour mobile'] },
  { id: 'fidelite', label: 'Carte de fidélité digitale', from: 299, summary: 'Une solution pratique pour fidéliser vos clients sans support papier.', includes: ['Carte dématérialisée', 'Programme de fidélité personnalisé', 'Suivi et statistiques'] },
]

export type PlanId = 'aucune' | 'essentielle' | 'premium'
export const PLANS: { id: PlanId; label: string; price: number; target: string; includes: string[] }[] = [
  { id: 'aucune', label: 'Sans maintenance', price: 0, target: 'Vous gérez votre site', includes: ['Mises à jour et sécurité à votre charge', 'Interventions sur devis'] },
  { id: 'essentielle', label: 'Maintenance Essentielle', price: 39.99, target: 'Pour un site vitrine', includes: ['Mises à jour de sécurité', 'Sauvegardes régulières', 'Petites modifications (textes, images)', 'Support par e-mail'] },
  { id: 'premium', label: 'Maintenance Premium', price: 79.99, target: 'Pour une solution complète', includes: ['Tout le contenu de la formule Essentielle', 'Mises à jour applicatives', 'Surveillance et optimisation des performances', 'Support prioritaire (e-mail, téléphone)', 'Évolutions et nouvelles fonctionnalités incluses'] },
]

// Conditions par défaut : modifiables ici pour tous les devis
export const TERMS = { deposit: 50, validityDays: 30, revisions: 2, noticeDays: 30, delay: '7 jours après la commande et la réception de vos contenus' }

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
  deposit: number
  delay: string
}

const cents = (v: number) => Math.round(v * 100) / 100
export const withoutVat = (ttc: number) => cents(ttc / (1 + COMPANY.vatRate))
export const planOf = (id: PlanId) => PLANS.find((p) => p.id === id)!

/** Ce que le client paie, en euros TTC, et la TVA comprise dedans. */
export function quoteTotals(q: Pick<QuoteDraft, 'price' | 'extras' | 'deposit'>) {
  const ttc = cents([q.price, ...q.extras.map((e) => e.price)].reduce((n, v) => n + v, 0))
  const ht = cents([q.price, ...q.extras.map((e) => e.price)].reduce((n, v) => n + withoutVat(v), 0))
  const deposit = cents((ttc * q.deposit) / 100)
  return { ttc, ht, vat: cents(ttc - ht), deposit, balance: cents(ttc - deposit) }
}

/** L'offre la plus proche de ce qu'on sait déjà du site et de sa fiche. */
export function offerFor(project: Pick<Project, 'type'>, client?: Pick<Prospect, 'service'>) {
  const service = (client?.service ?? '').toLowerCase()
  const byService = OFFERS.find((o) => o.label.toLowerCase() === service) ?? (service.includes('outil') ? OFFERS[2] : undefined)
  if (byService) return byService
  if (project.type === 'application') return OFFERS[2]
  if (project.type === 'ecommerce' || project.type === 'click_collect') return OFFERS[3]
  return OFFERS[0]
}

export function quoteNumber(projectId: string, already: number, date: Date) {
  const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `D-${day}-${projectId.replace(/-/g, '').slice(0, 4).toUpperCase()}${already ? `-${already + 1}` : ''}`
}
