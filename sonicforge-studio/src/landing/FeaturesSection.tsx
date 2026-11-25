import { ReactNode, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { ChevronRight, LayoutGrid, Search } from 'lucide-react'
import { LuvenWaveformMark } from './LuvenIcons'
import { DawMockupVisual, HeadphonesVisual, RobotComingSoonVisual } from './CardVisuals'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

function TiltFeatureCard({
  index,
  gray = false,
  children,
}: {
  index: number
  gray?: boolean
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const sRotX = useSpring(rotX, { stiffness: 240, damping: 24 })
  const sRotY = useSpring(rotY, { stiffness: 240, damping: 24 })

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduce || !ref.current) return
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
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: EASE_OUT }}
      whileHover={reduce ? undefined : { y: -4 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        reduce
          ? undefined
          : {
              rotateX: sRotX,
              rotateY: sRotY,
              transformPerspective: 900,
            }
      }
      className={`group relative grid min-h-[224px] grid-cols-[1.08fr_0.92fr] overflow-hidden rounded-[20px] border transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(15,15,16,0.06)] ${
        gray
          ? 'border-[#E4E4E7] bg-[#F4F4F5]'
          : 'border-[#E4E4E7] bg-white'
      }`}
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
      className="relative z-20 mx-auto max-w-[1280px] px-6 pt-6 pb-14 lg:px-8 lg:pt-8 lg:pb-16"
    >
      {/* Asymmetric 3-Card Grid matching Reference Composition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.04fr_1.02fr_0.94fr]">
        {/* CARD 1: Sound Creator */}
        <TiltFeatureCard index={0}>
          <div className="relative z-10 flex flex-col justify-between p-6 pr-2">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <LuvenWaveformMark size={24} color="#FFFFFF" />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10]">
                Sound Creator
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.48] text-[#52525B]">
                Buat sound keren dengan alat yang mudah digunakan.
              </p>
            </div>
            <Link
              to="/studio"
              className="mt-5 inline-flex w-fit items-center gap-1 rounded-md text-[14px] font-bold text-[#0F0F10] no-underline transition-transform duration-200 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
            >
              <span>Mulai Sekarang</span>
              <ChevronRight size={16} strokeWidth={2.4} />
            </Link>
          </div>
          <DawMockupVisual />
        </TiltFeatureCard>

        {/* CARD 2: Explore Sound */}
        <TiltFeatureCard index={1}>
          <div className="relative z-10 flex flex-col justify-between p-6 pr-2">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <Search size={22} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10]">
                Explore Sound
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.48] text-[#52525B]">
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
              className="mt-5 inline-flex w-fit cursor-pointer items-center gap-1 rounded-md text-[14px] font-bold text-[#0F0F10] transition-transform duration-200 hover:translate-x-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F0F10]"
            >
              <span>Jelajahi Sekarang</span>
              <ChevronRight size={16} strokeWidth={2.4} />
            </button>
          </div>
          <HeadphonesVisual />
        </TiltFeatureCard>

        {/* CARD 3: Fitur Lainnya (Gray Background) */}
        <TiltFeatureCard index={2} gray>
          <div className="relative z-10 flex flex-col justify-between p-6 pr-1">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#0F0F10] text-white">
                <LayoutGrid size={22} strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 text-[21px] font-bold tracking-[-0.02em] text-[#0F0F10]">
                Fitur Lainnya
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.48] text-[#52525B]">
                Masih dalam pengembangan. Nantikan update selanjutnya!
              </p>
            </div>
            <div className="mt-5">
              <span className="inline-flex h-8 items-center rounded-full bg-[#0F0F10] px-4 text-[12px] font-semibold text-white">
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
