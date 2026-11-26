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
    return cssVar('--color-bg', 'rgb(9, 9, 11)')
  },
  get panel() {
    return cssVar('--color-surface', 'rgb(17, 17, 20)')
  },
  get raised() {
    return cssVar('--color-elevated', 'rgb(24, 24, 28)')
  },
  get line() {
    return cssVar('--color-edge', 'rgb(39, 39, 42)')
  },
  get ink() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get sub() {
    return cssVar('--color-fg-sec', 'rgb(161, 161, 170)')
  },
  get mute() {
    return cssVar('--color-fg-muted', 'rgb(113, 113, 122)')
  },
  get accent() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get onAccent() {
    return cssVar('--color-bg', 'rgb(9, 9, 11)')
  },
  get waveformActive() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get waveformMuted() {
    return cssVar('--color-fg-muted', 'rgb(113, 113, 122)')
  },
  get meterNormal() {
    return cssVar('--color-fg-sec', 'rgb(161, 161, 170)')
  },
  get meterClip() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
}
