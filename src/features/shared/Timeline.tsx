import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, ImageIcon, MessageSquare, Paperclip, Send, Trash2, Upload } from 'lucide-react'
import type { Attachment, Channel, EntityType, UUID } from '../../lib/types'
import { useIsAdmin, useStore } from '../../data/store'
import { addComment, deleteAttachment, deleteComment, uploadAttachment } from '../../data/actions'
import { Avatar, Chips, Empty, Spinner, TextArea, confirmDialog, cx } from '../../components/ui'
import { ChannelIcon } from '../../components/bits'
import { relTime } from '../../lib/dates'
import { describeActivity } from './activity'
import { CHANNELS, PROJECT_STATUSES, PROSPECT_STATUSES, TICKET_STATUSES, TONES, labelOf } from '../../lib/constants'
import { fileUrlNow, useFileUrl } from '../../lib/useFileUrl'

type Filter = 'all' | 'exchanges' | 'comments' | 'status'

/** Fil d'un dossier : échanges client + commentaires + activité + historique des statuts */
export function Timeline({ entity, id, activityKey, onExchange }: {
  entity: 'prospect' | 'project' | 'ticket'; id: UUID; activityKey: 'prospect_id' | 'project_id' | 'ticket_id'; onExchange?: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const comments = useStore((s) => s.db.comments)
  const activities = useStore((s) => s.db.activities)
  const history = useStore((s) => s.db.status_history)
  const profiles = useStore((s) => s.db.profiles)
  const tickets = useStore((s) => s.db.tickets)
  const userId = useStore((s) => s.userId)
  const admin = useIsAdmin()
  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  // Sur une fiche client, les échanges notés sur ses tickets remontent aussi
  const clientTickets = useMemo(() => new Map(entity === 'prospect' ? tickets.filter((t) => t.prospect_id === id).map((t) => [t.id, t]) : []), [entity, id, tickets])
  const withExchanges = entity !== 'project'

  const items = useMemo(() => {
    const c = comments
      .filter((x) => (x.entity_type === entity && x.entity_id === id) || (x.entity_type === 'ticket' && !!x.channel && clientTickets.has(x.entity_id)))
      .map((x) => ({ kind: 'comment' as const, at: x.created_at, x }))
    const recent = <T extends { at: string }>(l: T[]) => l.sort((a, b) => (a.at < b.at ? 1 : -1))
    if (filter === 'exchanges') return recent(c.filter((i) => i.x.channel))
    if (filter === 'comments') return recent(c.filter((i) => !i.x.channel))
    if (filter === 'status') {
      return recent(history.filter((h) => h.entity_type === entity && h.entity_id === id).map((h) => ({ kind: 'status' as const, at: h.created_at, h })))
    }
    // Les échanges sont déjà affichés ; sur une fiche prospect, on ne répète pas les changements de statut des projets
    // ni le détail de la vie des tickets, qui reste sur le ticket lui-même
    const acts = activities
      .filter((a) => a[activityKey] === id && a.type !== 'contact_logged' &&
        !(entity === 'prospect' && a.project_id && a.type === 'project_status') &&
        !(entity !== 'ticket' && (a.type === 'ticket_status' || a.type === 'ticket_assigned')))
      .map((a) => ({ kind: 'activity' as const, at: a.created_at, a }))
    return recent([...c, ...acts])
  }, [comments, activities, history, entity, id, filter, activityKey, clientTickets])

  const statuses = entity === 'prospect' ? PROSPECT_STATUSES : entity === 'project' ? PROJECT_STATUSES : TICKET_STATUSES
  const label = (v: string | null) => statuses.find((s) => s.value === v)

  return (
    <div>
      <CommentComposer entity={entity} id={id} withExchange={withExchanges} onExchange={onExchange} />
      <Chips className="mt-4 mb-3" value={filter} onChange={setFilter}
        options={[
          { value: 'all' as const, label: 'Tout' },
          ...(withExchanges ? [{ value: 'exchanges' as const, label: 'Échanges client' }] : []),
          { value: 'comments' as const, label: withExchanges ? 'Notes internes' : 'Commentaires' },
          { value: 'status' as const, label: withExchanges ? 'Statuts' : 'Historique des statuts' },
        ]} />
      {items.length === 0 ? (
        <Empty icon={<MessageSquare size={24} />} title="Rien pour l’instant" text="Les échanges et changements apparaîtront ici." />
      ) : (
        <ol className="relative">
          {items.map((it, i) => {
            const last = i === items.length - 1
            if (it.kind === 'comment') {
              const author = it.x.author_id ? byId.get(it.x.author_id) : undefined
              const fromTicket = it.x.entity_type === 'ticket' ? clientTickets.get(it.x.entity_id) : undefined
              return (
                <li key={'c' + it.x.id} className="relative pl-11 pb-4">
                  {!last && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-line" />}
                  <span className="absolute left-0 top-0"><Avatar profile={author} size={31} /></span>
                  <div className={cx('card p-3 shadow-none', it.x.channel ? 'bg-copper/[0.05] border-copper/25' : 'bg-surface')}>
                    {it.x.channel && (
                      <p className="flex items-center gap-1.5 text-[12px] font-bold text-copper-ink mb-1">
                        <ChannelIcon channel={it.x.channel} size={13.5} />Échange client · {labelOf(CHANNELS, it.x.channel)}
                        {fromTicket && <Link to={`/suivi/${fromTicket.id}`} className="ml-auto underline underline-offset-2">#{fromTicket.number}</Link>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[13.5px]">{author?.first_name ?? '—'}</span>
                      <span className="text-[12px] text-faint flex-1">{relTime(it.x.created_at)}</span>
                      {(it.x.author_id === userId || admin) && (
                        <button className="text-faint hover:text-danger p-1 -m-1" aria-label="Supprimer le commentaire"
                          onClick={async () => { if (await confirmDialog({ title: 'Supprimer ce commentaire ?', confirm: 'Supprimer', danger: true })) deleteComment(it.x.id) }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">{it.x.body}</p>
                  </div>
                </li>
              )
            }
            if (it.kind === 'status') {
              const from = label(it.h.from_status), to = label(it.h.to_status)
              const who = it.h.changed_by ? byId.get(it.h.changed_by) : undefined
              return (
                <li key={'h' + it.h.id} className="relative pl-11 pb-4">
                  {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" />}
                  <span className={cx('absolute left-[10px] top-[7px] w-[11px] h-[11px] rounded-full ring-4 ring-bg', to ? TONES[to.tone].dot : 'bg-faint')} />
                  <p className="text-[14px] flex items-center gap-1.5 flex-wrap">
                    {from ? <><span className="text-muted">{from.label}</span><ArrowRight size={13} className="text-faint" /></> : <span className="text-muted">Créé en</span>}
                    <b className="font-semibold">{to?.label ?? it.h.to_status}</b>
                  </p>
                  <p className="text-[12.5px] text-faint mt-0.5">{who?.first_name ?? '—'} · {relTime(it.h.created_at)}{it.h.note ? ` · ${it.h.note}` : ''}</p>
                </li>
              )
            }
            const d = describeActivity(it.a, it.a.actor_id ? byId.get(it.a.actor_id) : undefined, false)
            return (
              <li key={'a' + it.a.id} className="relative pl-11 pb-4">
                {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" />}
                <span className={cx('absolute left-0 top-0 w-[31px] h-[31px] rounded-full flex items-center justify-center', d.tone)}>{d.icon}</span>
                <p className="text-[14px] leading-snug pt-1">{it.a.ticket_id && entity !== 'ticket' ? <Link to={`/suivi/${it.a.ticket_id}`} className="hover:text-copper-ink">{d.text}</Link> : d.text}</p>
                <p className="text-[12.5px] text-faint mt-0.5">{relTime(it.a.created_at)}</p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

/** withExchange : permet de noter un échange avec le client, pas seulement un commentaire interne */
export function CommentComposer({ entity, id, placeholder = 'Ajouter un commentaire interne…', withExchange, onExchange }: {
  entity: EntityType; id: UUID; placeholder?: string; withExchange?: boolean; onExchange?: () => void
}) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [channel, setChannel] = useState<Channel | null>(null)
  const [lastChannel, setLastChannel] = useState<Channel>('telephone')
  const send = async () => {
    if (!body.trim()) return
    setBusy(true)
    const ok = await addComment(entity, id, body, channel)
    setBusy(false)
    if (ok) {
      setBody('')
      if (channel) onExchange?.()
    }
  }
  return (
    <div>
      {withExchange && (
        <>
          <div className="grid grid-cols-2 gap-1 bg-sunken rounded-xl p-1 mb-2">
            {([[false, 'Note interne'], [true, 'Échange client']] as const).map(([on, l]) => (
              <button key={l} type="button" aria-pressed={!!channel === on} onClick={() => setChannel(on ? lastChannel : null)}
                className={cx('h-9 rounded-lg text-[13.5px] font-semibold transition', !!channel === on ? 'bg-surface shadow-card' : 'text-muted')}>{l}</button>
            ))}
          </div>
          {channel && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
              {CHANNELS.map((c) => (
                <button key={c.value} type="button" onClick={() => { setChannel(c.value); setLastChannel(c.value) }} className={cx('chip h-9 min-h-0 shrink-0', channel === c.value && 'chip-on')}>
                  <ChannelIcon channel={c.value} />{c.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="relative">
        <TextArea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel ? 'Ce qui a été dit, ce qui a été convenu…' : placeholder} className="pr-14"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }} />
        <button onClick={send} disabled={!body.trim() || busy} aria-label="Envoyer"
          className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-copper text-onCopper flex items-center justify-center disabled:opacity-30 transition active:scale-95">
          {busy ? <Spinner className="w-4 h-4" /> : <Send size={17} />}
        </button>
      </div>
    </div>
  )
}

/** Documents et captures joints à un dossier */
export function Attachments({ entity, id, compact }: { entity: EntityType; id: UUID; compact?: boolean }) {
  const all = useStore((s) => s.db.attachments)
  const files = useMemo(() => all.filter((a) => a.entity_type === entity && a.entity_id === id).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), [all, entity, id])
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const userId = useStore((s) => s.userId)
  const admin = useIsAdmin()

  async function onFiles(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    for (const f of Array.from(list)) await uploadAttachment(entity, id, f)
    setBusy(false)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <div className={cx('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3')}>
        {files.map((f) => <AttachmentTile key={f.id} f={f} canDelete={f.uploaded_by === userId || admin} />)}
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="aspect-[4/3] rounded-xl border border-dashed border-line text-muted flex flex-col items-center justify-center gap-1.5 text-[12.5px] font-semibold hover:border-copper/40 hover:text-copper-ink transition">
          {busy ? <Spinner /> : <Upload size={20} />}
          {busy ? 'Envoi…' : compact ? 'Capture' : 'Ajouter un fichier'}
        </button>
      </div>
      <input ref={input} type="file" multiple hidden accept={compact ? 'image/*' : 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt'} onChange={(e) => onFiles(e.target.files)} />
    </div>
  )
}

function AttachmentTile({ f, canDelete }: { f: Attachment; canDelete: boolean }) {
  const isImg = (f.mime_type ?? '').startsWith('image/')
  const url = useFileUrl(isImg ? f.file_path : null)
  const open = async () => {
    const u = await fileUrlNow(f.file_path)
    if (u.startsWith('data:')) {
      const w = window.open()
      if (w) { w.document.title = f.file_name; const img = w.document.createElement('img'); img.src = u; img.style.maxWidth = '100%'; w.document.body.appendChild(img) }
    } else window.open(u, '_blank', 'noopener')
  }
  return (
    <div className="group relative aspect-[4/3] rounded-xl border border-line bg-sunken overflow-hidden">
      <button type="button" onClick={open} className="absolute inset-0 flex items-center justify-center" aria-label={`Ouvrir ${f.file_name}`}>
        {isImg && url ? <img src={url} alt={f.file_name} className="w-full h-full object-cover" /> : (
          <span className="flex flex-col items-center gap-1 px-2 text-muted">
            {isImg ? <ImageIcon size={22} /> : f.mime_type === 'application/pdf' ? <FileText size={22} /> : <Paperclip size={22} />}
            <span className="text-[11.5px] font-semibold line-clamp-2 text-center break-all">{f.file_name}</span>
          </span>
        )}
      </button>
      {canDelete && (
        <button type="button" aria-label="Supprimer le fichier"
          onClick={async () => { if (await confirmDialog({ title: `Supprimer « ${f.file_name} » ?`, confirm: 'Supprimer', danger: true })) deleteAttachment(f.id) }}
          className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-black/55 text-white flex items-center justify-center lg:opacity-0 group-hover:opacity-100 transition">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}
