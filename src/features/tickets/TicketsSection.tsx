import { useMemo, useState } from 'react'
import { Plus, Ticket, TriangleAlert } from 'lucide-react'
import { Fold } from '../../components/ui'
import { useUi } from '../../components/Shell'
import { useStore } from '../../data/store'
import { filterTickets, isTicketOpen } from '../../lib/derive'
import type { UUID } from '../../lib/types'
import { TicketCard } from './TicketCard'

/** Le geste en cas de pépin sur un site : la fiche arrive avec le client et le site déjà remplis. */
export function ReportProblem({ prospectId, projectId, className }: { prospectId: UUID | null; projectId: UUID; className?: string }) {
  const newTicket = useUi((s) => s.newTicket)
  return (
    <button type="button" className={className ?? 'btn-soft w-full text-[14.5px]'} onClick={() => newTicket({ prospect_id: prospectId ?? undefined, project_id: projectId, type: 'incident' })}>
      <TriangleAlert size={17} />Signaler un problème
    </button>
  )
}

/** Tickets d'un client ou d'un site, repliés tant qu'aucun n'est ouvert */
export function TicketsSection({ prospectId, projectId }: { prospectId: UUID | null; projectId?: UUID }) {
  const all = useStore((s) => s.db.tickets)
  const userId = useStore((s) => s.userId)
  const newTicket = useUi((s) => s.newTicket)
  const [showDone, setShowDone] = useState(false)
  const mine = useMemo(() => all.filter((t) => (projectId ? t.project_id === projectId : t.prospect_id === prospectId)), [all, prospectId, projectId])
  const open = useMemo(() => filterTickets(mine, 'ouverts', userId), [mine, userId])
  const done = useMemo(() => filterTickets(mine, 'termines', userId), [mine, userId])
  const list = showDone ? [...open, ...done] : open
  // Sur un site, le bouton « Signaler un problème » est déjà visible : on ne replie que l'historique
  if (projectId && mine.length === 0) return null

  return (
    <Fold key={open.length > 0 ? 'ouvert' : 'calme'} title="Tickets" icon={<Ticket size={19} />} count={mine.filter(isTicketOpen).length} defaultOpen={open.length > 0}>
      {!projectId && prospectId && <button className="btn-soft w-full mb-3 text-[14px]" onClick={() => newTicket({ prospect_id: prospectId })}><Plus size={16} />Ticket</button>}
      {list.length > 0 && <div className="grid grid-cols-1 gap-2">{list.map((t) => <TicketCard key={t.id} ticket={t} hideClient />)}</div>}
      {done.length > 0 && <button className="mt-2 text-[13px] font-semibold text-muted min-h-[40px]" onClick={() => setShowDone((v) => !v)}>{showDone ? 'Masquer' : 'Afficher'} {done.length > 1 ? `les ${done.length} résolus` : 'le ticket résolu'}</button>}
    </Fold>
  )
}
