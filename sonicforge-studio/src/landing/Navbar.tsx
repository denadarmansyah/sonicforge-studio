import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Layers, LayoutGrid, Menu, Search, Sparkles, Users, Wand2, X } from 'lucide-react'
import { LuvenLogo, LuvenWaveformMark } from './LuvenIcons'
import { useMotionEnvironment } from './useMotionConfig'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const MORE_FEATURES = [
  {
    title: 'AI Voice Mastering',
    desc: 'Optimasi kejernihan vokal otomatis satu klik.',
    icon: Wand2,
  },
  {
    title: 'Sound Pack Library',
    desc: 'Koleksi sampel kurasi dari kreator komunitas.',
    icon: Layers,
  },
  {
    title: 'Live Session Collab',
    desc: 'Edit timeline sound bersama tim secara real-time.',
    icon: Users,
  },
  {
    title: 'Stem Extractor',
    desc: 'Pisahkan vokal, bass, dan instrumen dengan presisi.',
    icon: Sparkles,
  },
]

export function Navbar({
  onAuth,
  onComingSoon,
}: {
  onAuth: (mode: 'login' | 'signup') => void
  onComingSoon: (title: string, desc: string) => void
}) {
  const { prefersReduced } = useMotionEnvironment()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<'home' | 'creator' | 'explore' | 'more'>('home')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)

  const dropRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const drawerPanelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  // Sticky scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-close mobile drawer if viewport resizes >= 1024px
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Body scroll lock & Focus trap inside mobile drawer
  useEffect(() => {
    if (!mobileOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 40)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMobileOpen(false)
        burgerRef.current?.focus()
        return
      }
      if (e.key === 'Tab' && drawerPanelRef.current) {
        const focusables = Array.from(
          drawerPanelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(focusTimer)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen])

  // Close desktop dropdown on outside click or Escape
  useEffect(() => {
    if (!dropdownOpen) return
    const onOutside = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setHoveredNav('home')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setHoveredNav('home')
      }
    }
    document.addEventListener('mousedown', onOutside)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('keydown', onKey)
    }
  }, [dropdownOpen])

  const closeDrawer = () => {
    setMobileOpen(false)
    setTimeout(() => burgerRef.current?.focus(), 20)
  }

  return (
    <>
      <motion.header
        initial={prefersReduced ? false : { opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: EASE_OUT }}
        className={`sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled
            ? 'border-b border-[#E4E4E7] bg-white/88 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex h-18 max-w-[1280px] items-center justify-between px-4 md:h-20 md:px-6 lg:px-8"
        >
          {/* Left Brand Logo */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })}
            className="inline-flex min-h-11 items-center rounded-lg no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
            aria-label="Luven Beranda"
          >
            <LuvenLogo variant="dark" />
          </Link>

          {/* Center Navigation Menu (Desktop >= 1024px) */}
          <div
            className="hidden items-center gap-1 rounded-full bg-white/85 px-1.5 py-1 backdrop-blur-xs lg:flex"
            onMouseLeave={() => {
              if (!dropdownOpen) setHoveredNav('home')
            }}
          >
            {/* 1. Home */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
              }}
              onMouseEnter={() => setHoveredNav('home')}
              onFocus={() => setHoveredNav('home')}
              className={`relative inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[14px] font-semibold no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
                hoveredNav === 'home' ? 'text-white' : 'text-[#0F0F10]'
              }`}
            >
              {hoveredNav === 'home' && (
                <motion.span
                  layoutId="luven-nav-pill"
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-full bg-[#0F0F10]"
                />
              )}
              Home
            </a>

            {/* 2. Sound Creator */}
            <Link
              to="/studio"
              onMouseEnter={() => setHoveredNav('creator')}
              onFocus={() => setHoveredNav('creator')}
              className={`relative inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
                hoveredNav === 'creator' ? 'text-white' : 'text-[#0F0F10]'
              }`}
            >
              {hoveredNav === 'creator' && (
                <motion.span
                  layoutId="luven-nav-pill"
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-full bg-[#0F0F10]"
                />
              )}
              <LuvenWaveformMark size={17} color="currentColor" />
              <span>Sound Creator</span>
            </Link>

            {/* 3. Explore Sound */}
            <button
              type="button"
              onMouseEnter={() => setHoveredNav('explore')}
              onFocus={() => setHoveredNav('explore')}
              onClick={() =>
                onComingSoon(
                  'Explore Sound',
                  'Galeri sound komunitas Luven sedang dalam tahap akhir pengembangan. Nantikan update selanjutnya!'
                )
              }
              className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
                hoveredNav === 'explore' ? 'text-white' : 'text-[#0F0F10]'
              }`}
            >
              {hoveredNav === 'explore' && (
                <motion.span
                  layoutId="luven-nav-pill"
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 -z-10 rounded-full bg-[#0F0F10]"
                />
              )}
              <Search size={16} strokeWidth={2.2} />
              <span>Explore Sound</span>
            </button>

            {/* 4. More Features Dropdown */}
            <div ref={dropRef} className="relative">
              <button
                type="button"
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                onMouseEnter={() => setHoveredNav('more')}
                onFocus={() => setHoveredNav('more')}
                onClick={() => setDropdownOpen((v) => !v)}
                className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
                  hoveredNav === 'more' ? 'text-white' : 'text-[#0F0F10]'
                }`}
              >
                {hoveredNav === 'more' && (
                  <motion.span
                    layoutId="luven-nav-pill"
                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-[#0F0F10]"
                  />
                )}
                <LayoutGrid size={16} strokeWidth={2.1} />
                <span>More Features</span>
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    role="menu"
                    initial={{ opacity: 0, scale: 0.98, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 6 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="absolute left-0 top-[calc(100%+10px)] z-50 w-[300px] origin-top-left rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-[0_16px_36px_rgba(15,15,16,0.1)]"
                  >
                    {MORE_FEATURES.map((item, idx) => {
                      const Icon = item.icon
                      return (
                        <motion.button
                          key={item.title}
                          role="menuitem"
                          type="button"
                          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.045, ease: EASE_OUT }}
                          onClick={() => {
                            setDropdownOpen(false)
                            setHoveredNav('home')
                            onComingSoon(item.title, `${item.desc} Fitur ini masih dalam pengembangan.`)
                          }}
                          className="flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors [@media(hover:hover)]:hover:bg-[#F4F4F5] active:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F0F10] text-white">
                            <Icon size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold text-[#0F0F10]">{item.title}</span>
                              <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[10px] font-semibold text-[#52525B]">
                                Soon
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-[#52525B]">{item.desc}</span>
                          </span>
                        </motion.button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Auth Buttons (Desktop >= 1024px) */}
          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={() => onAuth('login')}
              className={`group relative inline-flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border px-6 text-[14px] font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${
                scrolled
                  ? 'border-[#0F0F10] bg-white text-[#0F0F10] [@media(hover:hover)]:hover:bg-[#F4F4F5] focus-visible:outline-[#0F0F10]'
                  : 'border-white/85 bg-[#0F0F10]/65 text-white [@media(hover:hover)]:hover:bg-white/14 focus-visible:outline-white'
              }`}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/18 to-transparent transition-transform duration-500 [@media(hover:hover)]:group-hover:translate-x-full" />
              Login
            </button>

            <button
              type="button"
              onClick={() => onAuth('signup')}
              className="group relative inline-flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#5B1A2B] px-6 text-[14px] font-semibold text-white transition-all duration-200 [@media(hover:hover)]:hover:bg-[#702237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B1A2B]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 [@media(hover:hover)]:group-hover:translate-x-full" />
              Sign Up
            </button>
          </div>

          {/* Mobile / Tablet (<1024px) Hamburger Button (>=44x44px) */}
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="luven-mobile-drawer"
            aria-label="Buka menu navigasi"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#0F0F10] transition-colors active:bg-[#F4F4F5] [@media(hover:hover)]:hover:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] lg:hidden"
          >
            <Menu size={20} />
          </button>
        </nav>
      </motion.header>

      {/* Full-Screen / Tablet Drawer (<1024px) with Backdrop, Focus Trap & Accordion */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs lg:hidden"
          >
            <motion.div
              id="luven-mobile-drawer"
              ref={drawerPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu navigasi Luven"
              initial={prefersReduced ? { opacity: 0 } : { x: '100%' }}
              animate={prefersReduced ? { opacity: 1 } : { x: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { x: '100%' }}
              transition={{ duration: 0.34, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-dvh w-full flex-col justify-between overflow-y-auto bg-white px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-[420px] sm:px-6 sm:shadow-2xl"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex h-14 items-center justify-between border-b border-[#E4E4E7] pb-3">
                  <Link
                    to="/"
                    onClick={() => {
                      closeDrawer()
                      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
                    }}
                    className="inline-flex min-h-11 items-center no-underline"
                  >
                    <LuvenLogo variant="dark" />
                  </Link>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Tutup menu navigasi"
                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#0F0F10] active:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Drawer Menu Items */}
                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href="#top"
                    onClick={(e) => {
                      e.preventDefault()
                      closeDrawer()
                      window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' })
                    }}
                    className="flex min-h-12 items-center rounded-2xl bg-[#0F0F10] px-4 text-[15px] font-semibold text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10]"
                  >
                    Home
                  </a>

                  <Link
                    to="/studio"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-4 text-[15px] font-medium text-[#0F0F10] no-underline active:bg-[#F4F4F5] [@media(hover:hover)]:hover:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                  >
                    <LuvenWaveformMark size={20} color="#0F0F10" />
                    <span>Sound Creator</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      closeDrawer()
                      onComingSoon(
                        'Explore Sound',
                        'Galeri sound komunitas Luven sedang dalam tahap akhir pengembangan.'
                      )
                    }}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-medium text-[#0F0F10] active:bg-[#F4F4F5] [@media(hover:hover)]:hover:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                  >
                    <Search size={19} />
                    <span>Explore Sound</span>
                  </button>

                  {/* More Features Accordion */}
                  <div className="rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA]">
                    <button
                      type="button"
                      aria-expanded={mobileMoreOpen}
                      onClick={() => setMobileMoreOpen((v) => !v)}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-between px-4 text-left text-[15px] font-medium text-[#0F0F10] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                    >
                      <span className="inline-flex items-center gap-3">
                        <LayoutGrid size={19} />
                        <span>More Features</span>
                      </span>
                      <ChevronDown
                        size={18}
                        className={`transition-transform duration-200 ${mobileMoreOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {mobileMoreOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-1 border-t border-[#E4E4E7] p-2">
                            {MORE_FEATURES.map((item) => {
                              const Icon = item.icon
                              return (
                                <button
                                  key={item.title}
                                  type="button"
                                  onClick={() => {
                                    closeDrawer()
                                    onComingSoon(item.title, `${item.desc} Fitur ini masih dalam pengembangan.`)
                                  }}
                                  className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-[#E4E4E7]/60 [@media(hover:hover)]:hover:bg-[#E4E4E7]/50 focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0F0F10] text-white">
                                    <Icon size={15} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13.5px] font-semibold text-[#0F0F10]">
                                      {item.title}
                                    </span>
                                    <span className="block truncate text-[12px] text-[#52525B]">{item.desc}</span>
                                  </span>
                                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#52525B] border border-[#E4E4E7]">
                                    Soon
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Auth Buttons */}
              <div className="mt-6 flex flex-col gap-3 border-t border-[#E4E4E7] pt-5">
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer()
                    onAuth('login')
                  }}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-[#0F0F10] bg-white text-[15px] font-semibold text-[#0F0F10] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer()
                    onAuth('signup')
                  }}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#5B1A2B] text-[15px] font-semibold text-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#5B1A2B]"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
