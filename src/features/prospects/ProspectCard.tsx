import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ExternalLink, Flame, Hourglass, MapPin, MessageCircle, Phone, RotateCcw, X } from 'lucide-react'
import type { Profile, Prospect } from '../../lib/types'
import { prospectStep, siteStep, SITE_STEPS, type ProspectStep } from '../../lib/constants'
import { Avatar, cx } from '../../components/ui'
import { DueChip, ProspectThumb } from '../../components/bits'
import { normalizeUrl, telLink, whatsappLink } from '../../lib/links'
import { useFileUrl } from '../../lib/useFileUrl'
import { useStore } from '../../data/store'

const SITE_TINT = 'bg-copper/12 text-copper-ink hover:bg-copper/20'
const DECISIONS: { to: ProspectStep; label: string; icon: typeof Check; tint: string }[] = [
  { to: 'accepte', label: 'Accepté', icon: Check, tint: 'bg-emerald-600/12 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-600/20' },
  { to: 'attente', label: 'En attente', icon: Hourglass, tint: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25' },
  { to: 'refuse', label: 'Refusé', icon: X, tint: 'bg-rose-600/10 text-rose-800 dark:text-rose-300 hover:bg-rose-600/18' },
]

/** Carte d'une fiche : l'étape suivante est un bouton, pas besoin d'ouvrir la fiche. */
export const ProspectCard = memo(function ProspectCard({ p, owner, onStep }: {
  p: Prospect; owner?: Profile; onStep: (p: Prospect, step: ProspectStep) => void
}) {
  const step = prospectStep(p.status)
  const logo = useFileUrl(p.logo_path)
  const site = useStore((s) => s.db.projects.find((x) => x.prospect_id === p.id && !x.archived))
  const tel = telLink(p.phone), wa = whatsappLink(p.phone)
  const url = normalizeUrl(site?.final_url ?? site?.demo_url ?? p.website_url)
  const deciding = step === 'vu' || step === 'attente'
  const decisions = DECISIONS.filter((d) => d.to !== step)
  const siteLabel = `Voir le site de ${p.name}`
  const action = 'relative z-10 h-11 rounded-xl text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[.98]'
  // Quatre boutons doivent tenir sur un téléphone : l'icône passe au-dessus du mot
  const stacked = 'relative z-10 h-14 min-w-0 rounded-xl text-[12.5px] leading-tight text-center font-semibold flex flex-col items-center justify-center gap-1 transition active:scale-[.98]'

  return (
    <div className="card relative p-3.5 transition hover:border-copper/30">
      <Link to={`/prospects/${p.id}`} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir ${p.name}`} />
      <div className="flex items-center gap-3">
        <ProspectThumb name={p.name} category={p.category} logoUrl={logo} size={44} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[16px] truncate flex items-center gap-1.5">
            <span className="truncate">{p.name}</span>
            {p.priority === 'haute' && <Flame size={15} className="text-copper shrink-0" aria-label="Priorité haute" />}
          </p>
          <div className="flex items-center flex-wrap gap-x-3 text-[13px] text-muted mt-0.5 min-w-0">
            {p.city && <span className="inline-flex items-center gap-1 truncate"><MapPin size={13} className="shrink-0" />{p.city}</span>}
            {deciding && <DueChip date={p.next_follow_up} />}
          </div>
        </div>
        {tel && <a href={tel} className="relative z-10 icon-btn w-10 h-10 bg-sunken" aria-label={`Appeler ${p.name}`}><Phone size={17} /></a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="relative z-10 icon-btn w-10 h-10 bg-sunken" aria-label={`WhatsApp ${p.name}`}><MessageCircle size={17} /></a>}
        {!tel && owner && <Avatar profile={owner} size={28} />}
      </div>

      {deciding ? (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${decisions.length + (url ? 1 : 0)}, minmax(0, 1fr))` }}>
          {decisions.map(({ to, label, icon: Icon, tint }) => (
            <button key={to} type="button" onClick={() => onStep(p, to)} className={cx(stacked, tint)}><Icon size={17} />{label}</button>
          ))}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={siteLabel} className={cx(stacked, SITE_TINT)}><ExternalLink size={17} />Site</a>}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {step === 'prospect' && (
              <button type="button" onClick={() => onStep(p, 'vu')} className={cx(action, 'w-full bg-sunken hover:bg-line/60')}><Check size={17} />Client vu</button>
            )}
            {step === 'accepte' && site && (
              <Link to={`/projets/${site.id}`} className={cx(action, 'w-full bg-sunken hover:bg-line/60')}>
                {SITE_STEPS.find((s) => s.value === siteStep(site.status))!.label}<ArrowRight size={16} />
              </Link>
            )}
            {step === 'refuse' && (
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 text-[13px] text-muted truncate">{p.lost_reason ?? 'Refusé'}</p>
                <button type="button" onClick={() => onStep(p, 'prospect')} className={cx(action, 'px-3 bg-sunken hover:bg-line/60 h-10')}><RotateCcw size={15} />Reprendre</button>
              </div>
            )}
          </div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={siteLabel} className={cx(action, 'shrink-0 px-3.5', SITE_TINT)}>
              Site<ExternalLink size={15} />
            </a>
          )}
        </div>
      )}
    </div>
  )
})
