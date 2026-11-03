/** La société, telle que publiée sur quad-core.fr : reprise sur les devis et les CGV. */
export const COMPANY = {
  name: 'QUADCORE SAS',
  capital: '1 000 €',
  address: '5 Rue du Docteur Roux',
  city: '60180 Nogent-sur-Oise',
  siret: '101 694 016 00013',
  rcsCity: 'Beauvais',
  rcsNumber: '101 694 016',
  vat: 'FR85101694016',
  president: 'Mouhamad Moustakine',
  phone: '+33 1 89 48 04 02',
  email: 'contact@quad-core.fr',
  web: 'quad-core.fr',
  vatRate: 0.2,
}

export const companyLegalLine = () => [
  `${COMPANY.name} au capital de ${COMPANY.capital}`,
  `${COMPANY.address}, ${COMPANY.city}`,
  `SIRET ${COMPANY.siret}`,
  `RCS ${COMPANY.rcsCity} ${COMPANY.rcsNumber}`,
  `TVA ${COMPANY.vat}`,
].join(' · ')
