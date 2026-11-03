import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive, ArchiveRestore, BellPlus, Camera, CheckSquare, ExternalLink, FolderPlus, Globe, History, Info, MapPin, MoreHorizontal, Paperclip, Pencil, Plus, Store, Trash2,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Avatar, Empty, Fold, Sheet, StepSwitch, confirmDialog, cx } from '../../components/ui'
import { ContactActions, DueChip, ProspectThumb, UrlTile } from '../../components/bits'
import { useIsAdmin, useStore, deleteRow } from '../../data/store'
import { archive, createProject, projectDraftFrom, uploadLogo } from '../../data/actions'
import { CATEGORIES, PRIORITIES, PROSPECT_STEPS, labelOf, prospectStep } from '../../lib/constants'
import { fullName } from '../../lib/derive'
import { formatPhone, normalizeUrl, prettyUrl } from '../../lib/links'
import { shortDate } from '../../lib/dates'
import { useFileUrl } from '../../lib/useFileUrl'
import { useProspectFlow } from './flows'
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
  const flow = useProspectFlow()
  const [edit, setEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; draft?: TaskDraft } | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const logo = useFileUrl(p?.logo_path)

  const projects = useMemo(() => allProjects.filter((x) => x.prospect_id === id && !x.archived), [allProjects, id])
  const tasks = useMemo(() => allTasks.filter((t) => t.prospect_id === id && t.status !== 'termine')
    .sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9')), [allTasks, id])

  if (!p) {
    return (
      <>
        <PageHeader title="Fiche" back="/prospects" />
        <Page><Empty icon={<Store size={26} />} title="Fiche introuvable" text="Elle a peut-être été supprimée par un administrateur." action={<Link className="btn-soft" to="/prospects">Retour aux prospects</Link>} /></Page>
      </>
    )
  }

  const step = prospectStep(p.status)
  const cat = CATEGORIES.find((c) => c.value === p.category)
  const startSite = async () => { const pr = await createProject(projectDraftFrom(p)); if (pr) nav(`/projets/${pr.id}`) }
  const info: [string, React.ReactNode][] = [
    ['Contact', p.contact_name],
    ['Téléphone', p.phone && formatPhone(p.phone)],
    ['E-mail', p.email],
    ['Adresse', [p.address, p.city].filter(Boolean).join(', ')],
    ['Instagram', p.instagram_handle && (p.instagram_url ? <a className="text-copper-ink font-semibold" href={p.instagram_url} target="_blank" rel="noopener noreferrer">@{p.instagram_handle}</a> : '@' + p.instagram_handle)],
    ['Lien du site', p.website_url &&<a className="text-copper-ink font-semibold inline-flex items-center gap-1" href={normalizeUrl(p.website_url)!} target="_blank" rel="noopener noreferrer">{prettyUrl(p.website_url)}<ExternalLink size={13} /></a>],
    ['Facebook', p.facebook_url && <a className="text-copper-ink font-semibold" href={normalizeUrl(p.facebook_url)!} target="_blank" rel="noopener noreferrer">{prettyUrl(p.facebook_url)}</a>],
    ['TikTok', p.tiktok_url && <a className="text-copper-ink font-semibold" href={normalizeUrl(p.tiktok_url)!} target="_blank" rel="noopener noreferrer">{prettyUrl(p.tiktok_url)}</a>],
    ['LinkedIn', p.linkedin_url && <a className="text-copper-ink font-semibold" href={normalizeUrl(p.linkedin_url)!} target="_blank" rel="noopener noreferrer">{prettyUrl(p.linkedin_url)}</a>],
    ['Source', p.source],
    ['Service proposé', p.service],
    ['Priorité', labelOf(PRIORITIES, p.priority)],
    ['Responsable', owner && fullName(owner)],
    ['Ajouté le', shortDate(p.created_at)],
  ]

  return (
    <>
      <PageHeader title={p.name} back="/prospects"
        actions={
          <>
            <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={19} /></button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Plus d’actions"><MoreHorizontal size={21} /></button>
          </>
        }
      />
      <Page className="pt-2">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="card p-4">
            <div className="flex items-center gap-3.5 mb-4">
              <button className="relative group" onClick={() => logoInput.current?.click()} aria-label="Ajouter un logo ou une photo">
                <ProspectThumb name={p.name} category={p.category} logoUrl={logo} size={56} />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center text-muted"><Camera size={12} /></span>
              </button>
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(p, f) }} />
              <div className="flex-1 min-w-0 text-[13.5px] text-muted">
                {p.contact_name && <p className="font-semibold text-ink text-[15px] truncate">{p.contact_name}</p>}
                <p className="flex items-center gap-1.5 flex-wrap">
                  {cat && <span>{cat.label}</span>}
                  {cat && p.city && <span className="text-faint">·</span>}
                  {p.city && <span className="inline-flex items-center gap-1"><MapPin size={13} />{p.city}</span>}
                </p>
              </div>
              {owner && <Avatar profile={owner} size={32} />}
            </div>
            <StepSwitch label="Étape" value={step} onChange={(v) => flow.moveTo(p, v)} options={PROSPECT_STEPS} />
            {step === 'refuse' && p.lost_reason && <p className="text-[13.5px] text-muted mt-3">Motif : {p.lost_reason}</p>}
            {p.next_follow_up && step === 'vu' && (
              <div className="mt-3 flex items-center justify-between text-[13.5px]">
                <span className="text-muted">Prochaine relance</span><DueChip date={p.next_follow_up} />
              </div>
            )}
          </div>

          {projects.length === 0 && <UrlTile icon={<Globe size={18} />} label="Lien du site" url={p.website_url} onAdd={() => setEdit(true)} />}

          <ContactActions phone={p.phone} email={p.email} instagramUrl={p.instagram_url} website={null} />

          {projects.map((pr) => <ProjectCard key={pr.id} project={pr} hideClient />)}
          {step === 'accepte' && projects.length === 0 && (
            <button className="btn-primary h-12" onClick={startSite}><FolderPlus size={18} />Lancer le site</button>
          )}

          {p.notes && (
            <div className="card p-4">
              <p className="section-title mb-1.5">Notes</p>
              <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          <Fold title="Échanges et historique" icon={<History size={19} />}><Timeline entity="prospect" id={p.id} activityKey="prospect_id" /></Fold>
          <TicketsSection prospectId={p.id} />
          <Fold title="Tâches et relances" icon={<CheckSquare size={19} />} count={tasks.length}>
            <div className="flex gap-2 mb-3">
              <button className="btn-soft flex-1 text-[14px]" onClick={() => setTaskSheet({ draft: { prospect_id: p.id } })}><Plus size={16} />Tâche</button>
              <button className="btn-soft flex-1 text-[14px]" onClick={() => flow.scheduleFor(p)}><BellPlus size={16} />Relance</button>
            </div>
            {tasks.length > 0 && <div className="grid grid-cols-1 gap-2">{tasks.map((t) => <TaskRow key={t.id} task={t} onOpen={(task) => setTaskSheet({ task })} showLinks={false} />)}</div>}
          </Fold>
          <Fold title="Informations" icon={<Info size={19} />}>
            <dl className="divide-y divide-line -mx-1">
              {info.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-4 px-1 py-2.5 text-[14.5px]">
                  <dt className="w-32 shrink-0 text-muted text-[13.5px]">{k}</dt>
                  <dd className="flex-1 min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <button className="btn-soft w-full mt-3 text-[14px]" onClick={() => setEdit(true)}><Pencil size={15} />Modifier</button>
          </Fold>
          <Fold title="Fichiers" icon={<Paperclip size={19} />}><Attachments entity="prospect" id={p.id} /></Fold>
        </div>
      </Page>

      <ProspectForm prospect={p} open={edit} onClose={() => setEdit(false)} />
      <TaskSheet open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} draft={taskSheet?.draft} />
      <Sheet open={menu} onClose={() => setMenu(false)} title={p.name} size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          <MenuItem icon={<Pencil size={19} />} label="Modifier la fiche" onClick={() => { setMenu(false); setEdit(true) }} />
          <MenuItem icon={<FolderPlus size={19} />} label="Lancer un site pour ce client" onClick={() => { setMenu(false); startSite() }} />
          {admin && (p.archived
            ? <MenuItem icon={<ArchiveRestore size={19} />} label="Restaurer la fiche" onClick={() => { setMenu(false); archive('prospects', p.id, false) }} />
            : <MenuItem icon={<Archive size={19} />} label="Archiver la fiche" hint="Masquée des listes, conservée dans Équipe › Archives" onClick={async () => {
                setMenu(false)
                if (await confirmDialog({ title: `Archiver ${p.name} ?`, message: 'La fiche sera masquée des listes et restera consultable dans Équipe › Archives.', confirm: 'Archiver' })) { await archive('prospects', p.id); nav('/prospects') }
              }} />)}
          {admin && <MenuItem danger icon={<Trash2 size={19} />} label="Supprimer définitivement" onClick={async () => {
            setMenu(false)
            if (await confirmDialog({ title: `Supprimer ${p.name} ?`, message: 'Action irréversible : la fiche, ses tickets, ses tâches et son fil seront supprimés. Les sites liés sont conservés. Préférez l’archivage.', confirm: 'Supprimer', danger: true })) {
              if (await deleteRow('prospects', p.id)) nav('/prospects')
            }
          }} />}
          {!admin && <p className="px-3 py-2 text-[13px] text-muted">L’archivage et la suppression sont réservés aux administrateurs.</p>}
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
