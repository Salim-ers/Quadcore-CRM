import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, CheckSquare, CreditCard, FileText, GitBranch, Globe, History, MonitorSmartphone, MoreHorizontal, Paperclip, Pencil, PencilRuler, Plus, Store, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Avatar, Badge, Empty, Fold, Sheet, StepSwitch, confirmDialog, cx } from '../../components/ui'
import { DueChip, MoneyLabel, UrlTile } from '../../components/bits'
import { deleteRow, useIsAdmin, useStore } from '../../data/store'
import { archive, updateProject } from '../../data/actions'
import { BILLING, SITE_STEPS, TONES, siteStep } from '../../lib/constants'
import { fullName } from '../../lib/derive'
import { prettyUrl, whatsappLink, mailLink } from '../../lib/links'
import { moveSite } from './flows'
import { PriceButton } from './PriceButton'
import { ProjectEditSheet } from './ProjectForm'
import { Revisions } from './Revisions'
import { Attachments, Timeline } from '../shared/Timeline'
import { ReportProblem, TicketsSection } from '../tickets/TicketsSection'
import { TaskRow } from '../tasks/TaskRow'
import { TaskSheet, type TaskDraft } from '../tasks/TaskSheet'
import { MenuItem } from '../prospects/ProspectDetail'
import type { Task } from '../../lib/types'

export function ProjectDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const p = useStore((s) => s.db.projects.find((x) => x.id === id))
  const owner = useStore((s) => s.db.profiles.find((x) => x.id === p?.owner_id))
  const client = useStore((s) => s.db.prospects.find((x) => x.id === p?.prospect_id))
  const allTasks = useStore((s) => s.db.tasks)
  const pending = useStore((s) => s.db.revisions.filter((r) => r.project_id === id && r.status !== 'termine').length)
  const admin = useIsAdmin()
  const [edit, setEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [billing, setBilling] = useState(false)
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; draft?: TaskDraft } | null>(null)
  const tasks = useMemo(() => allTasks.filter((t) => t.project_id === id && t.status !== 'termine').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9')), [allTasks, id])

  if (!p) {
    return (
      <>
        <PageHeader title="Site" back="/projets" />
        <Page><Empty icon={<Globe size={26} />} title="Site introuvable" action={<Link className="btn-soft" to="/projets">Retour aux sites</Link>} /></Page>
      </>
    )
  }

  const step = siteStep(p.status)
  const bill = BILLING.find((b) => b.value === p.billing_status)!
  const demoMsg = p.demo_url ? `Bonjour${client?.contact_name ? ' ' + client.contact_name.split(' ')[0] : ''}, voici la démonstration de votre futur site : ${p.demo_url}` : ''

  return (
    <>
      <PageHeader title={p.name} back="/projets"
        subtitle={client && <Link to={`/prospects/${client.id}`} className="inline-flex items-center gap-1 hover:text-ink"><Store size={13} />{client.name}</Link>}
        actions={
          <>
            <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={19} /></button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Plus d’actions"><MoreHorizontal size={21} /></button>
          </>
        } />

      <Page className="pt-2">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          <div className="card p-4">
            <StepSwitch label="Étape du site" value={step} onChange={(v) => moveSite(p, v)} options={SITE_STEPS} />
            <div className="flex items-center gap-3 mt-3">
              <PriceButton project={p} />
              {step === 'en_cours' && <DueChip date={p.due_date} />}
              {owner && <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-muted"><Avatar profile={owner} size={24} />{owner.first_name}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <UrlTile icon={<MonitorSmartphone size={18} />} label="Démo" url={p.demo_url} onAdd={() => setEdit(true)} />
            <UrlTile icon={<Globe size={18} />} label="Site" url={p.final_url} onAdd={() => setEdit(true)} />
          </div>
          {p.demo_url && step === 'en_cours' && client && (client.phone || client.email) && (
            <div className="flex gap-2">
              {whatsappLink(client.phone, demoMsg) && <a className="btn-soft flex-1 text-[14px]" href={whatsappLink(client.phone, demoMsg)!} target="_blank" rel="noopener noreferrer">Envoyer la démo sur WhatsApp</a>}
              {client.email && <a className="btn-soft flex-1 text-[14px]" href={`${mailLink(client.email, `Votre site ${client.name} — démonstration`)}&body=${encodeURIComponent(demoMsg)}`}>Par e-mail</a>}
            </div>
          )}

          <ReportProblem prospectId={p.prospect_id} projectId={p.id} />
          <TicketsSection prospectId={p.prospect_id} projectId={p.id} />
          <Fold title="Retouches" icon={<PencilRuler size={19} />} count={pending} defaultOpen={pending > 0}><Revisions project={p} /></Fold>
          <Fold title="Tâches" icon={<CheckSquare size={19} />} count={tasks.length}>
            <button className="btn-soft w-full mb-3 text-[14px]" onClick={() => setTaskSheet({ draft: { project_id: p.id, prospect_id: p.prospect_id } })}><Plus size={16} />Tâche</button>
            {tasks.length > 0 && <div className="grid grid-cols-1 gap-2">{tasks.map((t) => <TaskRow key={t.id} task={t} onOpen={(task) => setTaskSheet({ task })} showLinks={false} />)}</div>}
          </Fold>
          <Fold title="Prix et facturation" icon={<CreditCard size={19} />}>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[12.5px] text-muted">Proposé</p><p className="h-display text-[20px] mt-1"><MoneyLabel value={p.price_proposed} /></p></div>
              <div><p className="text-[12.5px] text-muted">Accepté</p><p className="h-display text-[20px] mt-1"><MoneyLabel value={p.price_accepted} /></p></div>
              <button className="text-left" onClick={() => setBilling(true)}>
                <p className="text-[12.5px] text-muted">Facturation</p>
                <Badge tone={bill.tone} className="mt-1.5">{bill.label}</Badge>
              </button>
            </div>
          </Fold>
          {p.description && <Fold title="Besoin du client" icon={<FileText size={19} />}><p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{p.description}</p></Fold>}
          <Fold title="Fichiers" icon={<Paperclip size={19} />}>
            {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="btn-soft w-full mb-3 text-[14px]"><GitBranch size={16} />{prettyUrl(p.github_url)}</a>}
            <Attachments entity="project" id={p.id} />
          </Fold>
          <Fold title="Commentaires et historique" icon={<History size={19} />}><Timeline entity="project" id={p.id} activityKey="project_id" /></Fold>
        </div>
      </Page>

      <ProjectEditSheet project={p} open={edit} onClose={() => setEdit(false)} />
      <TaskSheet open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} draft={taskSheet?.draft} />
      <Sheet open={billing} onClose={() => setBilling(false)} title="Facturation" size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          {BILLING.map((b) => (
            <button key={b.value} onClick={() => { updateProject(p.id, { billing_status: b.value }); setBilling(false) }}
              className={cx('flex items-center gap-3 min-h-[52px] px-3 rounded-xl hover:bg-sunken text-left', p.billing_status === b.value && 'bg-sunken')}>
              <span className={cx('w-2.5 h-2.5 rounded-full', TONES[b.tone].dot)} /><span className="font-semibold">{b.label}</span>
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={menu} onClose={() => setMenu(false)} title={p.name} size="sm">
        <div className="flex flex-col gap-1 -mx-2">
          <MenuItem icon={<Pencil size={19} />} label="Modifier le site" onClick={() => { setMenu(false); setEdit(true) }} />
          {client && <MenuItem icon={<Store size={19} />} label={`Voir la fiche ${client.name}`} onClick={() => nav(`/prospects/${client.id}`)} />}
          {admin && (p.archived
            ? <MenuItem icon={<ArchiveRestore size={19} />} label="Restaurer le site" onClick={() => { setMenu(false); archive('projects', p.id, false) }} />
            : <MenuItem icon={<Archive size={19} />} label="Archiver le site" onClick={async () => { setMenu(false); if (await confirmDialog({ title: `Archiver ${p.name} ?`, confirm: 'Archiver' })) { await archive('projects', p.id); nav('/projets') } }} />)}
          {admin && <MenuItem danger icon={<Trash2 size={19} />} label="Supprimer définitivement" onClick={async () => {
            setMenu(false)
            if (await confirmDialog({ title: `Supprimer ${p.name} ?`, message: 'Les retouches et tâches du site seront supprimées. Action irréversible.', confirm: 'Supprimer', danger: true })) { if (await deleteRow('projects', p.id)) nav('/projets') }
          }} />}
          {!admin && <p className="px-3 py-2 text-[13px] text-muted">L’archivage est réservé aux administrateurs. Responsable : {fullName(owner)}.</p>}
        </div>
      </Sheet>
    </>
  )
}
