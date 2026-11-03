// Données de démonstration — entièrement fictives, recalculées par rapport à la date du jour.
import type { DB, Profile } from '../lib/types'
import { DemoEngine } from './demoBackend'
import { addDaysStr } from '../lib/dates'
import { normalizeInstagram } from '../lib/links'

const day = (offset: number) => addDaysStr(offset)

export function buildSeed(): DB {
  const db: DB = {
    profiles: [], prospects: [], projects: [], revisions: [], tasks: [], tickets: [], comments: [], attachments: [], status_history: [], activities: [],
  }
  const created = new Date(Date.now() - 90 * 864e5).toISOString()
  const team: Profile[] = [
    { id: 'u-salim', email: 'salim@quadcore.demo', first_name: 'Salim', last_name: 'EL RHALMANI', role: 'admin', color: '#AA543D' },
    { id: 'u-hasan', email: 'hasan@quadcore.demo', first_name: 'Hasan', last_name: 'AKAR', role: 'member', color: '#2F6B5E' },
    { id: 'u-sadish', email: 'sadish@quadcore.demo', first_name: 'Sadish', last_name: 'AROUL', role: 'member', color: '#3D5A80' },
    { id: 'u-moustakine', email: 'moustakine@quadcore.demo', first_name: 'Moustakine', last_name: 'MOUHAMAD', role: 'member', color: '#8A6A2F' },
  ].map((p) => ({ ...p, avatar_url: null, active: true, created_at: created }) as Profile)
  db.profiles = team

  const e = new DemoEngine(db)
  // horloge pilotée : chaque action est datée dans le passé pour un historique crédible
  let t = Date.now() - 21 * 864e5
  const step = (minutes: number) => { t += minutes * 60_000 }
  const at = (daysAgo: number, h = 10, m = 0) => {
    const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); t = d.getTime()
  }
  e.clock = () => new Date(t)
  const as = (id: string) => { e.actor = id }
  const P = (data: Record<string, unknown>) => {
    step(7)
    const ig = normalizeInstagram((data.instagram_handle as string) ?? null)
    return e.insert('prospects', { ...data, instagram_url: ig.url }).id
  }
  const upd = (table: 'prospects' | 'projects' | 'revisions' | 'tasks' | 'tickets', id: string, patch: Record<string, unknown>) => { step(11); e.update(table, id, patch) }

  // ——— Prospects ———
  at(20, 9, 40); as('u-hasan')
  const coffee = P({
    name: 'Coffee Concept', category: 'cafe', contact_name: 'Camille Roussel', phone: '06 12 34 56 78', email: 'bonjour@coffeeconcept.fr',
    address: '12 rue de la République', city: 'Beauvais', instagram_handle: 'coffeeconcept.beauvais', source: 'Instagram',
    service: 'Site vitrine premium', owner_id: 'u-hasan', priority: 'haute', notes: 'Très actifs sur Instagram, aucune carte en ligne. Veulent mettre en avant le brunch du week-end.',
  })
  as('u-salim')
  const fournil = P({
    name: 'Le Fournil du Parc', category: 'boulangerie', contact_name: 'Marc Dupuis', phone: '06 45 22 10 98', city: 'Clermont',
    address: '3 place de l’Hôtel de Ville', source: 'Passage en boutique', service: 'Site vitrine + SEO', owner_id: 'u-salim',
  })
  const brasserie = P({
    name: 'Brasserie du Marché', category: 'restaurant', contact_name: 'Sophie Lambert', phone: '03 44 50 12 12', email: 'contact@brasseriedumarche.fr',
    city: 'Compiègne', instagram_handle: 'brasseriedumarche', website_url: 'https://brasseriedumarche-ancien.fr', source: 'Google Maps',
    service: 'Click & collect', owner_id: 'u-sadish', priority: 'haute',
  })
  at(14, 11, 5); as('u-moustakine')
  const lefevre = P({
    name: 'Boulangerie Maison Lefèvre', category: 'boulangerie', contact_name: 'Julie Lefèvre', phone: '06 77 81 23 45', city: 'Senlis',
    instagram_handle: 'maison.lefevre', source: 'Instagram', service: 'Site vitrine premium', owner_id: 'u-moustakine',
  })
  const sushi = P({
    name: 'Sushi Kaze', category: 'restaurant', contact_name: 'Kenji Morel', phone: '07 61 44 02 19', email: 'kaze.sushi@gmail.com',
    city: 'Creil', instagram_handle: 'sushikaze60', source: 'Instagram', service: 'E-commerce', owner_id: 'u-sadish',
  })
  const barber = P({
    name: 'Barber Club 60', category: 'barber', contact_name: 'Yanis Haddou', phone: '06 98 76 54 32', city: 'Clermont',
    instagram_handle: 'barberclub60', tiktok_url: 'https://www.tiktok.com/@barberclub60', website_url: 'https://barber-club-60.vercel.app', source: 'TikTok', service: 'Site vitrine premium', owner_id: 'u-salim',
  })
  at(9, 15, 20); as('u-sadish')
  const comptoir = P({
    name: 'Le Petit Comptoir', category: 'restaurant', contact_name: 'Hugo Bernard', phone: '06 31 20 87 66', city: 'Chantilly',
    instagram_handle: 'lepetitcomptoir.chantilly', website_url: 'https://le-petit-comptoir.vercel.app', source: 'Google Maps', service: 'Site vitrine + SEO', owner_id: 'u-sadish',
  })
  const fleurs = P({
    name: 'Fleurs de Saison', category: 'commerce', contact_name: 'Anaïs Petit', phone: '06 20 30 40 50', city: 'Beauvais',
    instagram_handle: 'fleursdesaison.bvs', source: 'Instagram', service: 'Site vitrine premium', owner_id: 'u-hasan',
  })
  const atelier = P({
    name: 'Atelier Bois & Fil', category: 'artisan', contact_name: 'Pierre Vasseur', phone: '06 55 44 33 22', email: 'atelier.boisfil@orange.fr',
    city: 'Clermont', source: 'Bouche-à-oreille', service: 'Site vitrine premium', owner_id: 'u-moustakine', priority: 'basse',
  })
  const garage = P({
    name: 'Garage Martin Auto', category: 'artisan', contact_name: 'Daniel Martin', phone: '03 44 78 90 12', city: 'Breteuil',
    website_url: 'https://garage-martin-auto.fr', source: 'Google Maps', service: 'Site vitrine + SEO', owner_id: 'u-salim', priority: 'basse',
  })
  at(3, 18, 10); as('u-hasan')
  const ongles = P({
    name: 'Studio Ongles & Co', category: 'commerce', contact_name: 'Sarah Lemoine', phone: '07 12 98 45 61', city: 'Creil',
    instagram_handle: 'studio.onglesandco', source: 'Instagram', service: 'Carte de visite digitale', owner_id: 'u-hasan',
  })
  at(1, 12, 30); as('u-moustakine')
  P({ name: 'Pizzeria Da Marco', category: 'restaurant', city: 'Compiègne', instagram_handle: 'pizzeria.damarco', source: 'Instagram', owner_id: 'u-moustakine', priority: 'haute' })
  at(0, 8, 50); as('u-sadish')
  P({ name: "L'Épicerie Fine de Gouvieux", category: 'commerce', city: 'Gouvieux', source: 'Passage en boutique', owner_id: 'u-sadish' })

  // ——— Parcours commerciaux ———
  at(19, 10); as('u-hasan'); upd('prospects', coffee, { status: 'contacte' }); upd('prospects', coffee, { status: 'interesse' })
  at(17, 14); upd('prospects', coffee, { status: 'demo_proposee' })
  at(18, 9); as('u-salim'); upd('prospects', fournil, { status: 'contacte' }); upd('prospects', fournil, { status: 'devis_envoye' })
  at(16, 16); upd('prospects', fournil, { status: 'gagne' })
  at(18, 11); as('u-sadish'); upd('prospects', brasserie, { status: 'contacte' }); upd('prospects', brasserie, { status: 'demo_proposee' })
  at(12, 17); upd('prospects', brasserie, { status: 'gagne' })
  at(13, 10); as('u-moustakine'); upd('prospects', lefevre, { status: 'contacte' }); upd('prospects', lefevre, { status: 'demo_proposee' })
  at(12, 9); as('u-sadish'); upd('prospects', sushi, { status: 'contacte' }); upd('prospects', sushi, { status: 'interesse' })
  at(6, 15); upd('prospects', sushi, { status: 'devis_envoye' })
  at(10, 18); as('u-salim'); upd('prospects', barber, { status: 'contacte' }); upd('prospects', barber, { status: 'en_attente' })
  at(4, 10); upd('prospects', barber, { status: 'a_relancer', next_follow_up: day(0) })
  at(7, 11); as('u-sadish'); upd('prospects', comptoir, { status: 'contacte' }); upd('prospects', comptoir, { status: 'interesse', next_follow_up: day(2) })
  at(5, 14); as('u-hasan'); upd('prospects', fleurs, { status: 'contacte' }); upd('prospects', fleurs, { status: 'en_attente', next_follow_up: day(-1) })
  at(8, 9); as('u-moustakine'); upd('prospects', atelier, { status: 'contacte', next_follow_up: day(4) })
  at(8, 15); as('u-salim'); upd('prospects', garage, { status: 'contacte' })
  at(6, 11); upd('prospects', garage, { lost_reason: 'A déjà un site', status: 'perdu' })
  at(2, 10); as('u-hasan'); upd('prospects', ongles, { status: 'contacte', next_follow_up: day(1) })

  // ——— Projets ———
  at(16, 17); as('u-salim')
  const pFournil = e.insert('projects', {
    name: 'Site Le Fournil du Parc', prospect_id: fournil, type: 'vitrine', owner_id: 'u-salim', start_date: day(-16), due_date: day(-4),
    demo_url: 'https://fournil-du-parc.vercel.app', final_url: 'https://lefournilduparc.fr', price_proposed: 900, price_accepted: 900,
    billing_status: 'paye', description: 'Vitrine + horaires, galerie des créations, référencement local Clermont.',
  }).id
  for (const [d, s] of [[15, 'demo_creation'], [13, 'demo_envoyee'], [12, 'demo_validee'], [10, 'dev_final'], [6, 'pret_livrer'], [5, 'livre'], [2, 'maintenance']] as const) {
    at(d, 15); upd('projects', pFournil, { status: s })
  }

  at(17, 15); as('u-hasan')
  const pCoffee = e.insert('projects', {
    name: 'Site Coffee Concept', prospect_id: coffee, type: 'vitrine', owner_id: 'u-hasan', start_date: day(-17), due_date: day(5),
    demo_url: 'https://exemple.vercel.app', github_url: 'https://github.com/quadcore/coffee-concept', price_proposed: 700,
    billing_status: 'devis_envoye', description: 'Vitrine élégante : carte du brunch, réservation, galerie Instagram.',
  }).id
  at(16, 10); upd('projects', pCoffee, { status: 'demo_creation' })
  at(14, 18); upd('projects', pCoffee, { status: 'demo_prete' })
  at(14, 19); upd('projects', pCoffee, { status: 'demo_envoyee' })
  at(11, 10); upd('projects', pCoffee, { status: 'modifs_demandees' })
  for (const [i, d] of ['Agrandir le logo dans l’en-tête', 'Mettre le numéro de téléphone en évidence'].entries()) {
    step(1); e.insert('revisions', { project_id: pCoffee, round: 1, description: d, position: i, assignee_id: 'u-hasan' })
  }
  const r1 = db.revisions.filter((r) => r.project_id === pCoffee)
  at(10, 14); for (const r of r1) upd('revisions', r.id, { status: 'termine' })
  at(10, 15); upd('projects', pCoffee, { status: 'attente_validation' })
  at(1, 9, 15); upd('projects', pCoffee, { status: 'modifs_demandees', revision_round: 2 })
  const round2 = ['Modifier le titre d’accueil', 'Remplacer la photo du comptoir', 'Changer la couleur du bouton de réservation', 'Ajouter une section horaires']
  const r2ids = round2.map((d, i) => { step(1); return e.insert('revisions', { project_id: pCoffee, round: 2, description: d, position: i, assignee_id: i === 3 ? 'u-sadish' : 'u-hasan', due_date: day(i === 3 ? 0 : 2) }).id })
  at(0, 9, 5); upd('revisions', r2ids[0], { status: 'termine' }); upd('revisions', r2ids[1], { status: 'termine' }); upd('revisions', r2ids[2], { status: 'termine' })
  as('u-sadish'); upd('revisions', r2ids[3], { status: 'en_cours' })

  at(12, 18); as('u-sadish')
  const pBrasserie = e.insert('projects', {
    name: 'Click & collect Brasserie du Marché', prospect_id: brasserie, type: 'click_collect', owner_id: 'u-sadish', start_date: day(-12),
    due_date: day(6), demo_url: 'https://brasserie-marche.vercel.app', price_proposed: 1500, price_accepted: 1400, billing_status: 'acompte_recu',
    description: 'Commande en ligne pour le midi, paiement à la récupération, menu du jour modifiable.',
  }).id
  at(11, 9); upd('projects', pBrasserie, { status: 'demo_creation' })
  at(8, 17); upd('projects', pBrasserie, { status: 'demo_envoyee' })
  at(7, 10); upd('projects', pBrasserie, { status: 'demo_validee' })
  at(6, 9); upd('projects', pBrasserie, { status: 'dev_final' })

  at(12, 16); as('u-moustakine')
  const pLefevre = e.insert('projects', {
    name: 'Démo Maison Lefèvre', prospect_id: lefevre, type: 'vitrine', owner_id: 'u-moustakine', start_date: day(-12), due_date: day(10),
    demo_url: 'https://maison-lefevre.vercel.app', price_proposed: 700,
  }).id
  at(11, 10); upd('projects', pLefevre, { status: 'demo_creation' })
  at(3, 17); upd('projects', pLefevre, { status: 'demo_envoyee' })
  at(2, 9); upd('projects', pLefevre, { status: 'attente_validation' })

  at(5, 11); as('u-sadish')
  const pSushi = e.insert('projects', {
    name: 'Boutique Sushi Kaze', prospect_id: sushi, type: 'ecommerce', owner_id: 'u-sadish', start_date: day(-5), due_date: day(14), price_proposed: 1500,
  }).id
  at(4, 10); upd('projects', pSushi, { status: 'demo_creation' })

  at(6, 18); as('u-sadish')
  const pComptoir = e.insert('projects', { name: 'Démo Le Petit Comptoir', prospect_id: comptoir, type: 'vitrine', owner_id: 'u-sadish', due_date: day(3) }).id
  at(1, 18); upd('projects', pComptoir, { status: 'demo_prete' })

  // ——— Tâches ———
  const T = (data: Record<string, unknown>) => { step(3); return e.insert('tasks', data).id }
  at(4, 10); as('u-salim')
  T({ title: 'Relancer Barber Club 60', description: 'Envoyer le lien de la démo Fournil comme référence.', assignee_id: 'u-salim', due_date: day(0), prospect_id: barber, is_follow_up: true, priority: 'haute' })
  as('u-hasan')
  T({ title: 'Relancer Fleurs de Saison', assignee_id: 'u-hasan', due_date: day(-1), prospect_id: fleurs, is_follow_up: true })
  T({ title: 'Envoyer la V2 à Camille (Coffee Concept)', assignee_id: 'u-hasan', due_date: day(1), project_id: pCoffee, priority: 'haute' })
  as('u-sadish')
  T({ title: 'Envoyer la démo au Petit Comptoir', assignee_id: 'u-sadish', due_date: day(0), project_id: pComptoir, prospect_id: comptoir })
  T({ title: 'Brancher le paiement Stripe (Brasserie)', assignee_id: 'u-sadish', due_date: day(3), project_id: pBrasserie })
  as('u-moustakine')
  T({ title: 'Appeler Pizzeria Da Marco', assignee_id: 'u-moustakine', due_date: day(0), priority: 'haute' })
  T({ title: 'Préparer le devis Atelier Bois & Fil', assignee_id: 'u-moustakine', due_date: day(4), prospect_id: atelier })
  as('u-salim')
  T({ title: 'Mettre à jour les horaires d’hiver (Fournil)', assignee_id: 'u-salim', due_date: day(-2), project_id: pFournil, priority: 'basse' })
  const done = T({ title: 'Relancer Sushi Kaze après devis', assignee_id: 'u-sadish', due_date: day(-3), prospect_id: sushi, is_follow_up: true })
  at(3, 16); as('u-sadish'); upd('tasks', done, { status: 'termine' })

  // ——— Commentaires ———
  const C = (entity_type: string, entity_id: string, author: string, body: string, daysAgo: number, h: number) => {
    at(daysAgo, h); as(author); e.insert('comments', { entity_type, entity_id, body, author_id: author })
  }
  C('project', pCoffee, 'u-hasan', 'Camille adore la V1, seulement des ajustements visuels. Elle valide dès que les horaires sont en ligne.', 1, 9)
  C('project', pCoffee, 'u-sadish', 'Je prends la section horaires, je reprends le composant de la Brasserie.', 0, 9)
  C('prospect', barber, 'u-salim', 'Le gérant est intéressé mais veut voir un exemple de barber. Lui montrer une démo rapide ?', 4, 10)
  C('project', pBrasserie, 'u-sadish', 'Acompte de 420 € reçu par virement.', 6, 10)

  // ——— Clients déjà livrés ———
  at(70, 11); as('u-hasan')
  const salon = P({
    name: 'Salon Élégance', category: 'commerce', contact_name: 'Nadia Chérif', phone: '06 41 52 63 74', email: 'contact@salon-elegance.fr', city: 'Clermont',
    instagram_handle: 'salon.elegance60', source: 'Bouche-à-oreille', service: 'Site vitrine premium', owner_id: 'u-hasan',
  })
  upd('prospects', salon, { status: 'gagne' })
  const pSalon = e.insert('projects', {
    name: 'Site Salon Élégance', prospect_id: salon, type: 'vitrine', owner_id: 'u-hasan', start_date: day(-70), due_date: day(-40),
    final_url: 'https://salon-elegance.fr', price_proposed: 800, price_accepted: 800, billing_status: 'paye', description: 'Vitrine, prestations et prise de rendez-vous.',
  }).id
  at(40, 15); upd('projects', pSalon, { status: 'livre' })

  at(80, 14); as('u-moustakine')
  const traiteur = P({
    name: 'Traiteur Saveurs d’Orient', category: 'restaurant', contact_name: 'Karim Saïdi', phone: '07 22 33 44 55', email: 'saveurs.orient@gmail.com', city: 'Beauvais',
    source: 'Instagram', service: 'Site vitrine premium', owner_id: 'u-moustakine',
  })
  upd('prospects', traiteur, { status: 'gagne' })
  const pTraiteur = e.insert('projects', {
    name: 'Site Saveurs d’Orient', prospect_id: traiteur, type: 'vitrine', owner_id: 'u-moustakine', start_date: day(-80), due_date: day(-55),
    final_url: 'https://saveurs-orient.fr', price_proposed: 750, price_accepted: 750, billing_status: 'paye',
  }).id
  at(55, 11); upd('projects', pTraiteur, { status: 'maintenance' })

  // ——— Tickets ———
  const K = (data: Record<string, unknown>) => { step(3); return e.insert('tickets', data).id }
  const X = (ticket: string, author: string, channel: string | null, body: string, daysAgo: number, h: number) => {
    at(daysAgo, h); as(author); e.insert('comments', { entity_type: 'ticket', entity_id: ticket, body, author_id: author, channel })
  }

  at(50, 10); as('u-moustakine')
  const kPhotos = K({ subject: 'Remplacer les photos du buffet', prospect_id: traiteur, project_id: pTraiteur, type: 'demande', channel: 'instagram', priority: 'basse', assignee_id: 'u-moustakine', due_date: day(-43) })
  upd('tickets', kPhotos, { status: 'en_cours' })
  X(kPhotos, 'u-moustakine', 'instagram', 'Karim a envoyé 6 nouvelles photos en message privé.', 49, 11)
  at(45, 16); as('u-moustakine'); upd('tickets', kPhotos, { status: 'resolu' })
  at(44, 9); upd('tickets', kPhotos, { status: 'ferme' })

  at(6, 9, 30); as('u-salim')
  const kHoraires = K({
    subject: 'Mettre à jour les horaires d’hiver', description: 'Le Fournil ferme désormais le lundi et ouvre à 6 h 30 le reste de la semaine.',
    prospect_id: fournil, project_id: pFournil, type: 'demande', channel: 'whatsapp', priority: 'normale', assignee_id: 'u-salim', due_date: day(-2),
  })
  upd('tickets', kHoraires, { status: 'en_cours' })
  X(kHoraires, 'u-salim', 'whatsapp', 'Marc confirme les nouveaux horaires et demande aussi d’afficher la fermeture de Noël.', 5, 10)

  at(5, 14); as('u-salim')
  const kSiret = K({
    subject: 'Facture d’acompte à refaire avec le bon SIRET', prospect_id: brasserie, project_id: pBrasserie, type: 'facturation', channel: 'email', priority: 'normale',
    assignee_id: 'u-salim', due_date: day(-1),
  })
  upd('tickets', kSiret, { status: 'en_cours' })
  X(kSiret, 'u-salim', 'email', 'Sophie a changé de structure juridique. Je lui ai demandé son nouveau SIRET par e-mail.', 5, 15)
  upd('tickets', kSiret, { status: 'attente_client' })

  at(4, 11); as('u-sadish')
  const kMenu = K({ subject: 'Peut-on modifier le menu du jour sans vous ?', prospect_id: brasserie, project_id: pBrasserie, type: 'question', channel: 'whatsapp', priority: 'normale', assignee_id: 'u-sadish', due_date: day(-1) })
  upd('tickets', kMenu, { status: 'en_cours' })
  X(kMenu, 'u-sadish', 'telephone', 'Appel de 10 minutes : je lui ai montré l’écran d’édition du menu. Elle a réussi seule.', 3, 16)
  at(3, 17); as('u-sadish'); upd('tickets', kMenu, { status: 'resolu' })

  at(0, 8, 40); as('u-hasan')
  const kForm = K({
    subject: 'Le formulaire de contact n’envoie plus rien', description: 'Nadia n’a reçu aucune demande depuis vendredi. Aucune erreur visible sur le site.',
    prospect_id: salon, project_id: pSalon, type: 'incident', channel: 'telephone', priority: 'urgente', assignee_id: 'u-sadish', due_date: day(0),
  })
  as('u-sadish'); upd('tickets', kForm, { status: 'en_cours' })
  X(kForm, 'u-sadish', null, 'La clé d’envoi d’e-mails a expiré. Je la renouvelle et je teste.', 0, 8)

  at(1, 17); as('u-moustakine')
  K({ subject: 'Renouvellement du nom de domaine', prospect_id: fournil, project_id: pFournil, type: 'question', channel: 'email', priority: 'haute', assignee_id: null, due_date: day(0) })
  at(0, 8, 15); as('u-hasan')
  K({ subject: 'Ajouter la carte des soins', prospect_id: salon, project_id: pSalon, type: 'demande', channel: 'instagram', priority: 'basse', assignee_id: null, due_date: day(7) })

  e.clock = null
  e.actor = null
  e.emitted = []
  return db
}
