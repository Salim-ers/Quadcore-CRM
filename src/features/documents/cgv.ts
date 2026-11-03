import { COMPANY } from '../../lib/company'
import { PLANS, TERMS } from './offers'

export const CGV_VERSION = 'novembre 2026'

const price = (v: number) => `${String(v).replace('.', ',')} € TTC par mois`
const [, essentielle, premium] = PLANS

/** Les conditions générales de vente, écrites pour des commerçants et des artisans : claires et sans jargon inutile. */
export const cgvSections = (): { title: string; paragraphs: string[] }[] => [
  {
    title: 'Qui sommes-nous',
    paragraphs: [
      `${COMPANY.name}, société par actions simplifiée${COMPANY.capital ? ` au capital de ${COMPANY.capital}` : ''}, siège : ${COMPANY.address}, ${COMPANY.city}, immatriculée au RCS de ${COMPANY.rcsCity} sous le numéro ${COMPANY.rcsNumber}, TVA intracommunautaire ${COMPANY.vat}, représentée par ${COMPANY.president}, Président. Contact : ${COMPANY.email}, ${COMPANY.phone}.`,
      'Dans ces conditions, « QUADCORE » désigne cette société et « vous » désigne le client professionnel qui signe le devis.',
    ],
  },
  {
    title: 'À quoi servent ces conditions',
    paragraphs: [
      'Elles s’appliquent à toutes nos prestations vendues à des professionnels : commerçants, restaurateurs, artisans et entreprises. Le devis signé et ces conditions forment ensemble votre contrat. Si l’un et l’autre se contredisent, le devis l’emporte. Vos propres conditions d’achat ne s’appliquent que si nous les avons acceptées par écrit.',
    ],
  },
  {
    title: 'Nos prestations',
    paragraphs: [
      'Création de sites vitrines, référencement, outils de gestion sur mesure, solutions web complètes, cartes de visite et de fidélité digitales, maintenance, hébergement et gestion du nom de domaine. Le devis décrit ce qui est compris. Ce qui n’y figure pas fait l’objet d’un devis complémentaire.',
    ],
  },
  {
    title: 'Devis et commande',
    paragraphs: [
      `Le devis est gratuit et valable ${TERMS.validityDays} jours, sauf autre date indiquée. Votre commande est ferme lorsque vous signez le devis avec la mention « Bon pour accord ». Toute modification doit être confirmée par écrit ; un e-mail suffit.`,
    ],
  },
  {
    title: 'Prix et paiement',
    paragraphs: [
      'Les prix sont indiqués en euros, hors taxes et toutes taxes comprises, au taux de TVA en vigueur. Sauf autre indication au devis, l’acompte est dû à la commande et le solde à la mise en ligne. Les factures sont payables à réception, par virement ou par le moyen indiqué sur la facture. Aucun escompte n’est accordé en cas de paiement anticipé.',
      'En cas de retard, des pénalités égales à trois fois le taux d’intérêt légal sont dues dès le lendemain de l’échéance, sans rappel, ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (articles L441-10 et D441-5 du Code de commerce). Après une mise en demeure restée sans effet pendant 15 jours, nous pouvons suspendre les prestations en cours.',
      'Si le droit de rétractation de l’article « Droit de rétractation » s’applique à vous, l’acompte n’est dû qu’à partir du 8e jour suivant la signature.',
    ],
  },
  {
    title: 'Délais et livraison',
    paragraphs: [
      `Le délai indiqué au devis court à partir de la commande et de la réception de vos contenus (textes, photos, logo, informations). Il dépend aussi de la rapidité de vos réponses. ${TERMS.revisions} séries de retouches sont comprises dans le prix, dans la limite de ce que prévoit le devis. Les demandes supplémentaires font l’objet d’un devis.`,
      'Le site est livré à sa mise en ligne ou à la remise des accès. Sans réserve écrite de votre part sous 8 jours, la livraison est considérée comme acceptée.',
    ],
  },
  {
    title: 'Site de démonstration',
    paragraphs: [
      'Nous pouvons préparer un site de démonstration avant toute commande, sans frais ni obligation pour vous. Tant qu’il n’est pas commandé et entièrement payé, il reste notre propriété : vous ne pouvez ni l’utiliser, ni le copier, ni le faire reprendre par un tiers. Si vous ne le commandez pas, nous pouvons réutiliser sa conception pour d’autres clients, après en avoir retiré vos éléments (nom, logo, photos, textes).',
    ],
  },
  {
    title: 'Votre nom de domaine vous appartient',
    paragraphs: [
      'Le nom de domaine est enregistré à votre nom : vous en êtes le titulaire. QUADCORE le gère techniquement pour vous, sans jamais en devenir propriétaire, et vous fournit les comptes et accès. Vous pouvez le reprendre ou le transférer à tout moment, même si vous arrêtez de travailler avec nous, sans frais de notre part.',
      'Un nom de domaine est attribué au premier qui le demande : nous ne pouvons pas garantir sa disponibilité. Vous vérifiez qu’il ne porte pas atteinte aux droits d’un tiers, notamment à une marque. Il se renouvelle chaque année : tant que vous nous confiez sa gestion, nous nous en occupons ; ensuite, ce renouvellement vous revient.',
    ],
  },
  {
    title: 'Hébergement',
    paragraphs: [
      'Votre site est hébergé chez un prestataire spécialisé. Les comptes et accès vous sont fournis et vous en restez propriétaire. Nous faisons le nécessaire pour que le site reste disponible et sécurisé, sans pouvoir garantir l’absence de toute interruption, notamment chez nos prestataires.',
      'Si vous arrêtez de nous confier l’hébergement, nous vous remettons sous 15 jours ce qu’il faut pour installer votre site ailleurs. Le tarif annuel indiqué au devis reste dû pour l’année commencée.',
    ],
  },
  {
    title: 'Maintenance',
    paragraphs: [
      `La maintenance est facultative. Essentielle (${price(essentielle.price)}, pour un site vitrine) : ${essentielle.includes.join(', ').toLowerCase()}. Premium (${price(premium.price)}, pour une solution complète) : tout le contenu de la formule Essentielle, ${premium.includes.slice(1).join(', ').toLowerCase()}.`,
      'Les petites modifications portent sur les textes et les images des pages existantes. Créer une page ou une fonction n’en fait pas partie, sauf avec la formule Premium, dans une mesure raisonnable.',
      `La maintenance commence à la mise en ligne et se facture chaque mois, sans durée minimale : vous l’arrêtez quand vous voulez par e-mail, avec un préavis de ${TERMS.noticeDays} jours. Nous pouvons faire évoluer ses tarifs en vous prévenant au moins ${TERMS.noticeDays} jours à l’avance.`,
      'Sans maintenance, les mises à jour et la sécurité du site sont à votre charge, et nos interventions font l’objet d’un devis.',
    ],
  },
  {
    title: 'Propriété du site',
    paragraphs: [
      'Vos contenus (textes, photos, logo) restent à vous, et vous garantissez avoir le droit de les utiliser. Une fois le devis entièrement payé, QUADCORE vous cède les droits de reproduction, de représentation et d’adaptation sur le site réalisé pour vous, pour l’exploitation de votre activité, dans le monde entier et pour toute la durée légale de protection. Avant ce paiement complet, le site reste notre propriété.',
      'Les composants de tiers (logiciels libres, polices, modules, images sous licence) restent soumis à leur propre licence, et nos outils et méthodes génériques restent à nous. Sauf refus de votre part par e-mail, nous pouvons citer et montrer votre site comme référence.',
    ],
  },
  {
    title: 'Vos engagements',
    paragraphs: [
      'Vous fournissez des informations exactes et des contenus licites, vous nous donnez les informations nécessaires aux mentions légales de votre site, et vous gardez vos accès confidentiels.',
    ],
  },
  {
    title: 'Droit de rétractation',
    paragraphs: [
      'Il s’applique si le contrat est signé hors de nos locaux (par exemple dans votre commerce), si son objet n’entre pas dans votre activité principale et si vous employez cinq salariés au plus (article L221-3 du Code de la consommation).',
      'Vous disposez alors de 14 jours à compter de la signature pour vous rétracter, sans motif ni frais, avec le formulaire joint ou toute déclaration claire envoyée à ' + COMPANY.email + '. Nous ne pouvons recevoir aucun paiement avant 7 jours après la signature, et nous remboursons toute somme versée sous 14 jours.',
      'Si vous demandez que nous commencions avant la fin des 14 jours et que vous vous rétractez ensuite, vous payez le travail déjà réalisé, en proportion du prix. Si la prestation est entièrement exécutée avant la fin du délai, à votre demande et avec votre renoncement exprès, vous ne pouvez plus vous rétracter.',
    ],
  },
  {
    title: 'Responsabilité',
    paragraphs: [
      'Nous mettons en œuvre tous les moyens raisonnables pour réaliser nos prestations. Nous ne garantissons ni une position dans les moteurs de recherche, ni un résultat commercial. Notre responsabilité est limitée au montant payé pour la prestation concernée, sauf faute lourde ou intentionnelle. Nous ne répondons ni des dommages indirects (perte de chiffre d’affaires, par exemple), ni des contenus que vous fournissez, ni des modifications faites par un tiers, ni des pannes de prestataires hors de notre contrôle.',
    ],
  },
  {
    title: 'Données personnelles',
    paragraphs: [
      `Nous utilisons vos coordonnées pour exécuter le contrat et assurer le suivi, le temps nécessaire et les durées légales de conservation. Vous pouvez exercer vos droits d’accès, de rectification et d’effacement à ${COMPANY.email}.`,
      'Pour les données des visiteurs de votre site (formulaires, commandes, réservations), vous êtes responsable du traitement. Lorsque nous hébergeons ou maintenons votre site, nous agissons comme sous-traitant : uniquement sur vos instructions, avec des mesures de sécurité adaptées et une obligation de confidentialité. Nous vous prévenons sans délai en cas de violation de données, nous vous aidons à répondre aux demandes des personnes, et nous restituons ou supprimons les données à la fin du contrat. Nos propres prestataires, comme l’hébergeur, sont tenus aux mêmes obligations.',
    ],
  },
  {
    title: 'Arrêt du contrat',
    paragraphs: [
      'Chacun peut mettre fin au contrat si l’autre ne respecte pas une obligation importante, 15 jours après une mise en demeure restée sans effet. En dehors du droit de rétractation, si vous annulez après la commande, le travail déjà réalisé reste dû.',
    ],
  },
  {
    title: 'Force majeure',
    paragraphs: ['Ni vous ni nous ne sommes responsables d’un retard ou d’une inexécution dus à un cas de force majeure (article 1218 du Code civil).'],
  },
  {
    title: 'Droit applicable et litiges',
    paragraphs: [
      `Le contrat est soumis au droit français. Nous cherchons d’abord une solution amiable. À défaut, tout litige entre professionnels relève du tribunal de commerce de ${COMPANY.rcsCity}.`,
    ],
  },
]

export const withdrawalForm = () => ({
  title: 'Formulaire de rétractation',
  intro: 'À remplir et à renvoyer uniquement si vous souhaitez vous rétracter du contrat, et si ce droit s’applique à vous (voir l’article « Droit de rétractation » des conditions générales de vente).',
  to: `À l’attention de ${COMPANY.name}, ${COMPANY.address}, ${COMPANY.city}, ${COMPANY.email}`,
  body: 'Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :',
  fields: ['Prestation et numéro de devis', 'Contrat signé le', 'Nom de l’entreprise et du signataire', 'Adresse', 'Date', 'Signature (uniquement si le formulaire est envoyé sur papier)'],
})
