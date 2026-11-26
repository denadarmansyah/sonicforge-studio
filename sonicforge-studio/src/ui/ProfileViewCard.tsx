import { CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowUpRight,
  ChevronDown,
  Disc3,
  ExternalLink,
  Flag,
  Globe,
  Link2,
  Megaphone,
  MessageCircle,
  Music2,
  Share2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import {
  CURATED_FONT_PAIRS,
  getEffectivePlan,
  ProfileThemeConfig,
  sanitizeProfileSettings,
  sanitizeProfileTheme,
} from '../lib/themeConfig'
import { AnalyticsEventType, CreatorTemplate, LinkItem, Profile } from '../lib/types'
import { extractTikTokEmbedUrl, extractYouTubeEmbedUrl } from '../lib/validators'
import {
  CapCutGlyph,
  InstagramGlyph,
  TikTokGlyph,
  VerifiedBadgeIcon,
  YouTubeGlyph,
} from './BrandIcons'
import { Logo } from './Logo'
import {
  Avatar,
  Badge,
  Button,
  EASE_SMOOTH,
  IconButton,
  Modal,
  ProgressiveImage,
  UnstyledButton,
} from './primitives'

export function TemplateCard({
  template,
  showCreator = false,
  onSelect,
  onCapcutClick,
}: {
  template: CreatorTemplate
  showCreator?: boolean
  onSelect?: (t: CreatorTemplate) => void
  onCapcutClick?: (t: CreatorTemplate) => void
}) {
  const reduce = useReducedMotion()

  return (
    <motion.article
      layoutId={reduce ? undefined : `tpl-card-${template.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-surface transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-fg-muted"
    >
      <UnstyledButton
        onClick={() => onSelect?.(template)}
        aria-label={`Lihat detail template ${template.title}`}
        className="relative block w-full border-0 bg-transparent p-0 text-left"
      >
        <ProgressiveImage
          src={template.thumbnail_url}
          alt={`Thumbnail template ${template.title}`}
          ratio="4:5"
          fallbackLabel="TEMPLATE 4:5"
          colorOnHover
        />
        {template.song_title && (
          <span className="absolute bottom-2.5 left-2.5 right-2.5 inline-flex max-w-[calc(100%-20px)] items-center gap-1.5 rounded-lg border border-edge bg-bg/90 px-2.5 py-1 font-mono text-[11px] text-fg backdrop-blur-xs">
            <Music2 size={12} className="shrink-0 text-accent" />
            <span className="truncate">{template.song_title}</span>
          </span>
        )}
      </UnstyledButton>

      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div>
          {showCreator && template.owner && (
            <Link
              to={`/@${template.owner.username}`}
              className="mb-1.5 inline-flex min-h-11 items-center gap-2 text-[12.5px] text-fg-sec no-underline [@media(hover:hover)]:hover:text-fg"
            >
              <Avatar src={template.owner.avatar_url} name={template.owner.display_name} size="sm" className="!h-6 !w-6 !text-[10px]" />
              <span className="truncate font-medium">@{template.owner.username}</span>
              {template.owner.is_verified && <VerifiedBadgeIcon size={13} />}
            </Link>
          )}

          <h3 className="m-0 text-[14px] sm:text-[15px] font-semibold leading-snug tracking-[-0.01em] text-fg">
            <UnstyledButton
              onClick={() => onSelect?.(template)}
              className="inline-flex min-h-11 w-full items-start border-0 bg-transparent p-0 text-left text-inherit"
            >
              <span className="line-clamp-2">{template.title}</span>
            </UnstyledButton>
          </h3>

          {template.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {template.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-edge bg-elevated px-2 py-0.5 font-mono text-[10.5px] text-fg-sec"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <a
          href={template.capcut_url}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          onClick={() => onCapcutClick?.(template)}
          className="mt-3 sm:mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 sm:gap-2 rounded-xl border border-accent bg-accent px-2.5 sm:px-4 text-[12px] sm:text-[13.5px] font-semibold text-on-accent no-underline transition-colors duration-150 active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CapCutGlyph size={14} />
          <span className="truncate">Pakai di CapCut</span>
          <ArrowUpRight size={14} className="shrink-0" />
        </a>
      </div>
    </motion.article>
  )
}

export function TemplateDetailModal({
  template,
  onClose,
  onTrackEvent,
  onReportTemplate,
}: {
  template: CreatorTemplate | null
  onClose: () => void
  onTrackEvent?: (type: AnalyticsEventType, templateId: string) => void
  onReportTemplate?: (t: CreatorTemplate) => void
}) {
  if (!template) return null
  return (
    <Modal
      open={Boolean(template)}
      onClose={onClose}
      title={template.title}
      description={template.owner ? `Oleh @${template.owner.username}` : undefined}
      maxWidth="max-w-[540px]"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[190px_1fr]">
        <div className="overflow-hidden rounded-xl border border-edge">
          <ProgressiveImage
            src={template.thumbnail_url}
            alt={`Pratinjau ${template.title}`}
            ratio="4:5"
          />
        </div>

        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-3">
            {template.description ? (
              <p className="m-0 text-[14px] leading-relaxed text-fg-sec">{template.description}</p>
            ) : (
              <p className="m-0 text-[13.5px] text-fg-sec">
                Ketuk tombol di bawah untuk membuka template ini langsung di aplikasi CapCut.
              </p>
            )}

            {template.song_title && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-edge bg-elevated px-3 py-1.5 font-mono text-[12px] text-fg">
                <Disc3 size={14} className="text-accent" />
                <span>{template.song_title}</span>
              </div>
            )}

            {template.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <Badge key={tag}>#{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-2">
            <a
              href={template.capcut_url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              onClick={() => onTrackEvent?.('capcut_click', template.id)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-on-accent no-underline transition-colors [@media(hover:hover)]:hover:bg-accent-hover"
            >
              <CapCutGlyph size={16} />
              <span>Pakai di CapCut</span>
              <ArrowUpRight size={15} />
            </a>

            {template.tiktok_url && (
              <a
                href={template.tiktok_url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                onClick={() => onTrackEvent?.('tiktok_click', template.id)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-edge bg-elevated px-4 text-[13.5px] font-medium text-fg no-underline transition-colors [@media(hover:hover)]:hover:border-fg-sec"
              >
                <TikTokGlyph size={15} />
                <span>Lihat Contoh Video di TikTok</span>
                <ExternalLink size={14} />
              </a>
            )}

            {onReportTemplate && (
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => {
                  onClose()
                  onReportTemplate(template)
                }}
              >
                <Flag size={13} />
                <span>Laporkan template ini</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function buildPatternStyle(theme: ProfileThemeConfig): CSSProperties {
  if (theme.bgPattern === 'dots') {
    return {
      backgroundImage: `radial-gradient(${theme.borderColor} 1px, transparent 1px)`,
      backgroundSize: '18px 18px',
    }
  }
  if (theme.bgPattern === 'lines') {
    return {
      backgroundImage: `repeating-linear-gradient(0deg, ${theme.borderColor}33 0px, ${theme.borderColor}33 1px, transparent 1px, transparent 10px)`,
    }
  }
  if (theme.bgPattern === 'grid') {
    return {
      backgroundImage: `linear-gradient(to right, ${theme.borderColor}44 1px, transparent 1px), linear-gradient(to bottom, ${theme.borderColor}44 1px, transparent 1px)`,
      backgroundSize: '28px 28px',
    }
  }
  if (theme.bgPattern === 'noise') {
    return {
      backgroundImage: `radial-gradient(${theme.textSecColor}18 1px, transparent 0)`,
      backgroundSize: '6px 6px',
    }
  }
  return {}
}

function buildBackgroundStyle(theme: ProfileThemeConfig): CSSProperties {
  if (theme.bgType === 'gradient-linear') {
    return {
      backgroundColor: theme.bgGradFrom,
      backgroundImage: `linear-gradient(${theme.bgGradAngle}deg, ${theme.bgGradFrom}, ${theme.bgGradVia}, ${theme.bgGradTo})`,
    }
  }
  if (theme.bgType === 'gradient-radial') {
    return {
      backgroundColor: theme.bgGradFrom,
      backgroundImage: `radial-gradient(circle at 50% 20%, ${theme.bgGradFrom}, ${theme.bgGradVia}, ${theme.bgGradTo})`,
    }
  }
  return { backgroundColor: theme.bgColor }
}

function getAvatarClipStyle(shape: ProfileThemeConfig['avatarShape']): CSSProperties {
  switch (shape) {
    case 'rounded':
      return { borderRadius: '18px' }
    case 'squircle':
      return { borderRadius: '30%' }
    case 'hexagon':
      return { clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }
    case 'star':
      return {
        clipPath:
          'polygon(50% 0%, 62% 32%, 98% 35%, 70% 57%, 79% 92%, 50% 72%, 21% 92%, 30% 57%, 2% 35%, 38% 32%)',
      }
    default:
      return { borderRadius: '9999px' }
  }
}

function LinkIcon({ type }: { type: LinkItem['type'] }) {
  switch (type) {
    case 'capcut':
      return <CapCutGlyph size={16} />
    case 'tiktok':
    case 'embed_tiktok':
      return <TikTokGlyph size={16} />
    case 'youtube':
    case 'embed_youtube':
      return <YouTubeGlyph size={16} />
    case 'instagram':
      return <InstagramGlyph size={16} />
    case 'whatsapp':
      return <MessageCircle size={16} />
    case 'announcement':
      return <Megaphone size={16} />
    case 'website':
      return <Globe size={16} />
    default:
      return <Link2 size={16} />
  }
}

/**
 * Core Link-in-Bio Public Profile Renderer.
 * Enforces FREE vs PRO capabilities cleanly, zero user raw CSS/HTML,
 * and supports both full-page /@username view and compact Dashboard/Home preview.
 */
export function PublicProfileRenderer({
  profile,
  templates,
  links = [],
  previewBadge,
  compactPreview = false,
  fullPage = false,
  onShare,
  onReportProfile,
  onReportTemplate,
  onTrackEvent,
}: {
  profile: Profile
  templates: CreatorTemplate[]
  links?: LinkItem[]
  previewBadge?: string
  compactPreview?: boolean
  fullPage?: boolean
  onShare?: () => void
  onReportProfile?: () => void
  onReportTemplate?: (t: CreatorTemplate) => void
  onTrackEvent?: (type: AnalyticsEventType, templateId?: string, linkId?: string) => void
}) {
  const reduce = useReducedMotion()
  const [selectedTpl, setSelectedTpl] = useState<CreatorTemplate | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [confettiId, setConfettiId] = useState<string | null>(null)

  const effPlan = getEffectivePlan(profile.plan, profile.plan_expires_at)
  const theme = sanitizeProfileTheme(profile.theme, effPlan)
  const settings = sanitizeProfileSettings(profile.settings, effPlan)

  const [gateAccepted, setGateAccepted] = useState(!settings.sensitiveContentGate)
  useEffect(() => {
    setGateAccepted(!settings.sensitiveContentGate)
  }, [settings.sensitiveContentGate, profile.id])

  const fontPair = CURATED_FONT_PAIRS.find((f) => f.id === theme.fontPairId) || CURATED_FONT_PAIRS[0]

  // Dynamically load curated Google Font only when PRO profile uses non-default font
  useEffect(() => {
    if (effPlan !== 'pro' || !fontPair.googleCssQuery) return
    const id = `luven-font-${fontPair.id}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${fontPair.googleCssQuery}&display=swap`
    document.head.appendChild(link)
  }, [effPlan, fontPair.id, fontPair.googleCssQuery])

  const useAnim = effPlan === 'pro' && theme.animationsEnabled && !reduce && theme.animationPreset !== 'none'
  const showLuvenBranding = effPlan === 'free' || !settings.hideLuvenBranding

  const btnRadius =
    theme.buttonShape === 'pill'
      ? '9999px'
      : theme.buttonShape === 'square'
      ? '4px'
      : '14px'

  const getCardStyle = (featured: boolean): CSSProperties => {
    const base: CSSProperties = {
      borderRadius: btnRadius,
      color: theme.cardTextColor,
      borderColor: featured ? theme.accentColor : theme.borderColor,
      borderWidth: `${theme.cardBorderWidth}px`,
      borderStyle:
        theme.cardBorderStyle === 'dashed'
          ? 'dashed'
          : theme.cardBorderStyle === 'double'
          ? 'double'
          : 'solid',
    }
    if (theme.buttonFillStyle === 'outline') {
      base.backgroundColor = 'transparent'
      base.color = theme.textColor
    } else if (theme.buttonFillStyle === 'glass') {
      base.backgroundColor = `${theme.cardBgColor}B3`
      base.backdropFilter = 'blur(10px)'
    } else {
      base.backgroundColor = theme.cardBgColor
    }

    if (theme.cardShadowStyle === 'neo-brutal' || theme.buttonFillStyle === 'offset') {
      base.boxShadow = `4px 4px 0px ${theme.borderColor}`
    } else if (theme.buttonFillStyle === '3d') {
      base.boxShadow = `0 4px 0 ${theme.borderColor}`
    } else if (theme.cardShadowStyle === 'soft') {
      base.boxShadow = '0 6px 20px rgba(0,0,0,0.18)'
    } else if (theme.cardShadowStyle === 'glow' || (featured && effPlan === 'pro')) {
      base.boxShadow = `0 0 0 1px ${theme.accentColor}, 0 8px 24px ${theme.accentColor}28`
    }
    return base
  }

  const handleSelectTpl = (t: CreatorTemplate) => {
    if (compactPreview) return
    onTrackEvent?.('template_view', t.id)
    setSelectedTpl(t)
  }

  const handleLinkClick = (item: LinkItem) => {
    if (compactPreview) return
    const evType: AnalyticsEventType =
      item.type === 'capcut'
        ? 'capcut_click'
        : item.type === 'tiktok'
        ? 'tiktok_click'
        : 'link_click'
    onTrackEvent?.(evType, undefined, item.id)
    if (effPlan === 'pro' && item.is_featured && theme.confettiOnFeatured && !reduce) {
      setConfettiId(item.id)
      window.setTimeout(() => setConfettiId(null), 900)
    }
  }

  // Group links under headings for PRO collapsible groups
  const isHiddenByGroup = (item: LinkItem) => {
    if (effPlan !== 'pro' || !item.group_id) return false
    return Boolean(collapsedGroups[item.group_id])
  }

  const avatarClip = getAvatarClipStyle(theme.avatarShape)
  const containerWidth = compactPreview ? '100%' : `${theme.contentMaxWidthPx}px`

  const outerBgStyle: CSSProperties = {
    ...buildBackgroundStyle(theme),
    color: theme.textColor,
    fontFamily: fontPair.bodyFont,
  }

  return (
    <div
      style={outerBgStyle}
      className={`relative w-full overflow-x-hidden ${
        fullPage ? 'min-h-dvh px-4 py-8 sm:py-12' : 'rounded-3xl border border-edge p-4 sm:p-6'
      }`}
    >
      {/* Background Image Layer (PRO) */}
      {effPlan === 'pro' && theme.bgType === 'image' && theme.bgImageUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${theme.bgImageUrl})`,
            filter: theme.bgBlurPx > 0 ? `blur(${theme.bgBlurPx}px)` : undefined,
            transform: theme.bgBlurPx > 0 ? 'scale(1.06)' : undefined,
          }}
        />
      )}

      {/* Overlay Layer for Background Image */}
      {effPlan === 'pro' && theme.bgType === 'image' && theme.bgImageUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: theme.bgColor, opacity: theme.bgOverlayOpacity / 100 }}
        />
      )}

      {/* Pattern Layer (PRO) */}
      {effPlan === 'pro' && theme.bgPattern !== 'none' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={buildPatternStyle(theme)}
        />
      )}

      {/* Subtle Animated Ambient Shift (PRO opt-in) */}
      {effPlan === 'pro' && theme.bgAnimated && !reduce && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-24 opacity-20"
          style={{
            background: `radial-gradient(circle, ${theme.accentColor}33 0%, transparent 65%)`,
          }}
          animate={{ x: [-20, 20, -20], y: [-12, 16, -12] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Sensitive Content Gate (PRO optional) */}
      {!gateAccepted && !compactPreview && (
        <div className="relative z-20 mx-auto my-12 max-w-[420px] rounded-2xl border border-edge bg-surface p-7 text-center text-fg">
          <ShieldAlert size={28} className="mx-auto text-fg" />
          <h2 className="mt-3 text-[18px] font-bold">Konfirmasi Konten Halaman</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-fg-sec">
            Kreator menandai halaman <span className="font-mono text-fg">@{profile.username}</span> dengan peringatan konten sensitif. Lanjutkan hanya jika Anda ingin melihat halaman ini.
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-xl border border-edge px-4 text-[13.5px] font-medium text-fg-sec no-underline"
            >
              Kembali
            </Link>
            <Button variant="primary" onClick={() => setGateAccepted(true)}>
              Lanjutkan
            </Button>
          </div>
        </div>
      )}

      {/* Main Centered Link-in-Bio Column */}
      {gateAccepted && (
        <div
          style={{ maxWidth: containerWidth }}
          className="relative z-10 mx-auto flex w-full flex-col"
        >
          {previewBadge && (
            <div className="mb-4 flex items-center justify-between">
              <span
                style={{ borderColor: theme.borderColor, color: theme.textSecColor }}
                className="rounded-md border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider"
              >
                {previewBadge}
              </span>
            </div>
          )}

          {/* Optional Banner (PRO or uploaded) */}
          {profile.banner_url && (
            <div
              style={{ borderColor: theme.borderColor }}
              className="mb-4 overflow-hidden rounded-2xl border"
            >
              <ProgressiveImage
                src={profile.banner_url}
                alt={`Banner profil ${profile.display_name}`}
                ratio="3:1"
                priority={!compactPreview}
              />
            </div>
          )}

          {/* Creator Header: Avatar + Name + Verified + Bio + Share/Report */}
          <header
            className={`flex flex-col ${
              theme.contentAlign === 'left' ? 'items-start text-left' : 'items-center text-center'
            }`}
          >
            <div className="relative inline-flex items-center justify-center">
              {effPlan === 'pro' && theme.avatarBorderStyle === 'spinning-ring' && !reduce && (
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  style={{
                    ...avatarClip,
                    borderColor: theme.accentColor,
                    borderStyle: 'dashed',
                    borderWidth: '2px',
                  }}
                  className="pointer-events-none absolute -inset-1.5"
                />
              )}
              <div
                style={{
                  ...avatarClip,
                  borderColor:
                    theme.avatarBorderStyle === 'gradient' ? theme.accentColor : theme.borderColor,
                  borderWidth: `${theme.avatarBorderWidth}px`,
                  borderStyle:
                    theme.avatarBorderStyle === 'dashed'
                      ? 'dashed'
                      : theme.avatarBorderStyle === 'double'
                      ? 'double'
                      : 'solid',
                }}
                className="overflow-hidden bg-elevated"
              >
                <Avatar
                  src={profile.avatar_url}
                  name={profile.display_name}
                  size={compactPreview ? 'lg' : 'xl'}
                  className="!rounded-none !border-0"
                />
              </div>
            </div>

            <div
              className={`mt-4 flex flex-wrap items-center gap-2 ${
                theme.contentAlign === 'left' ? 'justify-start' : 'justify-center'
              }`}
            >
              {compactPreview ? (
                <p
                  style={{
                    fontFamily: fontPair.headingFont,
                    fontSize: `${Math.min(22, theme.titleSizePx)}px`,
                    letterSpacing: `${theme.titleTrackingEm}em`,
                    color: theme.textColor,
                  }}
                  className="m-0 font-extrabold leading-tight"
                >
                  {profile.display_name}
                </p>
              ) : (
                <h1
                  style={{
                    fontFamily: fontPair.headingFont,
                    fontSize: `clamp(1.375rem, 2.5vw, ${theme.titleSizePx}px)`,
                    letterSpacing: `${theme.titleTrackingEm}em`,
                    color: theme.textColor,
                  }}
                  className="m-0 font-extrabold leading-tight"
                >
                  {profile.display_name}
                </h1>
              )}
              {profile.is_verified && <VerifiedBadgeIcon size={18} />}
            </div>

            <p
              style={{ color: theme.textSecColor }}
              className="mt-1 mb-0 font-mono text-[12.5px]"
            >
              @{profile.username} · {profile.category}
            </p>

            {profile.bio && (
              <p
                style={{ color: theme.textColor }}
                className="mt-3 mb-0 max-w-[56ch] text-[14.5px] leading-relaxed whitespace-pre-line"
              >
                {profile.bio}
              </p>
            )}

            {/* Social Icons Row */}
            {(profile.tiktok_url || profile.instagram_url || profile.youtube_url || profile.website_url) && (
              <div
                className={`mt-4 flex flex-wrap items-center gap-2 ${
                  theme.contentAlign === 'left' ? 'justify-start' : 'justify-center'
                }`}
              >
                {[
                  { url: profile.tiktok_url, label: 'TikTok', icon: <TikTokGlyph size={16} />, ev: 'tiktok_click' as const },
                  { url: profile.instagram_url, label: 'Instagram', icon: <InstagramGlyph size={16} />, ev: 'social_click' as const },
                  { url: profile.youtube_url, label: 'YouTube', icon: <YouTubeGlyph size={16} />, ev: 'social_click' as const },
                  { url: profile.website_url, label: 'Situs', icon: <Globe size={15} />, ev: 'social_click' as const },
                ]
                  .filter((s) => Boolean(s.url))
                  .map((s) => (
                    <a
                      key={s.label}
                      href={s.url!}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      aria-label={`${s.label} ${profile.display_name}`}
                      onClick={(e) => {
                        if (compactPreview) e.preventDefault()
                        else onTrackEvent?.(s.ev)
                      }}
                      style={{
                        borderColor: theme.borderColor,
                        backgroundColor:
                          theme.socialStyle === 'solid' ? theme.cardBgColor : 'transparent',
                        color: theme.socialStyle === 'solid' ? theme.cardTextColor : theme.textColor,
                      }}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-3 text-[13px] font-medium no-underline transition-transform active:scale-95 [@media(hover:hover)]:hover:-translate-y-0.5 ${
                        theme.socialStyle === 'pill'
                          ? 'rounded-full border'
                          : theme.socialStyle === 'minimal'
                          ? 'rounded-lg border-0'
                          : 'rounded-xl border'
                      }`}
                    >
                      {s.icon}
                      {theme.socialStyle === 'pill' && <span>{s.label}</span>}
                    </a>
                  ))}
              </div>
            )}

            {!compactPreview && onShare && (
              <div className="mt-4 flex items-center gap-2">
                <UnstyledButton
                  onClick={onShare}
                  style={{ borderColor: theme.borderColor, color: theme.textSecColor }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border bg-transparent px-3.5 text-[12px] font-medium [@media(hover:hover)]:hover:opacity-80"
                >
                  <Share2 size={13} />
                  <span>Bagikan & QR</span>
                </UnstyledButton>
              </div>
            )}
          </header>

          {/* LINK-IN-BIO LIST (Single-column by default; PRO grid-2 / featured-large supported) */}
          {links.length > 0 && (
            <section
              aria-label="Daftar tautan kreator"
              style={{ gap: `${theme.cardGapPx}px` }}
              className={`mt-6 grid ${
                effPlan === 'pro' && theme.layoutMode === 'grid-2'
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1'
              }`}
            >
              {links.map((item, idx) => {
                if (item.type === 'heading') {
                  const grp = item.group_id
                  const isCollapsed = grp ? Boolean(collapsedGroups[grp]) : false
                  return (
                    <div
                      key={item.id}
                      className={`pt-2 ${
                        effPlan === 'pro' && theme.layoutMode === 'grid-2' ? 'sm:col-span-2' : ''
                      }`}
                    >
                      {effPlan === 'pro' && grp ? (
                        <UnstyledButton
                          onClick={() =>
                            setCollapsedGroups((p) => ({ ...p, [grp]: !p[grp] }))
                          }
                          style={{ color: theme.textColor, borderColor: theme.borderColor }}
                          className="flex min-h-11 w-full items-center justify-between border-b pb-1.5 text-left text-[13px] font-bold uppercase tracking-wider"
                        >
                          <span>{item.title}</span>
                          <ChevronDown
                            size={15}
                            className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          />
                        </UnstyledButton>
                      ) : (
                        <h2
                          style={{ color: theme.textSecColor }}
                          className="m-0 text-[12px] font-bold uppercase tracking-widest"
                        >
                          {item.title}
                        </h2>
                      )}
                    </div>
                  )
                }

                if (isHiddenByGroup(item)) return null

                if (item.type === 'announcement') {
                  return (
                    <div
                      key={item.id}
                      style={getCardStyle(false)}
                      className={`flex items-start gap-3 p-4 ${
                        effPlan === 'pro' && theme.layoutMode === 'grid-2' ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <Megaphone size={16} className="mt-0.5 shrink-0" />
                      <p className="m-0 text-[13.5px] leading-relaxed">{item.title}</p>
                    </div>
                  )
                }

                if (item.type === 'embed_youtube' || item.type === 'embed_tiktok') {
                  const embedSrc =
                    item.type === 'embed_youtube'
                      ? extractYouTubeEmbedUrl(item.url)
                      : extractTikTokEmbedUrl(item.url)
                  if (!embedSrc) return null
                  return (
                    <div
                      key={item.id}
                      style={getCardStyle(false)}
                      className={`overflow-hidden p-3 ${
                        effPlan === 'pro' && theme.layoutMode === 'grid-2' ? 'sm:col-span-2' : ''
                      }`}
                    >
                      <p className="mt-0 mb-2 text-[13px] font-semibold">{item.title}</p>
                      <div className="aspect-video w-full overflow-hidden rounded-lg bg-bg">
                        <iframe
                          src={embedSrc}
                          title={item.title}
                          loading="lazy"
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="h-full w-full border-0"
                        />
                      </div>
                    </div>
                  )
                }

                const showThumb =
                  Boolean(item.thumbnail_url) &&
                  (effPlan === 'pro' || item.type === 'capcut')

                const isBigFeatured =
                  effPlan === 'pro' &&
                  (theme.layoutMode === 'featured-large' ||
                    (theme.layoutMode === 'mixed' && item.is_featured))

                const cardAnimProps = useAnim
                  ? {
                      initial: theme.animationPreset === 'fade-up' ? { opacity: 0, y: 14 } : false,
                      animate:
                        theme.animationPreset === 'pulse' && item.is_featured
                          ? { scale: [1, 1.02, 1], opacity: 1 }
                          : { opacity: 1, y: 0 },
                      whileHover:
                        theme.animationPreset === 'hover-lift'
                          ? { y: -4 }
                          : theme.animationPreset === 'shake'
                          ? { x: [0, -2, 2, 0] }
                          : undefined,
                      transition:
                        theme.animationPreset === 'pulse' && item.is_featured
                          ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' as const }
                          : { duration: 0.45, delay: Math.min(idx * 0.04, 0.25), ease: EASE_SMOOTH },
                    }
                  : {}

                return (
                  <motion.a
                    key={item.id}
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    onClick={(e) => {
                      if (compactPreview) e.preventDefault()
                      else handleLinkClick(item)
                    }}
                    style={getCardStyle(item.is_featured)}
                    className={`group relative flex min-h-13 items-center justify-between gap-3 px-4 py-3 no-underline transition-transform active:scale-[0.98] ${
                      isBigFeatured ? 'sm:col-span-2 flex-col items-stretch p-4' : ''
                    }`}
                    {...cardAnimProps}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {showThumb ? (
                        <img
                          src={item.thumbnail_url!}
                          alt=""
                          width={44}
                          height={44}
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-current/20">
                          <LinkIcon type={item.type} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14.5px] font-semibold">{item.title}</span>
                          {item.is_featured && effPlan === 'pro' && (
                            <Sparkles size={13} className="shrink-0" />
                          )}
                        </div>
                        {item.type === 'capcut' && (
                          <span className="block font-mono text-[11px] opacity-75">
                            Pakai di CapCut
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowUpRight size={16} className="shrink-0 opacity-75" />

                    {/* Subtle CSS dot burst when PRO spotlight confetti triggers */}
                    {confettiId === item.id && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-inherit border-2"
                        style={{ borderColor: theme.accentColor }}
                      />
                    )}
                  </motion.a>
                )
              })}
            </section>
          )}

          {/* Template CapCut Section (if creator also published templates) */}
          {templates.length > 0 && (
            <section className="mt-8" aria-label="Koleksi template CapCut">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2
                  style={{ color: theme.textColor }}
                  className="m-0 text-[15px] font-bold tracking-[-0.02em]"
                >
                  Template CapCut
                </h2>
                <span
                  style={{ color: theme.textSecColor }}
                  className="font-mono text-[11.5px] tabular-nums"
                >
                  {templates.length} template
                </span>
              </div>

              <div
                className={`grid gap-3 sm:gap-4 ${
                  compactPreview
                    ? 'grid-cols-2'
                    : templates.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                }`}
              >
                {templates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onSelect={handleSelectTpl}
                    onCapcutClick={(tpl) => {
                      if (!compactPreview) onTrackEvent?.('capcut_click', tpl.id)
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {links.length === 0 && templates.length === 0 && (
            <div
              style={{ borderColor: theme.borderColor, color: theme.textSecColor }}
              className="mt-8 rounded-2xl border p-6 text-center text-[13.5px]"
            >
              Belum ada tautan atau template yang ditampilkan oleh kreator ini.
            </div>
          )}

          {/* Unobtrusive Report Link */}
          {!compactPreview && onReportProfile && (
            <div className="mt-8 flex justify-center">
              <UnstyledButton
                onClick={onReportProfile}
                style={{ color: theme.textSecColor }}
                className="inline-flex min-h-10 items-center gap-1.5 border-0 bg-transparent px-3 text-[12px] opacity-75 [@media(hover:hover)]:hover:opacity-100"
              >
                <Flag size={12} />
                <span>Laporkan halaman ini</span>
              </UnstyledButton>
            </div>
          )}

          {/* Mandatory FREE / Optional PRO Bottom Luven Referral Block */}
          {showLuvenBranding && (
            <div className="mt-6 flex justify-center pb-2">
              <Link
                to={`/register?ref=${encodeURIComponent(profile.username)}`}
                onClick={(e) => {
                  if (compactPreview) e.preventDefault()
                }}
                style={{
                  borderColor: theme.borderColor,
                  backgroundColor: theme.cardBgColor,
                  color: theme.cardTextColor,
                }}
                className="inline-flex min-h-11 items-center gap-2.5 rounded-full border px-4 py-2 text-[12.5px] font-semibold no-underline transition-transform [@media(hover:hover)]:hover:-translate-y-0.5"
              >
                <Logo variant="symbol" size={20} />
                <span>Buat halaman kamu di Luven</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
        </div>
      )}

      <TemplateDetailModal
        template={selectedTpl}
        onClose={() => setSelectedTpl(null)}
        onTrackEvent={(type, tplId) => onTrackEvent?.(type, tplId)}
        onReportTemplate={onReportTemplate}
      />
    </div>
  )
}
