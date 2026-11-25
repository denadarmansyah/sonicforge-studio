import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, CheckCircle2, Loader2, Mail } from 'lucide-react'
import {
  InstagramIcon,
  LuvenLogo,
  TikTokIcon,
  XSocialIcon,
  YouTubeIcon,
} from './LuvenIcons'
import { useMotionEnvironment } from './useMotionConfig'

const WAVE_PATH_A =
  'M0 44C120 18 280 18 440 30C600 42 740 58 900 34C1060 10 1180 48 1310 38C1380 32 1410 4 1440 0V80H0V44Z'
const WAVE_PATH_B =
  'M0 36C140 28 300 10 460 24C620 38 760 52 920 26C1080 4 1200 42 1320 32C1385 26 1415 8 1440 4V80H0V36Z'

export function FooterSection({
  onScrollTop,
  onInfoLink,
}: {
  onScrollTop: () => void
  onInfoLink: (title: string, desc: string) => void
}) {
  const { animateLoops, enableDesktopEffects } = useMotionEnvironment()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')
  const [showTopBtn, setShowTopBtn] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 140)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = email.trim()
    if (!clean) {
      setStatus('error')
      setFeedback('Email wajib diisi terlebih dahulu.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setStatus('error')
      setFeedback('Format email tidak valid (mis. kreator@domain.com).')
      return
    }

    setStatus('loading')
    setFeedback('')
    setTimeout(() => {
      setStatus('success')
      setFeedback('Terima kasih! Anda berhasil berlangganan update terbaru Luven.')
      setEmail('')
    }, 650)
  }

  const socials = [
    { label: 'YouTube Luven', name: 'YouTube', icon: <YouTubeIcon size={19} /> },
    { label: 'TikTok Luven', name: 'TikTok', icon: <TikTokIcon size={17} /> },
    { label: 'Instagram Luven', name: 'Instagram', icon: <InstagramIcon size={17} /> },
    { label: 'X Luven', name: 'X', icon: <XSocialIcon size={16} /> },
  ]

  return (
    <footer className="relative overflow-hidden text-white">
      {/* Animated Wavy Top Edge */}
      <div aria-hidden="true" className="-mb-px w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 76"
          fill="none"
          preserveAspectRatio="none"
          className="block h-[42px] w-full sm:h-[58px] lg:h-[64px]"
        >
          <motion.path
            fill="#0F0F10"
            d={WAVE_PATH_A}
            animate={animateLoops ? { d: [WAVE_PATH_A, WAVE_PATH_B, WAVE_PATH_A] } : undefined}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* Main Dark Footer Body */}
      <div className="relative bg-[#0F0F10] pb-[env(safe-area-inset-bottom)]">
        {/* Right Decorative Pulsing Maroon Waveform */}
        <motion.svg
          viewBox="0 0 230 160"
          fill="none"
          aria-hidden="true"
          animate={animateLoops ? { scaleY: [1, 1.12, 0.94, 1], opacity: [0.55, 0.85, 0.55] } : undefined}
          transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originY: 1 }}
          className="pointer-events-none absolute bottom-12 right-0 hidden h-[150px] w-[220px] lg:block"
        >
          <path
            d="M12 148C26 148 30 116 42 116C54 116 58 144 70 144C84 144 92 72 106 72C120 72 126 142 140 142C156 142 170 26 188 26C206 26 212 138 228 138"
            stroke="#5B1A2B"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>

        <div className="relative z-10 mx-auto max-w-[1280px] px-4 pt-8 pb-10 md:px-6 lg:px-8">
          {/* HP: 1 col | Tablet: 2 cols | Desktop >=1024px: 3 cols + divider */}
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-[220px_1px_1fr_420px] lg:items-center lg:gap-9">
            {/* Col 1: Brand + Tagline */}
            <div>
              <LuvenLogo variant="light" size="lg" />
              <p className="mt-2.5 pl-1 text-[13.5px] font-normal text-[#D4D4D8]">
                Create. Explore. Share.
              </p>
            </div>

            {/* Subtle Vertical Divider on Desktop */}
            <div aria-hidden="true" className="hidden h-20 w-px bg-white/14 lg:block" />

            {/* Col 2: Community Text + Social Icons (44x44px touch targets) */}
            <div className="max-w-[360px]">
              <p className="text-[14px] leading-[1.6] text-[#E4E4E7]">
                Bergabunglah dengan komunitas kreator sound untuk menjelajahi lebih banyak kemungkinan.
              </p>
              <div className="mt-3 flex items-center gap-2">
                {socials.map((s) => (
                  <motion.button
                    key={s.name}
                    type="button"
                    aria-label={s.label}
                    whileHover={enableDesktopEffects ? { y: -3 } : undefined}
                    transition={{ duration: 0.2 }}
                    onClick={() =>
                      onInfoLink(
                        `Komunitas ${s.name}`,
                        `Kanal resmi ${s.name} Luven akan segera dibuka untuk publik.`
                      )
                    }
                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors active:bg-white/15 [@media(hover:hover)]:hover:bg-white/10 [@media(hover:hover)]:hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {s.icon}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Col 3: Newsletter Form (spans 2 cols on tablet so input+button breathe; 1 full col stacked on HP) */}
            <div className="md:col-span-2 lg:col-span-1">
              <h3 className="text-[16px] font-bold tracking-[-0.01em] text-white">
                Dapatkan update terbaru!
              </h3>
              <p className="mt-1 text-[13.5px] text-[#A1A1AA]">
                Berlangganan untuk mendapatkan informasi fitur terbaru.
              </p>

              <form onSubmit={handleSubscribe} noValidate className="mt-4 max-w-[520px] lg:max-w-none">
                {/* HP (<640px): full-width 1 column | >=640px: horizontal row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Mail
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#71717A]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status !== 'idle') {
                          setStatus('idle')
                          setFeedback('')
                        }
                      }}
                      disabled={status === 'loading'}
                      placeholder="Masukkan email Anda"
                      aria-label="Masukkan email Anda"
                      aria-invalid={status === 'error'}
                      className="min-h-11 w-full rounded-full border border-transparent bg-white pl-10 pr-4 text-[14px] text-[#0F0F10] placeholder-[#71717A] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#5B1A2B]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="group relative inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-[#5B1A2B] px-6 text-[14px] font-semibold text-white transition-all duration-200 [@media(hover:hover)]:hover:bg-[#702237] active:scale-[0.98] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 [@media(hover:hover)]:group-hover:translate-x-full" />
                    {status === 'loading' && <Loader2 size={15} className="animate-spin" />}
                    <span>Subscribe</span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {feedback && (
                    <motion.p
                      key={feedback}
                      role={status === 'error' ? 'alert' : 'status'}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`mt-2.5 flex items-center gap-1.5 text-[12.5px] ${
                        status === 'success' ? 'text-[#E4E4E7]' : 'font-medium text-white'
                      }`}
                    >
                      {status === 'success' && <CheckCircle2 size={14} className="shrink-0 text-white" />}
                      <span>{feedback}</span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Legal Bar — Wraps cleanly, Back-to-top never overlaps text */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 py-4 text-[12.5px] text-[#A1A1AA] sm:flex-row sm:items-center md:px-6 lg:px-8">
            <p className="m-0">© 2026 Luven. All rights reserved.</p>

            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#D4D4D8]">
                <button
                  type="button"
                  onClick={() =>
                    onInfoLink(
                      'Privacy Policy',
                      'Seluruh pemrosesan audio di Luven dilakukan langsung secara lokal di browser Anda untuk menjaga privasi penuh.'
                    )
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center transition-colors [@media(hover:hover)]:hover:text-white active:text-white focus-visible:outline-1 focus-visible:outline-white"
                >
                  Privacy Policy
                </button>
                <span aria-hidden="true" className="text-white/25">|</span>
                <button
                  type="button"
                  onClick={() =>
                    onInfoLink(
                      'Terms of Service',
                      'Seluruh karya sound yang Anda buat di Luven Studio 100% bebas royalti untuk proyek pribadi maupun komersial.'
                    )
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center transition-colors [@media(hover:hover)]:hover:text-white active:text-white focus-visible:outline-1 focus-visible:outline-white"
                >
                  Terms of Service
                </button>
                <span aria-hidden="true" className="text-white/25">|</span>
                <button
                  type="button"
                  onClick={() =>
                    onInfoLink(
                      'Contact Luven',
                      'Hubungi tim Luven melalui hello@luven.audio untuk kolaborasi dan masukan fitur.'
                    )
                  }
                  className="inline-flex min-h-11 cursor-pointer items-center transition-colors [@media(hover:hover)]:hover:text-white active:text-white focus-visible:outline-1 focus-visible:outline-white"
                >
                  Contact
                </button>
              </div>

              {/* Back-to-top circular button (>=44x44px touch target on mobile, clean circle on desktop) */}
              <motion.button
                type="button"
                onClick={onScrollTop}
                aria-label="Kembali ke atas halaman"
                animate={{
                  opacity: showTopBtn ? 1 : 0.8,
                  scale: showTopBtn ? 1 : 0.96,
                }}
                whileHover={enableDesktopEffects ? { y: -2, scale: 1.05 } : undefined}
                whileTap={{ scale: 0.95 }}
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-[#0F0F10] shadow-sm transition-colors [@media(hover:hover)]:hover:bg-[#E4E4E7] active:bg-[#E4E4E7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:h-9 lg:w-9"
              >
                <ArrowUp size={16} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
