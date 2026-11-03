import type { ReactNode } from 'react'
import {
  ArrowRight, BadgeCheck, CheckCircle2, FolderPlus, Headset, PackageCheck, PencilRuler, PhoneOutgoing, Plus, RotateCcw, Send, Ticket, Trophy, UserRoundCheck, XCircle, Wrench, RefreshCw, CheckSquare,
} from 'lucide-react'
import type { Activity, Profile } from '../../lib/types'
import { CHANNELS, PROJECT_STATUSES, PROSPECT_STATUSES, TICKET_STATUSES } from '../../lib/constants'

const pl = (n: number, s: string, p = s + 's') => `${n} ${n > 1 ? p : s}`

export function describeActivity(a: Activity, actor?: Profile, withSubject = true): { icon: ReactNode; tone: string; text: ReactNode } {
  const who = <b className="font-bold">{actor ? actor.first_name : 'Quelqu’un'}</b>
  const m = a.meta as Record<string, string | number | null>
  const name = withSubject && m.name ? <b className="font-bold">{m.name}</b> : null
  const pStatus = (v: unknown) => PROSPECT_STATUSES.find((s) => s.value === v)?.label ?? String(v)
  const jStatus = (v: unknown) => PROJECT_STATUSES.find((s) => s.value === v)?.label ?? String(v)
  const S = (x: ReactNode) => (name ? <> {x} {name}</> : null)
  switch (a.type) {
    case 'prospect_added': return { icon: <Plus size={15} />, tone: 'bg-stone-500/12 text-stone-700 dark:text-stone-300', text: <>{who} a ajouté {name ?? 'ce prospect'}</> }
    case 'prospect_contacted': return { icon: <PhoneOutgoing size={15} />, tone: 'bg-sky-600/12 text-sky-800 dark:text-sky-300', text: <>{who} a contacté {name ?? 'le prospect'}</> }
    case 'prospect_won': return { icon: <Trophy size={15} />, tone: 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300', text: <>{who} a gagné {name ?? 'ce client'}</> }
    case 'prospect_lost': return { icon: <XCircle size={15} />, tone: 'bg-rose-600/12 text-rose-800 dark:text-rose-300', text: <>{who} a classé {name ?? 'le prospect'} en perdu{m.reason ? <span className="text-muted"> — {m.reason}</span> : null}</> }
    case 'prospect_status': return { icon: <ArrowRight size={15} />, tone: 'bg-sunken text-muted', text: <>{who} a passé {name ?? 'le prospect'} en <b className="font-semibold">{pStatus(m.to)}</b></> }
    case 'project_created': return { icon: <FolderPlus size={15} />, tone: 'bg-copper/12 text-copper-ink', text: <>{who} a créé le projet {name ?? ''}</> }
    case 'demo_sent': return { icon: <Send size={15} />, tone: 'bg-copper/12 text-copper-ink', text: <>{who} a envoyé la démo{name ? <> — {name}</> : null}</> }
    case 'revision_requested': {
      const c = Number(m.count ?? 1)
      return { icon: <PencilRuler size={15} />, tone: 'bg-orange-500/12 text-orange-800 dark:text-orange-300', text: <>{who} a noté {pl(c, 'retouche')} demandée{c > 1 ? 's' : ''}{S('sur')}</> }
    }
    case 'revisions_done': return { icon: <Wrench size={15} />, tone: 'bg-teal-600/12 text-teal-800 dark:text-teal-300', text: <>{who} a terminé les retouches{S('de')}</> }
    case 'demo_validated': return { icon: <BadgeCheck size={15} />, tone: 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300', text: <>Démo validée{S('pour')} <span className="text-muted">· {actor?.first_name}</span></> }
    case 'site_delivered': return { icon: <PackageCheck size={15} />, tone: 'bg-ink text-bg', text: <>{who} a livré {name ?? 'le site'}</> }
    case 'project_status': return { icon: <ArrowRight size={15} />, tone: 'bg-sunken text-muted', text: <>{who} a passé {name ?? 'le projet'} en <b className="font-semibold">{jStatus(m.to)}</b></> }
    case 'follow_up_done': return { icon: <RefreshCw size={15} />, tone: 'bg-sky-600/12 text-sky-800 dark:text-sky-300', text: <>{who} a fait la relance : <span className="text-muted">{m.title}</span></> }
    case 'task_done': return { icon: <CheckSquare size={15} />, tone: 'bg-sunken text-muted', text: <>{who} a terminé <span className="text-muted">« {m.title} »</span></> }
    case 'ticket_opened': return { icon: <Ticket size={15} />, tone: 'bg-sky-600/12 text-sky-800 dark:text-sky-300', text: <>{who} a ouvert le ticket #{m.number}{name ? <> — {name}</> : null}</> }
    case 'ticket_status': return { icon: <ArrowRight size={15} />, tone: 'bg-sunken text-muted', text: <>{who} a passé le ticket #{m.number} en <b className="font-semibold">{TICKET_STATUSES.find((s) => s.value === m.to)?.label ?? String(m.to)}</b></> }
    case 'ticket_resolved': return { icon: <BadgeCheck size={15} />, tone: 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300', text: <>{who} a résolu le ticket #{m.number}{name ? <> — {name}</> : null}</> }
    case 'ticket_reopened': return { icon: <RotateCcw size={15} />, tone: 'bg-orange-500/12 text-orange-800 dark:text-orange-300', text: <>{who} a rouvert le ticket #{m.number}{name ? <> — {name}</> : null}</> }
    case 'ticket_assigned': return {
      icon: <UserRoundCheck size={15} />, tone: 'bg-sunken text-muted',
      text: !m.to ? <>{who} a retiré le responsable du ticket #{m.number}</>
        : m.to === a.actor_id ? <>{who} a pris le ticket #{m.number}</>
          : <>{who} a confié le ticket #{m.number} à <b className="font-semibold">{m.to_name ?? '—'}</b></>,
    }
    case 'contact_logged': return {
      icon: <Headset size={15} />, tone: 'bg-copper/12 text-copper-ink',
      text: <>{who} a noté un échange{name ? <> avec {name}</> : null} <span className="text-muted">· {CHANNELS.find((c) => c.value === m.channel)?.label ?? ''}</span></>,
    }
    default: return { icon: <CheckCircle2 size={15} />, tone: 'bg-sunken text-muted', text: <>{who} — {a.type}</> }
  }
}

/** Types affichés dans « Activité récente » du tableau de bord (les événements clés du spec) */
export const FEED_TYPES = new Set<Activity['type']>([
  'prospect_added', 'prospect_contacted', 'prospect_won', 'prospect_lost', 'project_created', 'demo_sent',
  'revision_requested', 'revisions_done', 'demo_validated', 'site_delivered', 'follow_up_done',
  'ticket_opened', 'ticket_resolved', 'ticket_reopened', 'contact_logged',
])
