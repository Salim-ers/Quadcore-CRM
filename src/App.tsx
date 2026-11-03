import { useEffect } from 'react'
import { BrowserRouter, MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './data/store'
import { Shell } from './components/Shell'
import { ConfirmHost, Logo, Toaster } from './components/ui'
import { BlockedPage, LoginPage, SetPasswordPage } from './features/auth/AuthPages'
import { Dashboard } from './features/dashboard/Dashboard'
import { ProspectsPage } from './features/prospects/ProspectsPage'
import { ProspectDetail } from './features/prospects/ProspectDetail'
import { ProjectsPage } from './features/projects/ProjectsPage'
import { ProjectDetail } from './features/projects/ProjectDetail'
import { TasksPage } from './features/tasks/TasksPage'
import { TicketsPage } from './features/tickets/TicketsPage'
import { TicketDetail } from './features/tickets/TicketDetail'
import { TeamPage } from './features/team/TeamPage'
import { useReminders } from './features/team/notifications'

declare const __SINGLE_FILE__: boolean
// L'aperçu autonome navigue en mémoire (pas d'URL à gérer), l'app déployée utilise de vraies URL
const Router = __SINGLE_FILE__ ? MemoryRouter : BrowserRouter

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Splash() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 animate-fade-in">
      <Logo size={46} withText={false} />
      <span className="w-24 h-1 rounded-full bg-sunken overflow-hidden"><span className="block h-full w-1/2 bg-copper rounded-full animate-[fade-in_.8s_ease_infinite_alternate]" /></span>
    </div>
  )
}

export default function App() {
  const phase = useStore((s) => s.phase)
  useReminders()

  let content: React.ReactNode
  if (phase === 'boot' || phase === 'loading') content = <Splash />
  else if (phase === 'signedOut') content = <LoginPage />
  else if (phase === 'setPassword') content = <SetPasswordPage />
  else if (phase === 'error') content = <BlockedPage />
  else content = (
    <Shell>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/prospects" element={<ProspectsPage />} />
        <Route path="/prospects/:id" element={<ProspectDetail />} />
        <Route path="/suivi" element={<TicketsPage />} />
        <Route path="/suivi/:id" element={<TicketDetail />} />
        <Route path="/projets" element={<ProjectsPage />} />
        <Route path="/projets/:id" element={<ProjectDetail />} />
        <Route path="/taches" element={<TasksPage />} />
        <Route path="/equipe" element={<TeamPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )

  return (
    <Router>
      {content}
      <Toaster />
      <ConfirmHost />
    </Router>
  )
}
