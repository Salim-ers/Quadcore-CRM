import type {
  BillingStatus, Category, Channel, Priority, ProjectStatus, ProjectType, ProspectStatus, Role, TicketPriority, TicketStatus, TicketType, WorkStatus,
} from './types'
import team from './team.json'

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

// Statuts stockés en base : gardés pour l'historique, mais l'app n'affiche que le parcours simple ci-dessous
export const PROSPECT_STATUSES: StatusDef<ProspectStatus>[] = [
  { value: 'a_prospecter', label: 'Prospect', tone: 'stone' },
  { value: 'contacte', label: 'Client vu', tone: 'sky' },
  { value: 'en_attente', label: 'Client vu', tone: 'sky' },
  { value: 'a_relancer', label: 'À relancer', tone: 'orange' },
  { value: 'interesse', label: 'Client vu', tone: 'sky' },
  { value: 'demo_proposee', label: 'Client vu', tone: 'sky' },
  { value: 'devis_envoye', label: 'Client vu', tone: 'sky' },
  { value: 'gagne', label: 'Accepté', tone: 'green' },
  { value: 'perdu', label: 'Refusé', tone: 'rose' },
]

export const PROJECT_STATUSES: StatusDef<ProjectStatus>[] = [
  { value: 'a_preparer', label: 'Site en cours', tone: 'amber' },
  { value: 'demo_creation', label: 'Site en cours', tone: 'amber' },
  { value: 'demo_prete', label: 'Site en cours', tone: 'amber' },
  { value: 'demo_envoyee', label: 'Site en cours', tone: 'amber' },
  { value: 'attente_validation', label: 'Site en cours', tone: 'amber' },
  { value: 'modifs_demandees', label: 'Retouches en cours', tone: 'amber' },
  { value: 'demo_refusee', label: 'Site en cours', tone: 'amber' },
  { value: 'demo_validee', label: 'Site en cours', tone: 'amber' },
  { value: 'dev_final', label: 'Site en cours', tone: 'amber' },
  { value: 'pret_livrer', label: 'Site en cours', tone: 'amber' },
  { value: 'livre', label: 'Site livré', tone: 'green' },
  { value: 'maintenance', label: 'Site livré', tone: 'green' },
]

export const PROSPECT_CLOSED: ProspectStatus[] = ['gagne', 'perdu']
export const PROJECT_DONE: ProjectStatus[] = ['livre', 'maintenance', 'demo_refusee']

// ———————————————————————— Le parcours : Prospect → Client vu → Accepté ou Refusé → Site en cours → Site livré ————————
export type ProspectStep = 'prospect' | 'vu' | 'accepte' | 'refuse'
export const PROSPECT_STEPS: { value: ProspectStep; label: string; plural: string; tone: Tone; status: ProspectStatus }[] = [
  { value: 'prospect', label: 'Prospect', plural: 'Prospects', tone: 'stone', status: 'a_prospecter' },
  { value: 'vu', label: 'Client vu', plural: 'Clients vus', tone: 'sky', status: 'contacte' },
  { value: 'accepte', label: 'Accepté', plural: 'Acceptés', tone: 'green', status: 'gagne' },
  { value: 'refuse', label: 'Refusé', plural: 'Refusés', tone: 'rose', status: 'perdu' },
]
export const prospectStep = (s: ProspectStatus): ProspectStep =>
  s === 'a_prospecter' ? 'prospect' : s === 'gagne' ? 'accepte' : s === 'perdu' ? 'refuse' : 'vu'

export type SiteStep = 'en_cours' | 'livre'
export const SITE_STEPS: { value: SiteStep; label: string; plural: string; tone: Tone; status: ProjectStatus }[] = [
  { value: 'en_cours', label: 'Site en cours', plural: 'Sites en cours', tone: 'amber', status: 'dev_final' },
  { value: 'livre', label: 'Site livré', plural: 'Sites livrés', tone: 'green', status: 'livre' },
]
export const siteStep = (s: ProjectStatus): SiteStep => (s === 'livre' || s === 'maintenance' ? 'livre' : 'en_cours')

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

/** Les quatre associés : créés par `npm run neon:installer`, proposés en un geste dans « Inviter » s'il en manque un. */
export const TEAM_ROSTER = team as { first_name: string; last_name: string; email: string; role: Role; color: string }[]

export const TICKET_STATUSES: StatusDef<TicketStatus>[] = [
  { value: 'nouveau', label: 'Nouveau', tone: 'sky' },
  { value: 'en_cours', label: 'En cours', tone: 'amber' },
  { value: 'attente_client', label: 'En attente du client', short: 'Attente client', tone: 'copper' },
  { value: 'resolu', label: 'Résolu', tone: 'green' },
  { value: 'ferme', label: 'Fermé', tone: 'slate' },
]
export const TICKET_DONE: TicketStatus[] = ['resolu', 'ferme']

/** `days` : délai de traitement proposé à la création, modifiable sur chaque ticket. */
export const TICKET_PRIORITIES: { value: TicketPriority; label: string; tone: Tone; days: number }[] = [
  { value: 'basse', label: 'Basse', tone: 'stone', days: 7 },
  { value: 'normale', label: 'Normale', tone: 'sky', days: 3 },
  { value: 'haute', label: 'Haute', tone: 'orange', days: 1 },
  { value: 'urgente', label: 'Urgente', tone: 'rose', days: 0 },
]

export const TICKET_TYPES: { value: TicketType; label: string }[] = [
  { value: 'demande', label: 'Demande' },
  { value: 'incident', label: 'Panne / bug' },
  { value: 'question', label: 'Question' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'autre', label: 'Autre' },
]

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'telephone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'sur_place', label: 'Sur place' },
  { value: 'autre', label: 'Autre' },
]

/** Au-delà, un client apparaît dans « Sans nouvelles ». */
export const CLIENT_QUIET_DAYS = 30
/** Au-delà, un ticket en attente du client remonte dans « À faire aujourd'hui ». */
export const TICKET_WAIT_DAYS = 3

export const prospectStatus = (s: ProspectStatus) => PROSPECT_STATUSES.find((x) => x.value === s)!
export const projectStatus = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)!
export const ticketStatus = (s: TicketStatus) => TICKET_STATUSES.find((x) => x.value === s)!
export const ticketPriority = (p: TicketPriority) => TICKET_PRIORITIES.find((x) => x.value === p)!
export const categoryOf = (c: Category | null) => CATEGORIES.find((x) => x.value === c)
export const labelOf = <T extends string>(list: { value: T; label: string }[], v: T | null | undefined) =>
  list.find((x) => x.value === v)?.label ?? '—'
