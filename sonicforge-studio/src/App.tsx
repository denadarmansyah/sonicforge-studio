import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HomePage } from './pages/HomePage'
import { Logo } from './ui/Logo'
import { ToastProvider } from './ui/primitives'

const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage }))
)
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
)
const PublicProfilePage = lazy(() =>
  import('./pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage }))
)
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage }))
)
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage }))
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const AccountSettingsPage = lazy(() =>
  import('./pages/AccountSettingsPage').then((m) => ({ default: m.AccountSettingsPage }))
)
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage }))
)
const PrivacyPage = lazy(() =>
  import('./pages/SupportPages').then((m) => ({ default: m.PrivacyPage }))
)
const TermsPage = lazy(() =>
  import('./pages/SupportPages').then((m) => ({ default: m.TermsPage }))
)
const ContactPage = lazy(() =>
  import('./pages/SupportPages').then((m) => ({ default: m.ContactPage }))
)
const NotFoundPage = lazy(() =>
  import('./pages/SupportPages').then((m) => ({ default: m.NotFoundPage }))
)

function HandleOrNotFoundRoute() {
  const { handle = '' } = useParams<{ handle: string }>()
  if (handle.startsWith('@') && handle.length > 1) {
    return <PublicProfilePage username={handle.slice(1)} />
  }
  return <NotFoundPage />
}

function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Memuat Luven"
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg text-fg"
    >
      <Logo variant="symbol" size={44} animate />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fg-sec">
        Memuat...
      </span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/settings" element={<AccountSettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/studio" element={<StudioPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/:handle" element={<HandleOrNotFoundRoute />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
