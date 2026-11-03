import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive, ArchiveRestore, Bell, ChevronRight, Download, LogOut, Mail, Monitor, Moon, Pencil, RotateCcw, Shield, Sun, UserPlus,
} from 'lucide-react'
import { Page, PageHeader } from '../../components/Shell'
import { Avatar, Badge, Field, Input, Section, Sheet, confirmDialog, cx } from '../../components/ui'
import { backend, toast, updateRow, useIsAdmin, useMe, useStore } from '../../data/store'
import { archive } from '../../data/actions'
import { fullName } from '../../lib/derive'
import { MEMBER_COLORS, PROJECT_DONE, PROSPECT_CLOSED, TEAM_ROSTER } from '../../lib/constants'
import { getTheme, setTheme, type ThemePref } from '../../lib/theme'
import { useNotificationPermission } from './notifications'
import { resetDemo } from '../../data/demoBackend'
import type { Profile } from '../../lib/types'

export function TeamPage() {
  const me = useMe()
  const admin = useIsAdmin()
  const db = useStore((s) => s.db)
  const [editMe, setEditMe] = useState(false)
  const [invite, setInvite] = useState(false)
  const [member, setMember] = useState<Profile | null>(null)
  const [theme, setThemeState] = useState<ThemePref>(getTheme)
  const notif = useNotificationPermission()
  const install = useInstallPrompt()

  const stats = useMemo(() => new Map(db.profiles.map((p) => [p.id, {
    prospects: db.prospects.filter((x) => x.owner_id === p.id && !x.archived && !PROSPECT_CLOSED.includes(x.status)).length,
    projects: db.projects.filter((x) => x.owner_id === p.id && !x.archived && !PROJECT_DONE.includes(x.status)).length,
  }])), [db])

  const archived = [...db.prospects.filter((p) => p.archived).map((p) => ({ kind: 'prospects' as const, id: p.id, name: p.name })),
    ...db.projects.filter((p) => p.archived).map((p) => ({ kind: 'projects' as const, id: p.id, name: p.name }))]
  const members = [...db.profiles].sort((a, b) => Number(b.active) - Number(a.active) || a.first_name.localeCompare(b.first_name, 'fr'))

  return (
    <>
      <PageHeader title="Équipe" subtitle={`QUADCORE · ${db.profiles.filter((p) => p.active).length} collaborateurs`} />
      <Page className="pt-2">
        {/* ——— Mon profil ——— */}
        <div className="card p-4 flex items-center gap-3.5">
          <Avatar profile={me} size={52} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[17px] truncate">{fullName(me)}</p>
            <p className="text-[13px] text-muted truncate">{me?.email}</p>
            <Badge tone={me?.role === 'admin' ? 'copper' : 'stone'} className="mt-1.5">{me?.role === 'admin' ? 'Administrateur' : 'Collaborateur'}</Badge>
          </div>
          <button className="icon-btn" onClick={() => setEditMe(true)} aria-label="Modifier mon profil"><Pencil size={18} /></button>
        </div>

        {/* ——— Membres ——— */}
        <Section title="Collaborateurs" action={admin && <button className="btn-ghost h-9 min-h-0 px-3 text-copper-ink" onClick={() => setInvite(true)}><UserPlus size={16} />Inviter</button>}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((p) => {
              const s = stats.get(p.id)!
              return (
                <button key={p.id} onClick={() => admin && p.id !== me?.id ? setMember(p) : undefined}
                  className={cx('card p-3.5 text-left flex items-center gap-3', !p.active && 'opacity-55', admin && p.id !== me?.id && 'hover:border-copper/30')}>
                  <Avatar profile={p} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] truncate flex items-center gap-1.5">
                      {fullName(p)}{p.role === 'admin' && <Shield size={13} className="text-copper-ink" aria-label="Administrateur" />}
                      {!p.active && <span className="text-[12px] font-semibold text-faint">· désactivé</span>}
                    </p>
                    <p className="text-[12.5px] text-muted tabular">{s.prospects} prospect{s.prospects > 1 ? 's' : ''} · {s.projects} site{s.projects > 1 ? 's' : ''} en cours</p>
                  </div>
                  {admin && p.id !== me?.id && <ChevronRight size={18} className="text-faint" />}
                </button>
              )
            })}
          </div>
        </Section>

        {/* ——— Préférences ——— */}
        <Section title="Préférences de cet appareil">
          <div className="card divide-y divide-line">
            <div className="p-4">
              <p className="font-semibold text-[15px] mb-3">Apparence</p>
              <div className="grid grid-cols-3 gap-2">
                {([['light', 'Clair', <Sun size={17} key="s" />], ['dark', 'Sombre', <Moon size={17} key="m" />], ['system', 'Auto', <Monitor size={17} key="a" />]] as const).map(([v, l, i]) => (
                  <button key={v} onClick={() => { setTheme(v); setThemeState(v) }} className={cx('chip h-11 justify-center', theme === v && 'chip-on')}>{i}{l}</button>
                ))}
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <Bell size={19} className="text-muted shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-[15px]">Rappels navigateur</p>
                <p className="text-[12.5px] text-muted">
                  {notif.perm === 'unsupported' ? 'Non pris en charge ici (sur iPhone : installez d’abord l’app sur l’écran d’accueil).'
                    : notif.perm === 'denied' ? 'Bloqués — à autoriser dans les réglages du navigateur.'
                      : 'Relances et tâches du jour, quand l’app est ouverte ou en arrière-plan.'}
                </p>
              </div>
              {notif.perm !== 'unsupported' && notif.perm !== 'denied' && (
                <Toggle on={notif.enabled} onChange={(v) => (v ? notif.enable() : notif.disable())} label="Rappels navigateur" />
              )}
            </div>
            {install.available && (
              <button className="p-4 w-full flex items-center gap-3 text-left" onClick={install.prompt}>
                <Download size={19} className="text-muted" />
                <span className="flex-1"><span className="block font-semibold text-[15px]">Installer l’application</span><span className="block text-[12.5px] text-muted">Accès direct depuis l’écran d’accueil, plein écran.</span></span>
                <ChevronRight size={18} className="text-faint" />
              </button>
            )}
            {install.ios && (
              <div className="p-4 flex items-start gap-3">
                <Download size={19} className="text-muted mt-0.5" />
                <p className="text-[13.5px] text-muted"><b className="text-ink">Installer sur iPhone :</b> touchez Partager, puis « Sur l’écran d’accueil ».</p>
              </div>
            )}
          </div>
        </Section>

        {/* ——— Archives ——— */}
        {admin && (
          <Section title={`Archives (${archived.length})`}>
            {archived.length === 0 ? <p className="text-[14px] text-muted">Aucun dossier archivé.</p> : (
              <div className="card divide-y divide-line">
                {archived.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Archive size={16} className="text-faint" />
                    <Link to={a.kind === 'prospects' ? `/prospects/${a.id}` : `/projets/${a.id}`} className="flex-1 min-w-0 truncate font-semibold text-[14.5px]">{a.name}</Link>
                    <span className="text-[12px] text-faint">{a.kind === 'prospects' ? 'Prospect' : 'Site'}</span>
                    <button className="icon-btn w-10 h-10" onClick={() => archive(a.kind, a.id, false)} aria-label={`Restaurer ${a.name}`}><ArchiveRestore size={17} /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        <Section title="Compte">
          <div className="flex flex-col gap-2">
            {backend.mode === 'demo' && (
              <button className="btn-soft" onClick={async () => {
                if (await confirmDialog({ title: 'Réinitialiser la démo ?', message: 'Les données fictives d’origine seront rechargées dans ce navigateur.', confirm: 'Réinitialiser' })) { resetDemo(); window.location.reload() }
              }}><RotateCcw size={17} />Réinitialiser les données de démo</button>
            )}
            <button className="btn-soft text-danger" onClick={() => backend.signOut()}><LogOut size={17} />Se déconnecter</button>
          </div>
          <p className="text-[12px] text-faint text-center mt-6">QUADCORE · v1.0 · {backend.mode === 'demo' ? 'mode démonstration' : 'connecté à Neon'}</p>
        </Section>
      </Page>

      {me && <ProfileSheet profile={me} open={editMe} onClose={() => setEditMe(false)} />}
      <InviteSheet open={invite} onClose={() => setInvite(false)} />
      <MemberSheet member={member} onClose={() => setMember(null)} />
    </>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx('w-[52px] h-8 rounded-full p-1 transition shrink-0', on ? 'bg-copper' : 'bg-line')}>
      <span className={cx('block w-6 h-6 rounded-full bg-white shadow transition-transform', on && 'translate-x-5')} />
    </button>
  )
}

function ProfileSheet({ profile, open, onClose }: { profile: Profile; open: boolean; onClose: () => void }) {
  const [first, setFirst] = useState(profile.first_name)
  const [last, setLast] = useState(profile.last_name)
  const [color, setColor] = useState(profile.color)
  useEffect(() => { if (open) { setFirst(profile.first_name); setLast(profile.last_name); setColor(profile.color) } }, [open, profile])
  return (
    <Sheet open={open} onClose={onClose} title="Mon profil" size="sm"
      footer={<button className="btn-primary w-full" disabled={!first.trim()} onClick={async () => { await updateRow('profiles', profile.id, { first_name: first.trim(), last_name: last.trim(), color }); onClose() }}>Enregistrer</button>}>
      <div className="flex flex-col gap-4">
        <div className="flex justify-center py-2"><Avatar profile={{ ...profile, first_name: first, last_name: last, color }} size={72} /></div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom"><Input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></Field>
          <Field label="Nom"><Input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></Field>
        </div>
        <div>
          <span className="field-label">Couleur des initiales</span>
          <div className="flex gap-3">
            {MEMBER_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} className={cx('w-11 h-11 rounded-full transition', color === c && 'ring-2 ring-offset-2 ring-offset-bg ring-ink')} style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [busy, setBusy] = useState(false)
  const profiles = useStore((s) => s.db.profiles)
  useEffect(() => { if (open) { setEmail(''); setFirst(''); setLast(''); setRole('member') } }, [open])
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const missing = TEAM_ROSTER.filter((r) => !profiles.some((p) => p.email.toLowerCase() === r.email))
  return (
    <Sheet open={open} onClose={onClose} title="Inviter un collaborateur" size="sm"
      footer={<button className="btn-primary w-full" disabled={!valid || busy} onClick={async () => {
        setBusy(true)
        try { await backend.inviteMember({ email: email.trim(), first_name: first.trim(), last_name: last.trim(), role, color: MEMBER_COLORS[profiles.length % MEMBER_COLORS.length] }); toast(backend.mode === 'demo' ? 'Collaborateur ajouté (démo)' : `Invitation envoyée à ${email.trim()}`, 'success'); onClose() }
        catch (e) { toast((e as Error).message, 'error') }
        setBusy(false)
      }}><Mail size={17} />Envoyer l’invitation</button>}>
      <div className="flex flex-col gap-4">
        <p className="text-[13.5px] text-muted">Un e-mail lui permettra de choisir son mot de passe et d’accéder à QUADCORE. Le lien est valable 1 heure ; ensuite, « Mot de passe oublié » en envoie un nouveau.</p>
        {missing.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {missing.map((r) => (
              <button key={r.email} type="button" onClick={() => { setFirst(r.first_name); setLast(r.last_name); setEmail(r.email); setRole(r.role) }}
                className={cx('chip', email === r.email && 'chip-on')}>{r.first_name} {r.last_name}</button>
            ))}
          </div>
        )}
        <Field label="E-mail *"><Input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@quad-core.fr" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom"><Input value={first} onChange={(e) => setFirst(e.target.value)} /></Field>
          <Field label="Nom"><Input value={last} onChange={(e) => setLast(e.target.value)} /></Field>
        </div>
        <div>
          <span className="field-label">Rôle</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole('member')} className={cx('chip h-11 justify-center', role === 'member' && 'chip-on')}>Collaborateur</button>
            <button type="button" onClick={() => setRole('admin')} className={cx('chip h-11 justify-center', role === 'admin' && 'chip-on')}>Administrateur</button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function MemberSheet({ member, onClose }: { member: Profile | null; onClose: () => void }) {
  const live = useStore((s) => s.db.profiles.find((p) => p.id === member?.id))
  const p = live ?? member
  return (
    <Sheet open={!!member} onClose={onClose} title={p ? fullName(p) : ''} size="sm">
      {p && (
        <div className="flex flex-col gap-4">
          <p className="text-[13.5px] text-muted">{p.email}</p>
          <div>
            <span className="field-label">Rôle</span>
            <div className="grid grid-cols-2 gap-2">
              {(['member', 'admin'] as const).map((r) => (
                <button key={r} onClick={async () => {
                  if (!await updateRow('profiles', p.id, { role: r })) return
                  // sans cela, un nouvel administrateur ne pourrait pas inviter
                  backend.syncAuthRole(p.id, r).catch((e) => toast((e as Error).message, 'error'))
                }} className={cx('chip h-11 justify-center', p.role === r && 'chip-on')}>{r === 'admin' ? 'Administrateur' : 'Collaborateur'}</button>
              ))}
            </div>
          </div>
          <div className="text-[13px] text-muted leading-relaxed bg-sunken rounded-xl p-3">
            <b className="text-ink">Administrateur :</b> gère les membres, les paramètres et l’archivage.<br />
            <b className="text-ink">Collaborateur :</b> crée et modifie prospects, sites, tickets, tâches, commentaires et documents.
          </div>
          {p.active ? (
            <button className="btn-danger" onClick={async () => {
              if (await confirmDialog({ title: `Désactiver ${p.first_name} ?`, message: 'Son accès est coupé immédiatement. Ses dossiers et son historique sont conservés.', confirm: 'Désactiver', danger: true })) { await updateRow('profiles', p.id, { active: false }); onClose() }
            }}>Désactiver l’accès</button>
          ) : (
            <button className="btn-soft" onClick={() => updateRow('profiles', p.id, { active: true })}>Réactiver l’accès</button>
          )}
        </div>
      )}
    </Sheet>
  )
}

interface BIPEvent extends Event { prompt: () => Promise<void> }
let deferred: BIPEvent | null = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent })

function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred)
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); deferred = e as BIPEvent; setAvailable(true) }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone)
  const ios = !standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)
  return { available: available && !standalone, ios, prompt: async () => { await deferred?.prompt(); deferred = null; setAvailable(false) } }
}
