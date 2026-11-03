import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCheck, Plus } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Chips, Empty, cx } from '../../components/ui'
import { useStore } from '../../data/store'
import { filterTasks, type TaskView } from '../../lib/derive'
import { TaskRow } from './TaskRow'
import { TaskSheet } from './TaskSheet'
import type { Task } from '../../lib/types'
import { NotificationCard } from '../team/notifications'
import { todayStr } from '../../lib/dates'

const VIEWS: { value: TaskView; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'late', label: 'En retard' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'mine', label: 'Mes tâches' },
  { value: 'all', label: 'Toutes' },
]

export function TasksPage() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('v') as TaskView) || 'today'
  const [showDone, setShowDone] = useState(false)
  const [sheet, setSheet] = useState<{ task?: Task } | null>(null)
  const tasks = useStore((s) => s.db.tasks)
  const userId = useStore((s) => s.userId)
  const [scope, setScope] = useState<'me' | 'team'>('me')

  const scoped = useMemo(() => (scope === 'me' && view !== 'mine' ? tasks.filter((t) => t.assignee_id === userId) : tasks), [tasks, scope, userId, view])
  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.value, filterTasks(scoped, v.value, userId, false).length])), [scoped, userId])
  const list = useMemo(() => filterTasks(scoped, view, userId, showDone), [scoped, view, userId, showDone])
  const doneToday = tasks.filter((t) => t.status === 'termine' && t.completed_at?.slice(0, 10) === todayStr() && t.assignee_id === userId).length

  // regroupement par échéance pour les vues longues
  const groups = useMemo(() => {
    if (view === 'today' || view === 'late') return [{ key: '', items: list }]
    const today = todayStr()
    const g: Record<string, Task[]> = {}
    for (const t of list) {
      const k = t.status === 'termine' ? 'Terminées' : !t.due_date ? 'Sans échéance' : t.due_date < today ? 'En retard' : t.due_date === today ? "Aujourd'hui" : 'À venir'
      ;(g[k] ??= []).push(t)
    }
    return ['En retard', "Aujourd'hui", 'À venir', 'Sans échéance', 'Terminées'].filter((k) => g[k]).map((k) => ({ key: k, items: g[k] }))
  }, [list, view])

  return (
    <>
      <PageHeader title="Tâches" subtitle={doneToday ? `${doneToday} terminée${doneToday > 1 ? 's' : ''} aujourd’hui — bravo` : 'Relances, envois, livraisons'}
        actions={<button className="btn-soft h-10 min-h-0 px-3" onClick={() => setSheet({})}><Plus size={17} />Tâche</button>}>
        <Chips className="mt-3" value={view} onChange={(v) => { const n = new URLSearchParams(params); if (v === 'today') n.delete('v'); else n.set('v', v); setParams(n, { replace: true }) }}
          options={VIEWS.map((v) => ({ ...v, count: counts[v.value] }))} />
        {view !== 'mine' && (
          <div className="flex items-center gap-1 mt-3 bg-sunken rounded-xl p-1 w-max">
            {(['me', 'team'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)} className={cx('h-9 px-3.5 rounded-lg text-[13.5px] font-semibold transition', scope === s ? 'bg-surface shadow-card' : 'text-muted')}>
                {s === 'me' ? 'Moi' : 'Toute l’équipe'}
              </button>
            ))}
          </div>
        )}
      </PageHeader>
      <Page className="pt-3">
        <NotificationCard />
        {list.length === 0 ? (
          <Empty icon={<CheckCheck size={26} />} title={view === 'late' ? 'Rien en retard' : 'Rien de prévu'}
            text={view === 'today' ? 'Profitez-en pour ajouter de nouveaux prospects.' : 'Aucune tâche dans cette vue.'}
            action={<button className="btn-soft" onClick={() => setSheet({})}><Plus size={17} />Nouvelle tâche</button>} />
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mb-5">
              {g.key && <p className={cx('section-title mb-2.5', g.key === 'En retard' && 'text-danger')}>{g.key} · {g.items.length}</p>}
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{g.items.map((t) => <TaskRow key={t.id} task={t} onOpen={(task) => setSheet({ task })} />)}</div>
            </div>
          ))
        )}
        {view !== 'late' && (
          <button className="text-[13.5px] font-semibold text-muted min-h-[44px]" onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Masquer les tâches terminées' : 'Afficher les tâches terminées'}
          </button>
        )}
      </Page>
      <TaskSheet open={!!sheet} onClose={() => setSheet(null)} task={sheet?.task} />
    </>
  )
}
