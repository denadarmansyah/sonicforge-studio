import { motion, useReducedMotion } from 'framer-motion'
import {
  LUVEN_RING_PATH,
  LUVEN_STAR_PATH,
  LUVEN_WORDMARK_PATH,
} from '../assets/brand/luvenPaths'

export type LogoVariant = 'symbol' | 'wordmark' | 'vertical' | 'horizontal'

interface LogoProps {
  variant?: LogoVariant
  /**
   * For 'symbol': width/height in px (enforced minimum 20px).
   * For 'horizontal': width in px (enforced minimum 96px).
   * For 'vertical': width in px (enforced minimum 84px).
   * For 'wordmark': width in px (enforced minimum 84px).
   */
  size?: number
  /**
   * Subtle slow orbit/star animation — strictly intended for Loading screen and Hero only.
   * Respects prefers-reduced-motion automatically.
   */
  animate?: boolean
  className?: string
}

export function Logo({
  variant = 'horizontal',
  size,
  animate = false,
  className = '',
}: LogoProps) {
  const reduce = useReducedMotion()
  const shouldAnimate = animate && !reduce

  if (variant === 'symbol') {
    const px = Math.max(20, size ?? 28)
    const h = Math.round((px * 720) / 754)
    return (
      <svg
        width={px}
        height={h}
        viewBox="-24 -24 802 768"
        fill="currentColor"
        role="img"
        aria-label="Luven"
        className={`inline-block shrink-0 select-none ${className}`}
      >
        <motion.path
          d={LUVEN_STAR_PATH}
          fillRule="evenodd"
          style={{ transformOrigin: '377px 360px' }}
          animate={shouldAnimate ? { scale: [1, 1.03, 1] } : undefined}
          transition={
            shouldAnimate
              ? { duration: 6, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        />
        <motion.path
          d={LUVEN_RING_PATH}
          fillRule="evenodd"
          style={{ transformOrigin: '420px 350px' }}
          animate={
            shouldAnimate
              ? { rotate: [0, 6, 0, -4, 0], x: [0, 4, 0] }
              : undefined
          }
          transition={
            shouldAnimate
              ? { duration: 8, repeat: Infinity, ease: 'easeInOut' }
              : undefined
          }
        />
      </svg>
    )
  }

  if (variant === 'wordmark') {
    const w = Math.max(84, size ?? 120)
    const h = Math.round((w * 116) / 860)
    return (
      <svg
        width={w}
        height={h}
        viewBox="-13 -11 860 116"
        fill="currentColor"
        role="img"
        aria-label="Luven"
        className={`inline-block shrink-0 select-none ${className}`}
      >
        <path d={LUVEN_WORDMARK_PATH} fillRule="evenodd" />
      </svg>
    )
  }

  if (variant === 'vertical') {
    const w = Math.max(84, size ?? 140)
    const h = Math.round((w * 890) / 880)
    return (
      <svg
        width={w}
        height={h}
        viewBox="-23 -20 880 890"
        fill="currentColor"
        role="img"
        aria-label="Luven"
        className={`inline-block shrink-0 select-none ${className}`}
      >
        <g transform="translate(40 0)">
          <motion.path
            d={LUVEN_STAR_PATH}
            fillRule="evenodd"
            style={{ transformOrigin: '377px 360px' }}
            animate={shouldAnimate ? { scale: [1, 1.025, 1] } : undefined}
            transition={
              shouldAnimate
                ? { duration: 6, repeat: Infinity, ease: 'easeInOut' }
                : undefined
            }
          />
          <motion.path
            d={LUVEN_RING_PATH}
            fillRule="evenodd"
            style={{ transformOrigin: '420px 350px' }}
            animate={shouldAnimate ? { rotate: [0, 5, 0, -3, 0] } : undefined}
            transition={
              shouldAnimate
                ? { duration: 8, repeat: Infinity, ease: 'easeInOut' }
                : undefined
            }
          />
        </g>
        <g transform="translate(0 754)">
          <path d={LUVEN_WORDMARK_PATH} fillRule="evenodd" />
        </g>
      </svg>
    )
  }

  // variant === 'horizontal' (min width 96px, clearspace included in viewBox)
  const w = Math.max(96, size ?? 124)
  const h = Math.round((w * 290) / 1150)
  return (
    <svg
      width={w}
      height={h}
      viewBox="-25 -15 1150 290"
      fill="currentColor"
      role="img"
      aria-label="Luven"
      className={`inline-block shrink-0 select-none ${className}`}
    >
      <g transform="translate(0 10) scale(0.333333)">
        <path d={LUVEN_STAR_PATH} fillRule="evenodd" />
        <path d={LUVEN_RING_PATH} fillRule="evenodd" />
      </g>
      <g transform="translate(304 87) scale(0.94)">
        <path d={LUVEN_WORDMARK_PATH} fillRule="evenodd" />
      </g>
    </svg>
  )
}
