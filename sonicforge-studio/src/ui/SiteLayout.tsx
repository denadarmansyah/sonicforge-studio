import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AudioWaveform,
  Compass,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { CONTACT_EMAIL } from '../lib/supabaseClient'
import { LuvenWordmark } from './BrandIcons'
import { Avatar, Button, Dropdown, EASE_SMOOTH, IconButton, LinkButton } from './primitives'

const NAV_LINKS = [
  { to: '/', label: 'Beranda' },
  { to: '/explore', label: 'Jelajah' },
  { to: '/studio', label: 'Alat Studio', icon: AudioWaveform },
]

export function SiteLayout({
  children,
  hideFooter = false,
}: {
  children: ReactNode
  hideFooter?: boolean
}) {
  const { user, profile, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Desktop-only Lenis smooth scroll (loaded dynamically so mobile pays 0 bytes)
  useEffect(() => {
    if (reduce) return
    const isDesktopPointer = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (min-width: 1024px)'
    ).matches
    if (!isDesktopPointer) return

    let raf = 0
    let disposed = false
    let cleanupLenis: (() => void) | undefined

    void import('lenis').then(({ default: Lenis }) => {
      if (disposed) return
      const lenis = new Lenis({
        duration: 0.9,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      const loop = (time: number) => {
        if (document.visibilityState === 'visible') lenis.raf(time)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      cleanupLenis = () => lenis.destroy()
    })

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      cleanupLenis?.()
    }
  }, [reduce])

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Drawer scroll lock + focus trap
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 30)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        burgerRef.current?.focus()
        return
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const els = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (!els.length) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const isRouteActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <a href="#main-content" className="skip-link">
        Lewati ke konten utama
      </a>

      {/* Sticky Top Navbar */}
      <header
        className={`sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)] transition-colors duration-200 ${
          scrolled ? 'border-b border-edge bg-bg/90 backdrop-blur-md' : 'border-b border-edge/50 bg-bg/75 backdrop-blur-xs'
        }`}
      >
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-6 lg:h-18 lg:px-8"
        >
          <div className="flex items-center gap-8">
            <Link
              to="/"
              aria-label="Beranda Luven"
              className="inline-flex min-h-11 items-center rounded-lg no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <LuvenWordmark />
            </Link>

            {/* Desktop Menu with Shared layoutId Active Indicator */}
            <div className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((item) => {
                const active = isRouteActive(item.to)
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                      active ? 'text-fg' : 'text-fg-sec [@media(hover:hover)]:hover:text-fg'
                    }`}
                  >
                    {Icon && <Icon size={15} className={active ? 'text-accent' : ''} />}
                    <span>{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="luven-top-nav-indicator"
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute right-3 bottom-1.5 left-3 h-0.5 rounded-full bg-accent"
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden items-center gap-2.5 lg:flex">
            {user ? (
              <>
                {isAdmin && (
                  <LinkButton to="/admin" variant="ghost" size="sm">
                    <ShieldCheck size={15} className="text-accent" />
                    <span>Moderasi</span>
                  </LinkButton>
                )}
                <LinkButton
                  to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'}
                  variant="secondary"
                  size="sm"
                >
                  <LayoutDashboard size={15} />
                  <span>Dasbor</span>
                </LinkButton>
                <Dropdown
                  trigger={
                    <button
                      type="button"
                      aria-label="Menu akun"
                      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-edge bg-surface p-0.5 pr-3 transition-colors [@media(hover:hover)]:hover:border-fg-sec focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <Avatar
                        src={profile?.avatar_url}
                        name={profile?.display_name || user.email}
                        size="sm"
                      />
                      <span className="max-w-[120px] truncate font-mono text-[12px] text-fg">
                        {profile?.username ? `@${profile.username}` : user.email.split('@')[0]}
                      </span>
                    </button>
                  }
                  items={[
                    ...(profile?.username
                      ? [
                          {
                            label: `Profil publik (@${profile.username})`,
                            icon: <ExternalLink size={15} />,
                            onClick: () => navigate(`/@${profile.username}`),
                          },
                        ]
                      : []),
                    {
                      label: 'Dasbor kreator',
                      icon: <LayoutDashboard size={15} />,
                      onClick: () => navigate(profile?.onboarding_completed ? '/dashboard' : '/onboarding'),
                    },
                    {
                      label: 'Keluar akun',
                      icon: <LogOut size={15} />,
                      danger: true,
                      onClick: async () => {
                        await signOut()
                        navigate('/')
                      },
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Masuk
                </LinkButton>
                <LinkButton to="/register" variant="primary" size="sm">
                  <UserPlus size={15} />
                  <span>Buat halaman kamu</span>
                </LinkButton>
              </>
            )}
          </div>

          {/* Mobile Hamburger (<1024px) */}
          <IconButton
            ref={burgerRef}
            label="Buka menu navigasi"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden"
          >
            <Menu size={20} />
          </IconButton>
        </nav>
      </header>

      {/* Full-Screen Mobile Drawer (<1024px) */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-bg/85 backdrop-blur-sm lg:hidden"
          >
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu navigasi Luven"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.28, ease: EASE_SMOOTH }}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex h-dvh w-full flex-col justify-between overflow-y-auto border-l border-edge bg-surface px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-[390px] sm:px-6"
            >
              <div>
                <div className="flex h-14 items-center justify-between border-b border-edge pb-2">
                  <LuvenWordmark />
                  <IconButton
                    ref={closeBtnRef}
                    label="Tutup menu navigasi"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <X size={20} />
                  </IconButton>
                </div>

                <div className="mt-5 flex flex-col gap-1.5">
                  {NAV_LINKS.map((item) => {
                    const active = isRouteActive(item.to)
                    const Icon = item.icon || Compass
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-[15px] font-medium no-underline transition-colors ${
                          active
                            ? 'border-accent/40 bg-elevated text-accent'
                            : 'border-transparent text-fg [@media(hover:hover)]:hover:bg-elevated'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}

                  {user && (
                    <>
                      <Link
                        to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-4 text-[15px] font-medium text-fg no-underline"
                      >
                        <LayoutDashboard size={18} />
                        <span>Dasbor Kreator</span>
                      </Link>
                      {profile?.username && (
                        <Link
                          to={`/@${profile.username}`}
                          className="flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-4 text-[15px] font-medium text-fg no-underline"
                        >
                          <ExternalLink size={18} />
                          <span>Profil Publik (@{profile.username})</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-4 text-[15px] font-medium text-accent no-underline"
                        >
                          <ShieldCheck size={18} />
                          <span>Moderasi Admin</span>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2.5 border-t border-edge pt-5">
                {user ? (
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={async () => {
                      await signOut()
                      setDrawerOpen(false)
                      navigate('/')
                    }}
                  >
                    <LogOut size={16} />
                    <span>Keluar dari {user.email}</span>
                  </Button>
                ) : (
                  <>
                    <LinkButton to="/login" variant="secondary" fullWidth>
                      Masuk ke akun
                    </LinkButton>
                    <LinkButton to="/register" variant="primary" fullWidth>
                      <UserPlus size={16} />
                      <span>Buat halaman kamu</span>
                    </LinkButton>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {children}
      </main>

      {/* Site Footer */}
      {!hideFooter && (
        <footer className="border-t border-edge bg-surface">
          <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
              <div className="md:col-span-5">
                <LuvenWordmark size="lg" />
                <p className="mt-3 max-w-[38ch] text-[14px] leading-relaxed text-fg-sec">
                  Halaman profil resmi dan direktori template untuk kreator TikTok serta CapCut di Indonesia.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-edge bg-elevated px-3 py-1 font-mono text-[11px] text-fg-sec">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span>luven.my.id</span>
                </div>
              </div>

              <div className="md:col-span-3">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-sec">
                  Platform
                </h2>
                <ul className="mt-3 list-none space-y-1 p-0 text-[14px]">
                  <li>
                    <Link to="/explore" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Jelajah Kreator
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Buat Halaman Profil
                    </Link>
                  </li>
                  <li>
                    <Link to="/studio" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Alat Audio Studio
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-4">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-sec">
                  Kebijakan & Bantuan
                </h2>
                <ul className="mt-3 list-none space-y-1 p-0 text-[14px]">
                  <li>
                    <Link to="/privacy" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Kebijakan Privasi
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Ketentuan Layanan & DMCA
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="inline-flex min-h-11 items-center text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg">
                      Kontak ({CONTACT_EMAIL})
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-edge pt-6 text-[12.5px] text-fg-sec sm:flex-row sm:items-center">
              <p className="m-0">© 2026 Luven (luven.my.id). Hak cipta dilindungi.</p>
              <p className="m-0 font-mono text-[11.5px] text-fg-sec">
                Tidak berafiliasi langsung dengan ByteDance Ltd., TikTok, maupun CapCut.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
