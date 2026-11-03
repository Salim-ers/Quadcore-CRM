import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive, ArchiveRestore, Camera, ChevronDown, ExternalLink, ThumbsUp, FolderPlus, Briefcase, MapPin, MoreHorizontal, Music2, Pencil, Plus, Store, Trash2,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Avatar, Badge, Empty, Section, Sheet, confirmDialog, cx } from '../../components/ui'
import { ContactActions, DueChip, ProspectThumb } from '../../components/bits'
import { useIsAdmin, useStore, deleteRow } from '../../data/store'
import { archive, createProject, projectDraftFrom, uploadLogo } from '../../data/actions'
import { CATEGORIES, PRIORITIES, PROSPECT_STATUSES, TONES, labelOf, prospectStatus } from '../../lib/constants'
import { fullName } from '../../lib/derive'
import { formatPhone, normalizeUrl, prettyUrl } from '../../lib/links'
import { shortDate } from '../../lib/dates'
import { useFileUrl } from '../../lib/useFileUrl'
import { useProspectStatusFlow } from './flows'
import { ProspectForm } from './ProspectForm'
import { ProjectCard } from '../projects/ProjectCard'
import { TaskRow } from '../tasks/TaskRow'
import { TaskSheet, type TaskDraft } from '../tasks/TaskSheet'
import { Attachments, Timeline } from '../shared/Timeline'
import { TicketsSection } from '../tickets/TicketsSection'
import type { Task } from '../../lib/types'

export function ProspectDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const p = useStore((s) => s.db.prospects.find((x) => x.id === id))
  const owner = useStore((s) => s.db.profiles.find((x) => x.id === p?.owner_id))
  const allProjects = useStore((s) => s.db.projects)
  const allTasks = useStore((s) => s.db.tasks)
  const admin = useIsAdmin()
  const flow = useProspectStatusFlow()
  const [edit, setEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; draft?: TaskDraft } | null>(null)
  const [showDone, setShowDone] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const logo = useFileUrl(p?.logo_path)

  const projects = useMemo(() => allProjects.filter((x) => x.prospect_id === id && !x.archived), [allProjects, id])
  const tasks = useMemo(() => allTasks.filter((t) => t.prospect_id === id && (showDone || t.status !== 'termine'))
    .sort((a, b) => (a.status === 'termine' ? 1 : 0) - (b.status === 'termine' ? 1 : 0) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9')), [allTasks, id, showDone])
  const doneCount = useMemo(() => allTasks.filter((t) => t.prospect_id === id && t.status === 'termine').length, [allTasks, id])

  if (!p) {
    return (
      <>
        <PageHeader title="Prospect" back="/prospects" />
        <Page><Empty icon={<Store size={26} />} title="Fiche introuvable" text="Elle a peut-être été supprimée par un administrateur." action={<Link className="btn-soft" to="/prospects">Retour aux prospects</Link>} /></Page>
      </>
    )
  }

  const st = prospectStatus(p.status)
  const idx = PROSPECT_STATUSES.findIndex((s) => s.value === p.status)
  const cat = CATEGORIES.find((c) => c.value === p.category)
  const info: [string, React.ReactNode][] = [
    ['Contact', p.contact_name],
    ['Téléphone', p.phone && formatPhone(p.phone)],
    ['E-mail', p.email],
    ['Adresse', [p.address, p.city].filter(Boolean).join(', ')],
    ['Instagram', p.instagram_handle && (p.instagram_url ? <a className="text-copper-ink font-semibold" href={p.instagram_url} target="_blank" rel="noopener noreferrer">@{p.instagram_handle}</a> : '@' + p.instagram_handle)],
    ['Site existant', p.website_url && <a className="text-copper-ink font-semibold inline-flex items-center gap-1" href={normalizeUrl(p.website_url)!} target="_blank" rel="noopener noreferrer">{prettyUrl(p.website_url)}<ExternalLink size={13} /></a>],
    ['Source', p.source],
    ['Service proposé', p.service],
    ['Priorité', labelOf(PRIORITIES, p.priority)],
    ['Ajouté le', shortDate(p.created_at)],
  ]
  const socials = [
    { url: p.facebook_url, icon: <ThumbsUp size={17} />, label: 'Facebook' },
    { url: p.tiktok_url, icon: <Music2 size={17} />, label: 'TikTok' },
    { url: p.linkedin_url, icon: <Briefcase size={17} />, label: 'LinkedIn' },
  ].filter((s) => s.url)

  return (
    <>
      <PageHeader
        title={p.name}
        back="/prospects"
        actions={
          <>
            <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={19} /></button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Plus d’actions"><MoreHorizontal size={21} /></button>
          </>
        }
      />
      <Page className="pt-2">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div>
            {/* ——— En-tête de fiche ——— */}
            <div className="card p-4">
              <div className="flex items-start gap-3.5">
                <button className="relative group" onClick={() => logoInput.current?.click()} aria-label="Ajouter un logo ou une photo">
                  <ProspectThumb name={p.name} category={p.category} logoUrl={logo} size={60} />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center text-muted"><Camera size={12} /></span>
                </button>
                <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(p, f) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-muted flex items-center gap-1.5 flex-wrap">
                    {cat && <span>{cat.label}</span>}
                    {cat && p.city && <span className="text-faint">·</span>}
                    {p.city && <span className="inline-flex items-center gap-1"><MapPin size={13} />{p.city}</span>}
                  </p>
                  <button onClick={() => flow.openPicker(p)} className="mt-2 inline-flex">
                    <Badge tone={st.tone} className="h-8 px-3 text-[13px]">{st.label}<ChevronDown size={14} className="-mr-1 opacity-60" /></Badge>
                  </button>
                  {p.status === 'perdu' && p.lost_reason && <p className="text-[13px] text-muted mt-1.5">Motif : {p.lost_reason}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {owner && <Avatar profile={owner} size={32} />}
                  <span className="text-[11.5px] text-faint">{owner?.first_name ?? 'Non attribué'}</span>
                </div>
              </div>
              {/* progression dans le pipeline */}
              <div className="flex gap-1 mt-4" aria-hidden>
                {PROSPECT_STATUSES.slice(0, 8).map((s, i) => (
                  <span key={s.value} className={cx('h-1 flex-1 rounded-full', p.status === 'perdu' ? 'bg-rose-500/25' : i <= idx ? TONES[st.tone].bar : 'bg-sunken')} />
                ))}
              </div>
              {p.next_follow_up && !['gagne', 'perdu'].includes(p.status) && (
                <div className="mt-3 flex items-center justify-between text-[13.5px]">
                  <span className="text-muted">Prochaine relance</span><DueChip date={p.next_follow_up} />
                </div>
              )}
            </div>

            <div className="mt-3">
              <ContactActions phone={p.phone} email={p.email} instagramUrl={p.instagram_url} website={p.website_url} onFollowUp={() => flow.scheduleFor(p)} />
            </div>

            <TicketsSection prospectId={p.id} />

            {/* ——— Projets ——— */}
            <Section title={`Projets (${projects.length})`}
              action={<button className="btn-ghost h-9 min-h-0 px-3 text-copper-ink" onClick={async () => { const pr = await createProject(projectDraftFrom(p)); if (pr) nav(`/projets/${pr.id}`) }}><FolderPlus size={16} />Créer</button>}>
              {projects.length === 0 ? (
                <p className="text-[14px] text-muted card p-4 shadow-none border-dashed">Aucun site en cours. Créez un projet de démo pour suivre sa production séparément du statut commercial.</p>
              ) : (
                <div className="grid gap-2.5">{projects.map((pr) => <ProjectCard key={pr.id} project={pr} hideClient />)}</div>
              )}
            </Section>

            {/* ——— Tâches ——— */}
            <Section title="Tâches & relances"
              action={<button className="btn-ghost h-9 min-h-0 px-3 text-copper-ink" onClick={() => setTaskSheet({ draft: { prospect_id: p.id } })}><Plus size={16} />Ajouter</button>}>
              {tasks.length === 0 ? <p className="text-[14px] text-muted">Aucune tâche ouverte.</p> : (
                <div className="grid gap-2">{tasks.map((t) => <TaskRow key={t.id} task={t} onOpen={(task) => setTaskSheet({ task })} showLinks={false} />)}</div>
              )}
              {doneCount > 0 && <button className="mt-2 text-[13px] font-semibold text-muted min-h-[40px]" onClick={() => setShowDone((v) => !v)}>{showDone ? 'Masquer' : 'Afficher'} les {doneCount} terminée{doneCount > 1 ? 's' : ''}</button>}
            </Section>

            {/* ——— Informations ——— */}
            <Section title="Informations" action={<button className="btn-ghost h-9 min-h-0 px-3" onClick={() => setEdit(true)}><Pencil size={15} />Modifier</button>}>
              <dl className="card divide-y divide-line">
                {info.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-4 px-4 py-3 text-[14.5px]">
                    <dt className="w-32 shrink-0 text-muted text-[13.5px]">{k}</dt>
                    <dd className={cx('flex-1 min-w-0 break-words', !v && 'text-faint')}>{v || '—'}</dd>
                  </div>
                ))}
                {socials.length > 0 && (
                  <div className="flex gap-2 px-4 py-3">
                    {socials.map((s) => <a key={s.label} href={normalizeUrl(s.url)!} target="_blank" rel="noopener noreferrer" className="btn-soft h-10 min-h-0 px-3 text-[13.5px]">{s.icon}{s.label}</a>)}
                  </div>
                )}
              </dl>
              {p.notes && (
                <div className="card p-4 mt-2.5 bg-copper/[0.04] border-copper/15">
                  <p className="section-title mb-1.5">Notes internes</p>
                  <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{p.notes}</p>
                </div>
              )}
            </Section>

            <Section title="Fichiers"><Attachments entity="prospect" id={p.id} /></Section>
          </div>

          <aside className="lg:pt-0">
            <Section title="Fil du dossier" className="lg:mt-0"><Timeline entity="prospect" id={p.id} activityKey="prospect_id" /></Section>
          </aside>
        </div>
      </Page>

      <ProspectForm prospect={p} open={edit} onClose={() => setEdit(false)} />
      <TaskSheet open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} draft={taskSheet?.draft} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={p.name} size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          <MenuItem icon={<Pencil size={19} />} label="Modifier la fiche" onClick={() => { setMenu(false); setEdit(true) }} />
          <MenuItem icon={<FolderPlus size={19} />} label="Créer un projet pour ce client" onClick={async () => { setMenu(false); const pr = await createProject(projectDraftFrom(p)); if (pr) nav(`/projets/${pr.id}`) }} />
          {admin && (p.archived
            ? <MenuItem icon={<ArchiveRestore size={19} />} label="Restaurer le dossier" onClick={() => { setMenu(false); archive('prospects', p.id, false) }} />
            : <MenuItem icon={<Archive size={19} />} label="Archiver le dossier" hint="Masqué des listes, conservé dans les archives" onClick={async () => {
                setMenu(false)
                if (await confirmDialog({ title: `Archiver ${p.name} ?`, message: 'Le dossier sera masqué des listes et restera consultable dans Équipe › Archives.', confirm: 'Archiver' })) { await archive('prospects', p.id); nav('/prospects') }
              }} />)}
          {admin && <MenuItem danger icon={<Trash2 size={19} />} label="Supprimer définitivement" onClick={async () => {
            setMenu(false)
            if (await confirmDialog({ title: `Supprimer ${p.name} ?`, message: 'Action irréversible : la fiche, ses tickets, ses tâches et son fil seront supprimés. Les projets liés sont conservés. Préférez l’archivage.', confirm: 'Supprimer', danger: true })) {
              if (await deleteRow('prospects', p.id)) nav('/prospects')
            }
          }} />}
          {!admin && <p className="px-3 py-2 text-[13px] text-muted">L’archivage et la suppression sont réservés aux administrateurs. Responsable : {fullName(owner)}.</p>}
        </div>
      </Sheet>
      {flow.ui}
    </>
  )
}

export function MenuItem({ icon, label, hint, onClick, danger }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('flex items-center gap-3 min-h-[52px] px-3 rounded-xl text-left hover:bg-sunken transition', danger && 'text-danger')}>
      <span className={cx('shrink-0', !danger && 'text-muted')}>{icon}</span>
      <span className="flex-1"><span className="block font-semibold text-[15px]">{label}</span>{hint && <span className="block text-[12.5px] text-muted">{hint}</span>}</span>
    </button>
  )
}
