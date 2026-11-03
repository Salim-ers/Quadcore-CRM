import type {
  BillingStatus, Category, Priority, ProjectStatus, ProjectType, ProspectStatus, WorkStatus,
} from './types'

/** Tons de statut : discrets, lisibles en clair comme en sombre, jamais de violet ni de néon. */
export type Tone = 'stone' | 'sky' | 'amber' | 'orange' | 'teal' | 'copper' | 'blue' | 'green' | 'rose' | 'slate' | 'ink'

export const TONES: Record<Tone, { badge: string; dot: string; bar: string }> = {
  stone:  { badge: 'bg-stone-500/10 text-stone-700 dark:text-stone-300', dot: 'bg-stone-400', bar: 'bg-stone-400' },
  slate:  { badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300', dot: 'bg-slate-500', bar: 'bg-slate-500' },
  sky:    { badge: 'bg-sky-600/10 text-sky-800 dark:text-sky-300', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  blue:   { badge: 'bg-blue-600/10 text-blue-800 dark:text-blue-300', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  teal:   { badge: 'bg-teal-600/10 text-teal-800 dark:text-teal-300', dot: 'bg-teal-500', bar: 'bg-teal-500' },
  amber:  { badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  orange: { badge: 'bg-orange-500/12 text-orange-800 dark:text-orange-300', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  copper: { badge: 'bg-copper/12 text-copper-ink', dot: 'bg-copper', bar: 'bg-copper' },
  green:  { badge: 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  rose:   { badge: 'bg-rose-600/10 text-rose-800 dark:text-rose-300', dot: 'bg-rose-500', bar: 'bg-rose-500' },
  ink:    { badge: 'bg-ink text-bg', dot: 'bg-ink', bar: 'bg-ink' },
}

interface StatusDef<S> { value: S; label: string; short?: string; tone: Tone }

export const PROSPECT_STATUSES: StatusDef<ProspectStatus>[] = [
  { value: 'a_prospecter', label: 'À prospecter', tone: 'stone' },
  { value: 'contacte', label: 'Contacté', tone: 'sky' },
  { value: 'en_attente', label: 'En attente de réponse', short: 'En attente', tone: 'amber' },
  { value: 'a_relancer', label: 'À relancer', tone: 'orange' },
  { value: 'interesse', label: 'Intéressé', tone: 'teal' },
  { value: 'demo_proposee', label: 'Démo proposée', tone: 'copper' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'blue' },
  { value: 'gagne', label: 'Accepté / gagné', short: 'Gagné', tone: 'green' },
  { value: 'perdu', label: 'Refusé / perdu', short: 'Perdu', tone: 'rose' },
]

export const PROJECT_STATUSES: StatusDef<ProjectStatus>[] = [
  { value: 'a_preparer', label: 'À préparer', tone: 'stone' },
  { value: 'demo_creation', label: 'Démo en création', tone: 'sky' },
  { value: 'demo_prete', label: 'Démo prête', tone: 'teal' },
  { value: 'demo_envoyee', label: 'Démo envoyée', tone: 'copper' },
  { value: 'attente_validation', label: 'En attente de validation', short: 'Attente validation', tone: 'amber' },
  { value: 'modifs_demandees', label: 'Modifications demandées', short: 'Retouches', tone: 'orange' },
  { value: 'demo_refusee', label: 'Démo refusée', tone: 'rose' },
  { value: 'demo_validee', label: 'Démo validée', tone: 'green' },
  { value: 'dev_final', label: 'Site final en développement', short: 'Dév. final', tone: 'blue' },
  { value: 'pret_livrer', label: 'Site prêt à livrer', short: 'Prêt à livrer', tone: 'teal' },
  { value: 'livre', label: 'Livré', tone: 'ink' },
  { value: 'maintenance', label: 'Maintenance', tone: 'slate' },
]

export const PROSPECT_CLOSED: ProspectStatus[] = ['gagne', 'perdu']
export const PROJECT_DONE: ProjectStatus[] = ['livre', 'maintenance', 'demo_refusee']

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽' },
  { value: 'cafe', label: 'Café', emoji: '☕' },
  { value: 'boulangerie', label: 'Boulangerie', emoji: '🥖' },
  { value: 'barber', label: 'Barber', emoji: '💈' },
  { value: 'artisan', label: 'Artisan', emoji: '🛠' },
  { value: 'commerce', label: 'Commerce', emoji: '🛍' },
  { value: 'autre', label: 'Autre', emoji: '•' },
]

export const PRIORITIES: { value: Priority; label: string; tone: Tone }[] = [
  { value: 'basse', label: 'Basse', tone: 'stone' },
  { value: 'normale', label: 'Normale', tone: 'sky' },
  { value: 'haute', label: 'Haute', tone: 'copper' },
]

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'vitrine', label: 'Site vitrine' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'click_collect', label: 'Click & collect' },
  { value: 'application', label: 'Application' },
  { value: 'autre', label: 'Autre' },
]

export const BILLING: { value: BillingStatus; label: string; tone: Tone }[] = [
  { value: 'non_facture', label: 'Non facturé', tone: 'stone' },
  { value: 'devis_envoye', label: 'Devis envoyé', tone: 'blue' },
  { value: 'acompte_recu', label: 'Acompte reçu', tone: 'amber' },
  { value: 'facture', label: 'Facturé', tone: 'copper' },
  { value: 'paye', label: 'Payé', tone: 'green' },
]

export const WORK_STATUSES: { value: WorkStatus; label: string; tone: Tone }[] = [
  { value: 'a_faire', label: 'À faire', tone: 'stone' },
  { value: 'en_cours', label: 'En cours', tone: 'amber' },
  { value: 'termine', label: 'Terminé', tone: 'green' },
]

export const SOURCES = ['Instagram', 'Google Maps', 'Passage en boutique', 'Bouche-à-oreille', 'Facebook', 'TikTok', 'LinkedIn', 'Autre']
export const SERVICES = ['Site vitrine premium', 'Site vitrine + SEO', 'E-commerce', 'Click & collect', 'Outil de gestion', 'Carte de visite digitale', 'Carte de fidélité digitale', 'Maintenance']
export const LOST_REASONS = ['Pas de budget', 'A déjà un site', 'Pas intéressé', 'Pas le bon moment', 'Concurrent choisi', 'Injoignable']

export const MEMBER_COLORS = ['#AA543D', '#2F6B5E', '#3D5A80', '#8A6A2F', '#6B4E3D', '#52606D']

export const prospectStatus = (s: ProspectStatus) => PROSPECT_STATUSES.find((x) => x.value === s)!
export const projectStatus = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)!
export const categoryOf = (c: Category | null) => CATEGORIES.find((x) => x.value === c)
export const labelOf = <T extends string>(list: { value: T; label: string }[], v: T | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? '—'
