import { useEffect, useState } from 'react'
import { Download, Send } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { canShareFile, shareFile } from './deliver'

// Pour changer la brochure : remplacer ce fichier dans public/assets, sans rien d'autre à toucher
const BROCHURE_URL = '/assets/brochure-quadcore.png'
const FILE_NAME = 'Brochure-QuadCore.png'

/** La brochure en grand, à montrer au client ou à lui envoyer. */
export function BrochurePage() {
  const [file, setFile] = useState<File | null>(null)

  // Prête d'avance : sur téléphone, le partage doit partir du geste, sans attente
  useEffect(() => {
    let live = true
    fetch(BROCHURE_URL).then((r) => r.blob()).then((b) => { if (live) setFile(new File([b], FILE_NAME, { type: 'image/png' })) }).catch(() => { /* il reste le téléchargement */ })
    return () => { live = false }
  }, [])

  return (
    <>
      <PageHeader title="Brochure" />
      <Page className="pt-1">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 mb-3">
            {file && canShareFile(file) && <button className="btn-primary flex-1" onClick={() => shareFile(file, 'Brochure QuadCore')}><Send size={17} />Envoyer</button>}
            <a className="btn-soft flex-1" href={BROCHURE_URL} download={FILE_NAME}><Download size={17} />Télécharger</a>
          </div>
          <a href={BROCHURE_URL} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir la brochure seule, pour zoomer" className="block -mx-4 sm:mx-0">
            <img src={BROCHURE_URL} width={1055} height={1491} alt="Brochure QuadCore : offres, maintenance, paiement en 3 ou 4 fois et coordonnées" className="block w-full h-auto sm:rounded-2xl sm:shadow-float" />
          </a>
        </div>
      </Page>
    </>
  )
}
