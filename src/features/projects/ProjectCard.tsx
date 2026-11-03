import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, PencilRuler, Store } from 'lucide-react'
import type { Project } from '../../lib/types'
import { PROJECT_TYPES, labelOf, projectStatus } from '../../lib/constants'
import { useStore } from '../../data/store'
import { useShallow } from 'zustand/react/shallow'
import { Avatar, Badge, ProgressBar, cx } from '../../components/ui'
import { DueChip } from '../../components/bits'

export const ProjectCard = memo(function ProjectCard({ project, onStatus, compact, hideClient }: {
  project: Project; onStatus?: (p: Project) => void; compact?: boolean; hideClient?: boolean
}) {
  const st = projectStatus(project.status)
  const owner = useStore((s) => s.db.profiles.find((p) => p.id === project.owner_id))
  const client = useStore((s) => (project.prospect_id ? s.db.prospects.find((p) => p.id === project.prospect_id) : undefined))
  const prog = useStore(useShallow((s) => {
    const r = s.db.revisions.filter((x) => x.project_id === project.id && x.round === project.revision_round)
    return { done: r.filter((x) => x.status === 'termine').length, total: r.length }
  }))
  const showRevs = prog.total > 0 && ['modifs_demandees', 'attente_validation', 'demo_envoyee'].includes(project.status)
  const done = ['livre', 'maintenance'].includes(project.status)

  return (
    <div className={cx('card relative transition hover:border-copper/30', compact ? 'p-3' : 'p-3.5')}>
      <Link to={`/projets/${project.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir ${project.name}`} />
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={cx('font-bold truncate', compact ? 'text-[14.5px]' : 'text-[16px]')}>{project.name}</p>
          <p className="text-[13px] text-muted mt-0.5 flex items-center gap-1.5 truncate">
            {!hideClient && client && <><Store size={13} className="shrink-0" /><span className="truncate">{client.name}</span><span className="text-faint">·</span></>}
            <span className="shrink-0">{labelOf(PROJECT_TYPES, project.type)}</span>
          </p>
        </div>
        {owner && <Avatar profile={owner} size={compact ? 24 : 28} />}
      </div>
      {showRevs && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12.5px] mb-1.5">
            <span className="inline-flex items-center gap-1.5 font-semibold text-muted"><PencilRuler size={13} />Retouches</span>
            <span className="tabular font-bold">{prog.done} / {prog.total}</span>
          </div>
          <ProgressBar value={prog.done} total={prog.total} tone={prog.done === prog.total ? 'green' : 'orange'} />
        </div>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {onStatus ? (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatus(project) }} className="relative z-10 -my-2 py-2 pr-1" aria-label={`Changer l'avancement (${st.label})`}>
            <Badge tone={st.tone}>{st.short ?? st.label}<ChevronDown size={13} className="-mr-1 opacity-60" /></Badge>
          </button>
        ) : <Badge tone={st.tone}>{st.short ?? st.label}</Badge>}
        {!done && <DueChip date={project.due_date} />}
      </div>
    </div>
  )
})
