import { PlanId } from '../config/plans'
import { sanitizePlainText, validateAllowedUrl } from './validators'

export type BgType = 'solid' | 'gradient-linear' | 'gradient-radial' | 'image'
export type BgPattern = 'none' | 'dots' | 'lines' | 'grid' | 'noise'
export type AvatarShape = 'circle' | 'rounded' | 'squircle' | 'star' | 'hexagon'
export type AvatarBorderStyle = 'solid' | 'double' | 'dashed' | 'gradient' | 'spinning-ring'
export type ButtonShape = 'square' | 'rounded' | 'pill'
export type ButtonFillStyle = 'solid' | 'outline' | 'glass' | '3d' | 'offset'
export type CardShadowStyle = 'none' | 'soft' | 'neo-brutal' | 'glow' | 'animated-outline'
export type CardBorderStyle = 'solid' | 'dashed' | 'double' | 'gradient'
export type LayoutMode = 'list' | 'grid-2' | 'featured-large' | 'mixed'
export type SocialStyle = 'pill' | 'outline' | 'minimal' | 'solid'
export type AnimationPreset = 'none' | 'fade-up' | 'hover-lift' | 'pulse' | 'shake' | 'spin-icon'
export type ContentAlign = 'center' | 'left'

export interface FontPairSpec {
  id: string
  label: string
  headingFont: string
  bodyFont: string
  googleCssQuery: string
}

export const CURATED_FONT_PAIRS: FontPairSpec[] = [
  { id: 'inter', label: 'Inter + JetBrains Mono (Bawaan)', headingFont: 'Inter, system-ui, sans-serif', bodyFont: 'Inter, system-ui, sans-serif', googleCssQuery: '' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', headingFont: '"Plus Jakarta Sans", sans-serif', bodyFont: '"Plus Jakarta Sans", sans-serif', googleCssQuery: 'Plus+Jakarta+Sans:wght@500;700;800' },
  { id: 'space-grotesk', label: 'Space Grotesk + Inter', headingFont: '"Space Grotesk", sans-serif', bodyFont: 'Inter, sans-serif', googleCssQuery: 'Space+Grotesk:wght@600;700' },
  { id: 'syne', label: 'Syne + Plus Jakarta', headingFont: 'Syne, sans-serif', bodyFont: '"Plus Jakarta Sans", sans-serif', googleCssQuery: 'Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;600' },
  { id: 'playfair', label: 'Playfair Display + Inter', headingFont: '"Playfair Display", serif', bodyFont: 'Inter, sans-serif', googleCssQuery: 'Playfair+Display:wght@700;800' },
  { id: 'dm-serif', label: 'DM Serif + DM Sans', headingFont: '"DM Serif Display", serif', bodyFont: '"DM Sans", sans-serif', googleCssQuery: 'DM+Serif+Display&family=DM+Sans:wght@400;500;700' },
  { id: 'bricolage', label: 'Bricolage Grotesque', headingFont: '"Bricolage Grotesque", sans-serif', bodyFont: 'Inter, sans-serif', googleCssQuery: 'Bricolage+Grotesque:wght@600;800' },
  { id: 'outfit', label: 'Outfit Geometric', headingFont: 'Outfit, sans-serif', bodyFont: 'Outfit, sans-serif', googleCssQuery: 'Outfit:wght@500;700;800' },
  { id: 'sora', label: 'Sora Modern', headingFont: 'Sora, sans-serif', bodyFont: 'Sora, sans-serif', googleCssQuery: 'Sora:wght@500;700;800' },
  { id: 'archivo', label: 'Archivo Black + Inter', headingFont: '"Archivo Black", sans-serif', bodyFont: 'Inter, sans-serif', googleCssQuery: 'Archivo+Black' },
  { id: 'ibm-plex', label: 'IBM Plex Mono Editorial', headingFont: '"IBM Plex Mono", monospace', bodyFont: '"IBM Plex Sans", sans-serif', googleCssQuery: 'IBM+Plex+Mono:wght@600;700&family=IBM+Plex+Sans:wght@400;600' },
  { id: 'fraunces', label: 'Fraunces + Manrope', headingFont: 'Fraunces, serif', bodyFont: 'Manrope, sans-serif', googleCssQuery: 'Fraunces:wght@700;800&family=Manrope:wght@400;600' },
]

export interface ProfileThemeConfig {
  presetId: string
  bgType: BgType
  bgColor: string
  bgGradFrom: string
  bgGradVia: string
  bgGradTo: string
  bgGradAngle: number
  bgPattern: BgPattern
  bgImageUrl: string | null
  bgOverlayOpacity: number // 0..80
  bgBlurPx: number // 0..20
  bgAnimated: boolean
  textColor: string
  textSecColor: string
  cardBgColor: string
  cardTextColor: string
  borderColor: string
  accentColor: string
  avatarShape: AvatarShape
  avatarBorderStyle: AvatarBorderStyle
  avatarBorderWidth: number // 0..6
  buttonShape: ButtonShape
  buttonFillStyle: ButtonFillStyle
  cardBorderStyle: CardBorderStyle
  cardBorderWidth: number // 0..4
  cardShadowStyle: CardShadowStyle
  cardGapPx: number // 8..24
  contentMaxWidthPx: number // 440..720
  contentAlign: ContentAlign
  fontPairId: string
  titleSizePx: number // 20..34
  titleTrackingEm: number // -0.04..0.04
  layoutMode: LayoutMode
  socialStyle: SocialStyle
  animationPreset: AnimationPreset
  animationsEnabled: boolean
  confettiOnFeatured: boolean
}

export interface ProfileSettings {
  hideLuvenBranding: boolean
  sensitiveContentGate: boolean
  seoTitle: string
  seoDescription: string
  customOgImageUrl: string | null
  qrFgColor: string
  qrBgColor: string
  qrIncludeLogo: boolean
}

export interface ThemePresetDefinition {
  id: string
  name: string
  group: 'free' | 'monokrom' | 'gelap' | 'terang' | 'pastel' | 'vivid' | 'retro'
  proOnly: boolean
  theme: ProfileThemeConfig
}

export const DEFAULT_FREE_THEME: ProfileThemeConfig = {
  presetId: 'free-obsidian',
  bgType: 'solid',
  bgColor: '#0A0A0A',
  bgGradFrom: '#0A0A0A',
  bgGradVia: '#141414',
  bgGradTo: '#1E1E1E',
  bgGradAngle: 145,
  bgPattern: 'none',
  bgImageUrl: null,
  bgOverlayOpacity: 45,
  bgBlurPx: 0,
  bgAnimated: false,
  textColor: '#FAFAFA',
  textSecColor: '#A3A3A3',
  cardBgColor: '#141414',
  cardTextColor: '#FAFAFA',
  borderColor: '#262626',
  accentColor: '#FAFAFA',
  avatarShape: 'circle',
  avatarBorderStyle: 'solid',
  avatarBorderWidth: 2,
  buttonShape: 'rounded',
  buttonFillStyle: 'solid',
  cardBorderStyle: 'solid',
  cardBorderWidth: 1,
  cardShadowStyle: 'none',
  cardGapPx: 12,
  contentMaxWidthPx: 540,
  contentAlign: 'center',
  fontPairId: 'inter',
  titleSizePx: 24,
  titleTrackingEm: -0.03,
  layoutMode: 'list',
  socialStyle: 'outline',
  animationPreset: 'none',
  animationsEnabled: false,
  confettiOnFeatured: false,
}

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  hideLuvenBranding: false,
  sensitiveContentGate: false,
  seoTitle: '',
  seoDescription: '',
  customOgImageUrl: null,
  qrFgColor: '#0A0A0A',
  qrBgColor: '#FAFAFA',
  qrIncludeLogo: false,
}

function makePreset(
  id: string,
  name: string,
  group: ThemePresetDefinition['group'],
  proOnly: boolean,
  overrides: Partial<ProfileThemeConfig>
): ThemePresetDefinition {
  return {
    id,
    name,
    group,
    proOnly,
    theme: { ...DEFAULT_FREE_THEME, presetId: id, ...overrides },
  }
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  // 3 FREE Monochrome Presets
  makePreset('free-obsidian', 'Obsidian Dark', 'free', false, {}),
  makePreset('free-paper', 'Paper Light', 'free', false, {
    bgColor: '#FFFFFF',
    textColor: '#0A0A0A',
    textSecColor: '#525252',
    cardBgColor: '#F5F5F5',
    cardTextColor: '#0A0A0A',
    borderColor: '#E5E5E5',
    accentColor: '#0A0A0A',
  }),
  makePreset('free-slate', 'Graphite Minimal', 'free', false, {
    bgColor: '#141414',
    textColor: '#FAFAFA',
    textSecColor: '#A3A3A3',
    cardBgColor: '#1E1E1E',
    cardTextColor: '#FAFAFA',
    borderColor: '#3A3A3A',
    accentColor: '#FAFAFA',
    buttonShape: 'pill',
  }),

  // 21+ PRO Presets
  makePreset('pro-noir-grid', 'Noir Studio Grid', 'monokrom', true, {
    bgPattern: 'grid',
    cardShadowStyle: 'neo-brutal',
    buttonShape: 'square',
    fontPairId: 'space-grotesk',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-editorial-serif', 'Editorial Serif', 'monokrom', true, {
    bgColor: '#F8F7F4',
    textColor: '#111111',
    textSecColor: '#555555',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#111111',
    borderColor: '#111111',
    accentColor: '#111111',
    fontPairId: 'playfair',
    buttonShape: 'square',
    cardShadowStyle: 'neo-brutal',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-acid-lime', 'Acid Hardware', 'vivid', true, {
    bgColor: '#0B0D08',
    textColor: '#F7FEE7',
    textSecColor: '#A3B18A',
    cardBgColor: '#14180F',
    cardTextColor: '#F7FEE7',
    borderColor: '#BEF264',
    accentColor: '#BEF264',
    fontPairId: 'space-grotesk',
    avatarBorderStyle: 'spinning-ring',
    cardShadowStyle: 'neo-brutal',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-cobalt-punch', 'Cobalt Studio', 'vivid', true, {
    bgType: 'gradient-linear',
    bgGradFrom: '#0B132B',
    bgGradVia: '#1C2541',
    bgGradTo: '#102542',
    bgGradAngle: 135,
    textColor: '#F8FAFC',
    textSecColor: '#94A3B8',
    cardBgColor: '#1E293B',
    cardTextColor: '#F8FAFC',
    borderColor: '#38BDF8',
    accentColor: '#38BDF8',
    buttonShape: 'pill',
    cardShadowStyle: 'soft',
    fontPairId: 'outfit',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-crimson-velvet', 'Crimson Velvet', 'gelap', true, {
    bgType: 'gradient-radial',
    bgGradFrom: '#2B0912',
    bgGradVia: '#17060B',
    bgGradTo: '#0A0406',
    textColor: '#FFF1F2',
    textSecColor: '#FDA4AF',
    cardBgColor: '#230A11',
    cardTextColor: '#FFF1F2',
    borderColor: '#FB7185',
    accentColor: '#FB7185',
    fontPairId: 'syne',
    avatarShape: 'squircle',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-matcha-cream', 'Matcha Cream', 'pastel', true, {
    bgColor: '#F3F7F0',
    textColor: '#1B2A1E',
    textSecColor: '#4A6350',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#1B2A1E',
    borderColor: '#A7C4A0',
    accentColor: '#3D6B4B',
    fontPairId: 'plus-jakarta',
    buttonShape: 'pill',
    cardShadowStyle: 'soft',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-peach-milk', 'Peach Sorbet', 'pastel', true, {
    bgType: 'gradient-linear',
    bgGradFrom: '#FFF5F0',
    bgGradVia: '#FFE8DC',
    bgGradTo: '#FFD8C7',
    bgGradAngle: 160,
    textColor: '#3A1F16',
    textSecColor: '#7C4D3A',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#3A1F16',
    borderColor: '#FDBA74',
    accentColor: '#EA580C',
    buttonShape: 'pill',
    fontPairId: 'outfit',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-lavender-mist', 'Lavender Mist', 'pastel', true, {
    bgType: 'gradient-linear',
    bgGradFrom: '#F5F3FF',
    bgGradVia: '#EDE9FE',
    bgGradTo: '#E0E7FF',
    bgGradAngle: 140,
    textColor: '#1E1B4B',
    textSecColor: '#4338CA',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#1E1B4B',
    borderColor: '#C4B5FD',
    accentColor: '#6D28D9',
    buttonShape: 'rounded',
    fontPairId: 'sora',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-sky-cloud', 'Sky Blueprint', 'pastel', true, {
    bgColor: '#EFF6FF',
    bgPattern: 'dots',
    textColor: '#0F172A',
    textSecColor: '#334155',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#0F172A',
    borderColor: '#93C5FD',
    accentColor: '#0284C7',
    buttonShape: 'rounded',
    cardShadowStyle: 'neo-brutal',
    fontPairId: 'bricolage',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-retro-crt', 'Retro Terminal', 'retro', true, {
    bgColor: '#07130B',
    bgPattern: 'lines',
    textColor: '#4ADE80',
    textSecColor: '#22C55E',
    cardBgColor: '#0C1F13',
    cardTextColor: '#4ADE80',
    borderColor: '#22C55E',
    accentColor: '#4ADE80',
    fontPairId: 'ibm-plex',
    buttonShape: 'square',
    cardBorderStyle: 'dashed',
    animationsEnabled: true,
    animationPreset: 'pulse',
  }),
  makePreset('pro-warm-paper', 'Warm Zine 90s', 'retro', true, {
    bgColor: '#F4EFE6',
    bgPattern: 'noise',
    textColor: '#1F1A17',
    textSecColor: '#6E5F55',
    cardBgColor: '#FFFDF9',
    cardTextColor: '#1F1A17',
    borderColor: '#1F1A17',
    accentColor: '#D97706',
    buttonShape: 'square',
    cardBorderWidth: 2,
    cardShadowStyle: 'neo-brutal',
    fontPairId: 'fraunces',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-sunset-tape', 'Sunset Cassette', 'retro', true, {
    bgType: 'gradient-linear',
    bgGradFrom: '#2D142C',
    bgGradVia: '#510A32',
    bgGradTo: '#801336',
    bgGradAngle: 150,
    textColor: '#FFFBEB',
    textSecColor: '#FDE68A',
    cardBgColor: '#3B112B',
    cardTextColor: '#FFFBEB',
    borderColor: '#F59E0B',
    accentColor: '#FBBF24',
    fontPairId: 'archivo',
    buttonShape: 'rounded',
    cardShadowStyle: 'neo-brutal',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-emerald-night', 'Emerald Night', 'gelap', true, {
    bgColor: '#041410',
    textColor: '#ECFDF5',
    textSecColor: '#6EE7B7',
    cardBgColor: '#08221B',
    cardTextColor: '#ECFDF5',
    borderColor: '#10B981',
    accentColor: '#34D399',
    fontPairId: 'sora',
    avatarBorderStyle: 'gradient',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-amber-forge', 'Amber Studio', 'gelap', true, {
    bgColor: '#120E09',
    bgPattern: 'dots',
    textColor: '#FEF3C7',
    textSecColor: '#FCD34D',
    cardBgColor: '#1D160E',
    cardTextColor: '#FEF3C7',
    borderColor: '#D97706',
    accentColor: '#F59E0B',
    fontPairId: 'space-grotesk',
    buttonShape: 'rounded',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-electric-orange', 'Tangerine Pop', 'vivid', true, {
    bgColor: '#FFF7ED',
    textColor: '#1C1917',
    textSecColor: '#57534E',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#1C1917',
    borderColor: '#1C1917',
    accentColor: '#F97316',
    cardBorderWidth: 2,
    cardShadowStyle: 'neo-brutal',
    fontPairId: 'bricolage',
    buttonShape: 'pill',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-cyan-glass', 'Arctic Glass', 'terang', true, {
    bgType: 'gradient-linear',
    bgGradFrom: '#ECFEFF',
    bgGradVia: '#E0F2FE',
    bgGradTo: '#F0F9FF',
    bgGradAngle: 120,
    textColor: '#082F49',
    textSecColor: '#0369A1',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#082F49',
    borderColor: '#7DD3FC',
    accentColor: '#0284C7',
    buttonFillStyle: 'glass',
    fontPairId: 'plus-jakarta',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-sand-minimal', 'Sandstone Calm', 'terang', true, {
    bgColor: '#EFECE6',
    textColor: '#1C1917',
    textSecColor: '#57534E',
    cardBgColor: '#FAF8F5',
    cardTextColor: '#1C1917',
    borderColor: '#D6D3CD',
    accentColor: '#292524',
    fontPairId: 'dm-serif',
    buttonShape: 'rounded',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-midnight-grid', 'Midnight Matrix', 'gelap', true, {
    bgColor: '#060A14',
    bgPattern: 'grid',
    textColor: '#F1F5F9',
    textSecColor: '#94A3B8',
    cardBgColor: '#0F172A',
    cardTextColor: '#F1F5F9',
    borderColor: '#334155',
    accentColor: '#E2E8F0',
    fontPairId: 'ibm-plex',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-mint-brutal', 'Mint Neo-Brutal', 'vivid', true, {
    bgColor: '#D1FAE5',
    textColor: '#064E3B',
    textSecColor: '#065F46',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#064E3B',
    borderColor: '#064E3B',
    accentColor: '#059669',
    cardBorderWidth: 2,
    cardShadowStyle: 'neo-brutal',
    fontPairId: 'space-grotesk',
    buttonShape: 'square',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-rose-brutal', 'Coral Zine', 'vivid', true, {
    bgColor: '#FFE4E6',
    textColor: '#4C0519',
    textSecColor: '#881337',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#4C0519',
    borderColor: '#4C0519',
    accentColor: '#E11D48',
    cardBorderWidth: 2,
    cardShadowStyle: 'neo-brutal',
    fontPairId: 'archivo',
    buttonShape: 'rounded',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
  makePreset('pro-gold-obsidian', 'Gold Edition', 'gelap', true, {
    bgColor: '#0B0A08',
    bgPattern: 'noise',
    textColor: '#FEF9C3',
    textSecColor: '#CA8A04',
    cardBgColor: '#16130E',
    cardTextColor: '#FEF9C3',
    borderColor: '#EAB308',
    accentColor: '#FACC15',
    fontPairId: 'playfair',
    avatarBorderStyle: 'double',
    animationsEnabled: true,
    animationPreset: 'fade-up',
  }),
  makePreset('pro-star-pop', 'Creator Grid 2-Col', 'terang', true, {
    bgColor: '#FAFAFA',
    bgPattern: 'dots',
    textColor: '#09090B',
    textSecColor: '#52525B',
    cardBgColor: '#FFFFFF',
    cardTextColor: '#09090B',
    borderColor: '#18181B',
    accentColor: '#18181B',
    layoutMode: 'grid-2',
    avatarShape: 'star',
    cardBorderWidth: 1,
    cardShadowStyle: 'soft',
    fontPairId: 'outfit',
    animationsEnabled: true,
    animationPreset: 'hover-lift',
  }),
]

export function getEffectivePlan(
  plan: PlanId | string | null | undefined,
  expiresAt: string | null | undefined
): PlanId {
  if (plan !== 'pro') return 'free'
  if (expiresAt) {
    const expMs = Date.parse(expiresAt)
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      return 'free'
    }
  }
  return 'pro'
}

export function sanitizeHexColor(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback
  const clean = raw.trim().toUpperCase()
  return /^#[0-9A-F]{6}$/.test(clean) ? clean : fallback
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function pickEnum<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val)
    ? (val as T)
    : fallback
}

const VALID_FONT_IDS = CURATED_FONT_PAIRS.map((f) => f.id)

export function sanitizeProfileTheme(
  raw: unknown,
  effectivePlan: PlanId
): ProfileThemeConfig {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProfileThemeConfig>
  const presetMatch = THEME_PRESETS.find((p) => p.id === input.presetId)

  if (effectivePlan === 'free') {
    // Only allow the 3 FREE monochrome presets on FREE plan
    const freePreset = presetMatch && !presetMatch.proOnly ? presetMatch : THEME_PRESETS[0]
    return { ...freePreset.theme }
  }

  const base = presetMatch ? presetMatch.theme : DEFAULT_FREE_THEME
  let bgImageUrl: string | null = null
  if (typeof input.bgImageUrl === 'string' && input.bgImageUrl.trim()) {
    if (input.bgImageUrl.startsWith('data:image/webp;base64,')) {
      bgImageUrl = input.bgImageUrl
    } else {
      const check = validateAllowedUrl(input.bgImageUrl, 'website', false)
      if (check.ok) bgImageUrl = check.clean
    }
  }

  return {
    presetId: presetMatch ? presetMatch.id : typeof input.presetId === 'string' ? input.presetId.slice(0, 40) : base.presetId,
    bgType: pickEnum(input.bgType, ['solid', 'gradient-linear', 'gradient-radial', 'image'] as const, base.bgType),
    bgColor: sanitizeHexColor(input.bgColor, base.bgColor),
    bgGradFrom: sanitizeHexColor(input.bgGradFrom, base.bgGradFrom),
    bgGradVia: sanitizeHexColor(input.bgGradVia, base.bgGradVia),
    bgGradTo: sanitizeHexColor(input.bgGradTo, base.bgGradTo),
    bgGradAngle: Math.round(clampNum(input.bgGradAngle, 0, 360, base.bgGradAngle)),
    bgPattern: pickEnum(input.bgPattern, ['none', 'dots', 'lines', 'grid', 'noise'] as const, base.bgPattern),
    bgImageUrl,
    bgOverlayOpacity: Math.round(clampNum(input.bgOverlayOpacity, 0, 80, base.bgOverlayOpacity)),
    bgBlurPx: Math.round(clampNum(input.bgBlurPx, 0, 20, base.bgBlurPx)),
    bgAnimated: Boolean(input.bgAnimated),
    textColor: sanitizeHexColor(input.textColor, base.textColor),
    textSecColor: sanitizeHexColor(input.textSecColor, base.textSecColor),
    cardBgColor: sanitizeHexColor(input.cardBgColor, base.cardBgColor),
    cardTextColor: sanitizeHexColor(input.cardTextColor, base.cardTextColor),
    borderColor: sanitizeHexColor(input.borderColor, base.borderColor),
    accentColor: sanitizeHexColor(input.accentColor, base.accentColor),
    avatarShape: pickEnum(input.avatarShape, ['circle', 'rounded', 'squircle', 'star', 'hexagon'] as const, base.avatarShape),
    avatarBorderStyle: pickEnum(input.avatarBorderStyle, ['solid', 'double', 'dashed', 'gradient', 'spinning-ring'] as const, base.avatarBorderStyle),
    avatarBorderWidth: Math.round(clampNum(input.avatarBorderWidth, 0, 6, base.avatarBorderWidth)),
    buttonShape: pickEnum(input.buttonShape, ['square', 'rounded', 'pill'] as const, base.buttonShape),
    buttonFillStyle: pickEnum(input.buttonFillStyle, ['solid', 'outline', 'glass', '3d', 'offset'] as const, base.buttonFillStyle),
    cardBorderStyle: pickEnum(input.cardBorderStyle, ['solid', 'dashed', 'double', 'gradient'] as const, base.cardBorderStyle),
    cardBorderWidth: Math.round(clampNum(input.cardBorderWidth, 0, 4, base.cardBorderWidth)),
    cardShadowStyle: pickEnum(input.cardShadowStyle, ['none', 'soft', 'neo-brutal', 'glow', 'animated-outline'] as const, base.cardShadowStyle),
    cardGapPx: Math.round(clampNum(input.cardGapPx, 8, 24, base.cardGapPx)),
    contentMaxWidthPx: Math.round(clampNum(input.contentMaxWidthPx, 440, 720, base.contentMaxWidthPx)),
    contentAlign: pickEnum(input.contentAlign, ['center', 'left'] as const, base.contentAlign),
    fontPairId: pickEnum(input.fontPairId, VALID_FONT_IDS, base.fontPairId),
    titleSizePx: Math.round(clampNum(input.titleSizePx, 20, 34, base.titleSizePx)),
    titleTrackingEm: Number(clampNum(input.titleTrackingEm, -0.04, 0.04, base.titleTrackingEm).toFixed(3)),
    layoutMode: pickEnum(input.layoutMode, ['list', 'grid-2', 'featured-large', 'mixed'] as const, base.layoutMode),
    socialStyle: pickEnum(input.socialStyle, ['pill', 'outline', 'minimal', 'solid'] as const, base.socialStyle),
    animationPreset: pickEnum(input.animationPreset, ['none', 'fade-up', 'hover-lift', 'pulse', 'shake', 'spin-icon'] as const, base.animationPreset),
    animationsEnabled: input.animationsEnabled !== undefined ? Boolean(input.animationsEnabled) : base.animationsEnabled,
    confettiOnFeatured: Boolean(input.confettiOnFeatured),
  }
}

export function sanitizeProfileSettings(raw: unknown, effectivePlan: PlanId): ProfileSettings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Partial<ProfileSettings>
  if (effectivePlan === 'free') {
    return { ...DEFAULT_PROFILE_SETTINGS }
  }
  let customOgImageUrl: string | null = null
  if (typeof input.customOgImageUrl === 'string' && input.customOgImageUrl.trim()) {
    if (input.customOgImageUrl.startsWith('data:image/webp;base64,')) {
      customOgImageUrl = input.customOgImageUrl
    } else {
      const chk = validateAllowedUrl(input.customOgImageUrl, 'website', false)
      if (chk.ok) customOgImageUrl = chk.clean
    }
  }
  return {
    hideLuvenBranding: Boolean(input.hideLuvenBranding),
    sensitiveContentGate: Boolean(input.sensitiveContentGate),
    seoTitle: sanitizePlainText(input.seoTitle || '', 70),
    seoDescription: sanitizePlainText(input.seoDescription || '', 160),
    customOgImageUrl,
    qrFgColor: sanitizeHexColor(input.qrFgColor, '#0A0A0A'),
    qrBgColor: sanitizeHexColor(input.qrBgColor, '#FAFAFA'),
    qrIncludeLogo: Boolean(input.qrIncludeLogo),
  }
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(sanitizeHexColor(hexA, '#0A0A0A'))
  const l2 = relativeLuminance(sanitizeHexColor(hexB, '#FAFAFA'))
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

export function suggestAccessibleTextColor(bgHex: string): string {
  const lum = relativeLuminance(sanitizeHexColor(bgHex, '#0A0A0A'))
  return lum > 0.179 ? '#0A0A0A' : '#FAFAFA'
}
