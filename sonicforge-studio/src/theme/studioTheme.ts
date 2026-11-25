/**
 * Centralized monochrome palette tokens for the Luven Studio Editor
 * Mirrors @theme CSS custom properties in src/index.css so canvas & DOM stay in sync.
 */
export const STUDIO_THEME = {
  base: '#09090B',
  panel: '#111114',
  raised: '#18181C',
  line: '#27272A',
  ink: '#FAFAFA',
  sub: '#A1A1AA',
  mute: '#71717A',
  accent: '#FAFAFA',
  waveformActive: '#E4E4E7',
  waveformMuted: '#52525B',
  meterNormal: '#A1A1AA',
  meterClip: '#FFFFFF',
} as const
