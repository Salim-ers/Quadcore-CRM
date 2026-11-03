import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, MessageSquare, Store } from 'lucide-react'
import type { Ticket } from '../../lib/types'
import { ticketPriority, ticketStatus } from '../../lib/constants'
import { useStore } from '../../data/store'
import { Avatar, Badge, cx } from '../../components/ui'
import { DueChip } from '../../components/bits'
import { isTicketLate, isTicketOpen, ticketRef } from '../../lib/derive'
import { relTime } from '../../lib/dates'

export const TicketCard = memo(function TicketCard({ ticket, onStatus, compact, hideClient }: {
  ticket: Ticket; onStatus?: (t: Ticket) => void; compact?: boolean; hideClient?: boolean
}) {
  const st = ticketStatus(ticket.status)
  const pr = ticketPriority(ticket.priority)
  const assignee = useStore((s) => s.db.profiles.find((p) => p.id === ticket.assignee_id))
  const client = useStore((s) => s.db.prospects.find((p) => p.id === ticket.prospect_id))
  const exchanges = useStore((s) => s.db.comments.filter((c) => c.entity_type === 'ticket' && c.entity_id === ticket.id).length)
  const open = isTicketOpen(ticket)
  const late = isTicketLate(ticket)

  return (
    <div className={cx('card relative transition hover:border-copper/30', compact ? 'p-3' : 'p-3.5', late && 'border-danger/35')}>
      <Link to={`/suivi/${ticket.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir le ticket ${ticketRef(ticket)}`} />
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] text-muted flex items-center gap-1.5 min-w-0">
            <span className="tabular font-bold shrink-0">{ticketRef(ticket)}</span>
            {!hideClient && client && <span className="inline-flex items-center gap-1 truncate"><Store size={12.5} className="shrink-0" /><span className="truncate">{client.name}</span></span>}
          </p>
          <p className={cx('font-bold leading-snug mt-0.5', compact ? 'text-[14px]' : 'text-[15.5px]', !open && 'text-muted')}>{ticket.subject}</p>
        </div>
        {assignee ? <Avatar profile={assignee} size={compact ? 24 : 28} /> : (
          <span title="Sans responsable" className={cx('rounded-full border border-dashed border-faint shrink-0', compact ? 'w-6 h-6' : 'w-7 h-7')} />
        )}
      </div>
      <div className="flex items-center gap-x-2.5 gap-y-1 mt-2.5 flex-wrap">
        {onStatus ? (
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatus(ticket) }}
            className="relative z-10 inline-flex items-center -my-2 py-2 pr-1 rounded-full" aria-label={`Changer le statut (${st.label})`}>
            <Badge tone={st.tone}>{st.short ?? st.label}<ChevronDown size={13} className="-mr-1 opacity-60" /></Badge>
          </button>
        ) : <Badge tone={st.tone}>{st.short ?? st.label}</Badge>}
        {open && (ticket.priority === 'urgente' || ticket.priority === 'haute') && <Badge tone={pr.tone} dot={false}>{pr.label}</Badge>}
        {open && ticket.status !== 'attente_client' && <DueChip date={ticket.due_date} />}
        {!open && ticket.resolved_at && <span className="text-[12.5px] text-faint">{relTime(ticket.resolved_at)}</span>}
        {exchanges > 0 && <span className="inline-flex items-center gap-1 text-[12.5px] text-faint"><MessageSquare size={12.5} />{exchanges}</span>}
      </div>
    </div>
  )
})
