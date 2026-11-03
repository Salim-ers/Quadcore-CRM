import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Section } from '../../components/ui'
import { useUi } from '../../components/Shell'
import { useStore } from '../../data/store'
import { filterTickets, isTicketOpen } from '../../lib/derive'
import type { UUID } from '../../lib/types'
import { TicketCard } from './TicketCard'

/** Tickets d'un client ou d'un projet, à afficher sur sa fiche */
export function TicketsSection({ prospectId, projectId }: { prospectId: UUID | null; projectId?: UUID }) {
  const all = useStore((s) => s.db.tickets)
  const userId = useStore((s) => s.userId)
  const newTicket = useUi((s) => s.newTicket)
  const [showDone, setShowDone] = useState(false)
  const mine = useMemo(() => all.filter((t) => (projectId ? t.project_id === projectId : t.prospect_id === prospectId)), [all, prospectId, projectId])
  const open = useMemo(() => filterTickets(mine, 'ouverts', userId), [mine, userId])
  const done = useMemo(() => filterTickets(mine, 'termines', userId), [mine, userId])
  const list = showDone ? [...open, ...done] : open

  return (
    <Section title={`Tickets (${mine.filter(isTicketOpen).length} ouverts)`}
      action={prospectId && <button className="btn-ghost h-9 min-h-0 px-3 text-copper-ink" onClick={() => newTicket({ prospect_id: prospectId, project_id: projectId ?? null })}><Plus size={16} />Ticket</button>}>
      {list.length === 0 ? <p className="text-[14px] text-muted">Aucun ticket ouvert.</p> : (
        <div className="grid gap-2">{list.map((t) => <TicketCard key={t.id} ticket={t} hideClient />)}</div>
      )}
      {done.length > 0 && <button className="mt-2 text-[13px] font-semibold text-muted min-h-[40px]" onClick={() => setShowDone((v) => !v)}>{showDone ? 'Masquer' : 'Afficher'} {done.length > 1 ? `les ${done.length} résolus` : 'le ticket résolu'}</button>}
    </Section>
  )
}
