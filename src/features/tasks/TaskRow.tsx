import { memo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, FolderKanban, RefreshCw, Store } from 'lucide-react'
import type { Task } from '../../lib/types'
import { useStore } from '../../data/store'
import { toggleTask } from '../../data/actions'
import { Avatar, cx } from '../../components/ui'
import { DueChip } from '../../components/bits'

export const TaskRow = memo(function TaskRow({ task, onOpen, showLinks = true }: { task: Task; onOpen: (t: Task) => void; showLinks?: boolean }) {
  const assignee = useStore((s) => s.db.profiles.find((p) => p.id === task.assignee_id))
  const prospect = useStore((s) => (task.prospect_id ? s.db.prospects.find((p) => p.id === task.prospect_id) : undefined))
  const project = useStore((s) => (task.project_id ? s.db.projects.find((p) => p.id === task.project_id) : undefined))
  const done = task.status === 'termine'
  // coche instantanée, même pendant l'enregistrement
  const [checked, setChecked] = useState(done)
  useEffect(() => setChecked(done), [done])

  return (
    <div className={cx('card flex items-start gap-1 pr-3 transition', checked && 'opacity-60')}>
      <button
        type="button"
        onClick={() => { setChecked(!checked); toggleTask(task) }}
        aria-label={checked ? 'Marquer comme à faire' : 'Marquer comme terminée'}
        className="w-12 h-[52px] shrink-0 flex items-center justify-center"
      >
        <span className={cx('w-[22px] h-[22px] rounded-[7px] border-2 flex items-center justify-center transition',
          checked ? 'bg-copper border-copper text-onCopper' : task.priority === 'haute' ? 'border-copper' : 'border-faint')}>
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
      </button>
      <button type="button" onClick={() => onOpen(task)} className="flex-1 min-w-0 text-left py-3">
        <p className={cx('font-semibold text-[15px] leading-snug', checked && 'line-through decoration-faint')}>
          {task.is_follow_up && <RefreshCw size={13} className="inline -mt-0.5 mr-1.5 text-copper-ink" aria-label="Relance" />}
          {task.title}
        </p>
        <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap">
          <DueChip date={task.due_date} done={checked} />
          {showLinks && prospect && <span className="inline-flex items-center gap-1 text-[12.5px] text-muted truncate max-w-[180px]"><Store size={13} />{prospect.name}</span>}
          {showLinks && project && !prospect && <span className="inline-flex items-center gap-1 text-[12.5px] text-muted truncate max-w-[180px]"><FolderKanban size={13} />{project.name}</span>}
        </div>
      </button>
      <span className="pt-3.5">{assignee && <Avatar profile={assignee} size={24} />}</span>
    </div>
  )
})

export function LinkedEntity({ task }: { task: Task }) {
  const prospect = useStore((s) => (task.prospect_id ? s.db.prospects.find((p) => p.id === task.prospect_id) : undefined))
  const project = useStore((s) => (task.project_id ? s.db.projects.find((p) => p.id === task.project_id) : undefined))
  return (
    <div className="flex flex-col gap-2">
      {prospect && <Link to={`/prospects/${prospect.id}`} className="btn-soft justify-start"><Store size={17} />{prospect.name}</Link>}
      {project && <Link to={`/projets/${project.id}`} className="btn-soft justify-start"><FolderKanban size={17} />{project.name}</Link>}
    </div>
  )
}
