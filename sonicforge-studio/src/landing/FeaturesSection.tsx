import { ReactNode, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { ChevronRight, LayoutGrid, Search } from 'lucide-react'
import { LuvenWaveformMark } from './LuvenIcons'
import { DawMockupVisual, HeadphonesVisual, RobotComingSoonVisual } from './CardVisuals'
import { useMotionEnvironment } from './useMotionConfig'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

function TiltFeatureCard({
  index,
  gray = false,
  className = '',
  children,
}: {
  index: number
  gray?: boolean
  className?: string
  children: ReactNode
}) {
  const { prefersReduced, enableDesktopEffects } = useMotionEnvironment()
  const ref = useRef<HTMLElement>(null)
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const sRotX = useSpring(rotX, { stiffness: 240, damping: 24 })
  const sRotY = useSpring(rotY, { stiffness: 240, damping: 24 })

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!enableDesktopEffects || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    rotX.set(-py * 4.5)
    rotY.set(px * 4.5)
  }

  const onLeave = () => {
    rotX.set(0)
    rotY.set(0)
  }

  return (
    <motion.article
      ref={ref}
      initial={prefersReduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE_OUT }}
      whileHover={enableDesktopEffects ? { y: -4 } : undefined}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        enableDesktopEffects
          ? {
              rotateX: sRotX,
              rotateY: sRotY,
              transformPerspective: 900,
            }
          : undefined
      }
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] border transition-shadow duration-300 sm:min-h-[228px] sm:grid sm:grid-cols-[1.08fr_0.92fr] lg:grid-cols-[1.22fr_0.78fr] xl:grid-cols-[1.08fr_0.92fr] [@media(hover:hover)]:hover:shadow-[0_12px_30px_rgba(15,15,16,0.06)] ${
        gray ? 'border-[#E4E4E7] bg-[#F4F4F5]' : 'border-[#E4E4E7] bg-white'
      } ${className}`}
    >
      {children}
    </motion.article>
  )
}

export function FeaturesSection({
  onComingSoon,
}: {
  onComingSoon: (title: string, desc: string) => void
}) {
  return (
    <section
      id="features"
      aria-label="Fitur utama Luven"
      className="relative z-20 mx-auto max-w-[1280px] px-4 py-[clamp(2.5rem,4.5vw,4rem)] md:px-6 lg:px-8"
    >
      {/* Mobile: 1 col (visual below text) | Tablet 640-1023: 2 cols (3rd spans full) | Desktop >=1024: 3 cols */}
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-[1.04fr_1.02fr_0.94fr]">
        {/* CARD 1: Sound Creator */}
        <TiltFeatureCard index={0}>
          <div className="relative z-10 flex flex-col justify-between p-6 pb-3 sm:pb-6 sm:pr-2 lg:p-5 lg:pr-1 xl:p-6 xl:pr-2">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <LuvenWaveformMark size={24} color="#FFFFFF" />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10] lg:text-[18.5px] xl:text-[21px]">
                Sound Creator
              </h2>
              <p className="mt-1.5 text-[14px] leading-[1.5] text-[#52525B] lg:text-[13px] xl:text-[14px]">
                Buat sound keren dengan alat yang mudah digunakan.
              </p>
            </div>
            <Link
              to="/studio"
              className="mt-3 inline-flex min-h-11 w-fit items-center gap-1 rounded-md text-[14px] font-bold whitespace-nowrap text-[#0F0F10] no-underline transition-transform duration-200 lg:text-[13.5px] xl:text-[14px] [@media(hover:hover)]:hover:translate-x-0.5 active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
            >
              <span>Mulai Sekarang</span>
              <ChevronRight size={16} strokeWidth={2.4} />
            </Link>
          </div>
          <DawMockupVisual />
        </TiltFeatureCard>

        {/* CARD 2: Explore Sound */}
        <TiltFeatureCard index={1}>
          <div className="relative z-10 flex flex-col justify-between p-6 pb-3 sm:pb-6 sm:pr-2 lg:p-5 lg:pr-1 xl:p-6 xl:pr-2">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <Search size={22} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10] lg:text-[18.5px] xl:text-[21px]">
                Explore Sound
              </h2>
              <p className="mt-1.5 text-[14px] leading-[1.5] text-[#52525B] lg:text-[13px] xl:text-[14px]">
                Temukan berbagai sound menarik dari komunitas.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onComingSoon(
                  'Explore Sound',
                  'Ribuan efek suara dan preset karya komunitas kreator akan segera hadir di Luven.'
                )
              }
              className="mt-3 inline-flex min-h-11 w-fit cursor-pointer items-center gap-1 rounded-md text-[14px] font-bold whitespace-nowrap text-[#0F0F10] transition-transform duration-200 lg:text-[13.5px] xl:text-[14px] [@media(hover:hover)]:hover:translate-x-0.5 active:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
            >
              <span>Jelajahi Sekarang</span>
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>
          <HeadphonesVisual />
        </TiltFeatureCard>

        {/* CARD 3: Fitur Lainnya (Gray Background; spans 2 cols on tablet 640-1023) */}
        <TiltFeatureCard index={2} gray className="sm:col-span-2 lg:col-span-1">
          <div className="relative z-10 flex flex-col justify-between p-6 pb-3 sm:pb-6 sm:pr-1 lg:p-5 lg:pr-1 xl:p-6 xl:pr-1">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <LayoutGrid size={22} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10] lg:text-[18.5px] xl:text-[21px]">
                Fitur Lainnya
              </h2>
              <p className="mt-1.5 max-w-[34ch] text-[14px] leading-[1.5] text-[#52525B] lg:text-[13px] xl:text-[14px]">
                Masih dalam pengembangan. Nantikan update selanjutnya!
              </p>
            </div>
            <div className="mt-4 flex min-h-11 items-center">
              <span className="inline-flex h-8 items-center rounded-full bg-[#0F0F10] px-4 text-[12px] font-semibold whitespace-nowrap text-white">
                Coming Soon
              </span>
            </div>
          </div>
          <RobotComingSoonVisual />
        </TiltFeatureCard>
      </div>
    </section>
  )
}
