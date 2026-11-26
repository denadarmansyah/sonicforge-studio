/**
 * Reads semantic design tokens directly from CSS custom properties in @theme (src/index.css)
 * so canvas elements (WaveformTrack, EqVisualizer, LevelMeter, QR) never hardcode hex values.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return val || fallback
}

export const STUDIO_THEME = {
  get base() {
    return cssVar('--color-bg', 'rgb(10, 10, 11)')
  },
  get panel() {
    return cssVar('--color-surface', 'rgb(17, 17, 19)')
  },
  get raised() {
    return cssVar('--color-elevated', 'rgb(23, 23, 26)')
  },
  get line() {
    return cssVar('--color-edge', 'rgb(38, 38, 43)')
  },
  get ink() {
    return cssVar('--color-fg', 'rgb(245, 245, 244)')
  },
  get sub() {
    return cssVar('--color-fg-sec', 'rgb(161, 161, 170)')
  },
  get mute() {
    return cssVar('--color-fg-muted', 'rgb(113, 113, 122)')
  },
  get accent() {
    return cssVar('--color-accent', 'rgb(198, 255, 61)')
  },
  get onAccent() {
    return cssVar('--color-on-accent', 'rgb(10, 10, 11)')
  },
  get waveformActive() {
    return cssVar('--color-fg', 'rgb(245, 245, 244)')
  },
  get waveformMuted() {
    return cssVar('--color-fg-muted', 'rgb(113, 113, 122)')
  },
  get meterNormal() {
    return cssVar('--color-accent', 'rgb(198, 255, 61)')
  },
  get meterClip() {
    return cssVar('--color-fg', 'rgb(245, 245, 244)')
  },
}
