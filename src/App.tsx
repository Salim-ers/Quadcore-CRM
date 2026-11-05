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
import { CalendarPage } from './features/calendar/CalendarPage'
import { BrochurePage } from './features/documents/BrochurePage'
import { DocumentsPage } from './features/documents/DocumentsPage'
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

// Une barre qui défile : une demi-barre figée qui clignote donnait l'impression d'un chargement bloqué
function Splash() {
  return (
    <div role="status" aria-label="Chargement" className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 animate-fade-in">
      <Logo size={46} withText={false} />
      <span className="relative w-28 h-1 rounded-full bg-copper/15 overflow-hidden">
        <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-copper animate-loading motion-reduce:animate-none" />
      </span>
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
        <Route path="/calendrier" element={<CalendarPage />} />
        <Route path="/suivi" element={<TicketsPage />} />
        <Route path="/suivi/:id" element={<TicketDetail />} />
        <Route path="/projets" element={<ProjectsPage />} />
        <Route path="/projets/:id" element={<ProjectDetail />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/brochure" element={<BrochurePage />} />
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
