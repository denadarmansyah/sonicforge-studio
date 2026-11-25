import { motion } from 'framer-motion'
import { MusicEighthNote } from './LuvenIcons'
import { useMotionEnvironment } from './useMotionConfig'

const DAW_BARS = [
  4, 10, 20, 14, 30, 42, 34, 20, 26, 12, 6, 4, 14, 26, 22, 40, 46, 28, 34, 22, 16, 8,
]

export function DawMockupVisual() {
  const { animateLoops } = useMotionEnvironment()

  return (
    <div className="relative flex h-44 w-full items-center justify-center overflow-hidden sm:h-full sm:justify-end sm:pr-0">
      {/* Soft organic gray backdrop */}
      <svg
        viewBox="0 0 220 220"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute right-1/2 -bottom-6 h-[200px] w-[200px] translate-x-1/2 text-[#F1F1F3] sm:-right-4 sm:-bottom-4 sm:h-[210px] sm:w-[210px] sm:translate-x-0"
      >
        <path
          d="M45 35C82 8 158 12 188 46C218 80 218 168 184 198C150 228 56 224 28 190C0 156 8 62 45 35Z"
          fill="currentColor"
        />
      </svg>

      <svg
        viewBox="0 0 232 196"
        fill="none"
        role="img"
        aria-label="Preview antarmuka editor audio Luven"
        className="relative z-10 h-[172px] w-[212px] drop-shadow-[0_10px_20px_rgba(15,15,16,0.12)] sm:-mr-3 sm:mt-3 sm:h-[186px] sm:w-[222px]"
      >
        <g transform="translate(6, 14) skewY(-6)">
          <rect x="4" y="10" width="228" height="162" rx="10" fill="#18181B" stroke="#0F0F10" strokeWidth="3" />
          <path d="M5.5 20C5.5 15.3 9.3 11.5 14 11.5H222C226.7 11.5 230.5 15.3 230.5 20V30H5.5V20Z" fill="#232327" />
          <line x1="5" y1="30" x2="231" y2="30" stroke="#0F0F10" strokeWidth="2" />

          <circle cx="16" cy="21" r="2.8" fill="#52525B" />
          <circle cx="25" cy="21" r="2.8" fill="#52525B" />
          <circle cx="34" cy="21" r="2.8" fill="#52525B" />
          <circle cx="186" cy="21" r="2.8" fill="#52525B" />
          <circle cx="197" cy="21" r="2.8" fill="#52525B" />
          <circle cx="208" cy="21" r="2.8" fill="#52525B" />

          <rect x="6" y="31" width="54" height="139" fill="#202024" />
          <line x1="60" y1="30" x2="60" y2="170" stroke="#0F0F10" strokeWidth="2" />
          <rect x="12" y="41" width="40" height="3.5" rx="1.75" fill="#A1A1AA" />
          <circle cx="17" cy="42.75" r="3.2" fill="#FAFAFA" />
          <line x1="6" y1="53" x2="60" y2="53" stroke="#2D2D33" strokeWidth="1.2" />

          <g fill="#71717A">
            <circle cx="18" cy="68" r="3.8" fill="#A1A1AA" />
            <rect x="27" y="66.5" width="23" height="2.8" rx="1.4" />
            <circle cx="18" cy="92" r="3.8" />
            <rect x="27" y="90.5" width="23" height="2.8" rx="1.4" />
            <circle cx="18" cy="116" r="3.8" stroke="#71717A" strokeWidth="1.4" fill="none" />
            <circle cx="18" cy="116" r="1.4" fill="#A1A1AA" />
            <rect x="27" y="114.5" width="23" height="2.8" rx="1.4" />
            <circle cx="18" cy="140" r="3.8" stroke="#71717A" strokeWidth="1.4" fill="none" />
            <circle cx="18" cy="140" r="1.4" fill="#A1A1AA" />
            <rect x="27" y="138.5" width="23" height="2.8" rx="1.4" />
          </g>

          <line x1="60" y1="53" x2="230" y2="53" stroke="#111114" strokeWidth="1.8" />
          <line x1="60" y1="104" x2="230" y2="104" stroke="#111114" strokeWidth="1.8" />
          <line x1="124" y1="31" x2="124" y2="170" stroke="#27272A" strokeWidth="1.1" />
          <line x1="184" y1="31" x2="184" y2="170" stroke="#27272A" strokeWidth="1.1" />
          <rect x="68" y="41" width="76" height="3" rx="1.5" fill="#3F3F46" />

          <line x1="62" y1="79" x2="228" y2="79" stroke="#71717A" strokeWidth="1.3" />

          {DAW_BARS.map((h, i) => {
            const x = 68 + i * 4.8
            const y = 79 - h / 2
            return !animateLoops ? (
              <rect key={i} x={x} y={y} width="2.3" height={h} rx="1.15" fill="#FAFAFA" />
            ) : (
              <motion.rect
                key={i}
                x={x}
                y={y}
                width="2.3"
                height={h}
                rx="1.15"
                fill="#FAFAFA"
                style={{ originY: '50%', transformBox: 'fill-box' }}
                animate={{
                  scaleY: [1, i % 3 === 0 ? 1.32 : i % 2 === 0 ? 0.65 : 1.18, 1],
                }}
                transition={{
                  duration: 1.5 + (i % 4) * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.05,
                }}
              />
            )
          })}

          <motion.g
            style={{ originX: '132px', originY: '130px' }}
            animate={animateLoops ? { scale: [1, 1.07, 1] } : undefined}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <circle cx="132" cy="130" r="28" fill="#111113" stroke="#2D2D33" strokeWidth="1.8" />
            <path
              d="M125.5 118L145.5 130L125.5 142V118Z"
              fill="#FAFAFA"
              stroke="#FAFAFA"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </motion.g>
        </g>
      </svg>
    </div>
  )
}

export function HeadphonesVisual() {
  const { animateLoops } = useMotionEnvironment()

  return (
    <div className="relative flex h-44 w-full items-center justify-center overflow-hidden sm:h-full sm:pr-2">
      <svg
        viewBox="0 0 220 220"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute h-[184px] w-[184px] text-[#F2F2F4] sm:right-1 sm:h-[196px] sm:w-[196px]"
      >
        <path
          d="M52 24C94 4 166 16 194 58C222 100 210 170 168 196C126 222 50 212 24 170C-2 128 10 44 52 24Z"
          fill="currentColor"
        />
      </svg>

      <motion.div
        className="pointer-events-none relative z-10 flex items-center justify-center"
        animate={animateLoops ? { rotate: [-3.2, 3.2, -3.2], y: [0, -3, 0] } : undefined}
        transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <picture>
          <source
            type="image/webp"
            srcSet="/assets/headphones-1x.webp 198w, /assets/headphones.webp 396w"
            sizes="180px"
          />
          <img
            src="/assets/headphones.png"
            alt="Headphone studio untuk menjelajahi koleksi sound komunitas"
            loading="lazy"
            decoding="async"
            width={168}
            height={166}
            className="h-[158px] w-[160px] object-contain select-none sm:h-[170px] sm:w-[172px]"
          />
        </picture>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-24 text-[#0F0F10] sm:left-3 sm:top-9 sm:translate-x-0"
        animate={animateLoops ? { y: [0, -5, 0], rotate: [-8, 4, -8] } : undefined}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MusicEighthNote size={21} />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-4 left-1/2 z-20 translate-x-18 text-[#0F0F10] sm:bottom-5 sm:left-auto sm:right-3 sm:translate-x-0"
        animate={animateLoops ? { y: [0, -6, 0], rotate: [6, -6, 6] } : undefined}
        transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
      >
        <MusicEighthNote size={20} />
      </motion.div>
    </div>
  )
}

export function RobotComingSoonVisual() {
  const { animateLoops } = useMotionEnvironment()

  return (
    <div className="relative flex h-44 w-full items-end justify-center overflow-hidden sm:h-full sm:justify-end sm:pr-1">
      <svg
        viewBox="0 0 220 220"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 h-[196px] w-[196px] text-[#E5E5E8] sm:-right-4 sm:-bottom-4 sm:h-[206px] sm:w-[206px]"
      >
        <path
          d="M58 20C106 -2 178 14 202 60C226 106 214 184 168 208C122 232 42 222 18 176C-6 130 10 42 58 20Z"
          fill="currentColor"
        />
      </svg>

      <svg
        viewBox="0 0 236 212"
        fill="none"
        role="img"
        aria-label="Ilustrasi robot memegang papan Coming Soon"
        className="relative z-10 -mb-1 h-[176px] w-[196px] sm:h-[196px] sm:w-[214px]"
      >
        <motion.g
          stroke="#0F0F10"
          strokeWidth="3.2"
          strokeLinecap="round"
          animate={animateLoops ? { opacity: [0.45, 1, 0.45], scale: [0.97, 1.03, 0.97] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '52px', originY: '84px' }}
        >
          <line x1="54" y1="56" x2="63" y2="70" />
          <line x1="36" y1="77" x2="52" y2="85" />
          <line x1="36" y1="103" x2="50" y2="103" />
        </motion.g>

        <motion.g
          animate={animateLoops ? { y: [0, -5, 0], rotate: [-4, 6, -4] } : undefined}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '198px', originY: '42px' }}
        >
          <ellipse cx="192" cy="46" rx="5.2" ry="4" transform="rotate(-20 192 46)" fill="#0F0F10" />
          <path
            d="M196 45L201 25C206 28 210 33 208 40"
            stroke="#0F0F10"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M202 64L209 58" stroke="#0F0F10" strokeWidth="3.2" strokeLinecap="round" />
        </motion.g>

        <motion.g
          animate={animateLoops ? { y: [0, -2.5, 0], rotate: [-1, 1.2, -1] } : undefined}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '130px', originY: '115px' }}
        >
          <line x1="134" y1="44" x2="136" y2="26" stroke="#0F0F10" strokeWidth="4.2" strokeLinecap="round" />
          <circle cx="137" cy="20" r="7" fill="#3F3F46" stroke="#0F0F10" strokeWidth="2.8" />
          <circle cx="134.8" cy="17.8" r="1.9" fill="#FAFAFA" />

          <ellipse cx="79" cy="94" rx="6.8" ry="14.5" fill="#A1A1AA" stroke="#0F0F10" strokeWidth="2.8" />
          <ellipse cx="181" cy="96" rx="7.8" ry="15.5" fill="#A1A1AA" stroke="#0F0F10" strokeWidth="2.8" />

          <rect x="80" y="44" width="100" height="82" rx="41" fill="#FAFAFA" stroke="#0F0F10" strokeWidth="3.2" />
          <path
            d="M156 50C170 60 176 76 174 95C172 111 158 121 136 123C153 117 164 105 166 88C167 72 163 58 156 50Z"
            fill="#E4E4E7"
          />

          <rect x="91" y="60" width="74" height="51" rx="21" fill="#141416" />

          <motion.rect
            x="107"
            y="78"
            width="7.8"
            height="15.5"
            rx="3.9"
            fill="#FAFAFA"
            style={{ originY: '50%', transformBox: 'fill-box' }}
            animate={animateLoops ? { scaleY: [1, 1, 0.08, 1, 1, 1] } : undefined}
            transition={{ duration: 3.8, repeat: Infinity, times: [0, 0.44, 0.48, 0.52, 0.8, 1] }}
          />
          <motion.rect
            x="140"
            y="79"
            width="7.8"
            height="15.5"
            rx="3.9"
            fill="#FAFAFA"
            style={{ originY: '50%', transformBox: 'fill-box' }}
            animate={animateLoops ? { scaleY: [1, 1, 0.08, 1, 1, 1] } : undefined}
            transition={{ duration: 3.8, repeat: Infinity, times: [0, 0.44, 0.48, 0.52, 0.8, 1] }}
          />

          <path d="M122 96Q128 101 134 96" stroke="#FAFAFA" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        <rect x="115" y="125" width="28" height="10" fill="#D4D4D8" stroke="#0F0F10" strokeWidth="2.8" />

        <motion.g
          animate={animateLoops ? { rotate: [0, -7, 3, -7, 0] } : undefined}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '188px', originY: '154px' }}
        >
          <path d="M194 154C206 168 208 188 198 198" stroke="#0F0F10" strokeWidth="13.5" strokeLinecap="round" />
          <path d="M194 154C206 168 208 188 198 198" stroke="#52525B" strokeWidth="7.8" strokeLinecap="round" />
        </motion.g>

        <motion.g
          animate={animateLoops ? { rotate: [2.2, 4.2, 0.8, 2.2], y: [0, -1.5, 0] } : undefined}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '128px', originY: '170px' }}
        >
          <rect x="55" y="132" width="144" height="74" rx="8" fill="#FAFAFA" stroke="#0F0F10" strokeWidth="3.8" />
          <text
            x="127"
            y="165"
            textAnchor="middle"
            fill="#0F0F10"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="800"
            fontSize="21"
            letterSpacing="-0.5"
          >
            COMING
          </text>
          <text
            x="127"
            y="189"
            textAnchor="middle"
            fill="#0F0F10"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="800"
            fontSize="21"
            letterSpacing="-0.5"
          >
            SOON
          </text>

          <ellipse cx="52" cy="172" rx="7.5" ry="12.5" fill="#3F3F46" stroke="#0F0F10" strokeWidth="3" />
          <ellipse
            cx="190"
            cy="199"
            rx="11.5"
            ry="8.5"
            transform="rotate(-24 190 199)"
            fill="#3F3F46"
            stroke="#0F0F10"
            strokeWidth="3"
          />
        </motion.g>
      </svg>
    </div>
  )
}
