import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ChevronRight, Play } from 'lucide-react'
import { LuvenWaveformMark, MusicBeamedNote, MusicEighthNote, SparkleStar } from './LuvenIcons'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const EQ_HEIGHTS = [
  8, 14, 10, 22, 16, 28, 18, 12, 26, 36, 20, 44, 28, 52, 34, 62, 40, 48, 28, 36, 22, 16,
]

const H1_LINE_1 = ['Create', 'Your', 'Own']
const H1_LINE_2 = [
  { text: 'Sound,', accent: false },
  { text: 'Your', accent: true },
  { text: 'Way', accent: true },
]

export function HeroSection({ onLearnMore }: { onLearnMore: () => void }) {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const [ctaHover, setCtaHover] = useState(false)
  const [rippleKey, setRippleKey] = useState(0)

  // Subtle magnetic button motion values (GPU transform only)
  const magRef = useRef<HTMLButtonElement>(null)
  const magX = useMotionValue(0)
  const magY = useMotionValue(0)
  const smoothMagX = useSpring(magX, { stiffness: 260, damping: 20 })
  const smoothMagY = useSpring(magY, { stiffness: 260, damping: 20 })

  // Subtle mouse parallax for hero illustration (max 12px)
  const parX = useMotionValue(0)
  const parY = useMotionValue(0)
  const smoothParX = useSpring(parX, { stiffness: 90, damping: 22 })
  const smoothParY = useSpring(parY, { stiffness: 90, damping: 22 })

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2 // -1..1
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    parX.set(nx * 10)
    parY.set(ny * 8)
  }

  const handleHeroMouseLeave = () => {
    parX.set(0)
    parY.set(0)
  }

  const handleMagMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduce || !magRef.current) return
    const r = magRef.current.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    magX.set(Math.max(-5, Math.min(5, dx * 0.08)))
    magY.set(Math.max(-4, Math.min(4, dy * 0.1)))
  }

  const handleMagLeave = () => {
    setCtaHover(false)
    magX.set(0)
    magY.set(0)
  }

  return (
    <section
      id="top"
      onMouseMove={handleHeroMouseMove}
      onMouseLeave={handleHeroMouseLeave}
      className="relative -mt-20 overflow-hidden pt-20"
    >
      {/* Top-Right Organic Black Blob (extends behind desktop navbar auth buttons just like reference) */}
      <motion.div
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0, scale: 0.78, x: 60, y: -40 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ duration: 0.95, ease: EASE_OUT }}
        style={{ originX: 1, originY: 0 }}
        className="pointer-events-none absolute right-0 top-0 hidden h-[410px] w-[350px] lg:block xl:h-[430px] xl:w-[calc(50vw-230px)] xl:min-w-[430px]"
      >
        <svg viewBox="0 0 450 440" fill="none" className="h-full w-full" preserveAspectRatio="none">
          <motion.path
            fill="#0F0F10"
            animate={
              reduce
                ? undefined
                : {
                    d: [
                      'M78 0H450V316C412 368 338 408 246 404C112 398 18 292 22 158C24 92 46 38 78 0Z',
                      'M68 0H450V326C404 378 326 414 236 408C104 398 12 284 18 150C21 86 42 36 68 0Z',
                      'M78 0H450V316C412 368 338 408 246 404C112 398 18 292 22 158C24 92 46 38 78 0Z',
                    ],
                  }
            }
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            d="M78 0H450V316C412 368 338 408 246 404C112 398 18 292 22 158C24 92 46 38 78 0Z"
          />
        </svg>
      </motion.div>

      <div className="relative mx-auto max-w-[1280px] px-6 pt-6 pb-2 lg:px-8 lg:pt-8">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[540px_1fr] xl:grid-cols-[570px_1fr] lg:gap-4">
          {/* LEFT HERO COPY */}
          <div className="relative z-20 pb-4 lg:pb-12">
            {/* Pill Badge + Entrance Sound Ripple */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT }}
              className="relative inline-flex items-center"
            >
              <span className="inline-flex items-center gap-2.5 rounded-full border border-[#E4E4E7] bg-white px-4 py-1.5 text-[13px] font-medium text-[#0F0F10] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  {!reduce && (
                    <motion.span
                      className="absolute inset-0 rounded-full border border-[#5B1A2B]"
                      animate={{ scale: [1, 2.3], opacity: [0.65, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                  <span className="h-2.5 w-2.5 rounded-full bg-[#5B1A2B]" />
                </span>
                <span>Create • Explore • Share</span>
              </span>
            </motion.div>

            {/* H1 Word-by-Word Mask Reveal */}
            <h1 className="mt-6 text-[42px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#0F0F10] sm:text-[54px] xl:text-[62px]">
              <span className="block">
                {H1_LINE_1.map((word, idx) => (
                  <span key={word} className="mr-[0.24em] inline-block overflow-hidden pb-1 align-bottom last:mr-0">
                    <motion.span
                      className="inline-block"
                      initial={reduce ? false : { y: '110%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{
                        duration: 0.68,
                        delay: 0.16 + idx * 0.06,
                        ease: EASE_OUT,
                      }}
                    >
                      {word}
                    </motion.span>
                  </span>
                ))}
              </span>
              <span className="block">
                {H1_LINE_2.map((item, idx) => (
                  <span
                    key={item.text}
                    className={`mr-[0.24em] inline-block overflow-hidden pb-1.5 align-bottom last:mr-0 ${
                      item.accent ? 'text-[#5B1A2B]' : 'text-[#0F0F10]'
                    }`}
                  >
                    <motion.span
                      className="inline-block"
                      initial={reduce ? false : { y: '110%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{
                        duration: 0.68,
                        delay: 0.34 + idx * 0.06,
                        ease: EASE_OUT,
                      }}
                    >
                      {item.text}
                    </motion.span>
                  </span>
                ))}
              </span>
            </h1>

            {/* Subtitle */}
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.52, ease: EASE_OUT }}
              className="mt-5 max-w-[460px] text-[16px] leading-[1.55] font-normal text-[#27272A] sm:text-[18px]"
            >
              Platform modern untuk membuat, mengelola, dan menemukan sound terbaik.
            </motion.p>

            {/* CTA Buttons Row */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.62, ease: EASE_OUT }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              {/* Primary Maroon Button with Magnetic Hover, Sheen & Concentric Sound Ripple */}
              <div className="relative inline-flex items-center justify-center">
                {!reduce && ctaHover && (
                  <>
                    <motion.span
                      key={`r1-${rippleKey}`}
                      aria-hidden="true"
                      initial={{ scale: 0.96, opacity: 0.45 }}
                      animate={{ scale: 1.24, opacity: 0 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-full border border-[#5B1A2B]"
                    />
                    <motion.span
                      key={`r2-${rippleKey}`}
                      aria-hidden="true"
                      initial={{ scale: 0.98, opacity: 0.3 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{ duration: 1.15, delay: 0.14, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-full border border-[#5B1A2B]/60"
                    />
                  </>
                )}

                <motion.button
                  ref={magRef}
                  type="button"
                  style={reduce ? undefined : { x: smoothMagX, y: smoothMagY }}
                  onMouseEnter={() => {
                    setCtaHover(true)
                    setRippleKey((k) => k + 1)
                  }}
                  onMouseMove={handleMagMove}
                  onMouseLeave={handleMagLeave}
                  onClick={() => navigate('/studio')}
                  className="group relative inline-flex h-[50px] cursor-pointer items-center gap-2.5 overflow-hidden rounded-full bg-[#5B1A2B] px-7 text-[14.5px] font-semibold text-white shadow-[0_6px_20px_rgba(91,26,43,0.22)] transition-colors duration-200 hover:bg-[#702237] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B1A2B]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/22 to-transparent transition-transform duration-600 group-hover:translate-x-full" />
                  <LuvenWaveformMark size={20} color="#FFFFFF" pulse={ctaHover} />
                  <span>Mulai Sekarang</span>
                  <ChevronRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </motion.button>
              </div>

              {/* Outline Button */}
              <button
                type="button"
                onClick={onLearnMore}
                className="group relative inline-flex h-[50px] cursor-pointer items-center gap-2.5 overflow-hidden rounded-full border border-[#18181B] bg-white px-7 text-[14.5px] font-semibold text-[#0F0F10] transition-colors duration-200 hover:bg-[#F4F4F5] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F0F10]"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-600 group-hover:translate-x-full" />
                <Play size={15} fill="#0F0F10" className="text-[#0F0F10]" />
                <span>Pelajari Lebih Lanjut</span>
              </button>
            </motion.div>
          </div>

          {/* RIGHT HERO ILLUSTRATION + EQUALIZER + FLOATING NOTES */}
          <div className="relative z-10 flex items-end justify-center lg:-ml-12 lg:justify-end">
            {/* Soft Organic Light-Gray Blob behind Characters */}
            <svg
              viewBox="0 0 680 460"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-[92%] w-[94%] text-[#F2F2F4]"
            >
              <path
                d="M225 46C312 -18 468 10 546 98C624 186 644 374 590 460H18C32 356 84 282 146 250C196 224 156 96 225 46Z"
                fill="currentColor"
              />
            </svg>

            {/* Animated Gray/Maroon Equalizer Bars in Bottom-Left of Hero Illustration */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 -left-8 z-10 hidden h-16 items-end gap-[5px] sm:flex lg:-left-20"
            >
              {EQ_HEIGHTS.map((h, i) => {
                const isPeakAccent = i === 13 || i === 15 || i === 17
                return reduce ? (
                  <span
                    key={i}
                    style={{ height: h }}
                    className={`w-[4px] rounded-t-full ${
                      isPeakAccent ? 'bg-[#5B1A2B]/35' : 'bg-[#D4D4D8]/85'
                    }`}
                  />
                ) : (
                  <motion.span
                    key={i}
                    style={{ height: h, originY: 1 }}
                    animate={{
                      scaleY: [
                        0.38,
                        i % 2 === 0 ? 1 : 0.62,
                        i % 3 === 0 ? 0.48 : 0.94,
                        0.72,
                        0.38,
                      ],
                    }}
                    transition={{
                      duration: 1.5 + (i % 5) * 0.22,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.06,
                    }}
                    className={`w-[4px] rounded-t-full will-change-transform ${
                      isPeakAccent ? 'bg-[#5B1A2B]/40' : 'bg-[#D4D4D8]/90'
                    }`}
                  />
                )
              })}
            </div>

            {/* Subtle 4-point Sparkle Star near Laptop */}
            <motion.div
              aria-hidden="true"
              animate={reduce ? undefined : { scale: [0.85, 1.15, 0.85], opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute bottom-16 left-2 z-20 hidden text-[#0F0F10] sm:block lg:-left-2"
            >
              <SparkleStar size={18} />
            </motion.div>

            {/* Floating Musical Notes (each with unique loop & delay) */}
            {/* Note 1: Left of boy's head */}
            <motion.div
              aria-hidden="true"
              animate={
                reduce
                  ? undefined
                  : { y: [0, -14, -24], rotate: [-8, 5, -4], opacity: [0, 1, 0] }
              }
              transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              className="pointer-events-none absolute left-[12%] top-[24%] z-20 text-[#0F0F10]"
            >
              <MusicEighthNote size={28} />
            </motion.div>

            {/* Manga rhythm accent lines left of boy */}
            <svg
              width="28"
              height="22"
              viewBox="0 0 28 22"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-[14%] top-[36%] z-20 hidden sm:block"
            >
              <line x1="3" y1="18" x2="23" y2="5" stroke="#0F0F10" strokeWidth="2.6" strokeLinecap="round" />
              <line x1="12" y1="20" x2="24" y2="12" stroke="#0F0F10" strokeWidth="2.2" strokeLinecap="round" />
            </svg>

            {/* Note 2: Center beamed note between boy & girl */}
            <motion.div
              aria-hidden="true"
              animate={
                reduce
                  ? undefined
                  : { y: [4, -12, -22], rotate: [6, -6, 4], opacity: [0, 1, 0] }
              }
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1.3 }}
              className="pointer-events-none absolute left-[52%] top-[16%] z-20 text-[#0F0F10]"
            >
              <MusicBeamedNote size={34} />
            </motion.div>

            {/* White rhythm lines + White Beamed Note over top-right dark blob */}
            <svg
              width="42"
              height="34"
              viewBox="0 0 42 34"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute right-[12%] top-[12%] z-20 hidden lg:block"
            >
              <line x1="4" y1="26" x2="22" y2="4" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
              <line x1="14" y1="30" x2="36" y2="15" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" />
            </svg>

            <motion.div
              aria-hidden="true"
              animate={
                reduce
                  ? undefined
                  : { y: [4, -14, -26], rotate: [-6, 8, -2], opacity: [0, 1, 0] }
              }
              transition={{ duration: 5.1, repeat: Infinity, ease: 'easeInOut', delay: 2.1 }}
              className="pointer-events-none absolute right-[2%] top-[24%] z-20 hidden text-white lg:block"
            >
              <MusicBeamedNote size={36} />
            </motion.div>

            {/* Bottom-right small eighth note */}
            <motion.div
              aria-hidden="true"
              animate={
                reduce
                  ? undefined
                  : { y: [2, -10, -18], rotate: [4, -8, 4], opacity: [0, 0.95, 0] }
              }
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 2.9 }}
              className="pointer-events-none absolute bottom-[16%] right-[2%] z-20 text-[#0F0F10]"
            >
              <MusicEighthNote size={22} />
            </motion.div>

            {/* Parallax + Entrance + Slow Float Wrapper for Crisp 2x Hero Characters */}
            <motion.div
              style={reduce ? undefined : { x: smoothParX, y: smoothParY }}
              initial={reduce ? false : { opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.28, ease: EASE_OUT }}
              className="relative z-10 w-full max-w-[740px] lg:-mr-8 xl:-mr-16"
            >
              <motion.img
                src="/assets/hero-characters.png"
                alt="Dua kreator musik berheadphone sedang membuat sound dengan laptop dan mikrofon studio"
                width={918}
                height={443}
                decoding="async"
                fetchPriority="high"
                animate={reduce ? undefined : { y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="block h-auto w-full object-contain select-none will-change-transform"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
