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
    return cssVar('--color-bg', 'rgb(10, 10, 10)')
  },
  get panel() {
    return cssVar('--color-surface', 'rgb(17, 17, 17)')
  },
  get raised() {
    return cssVar('--color-elevated', 'rgb(26, 26, 26)')
  },
  get line() {
    return cssVar('--color-edge', 'rgb(38, 38, 38)')
  },
  get ink() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get sub() {
    return cssVar('--color-fg-sec', 'rgb(163, 163, 163)')
  },
  get mute() {
    return cssVar('--color-fg-muted', 'rgb(115, 115, 115)')
  },
  get accent() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get onAccent() {
    return cssVar('--color-bg', 'rgb(10, 10, 10)')
  },
  get waveformActive() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
  get waveformMuted() {
    return cssVar('--color-fg-muted', 'rgb(115, 115, 115)')
  },
  get meterNormal() {
    return cssVar('--color-fg-sec', 'rgb(163, 163, 163)')
  },
  get meterClip() {
    return cssVar('--color-fg', 'rgb(250, 250, 250)')
  },
}
