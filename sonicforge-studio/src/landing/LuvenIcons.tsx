import { motion, useReducedMotion } from 'framer-motion'

export function LuvenWaveformMark({
  size = 24,
  color = 'currentColor',
  accentDotsColor,
  pulse = false,
  className = '',
}: {
  size?: number
  color?: string
  accentDotsColor?: string
  pulse?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const animate = pulse && !reduce
  const dotFill = accentDotsColor ?? color

  const bars = [
    { x: 6.5, y: 10, h: 12, d: 0 },
    { x: 11.2, y: 4.5, h: 23, d: 0.12 },
    { x: 15.9, y: 11.5, h: 9, d: 0.24 },
    { x: 20.6, y: 7.5, h: 17, d: 0.36 },
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="2.6" cy="16" r="1.8" fill={dotFill} />
      {bars.map((b, i) =>
        animate ? (
          <motion.rect
            key={i}
            x={b.x}
            y={b.y}
            width="2.9"
            height={b.h}
            rx="1.45"
            fill={color}
            style={{ originY: '50%', transformBox: 'fill-box' }}
            animate={{ scaleY: [1, i % 2 === 0 ? 1.28 : 0.72, 1] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: b.d,
            }}
          />
        ) : (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width="2.9"
            height={b.h}
            rx="1.45"
            fill={color}
          />
        )
      )}
      <circle cx="26.8" cy="16" r="1.8" fill={dotFill} />
    </svg>
  )
}

export function LuvenLogo({
  variant = 'dark',
  size = 'md',
}: {
  variant?: 'dark' | 'light'
  size?: 'md' | 'lg'
}) {
  const isLight = variant === 'light'
  const iconSize = size === 'lg' ? 34 : 30
  const textClass =
    size === 'lg' ? 'text-[24px] tracking-[-0.03em]' : 'text-[22px] tracking-[-0.03em]'

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LuvenWaveformMark
        size={iconSize}
        color={isLight ? '#FFFFFF' : '#0F0F10'}
        accentDotsColor={isLight ? '#FFFFFF' : '#0F0F10'}
      />
      <span
        className={`font-extrabold leading-none ${textClass} ${
          isLight ? 'text-white' : 'text-[#0F0F10]'
        }`}
      >
        Luven
      </span>
    </span>
  )
}

export function MusicEighthNote({
  size = 22,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M14.5 3.5V15.8C13.6 15.1 12.3 14.9 10.9 15.3C8.8 15.9 7.5 17.7 8 19.3C8.5 20.9 10.6 21.7 12.7 21.1C14.6 20.5 16 19 16.2 17.4L16.3 7.6C18.3 8.2 19.7 9.7 19.4 11.9C19.3 12.4 19.8 12.7 20.2 12.3C21.5 10.6 21.2 7.8 19.2 6.1C18 5.1 16.7 4.5 16.2 3.5H14.5Z" />
    </svg>
  )
}

export function MusicBeamedNote({
  size = 28,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10.5 6.2L22.5 3.6C23.2 3.4 23.8 4 23.8 4.7V17.6C23.8 19.5 22 21.2 19.8 21.5C17.7 21.8 16 20.6 16 18.9C16 17.1 17.8 15.6 20 15.4C20.6 15.3 21.1 15.4 21.5 15.6V7.8L11.8 9.9V19.9C11.8 21.8 10 23.5 7.8 23.8C5.7 24.1 4 22.9 4 21.2C4 19.4 5.8 17.9 8 17.7C8.6 17.6 9.1 17.7 9.5 17.9V7.3C9.5 6.8 9.9 6.3 10.5 6.2Z" />
    </svg>
  )
}

export function SparkleStar({
  size = 16,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 1C10.5 5.8 14.2 9.5 19 10C14.2 10.5 10.5 14.2 10 19C9.5 14.2 5.8 10.5 1 10C5.8 9.5 9.5 5.8 10 1Z" />
    </svg>
  )
}

export function YouTubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.8 8.001a2.75 2.75 0 0 0-1.94-1.946C18.14 5.6 12 5.6 12 5.6s-6.14 0-7.86.455A2.75 2.75 0 0 0 2.2 8.001 28.9 28.9 0 0 0 1.75 12c0 1.35.15 2.68.45 3.999a2.75 2.75 0 0 0 1.94 1.946c1.72.455 7.86.455 7.86.455s6.14 0 7.86-.455a2.75 2.75 0 0 0 1.94-1.946c.3-1.319.45-2.649.45-3.999s-.15-2.68-.45-3.999ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  )
}

export function TikTokIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  )
}

export function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function XSocialIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
