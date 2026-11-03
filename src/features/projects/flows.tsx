import { celebrate } from '../../components/ui'
import { setProjectStatus } from '../../data/actions'
import { toast } from '../../data/store'
import { SITE_STEPS, siteStep, type SiteStep } from '../../lib/constants'
import type { Project } from '../../lib/types'

/** Passe un site à l'étape voulue : un site livré, ça se fête. */
export async function moveSite(project: Project, step: SiteStep) {
  if (step === siteStep(project.status)) return
  const target = SITE_STEPS.find((s) => s.value === step)!
  if (!(await setProjectStatus(project.id, target.status))) return
  const undo = { label: 'Annuler', run: () => setProjectStatus(project.id, project.status) }
  if (step === 'livre') {
    celebrate()
    toast(`${project.name} : livré`, 'success', undo)
  } else {
    toast(`${project.name} : en cours`, 'default', undo)
  }
}
