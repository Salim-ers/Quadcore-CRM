import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, ArchiveRestore, ChevronDown, Copy, ExternalLink, FolderKanban, GitBranch, Globe, MonitorSmartphone, MoreHorizontal, Pencil, Plus, Store, Trash2 } from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Avatar, Badge, Empty, Section, Sheet, confirmDialog, cx } from '../../components/ui'
import { DueChip, MoneyLabel } from '../../components/bits'
import { deleteRow, toast, useIsAdmin, useStore } from '../../data/store'
import { archive, updateProject } from '../../data/actions'
import { BILLING, PROJECT_STATUSES, PROJECT_TYPES, TONES, labelOf, projectStatus } from '../../lib/constants'
import { fullName } from '../../lib/derive'
import { prettyUrl, whatsappLink, mailLink } from '../../lib/links'
import { shortDate } from '../../lib/dates'
import { useProjectStatusFlow } from './flows'
import { ProjectEditSheet } from './ProjectForm'
import { Revisions } from './Revisions'
import { Attachments, Timeline } from '../shared/Timeline'
import { TicketsSection } from '../tickets/TicketsSection'
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
  const admin = useIsAdmin()
  const flow = useProjectStatusFlow()
  const [edit, setEdit] = useState(false)
  const [menu, setMenu] = useState(false)
  const [billing, setBilling] = useState(false)
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; draft?: TaskDraft } | null>(null)
  const tasks = useMemo(() => allTasks.filter((t) => t.project_id === id && t.status !== 'termine').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9')), [allTasks, id])

  if (!p) {
    return (
      <>
        <PageHeader title="Projet" back="/projets" />
        <Page><Empty icon={<FolderKanban size={26} />} title="Projet introuvable" action={<Link className="btn-soft" to="/projets">Retour aux projets</Link>} /></Page>
      </>
    )
  }

  const st = projectStatus(p.status)
  const idx = PROJECT_STATUSES.findIndex((s) => s.value === p.status)
  const bill = BILLING.find((b) => b.value === p.billing_status)!
  const showRevisions = ['demo_envoyee', 'attente_validation', 'modifs_demandees', 'demo_validee', 'dev_final', 'pret_livrer', 'livre', 'maintenance'].includes(p.status)
  const demoMsg = p.demo_url ? `Bonjour${client?.contact_name ? ' ' + client.contact_name.split(' ')[0] : ''}, voici la démonstration de votre futur site : ${p.demo_url}` : ''

  return (
    <>
      <PageHeader title={p.name} back="/projets"
        subtitle={client ? <Link to={`/prospects/${client.id}`} className="inline-flex items-center gap-1 hover:text-ink"><Store size={13} />{client.name}</Link> : 'Projet interne'}
        actions={
          <>
            <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={19} /></button>
            <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Plus d’actions"><MoreHorizontal size={21} /></button>
          </>
        } />

      <Page className="pt-2">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div>
            {/* ——— Avancement ——— */}
            <div className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-muted">{labelOf(PROJECT_TYPES, p.type)} · étape {idx + 1} / {PROJECT_STATUSES.length}</p>
                  <button onClick={() => flow.openPicker(p)} className="mt-2 inline-flex">
                    <Badge tone={st.tone} className="h-8 px-3 text-[13px]">{st.label}<ChevronDown size={14} className="-mr-1 opacity-60" /></Badge>
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {owner && <Avatar profile={owner} size={32} />}
                  <span className="text-[11.5px] text-faint">{owner?.first_name ?? 'Non attribué'}</span>
                </div>
              </div>
              <div className="flex gap-[3px] mt-4" aria-hidden>
                {PROJECT_STATUSES.map((s, i) => (
                  <span key={s.value} title={s.label} className={cx('h-1 flex-1 rounded-full', p.status === 'demo_refusee' ? 'bg-rose-500/25' : i <= idx ? TONES[st.tone].bar : 'bg-sunken')} />
                ))}
              </div>
              <NextStep status={p.status} onGo={(s) => flow.change(p, s)} />
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-line text-[13.5px]">
                <div><p className="text-muted">Démarrage</p><p className="font-semibold mt-0.5">{shortDate(p.start_date)}</p></div>
                <div><p className="text-muted">Livraison prévue</p><p className="font-semibold mt-0.5">{p.due_date ? <>{shortDate(p.due_date)} {!['livre', 'maintenance'].includes(p.status) && <DueChip date={p.due_date} className="ml-1" />}</> : '—'}</p></div>
              </div>
            </div>

            {/* ——— Liens ——— */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <UrlTile icon={<MonitorSmartphone size={18} />} label="Démo" url={p.demo_url} onAdd={() => setEdit(true)} />
              <UrlTile icon={<Globe size={18} />} label="Site définitif" url={p.final_url} onAdd={() => setEdit(true)} />
              <UrlTile icon={<GitBranch size={18} />} label="GitHub" url={p.github_url} onAdd={() => setEdit(true)} />
            </div>
            {p.demo_url && client && (client.phone || client.email) && (
              <div className="flex gap-2 mt-2">
                {whatsappLink(client.phone, demoMsg) && <a className="btn-soft flex-1 text-[14px]" href={whatsappLink(client.phone, demoMsg)!} target="_blank" rel="noopener noreferrer">Envoyer la démo par WhatsApp</a>}
                {client.email && <a className="btn-soft flex-1 text-[14px]" href={`${mailLink(client.email, `Votre site ${client.name} — démonstration`)}&body=${encodeURIComponent(demoMsg)}`}>Par e-mail</a>}
              </div>
            )}

            {/* ——— Retouches ——— */}
            {showRevisions && <Section title="Retouches"><Revisions project={p} /></Section>}

            <TicketsSection prospectId={p.prospect_id} projectId={p.id} />

            {/* ——— Tâches ——— */}
            <Section title="Tâches" action={<button className="btn-ghost h-9 min-h-0 px-3 text-copper-ink" onClick={() => setTaskSheet({ draft: { project_id: p.id, prospect_id: p.prospect_id } })}><Plus size={16} />Ajouter</button>}>
              {tasks.length === 0 ? <p className="text-[14px] text-muted">Aucune tâche ouverte.</p> : <div className="grid gap-2">{tasks.map((t) => <TaskRow key={t.id} task={t} onOpen={(task) => setTaskSheet({ task })} showLinks={false} />)}</div>}
            </Section>

            {/* ——— Prix & facturation ——— */}
            <Section title="Prix & facturation">
              <div className="card grid grid-cols-3 divide-x divide-line">
                <div className="p-4"><p className="text-[12.5px] text-muted">Proposé</p><p className="h-display text-[20px] mt-1"><MoneyLabel value={p.price_proposed} /></p></div>
                <div className="p-4"><p className="text-[12.5px] text-muted">Accepté</p><p className="h-display text-[20px] mt-1"><MoneyLabel value={p.price_accepted} /></p></div>
                <button className="p-4 text-left" onClick={() => setBilling(true)}>
                  <p className="text-[12.5px] text-muted">Facturation</p>
                  <Badge tone={bill.tone} className="mt-1.5">{bill.label}</Badge>
                </button>
              </div>
            </Section>

            {p.description && (
              <Section title="Besoin du client">
                <div className="card p-4"><p className="text-[14.5px] leading-relaxed whitespace-pre-wrap">{p.description}</p></div>
              </Section>
            )}

            <Section title="Documents & fichiers"><Attachments entity="project" id={p.id} /></Section>
          </div>
          <aside>
            <Section title="Commentaires & historique" className="lg:mt-0"><Timeline entity="project" id={p.id} activityKey="project_id" /></Section>
          </aside>
        </div>
      </Page>

      <ProjectEditSheet project={p} open={edit} onClose={() => setEdit(false)} />
      <TaskSheet open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} draft={taskSheet?.draft} />
      <Sheet open={billing} onClose={() => setBilling(false)} title="Statut de facturation" size="sm">
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
          <MenuItem icon={<Pencil size={19} />} label="Modifier le projet" onClick={() => { setMenu(false); setEdit(true) }} />
          {client && <MenuItem icon={<Store size={19} />} label={`Voir la fiche ${client.name}`} onClick={() => nav(`/prospects/${client.id}`)} />}
          {admin && (p.archived
            ? <MenuItem icon={<ArchiveRestore size={19} />} label="Restaurer le projet" onClick={() => { setMenu(false); archive('projects', p.id, false) }} />
            : <MenuItem icon={<Archive size={19} />} label="Archiver le projet" onClick={async () => { setMenu(false); if (await confirmDialog({ title: `Archiver ${p.name} ?`, confirm: 'Archiver' })) { await archive('projects', p.id); nav('/projets') } }} />)}
          {admin && <MenuItem danger icon={<Trash2 size={19} />} label="Supprimer définitivement" onClick={async () => {
            setMenu(false)
            if (await confirmDialog({ title: `Supprimer ${p.name} ?`, message: 'Les retouches et tâches du projet seront supprimées. Action irréversible.', confirm: 'Supprimer', danger: true })) { if (await deleteRow('projects', p.id)) nav('/projets') }
          }} />}
          {!admin && <p className="px-3 py-2 text-[13px] text-muted">L’archivage est réservé aux administrateurs. Responsable : {fullName(owner)}.</p>}
        </div>
      </Sheet>
      {flow.ui}
    </>
  )
}

/** Suggestion de l'étape suivante logique, en un geste */
function NextStep({ status, onGo }: { status: string; onGo: (s: (typeof PROJECT_STATUSES)[number]['value']) => void }) {
  const next: Record<string, { to: (typeof PROJECT_STATUSES)[number]['value']; label: string }[]> = {
    a_preparer: [{ to: 'demo_creation', label: 'Démarrer la démo' }],
    demo_creation: [{ to: 'demo_prete', label: 'Démo prête' }],
    demo_prete: [{ to: 'demo_envoyee', label: 'Démo envoyée' }],
    demo_envoyee: [{ to: 'attente_validation', label: 'En attente du client' }],
    attente_validation: [{ to: 'demo_validee', label: 'Validée' }, { to: 'modifs_demandees', label: 'Retouches' }, { to: 'demo_refusee', label: 'Refusée' }],
    modifs_demandees: [],
    demo_validee: [{ to: 'dev_final', label: 'Lancer le site final' }],
    dev_final: [{ to: 'pret_livrer', label: 'Prêt à livrer' }],
    pret_livrer: [{ to: 'livre', label: 'Marquer livré' }],
    livre: [{ to: 'maintenance', label: 'Passer en maintenance' }],
    maintenance: [],
    demo_refusee: [{ to: 'demo_creation', label: 'Retravailler la démo' }],
  }
  const opts = next[status] ?? []
  if (!opts.length) return null
  return (
    <div className="flex gap-2 mt-4">
      {opts.map((o, i) => (
        <button key={o.to} onClick={() => onGo(o.to)} className={cx('flex-1 h-11 text-[14px]', i === 0 ? 'btn-dark' : o.to === 'demo_refusee' ? 'btn-danger' : 'btn-soft')}>{o.label}</button>
      ))}
    </div>
  )
}

function UrlTile({ icon, label, url, onAdd }: { icon: React.ReactNode; label: string; url: string | null; onAdd: () => void }) {
  if (!url) {
    return (
      <button onClick={onAdd} className="flex items-center gap-3 min-h-[56px] px-3.5 rounded-2xl border border-dashed border-line text-faint text-[14px] font-semibold hover:text-muted">
        {icon}<span className="flex-1 text-left">{label}</span><Plus size={16} />
      </button>
    )
  }
  return (
    <div className="card flex items-center gap-3 min-h-[56px] pl-3.5 pr-1.5">
      <span className="text-copper-ink">{icon}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
        <p className="text-[12px] text-muted font-semibold">{label}</p>
        <p className="text-[14px] font-semibold truncate">{prettyUrl(url)}</p>
      </a>
      <button className="icon-btn w-10 h-10 text-muted" aria-label={`Copier le lien ${label}`}
        onClick={async () => { try { await navigator.clipboard.writeText(url); toast('Lien copié') } catch { toast('Copie impossible', 'error') } }}><Copy size={16} /></button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="icon-btn w-10 h-10 text-muted" aria-label={`Ouvrir ${label}`}><ExternalLink size={16} /></a>
    </div>
  )
}
