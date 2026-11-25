import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import Lenis from 'lenis'
import { Navbar } from '../landing/Navbar'
import { HeroSection } from '../landing/HeroSection'
import { FeaturesSection } from '../landing/FeaturesSection'
import { FooterSection } from '../landing/FooterSection'
import { AuthModal, ComingSoonToast } from '../landing/InteractiveModals'

export function LandingPage() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const lenisRef = useRef<Lenis | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)
  const [notice, setNotice] = useState<{ title: string; desc: string } | null>(null)

  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis
    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [reduce])

  const scrollToFeatures = () => {
    const el = document.getElementById('features')
    if (!el) return
    if (lenisRef.current && !reduce) {
      lenisRef.current.scrollTo(el, { offset: -88 })
    } else {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  const scrollToTop = () => {
    if (lenisRef.current && !reduce) {
      lenisRef.current.scrollTo(0)
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  const triggerNotice = (title: string, desc: string) => {
    setNotice({ title, desc })
  }

  return (
    <div className="min-h-screen bg-white text-[#0F0F10] selection:bg-[#5B1A2B] selection:text-white">
      <Navbar onAuth={setAuthMode} onComingSoon={triggerNotice} />
      <main>
        <HeroSection onLearnMore={scrollToFeatures} />
        <FeaturesSection onComingSoon={triggerNotice} />
      </main>
      <FooterSection onScrollTop={scrollToTop} onInfoLink={triggerNotice} />

      <AuthModal
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSwitchMode={(m) => setAuthMode(m)}
      />
      <ComingSoonToast
        notice={notice}
        onDismiss={() => setNotice(null)}
        onOpenStudio={() => navigate('/studio')}
      />
    </div>
  )
}
