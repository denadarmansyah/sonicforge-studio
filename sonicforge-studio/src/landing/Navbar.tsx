import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, LayoutGrid, Menu, Search, Sparkles, Wand2, Layers, Users, X } from 'lucide-react'
import { LuvenLogo, LuvenWaveformMark } from './LuvenIcons'

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
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<'home' | 'creator' | 'explore' | 'more'>('home')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE_OUT }}
      className={`sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-b border-[#E4E4E7] bg-white/88 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 lg:px-8"
      >
        {/* Left Brand Logo */}
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
          className="rounded-lg no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
          aria-label="Luven Beranda"
        >
          <LuvenLogo variant="dark" />
        </Link>

        {/* Center Navigation Menu (Desktop) */}
        <div
          className="hidden items-center gap-1.5 rounded-full bg-white/80 px-1.5 py-1 backdrop-blur-xs lg:flex"
          onMouseLeave={() => {
            if (!dropdownOpen) setHoveredNav('home')
          }}
        >
          {/* 1. Home */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
            }}
            onMouseEnter={() => setHoveredNav('home')}
            onFocus={() => setHoveredNav('home')}
            className={`relative inline-flex h-10 items-center justify-center rounded-full px-5 text-[14px] font-semibold no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
              hoveredNav === 'home' ? 'text-white' : 'text-[#0F0F10]'
            }`}
          >
            {hoveredNav === 'home' && (
              <motion.span
                layoutId="luven-nav-pill"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
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
            className={`relative inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
              hoveredNav === 'creator' ? 'text-white' : 'text-[#0F0F10]'
            }`}
          >
            {hoveredNav === 'creator' && (
              <motion.span
                layoutId="luven-nav-pill"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
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
            className={`relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
              hoveredNav === 'explore' ? 'text-white' : 'text-[#0F0F10]'
            }`}
          >
            {hoveredNav === 'explore' && (
              <motion.span
                layoutId="luven-nav-pill"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
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
              className={`relative inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10] ${
                hoveredNav === 'more' ? 'text-white' : 'text-[#0F0F10]'
              }`}
            >
              {hoveredNav === 'more' && (
                <motion.span
                  layoutId="luven-nav-pill"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
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
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.045, ease: EASE_OUT }}
                        onClick={() => {
                          setDropdownOpen(false)
                          setHoveredNav('home')
                          onComingSoon(item.title, `${item.desc} Fitur ini masih dalam pengembangan.`)
                        }}
                        className="flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-[#F4F4F5] focus-visible:outline-2 focus-visible:outline-[#0F0F10]"
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

        {/* Right Auth Buttons (Desktop) */}
        <div className="hidden items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={() => onAuth('login')}
            className={`group relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border px-6 text-[14px] font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 ${
              scrolled
                ? 'border-[#0F0F10] bg-white text-[#0F0F10] hover:bg-[#F4F4F5] focus-visible:outline-[#0F0F10]'
                : 'border-white/85 bg-[#0F0F10]/60 text-white hover:bg-white/12 focus-visible:outline-white'
            }`}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/18 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            Login
          </button>

          <button
            type="button"
            onClick={() => onAuth('signup')}
            className="group relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#5B1A2B] px-6 text-[14px] font-semibold text-white transition-all duration-200 hover:bg-[#702237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B1A2B]"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            Sign Up
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#0F0F10] transition-colors hover:bg-[#F4F4F5] lg:hidden"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden border-b border-[#E4E4E7] bg-white lg:hidden"
          >
            <div className="mx-auto flex max-w-[1280px] flex-col gap-1.5 px-6 py-5">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault()
                  setMobileOpen(false)
                  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
                }}
                className="flex h-11 items-center rounded-xl bg-[#0F0F10] px-4 text-[14px] font-semibold text-white no-underline"
              >
                Home
              </a>
              <Link
                to="/studio"
                onClick={() => setMobileOpen(false)}
                className="flex h-11 items-center gap-2.5 rounded-xl px-4 text-[14px] font-medium text-[#0F0F10] no-underline hover:bg-[#F4F4F5]"
              >
                <LuvenWaveformMark size={18} color="#0F0F10" />
                Sound Creator
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false)
                  onComingSoon(
                    'Explore Sound',
                    'Galeri sound komunitas Luven sedang dalam tahap akhir pengembangan.'
                  )
                }}
                className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-4 text-left text-[14px] font-medium text-[#0F0F10] hover:bg-[#F4F4F5]"
              >
                <Search size={17} />
                Explore Sound
              </button>
              <div className="my-1 border-t border-[#E4E4E7] pt-2">
                <span className="px-4 text-[11.5px] font-semibold uppercase tracking-wider text-[#71717A]">
                  More Features
                </span>
                <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {MORE_FEATURES.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false)
                        onComingSoon(item.title, `${item.desc} Fitur ini masih dalam pengembangan.`)
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-xl px-4 py-2.5 text-left text-[13.5px] font-medium text-[#0F0F10] hover:bg-[#F4F4F5]"
                    >
                      <span>{item.title}</span>
                      <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[10.5px] font-semibold text-[#52525B]">
                        Coming Soon
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 border-t border-[#E4E4E7] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    onAuth('login')
                  }}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#0F0F10] bg-white text-[14px] font-semibold text-[#0F0F10]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    onAuth('signup')
                  }}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#5B1A2B] text-[14px] font-semibold text-white"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
