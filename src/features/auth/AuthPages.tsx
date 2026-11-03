import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Avatar, Field, Input, Logo, Spinner, cx } from '../../components/ui'
import { backend, passwordDone, toast, useStore } from '../../data/store'
import { fullName } from '../../lib/derive'

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col px-5 pt-[max(var(--safe-top),24px)] pb-[max(var(--safe-bottom),24px)]">
      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto animate-fade-up">
        <div className="mb-10"><Logo size={44} /></div>
        {children}
      </div>
      <p className="text-center text-[12px] text-faint">Outil interne QUADCORE — accès réservé à l’équipe</p>
    </div>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const accounts = backend.demoAccounts?.() ?? []

  async function submit(e?: React.FormEvent, asEmail?: string) {
    e?.preventDefault()
    setBusy(true); setError(null)
    try { await backend.signIn(asEmail ?? email, password) }
    catch (err) { setError((err as Error).message) }
    setBusy(false)
  }

  if (backend.mode === 'demo') {
    return (
      <AuthFrame>
        <h1 className="h-display text-[30px] leading-tight">Bienvenue</h1>
        <p className="text-muted mt-1.5 mb-7">Mode démonstration : choisissez un collaborateur fictif pour explorer l’application.</p>
        <div className="flex flex-col gap-2">
          {accounts.map((p) => (
            <button key={p.id} onClick={() => submit(undefined, p.email)} disabled={busy}
              className="card p-3.5 flex items-center gap-3 text-left hover:border-copper/40 transition active:scale-[.99]">
              <Avatar profile={p} size={40} />
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[15.5px]">{fullName(p)}</span>
                <span className="block text-[12.5px] text-muted">{p.role === 'admin' ? 'Administrateur' : 'Collaborateur'}</span>
              </span>
              <ArrowRight size={18} className="text-faint" />
            </button>
          ))}
        </div>
        <p className="text-[12.5px] text-faint mt-6 leading-relaxed">En production, chacun se connecte avec son e-mail et son mot de passe.</p>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame>
      <h1 className="h-display text-[30px] leading-tight">Connexion</h1>
      <p className="text-muted mt-1.5 mb-7">Retrouvez vos prospects et vos sites.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="E-mail"><Input type="email" inputMode="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Mot de passe">
          <span className="relative block">
            <Input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-12" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-faint" aria-label={show ? 'Masquer' : 'Afficher'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
        </Field>
        {error && <p className="text-[13.5px] font-semibold text-danger" role="alert">{error}</p>}
        <button className="btn-primary h-12 mt-1" disabled={busy || !email || !password}>{busy ? <Spinner /> : 'Se connecter'}</button>
        <button type="button" disabled={!email || resetSent}
          className={cx('text-[13.5px] font-semibold min-h-[44px]', email ? 'text-copper-ink' : 'text-faint')}
          onClick={async () => {
            try { await backend.sendPasswordReset(email); setResetSent(true); toast('E-mail de réinitialisation envoyé', 'success') }
            catch (e) { setError((e as Error).message) }
          }}>
          {resetSent ? 'Lien envoyé — vérifiez votre boîte mail' : 'Mot de passe oublié ?'}
        </button>
      </form>
    </AuthFrame>
  )
}

export function SetPasswordPage() {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ok = pwd.length >= 8 && pwd === confirm
  return (
    <AuthFrame>
      <div className="w-12 h-12 rounded-2xl bg-copper/12 text-copper-ink flex items-center justify-center mb-4"><KeyRound size={22} /></div>
      <h1 className="h-display text-[28px] leading-tight">Choisissez votre mot de passe</h1>
      <p className="text-muted mt-1.5 mb-7">Au moins 8 caractères. Vous l’utiliserez pour vous connecter sur tous vos appareils.</p>
      <form className="flex flex-col gap-4" onSubmit={async (e) => {
        e.preventDefault(); if (!ok) return
        setBusy(true); setError(null)
        try { await backend.updatePassword(pwd); toast('Mot de passe enregistré', 'success'); passwordDone() }
        catch (err) { setError((err as Error).message) }
        setBusy(false)
      }}>
        <Field label="Nouveau mot de passe"><Input type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></Field>
        <Field label="Confirmer"><Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {confirm && pwd !== confirm && <p className="text-[13px] text-danger">Les deux mots de passe ne correspondent pas.</p>}
        {error && <p className="text-[13.5px] font-semibold text-danger">{error}</p>}
        <button className="btn-primary h-12" disabled={!ok || busy}>{busy ? <Spinner /> : 'Enregistrer et continuer'}</button>
        <button type="button" className="text-[13.5px] font-semibold text-muted min-h-[44px]" onClick={() => { backend.cancelPasswordSetup(); passwordDone() }}>Retour à la connexion</button>
      </form>
    </AuthFrame>
  )
}

export function BlockedPage() {
  const error = useStore((s) => s.error)
  return (
    <AuthFrame>
      <h1 className="h-display text-[26px] leading-tight">Accès impossible</h1>
      <p className="text-muted mt-2 mb-6">{error}</p>
      <div className="flex gap-2">
        <button className="btn-soft flex-1" onClick={() => window.location.reload()}>Réessayer</button>
        <button className="btn-dark flex-1" onClick={() => backend.signOut()}>Se déconnecter</button>
      </div>
    </AuthFrame>
  )
}
