import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, PencilRuler, Store, TriangleAlert } from 'lucide-react'
import type { Project } from '../../lib/types'
import { siteStep } from '../../lib/constants'
import { useStore } from '../../data/store'
import { Avatar, Badge } from '../../components/ui'
import { DueChip } from '../../components/bits'
import { useUi } from '../../components/Shell'
import { isTicketOpen } from '../../lib/derive'
import { normalizeUrl } from '../../lib/links'
import { moveSite } from './flows'

/** Carte d'un site : en cours, le bouton le marque livré ; livré, le lien l'ouvre. */
export const ProjectCard = memo(function ProjectCard({ project, hideClient }: { project: Project; hideClient?: boolean }) {
  const step = siteStep(project.status)
  const owner = useStore((s) => s.db.profiles.find((p) => p.id === project.owner_id))
  const client = useStore((s) => (project.prospect_id ? s.db.prospects.find((p) => p.id === project.prospect_id) : undefined))
  const pending = useStore((s) => s.db.revisions.filter((x) => x.project_id === project.id && x.status !== 'termine').length)
  const problems = useStore((s) => s.db.tickets.filter((t) => t.project_id === project.id && isTicketOpen(t)).length)
  const newTicket = useUi((s) => s.newTicket)
  const url = normalizeUrl(project.final_url ?? project.demo_url)

  return (
    <div className="card relative p-3.5 transition hover:border-copper/30">
      <Link to={`/projets/${project.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir ${project.name}`} />
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[16px] truncate">{project.name}</p>
          {!hideClient && client && <p className="text-[13px] text-muted mt-0.5 flex items-center gap-1.5"><Store size={13} className="shrink-0" /><span className="truncate">{client.name}</span></p>}
          <div className="flex items-center gap-3 mt-1 flex-wrap empty:hidden">
            {step === 'en_cours' && <DueChip date={project.due_date} />}
            {pending > 0 && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-orange-700 dark:text-orange-300"><PencilRuler size={13} />{pending} retouche{pending > 1 ? 's' : ''}</span>}
            {problems > 0 && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-danger"><TriangleAlert size={13} />{problems} problème{problems > 1 ? 's' : ''}</span>}
          </div>
        </div>
        {owner && <Avatar profile={owner} size={28} />}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {step === 'en_cours' ? (
          <button type="button" onClick={() => moveSite(project, 'livre')}
            className="relative z-10 flex-1 h-11 rounded-xl bg-sunken hover:bg-line/60 text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[.98]">
            <Check size={17} />Site livré
          </button>
        ) : <Badge tone="green">Livré</Badge>}
        <div className="flex items-center gap-2 ml-auto">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="relative z-10 h-11 px-3 rounded-xl bg-sunken hover:bg-line/60 text-[14px] font-semibold inline-flex items-center gap-1.5 transition">
              Voir<ExternalLink size={15} />
            </a>
          )}
          <button type="button" aria-label={`Signaler un problème sur ${project.name}`} title="Signaler un problème"
            onClick={() => newTicket({ prospect_id: project.prospect_id ?? undefined, project_id: project.id, type: 'incident' })}
            className="relative z-10 w-11 h-11 rounded-xl bg-sunken hover:bg-line/60 text-muted inline-flex items-center justify-center transition">
            <TriangleAlert size={17} />
          </button>
        </div>
      </div>
    </div>
  )
})
