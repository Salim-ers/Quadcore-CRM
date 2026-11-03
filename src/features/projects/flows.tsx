import { useState, type ReactNode } from 'react'
import { Picker, confirmDialog } from '../../components/ui'
import { PROJECT_STATUSES } from '../../lib/constants'
import type { Project, ProjectStatus } from '../../lib/types'
import { setProjectStatus, setProspectStatus } from '../../data/actions'
import { toast, useStore } from '../../data/store'

const EARLY = ['a_prospecter', 'contacte', 'en_attente', 'a_relancer', 'interesse']

/** Avancement technique du site, avec synchronisation légère du statut commercial. */
export function useProjectStatusFlow() {
  const [pick, setPick] = useState<Project | null>(null)

  async function change(p: Project, status: ProjectStatus) {
    if (status === p.status) return
    if (status === 'demo_envoyee' && !p.demo_url) {
      const go = await confirmDialog({ title: 'Aucune URL de démo', message: 'Vous pourrez l’ajouter ensuite dans la fiche projet. Marquer quand même la démo comme envoyée ?', confirm: 'Continuer' })
      if (!go) return
    }
    const ok = await setProjectStatus(p.id, status)
    if (!ok) return
    const prospect = p.prospect_id ? useStore.getState().db.prospects.find((x) => x.id === p.prospect_id) : undefined
    if (!prospect) return
    if (status === 'demo_envoyee' && EARLY.includes(prospect.status)) {
      await setProspectStatus(prospect.id, 'demo_proposee')
      toast(`${prospect.name} passe en « Démo proposée »`)
    }
    if (status === 'demo_validee' && prospect.status !== 'gagne') {
      if (await confirmDialog({ title: 'Démo validée', message: `Marquer ${prospect.name} comme client gagné ?`, confirm: 'Oui, gagné' })) await setProspectStatus(prospect.id, 'gagne')
    }
  }

  const ui: ReactNode = (
    <Picker open={!!pick} onClose={() => setPick(null)} title="Avancement du site" value={pick?.status}
      options={PROJECT_STATUSES.map((s, i) => ({ value: s.value, label: `${i + 1}. ${s.label}`, tone: s.tone }))}
      onPick={(v) => pick && change(pick, v)} />
  )
  return { change, openPicker: setPick, ui }
}
