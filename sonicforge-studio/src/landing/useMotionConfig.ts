import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export function useMotionEnvironment() {
  const prefersReduced = !!useReducedMotion()
  const [isTouchOrSmall, setIsTouchOrSmall] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: none), (pointer: coarse), (max-width: 1023px)').matches
  })
  const [isCompactMobile, setIsCompactMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 639px)').matches
  })
  const [isTabVisible, setIsTabVisible] = useState(() => {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  })

  useEffect(() => {
    const mqTouch = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 1023px)')
    const mqCompact = window.matchMedia('(max-width: 639px)')
    const updateMedia = () => {
      setIsTouchOrSmall(mqTouch.matches)
      setIsCompactMobile(mqCompact.matches)
    }
    const updateVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible')
    }

    mqTouch.addEventListener('change', updateMedia)
    mqCompact.addEventListener('change', updateMedia)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => {
      mqTouch.removeEventListener('change', updateMedia)
      mqCompact.removeEventListener('change', updateMedia)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  return {
    prefersReduced,
    isTouchOrSmall,
    isCompactMobile,
    isTabVisible,
    animateLoops: !prefersReduced && isTabVisible,
    enableDesktopEffects: !prefersReduced && !isTouchOrSmall && isTabVisible,
  }
}
