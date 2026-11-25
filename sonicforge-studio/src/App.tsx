import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'

const StudioPage = lazy(() =>
  import('./pages/StudioPage').then((m) => ({ default: m.StudioPage }))
)

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen w-screen bg-[#09090B]" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
