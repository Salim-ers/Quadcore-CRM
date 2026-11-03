import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Flame, MapPin } from 'lucide-react'
import type { Profile, Prospect } from '../../lib/types'
import { prospectStatus } from '../../lib/constants'
import { Avatar, Badge, cx } from '../../components/ui'
import { DueChip, ProspectThumb } from '../../components/bits'
import { useFileUrl } from '../../lib/useFileUrl'

export const ProspectCard = memo(function ProspectCard({ p, owner, onStatus, compact }: {
  p: Prospect; owner?: Profile; onStatus?: (p: Prospect) => void; compact?: boolean
}) {
  const st = prospectStatus(p.status)
  const logo = useFileUrl(p.logo_path)
  const followDue = p.next_follow_up && !['gagne', 'perdu'].includes(p.status)
  return (
    <div className={cx('card relative transition hover:border-copper/30', compact ? 'p-3' : 'p-3.5')}>
      <Link to={`/prospects/${p.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir ${p.name}`} />
      <div className="flex items-start gap-3">
        <ProspectThumb name={p.name} category={p.category} logoUrl={logo} size={compact ? 38 : 46} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cx('font-bold truncate', compact ? 'text-[14.5px]' : 'text-[16px]')}>{p.name}</p>
            {p.priority === 'haute' && <Flame size={15} className="text-copper shrink-0" aria-label="Priorité haute" />}
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted mt-0.5 min-w-0">
            {p.city && <span className="inline-flex items-center gap-1 truncate"><MapPin size={13} />{p.city}</span>}
            {p.instagram_handle && !compact && <span className="truncate text-faint">@{p.instagram_handle}</span>}
          </div>
        </div>
        {owner && <Avatar profile={owner} size={compact ? 24 : 28} />}
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {onStatus ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatus(p) }}
            className="relative z-10 inline-flex items-center gap-1 -my-2 py-2 pr-1 rounded-full"
            aria-label={`Changer le statut (${st.label})`}
          >
            <Badge tone={st.tone}>{st.short ?? st.label}<ChevronDown size={13} className="-mr-1 opacity-60" /></Badge>
          </button>
        ) : <Badge tone={st.tone}>{st.short ?? st.label}</Badge>}
        {followDue && <DueChip date={p.next_follow_up} />}
        {p.status === 'perdu' && p.lost_reason && <span className="text-[12.5px] text-faint truncate">{p.lost_reason}</span>}
      </div>
    </div>
  )
})
