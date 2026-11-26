import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Disc3, ExternalLink, Flag, Globe, Music2, Share2 } from 'lucide-react'
import { AnalyticsEventType, CreatorTemplate, Profile } from '../lib/types'
import {
  CapCutGlyph,
  InstagramGlyph,
  TikTokGlyph,
  VerifiedBadgeIcon,
  YouTubeGlyph,
} from './BrandIcons'
import { Avatar, Badge, Button, EASE_SMOOTH, IconButton, Modal, ProgressiveImage } from './primitives'

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
      <button
        type="button"
        onClick={() => onSelect?.(template)}
        aria-label={`Lihat detail template ${template.title}`}
        className="relative block w-full cursor-pointer border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-accent"
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
      </button>

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
            <button
              type="button"
              onClick={() => onSelect?.(template)}
              className="inline-flex min-h-11 w-full cursor-pointer items-start border-0 bg-transparent p-0 text-left text-inherit focus-visible:outline-1 focus-visible:outline-accent"
            >
              <span className="line-clamp-2">{template.title}</span>
            </button>
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
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onReportTemplate(template)
                }}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 text-[12.5px] text-fg-sec [@media(hover:hover)]:hover:text-fg"
              >
                <Flag size={13} />
                <span>Laporkan template ini</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Core link-in-bio profile renderer — crafted to look balanced and editorial
 * even when banner is omitted and even with 0 or 1 template.
 */
export function PublicProfileRenderer({
  profile,
  templates,
  previewBadge,
  compactPreview = false,
  onShare,
  onReportProfile,
  onReportTemplate,
  onTrackEvent,
}: {
  profile: Profile
  templates: CreatorTemplate[]
  previewBadge?: string
  compactPreview?: boolean
  onShare?: () => void
  onReportProfile?: () => void
  onReportTemplate?: (t: CreatorTemplate) => void
  onTrackEvent?: (type: AnalyticsEventType, templateId?: string) => void
}) {
  const [selectedTpl, setSelectedTpl] = useState<CreatorTemplate | null>(null)

  const handleSelectTpl = (t: CreatorTemplate) => {
    if (compactPreview) return
    onTrackEvent?.('template_view', t.id)
    setSelectedTpl(t)
  }

  return (
    <div className="w-full">
      {/* Profile Header Card */}
      <section className="overflow-hidden rounded-3xl border border-edge bg-surface">
        {/* Banner (3:1 if uploaded; sleek hardware status strip if omitted so no awkward empty hole) */}
        {profile.banner_url ? (
          <div className="relative border-b border-edge">
            <ProgressiveImage
              src={profile.banner_url}
              alt={`Banner profil ${profile.display_name}`}
              ratio="3:1"
              priority={!compactPreview}
            />
            {previewBadge && (
              <span className="absolute top-3 left-3 rounded-md border border-edge bg-bg/90 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
                {previewBadge}
              </span>
            )}
          </div>
        ) : (
          <div className="hw-grid-bg flex h-16 items-center justify-between border-b border-edge bg-elevated px-5 sm:h-20 sm:px-7">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-fg-sec">
                {previewBadge || `LUVEN CREATOR // ${profile.category.toUpperCase()}`}
              </span>
            </div>
            <div className="flex items-center gap-1" aria-hidden="true">
              <span className="h-3 w-1 rounded-xs bg-accent" />
              <span className="h-4 w-1 rounded-xs bg-fg-sec" />
              <span className="h-2.5 w-1 rounded-xs bg-fg-muted" />
              <span className="h-3.5 w-1 rounded-xs bg-accent" />
            </div>
          </div>
        )}

        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar
                src={profile.avatar_url}
                name={profile.display_name}
                size={compactPreview ? 'lg' : 'xl'}
                className={profile.banner_url ? '-mt-12 ring-4 ring-surface sm:-mt-14' : ''}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {compactPreview ? (
                    <p className="m-0 text-[20px] font-extrabold tracking-[-0.03em] text-fg">
                      {profile.display_name}
                    </p>
                  ) : (
                    <h1 className="m-0 text-[clamp(1.375rem,2.4vw,1.875rem)] font-extrabold tracking-[-0.03em] text-fg">
                      {profile.display_name}
                    </h1>
                  )}
                  {profile.is_verified && <VerifiedBadgeIcon size={18} />}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] text-fg-sec">@{profile.username}</span>
                  <Badge variant="neutral">{profile.category}</Badge>
                </div>
              </div>
            </div>

            {!compactPreview && (onShare || onReportProfile) && (
              <div className="flex items-center gap-2 self-start">
                {onShare && (
                  <Button variant="secondary" size="sm" onClick={onShare}>
                    <Share2 size={15} />
                    <span>Bagikan & QR</span>
                  </Button>
                )}
                {onReportProfile && (
                  <IconButton label="Laporkan profil ini" onClick={onReportProfile}>
                    <Flag size={16} />
                  </IconButton>
                )}
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed whitespace-pre-line text-fg">
              {profile.bio}
            </p>
          )}

          {/* External Social Links Row */}
          {(profile.tiktok_url || profile.instagram_url || profile.youtube_url || profile.website_url) && (
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {profile.tiktok_url && (
                <a
                  href={profile.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  onClick={(e) => {
                    if (compactPreview) e.preventDefault()
                    else onTrackEvent?.('tiktok_click')
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-[14px] font-semibold text-on-accent no-underline transition-colors active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <TikTokGlyph size={16} />
                  <span>Buka TikTok</span>
                  <ArrowUpRight size={15} />
                </a>
              )}

              {profile.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  onClick={(e) => {
                    if (compactPreview) e.preventDefault()
                    else onTrackEvent?.('social_click')
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-elevated px-4 text-[13.5px] font-medium text-fg no-underline transition-colors [@media(hover:hover)]:hover:border-fg-sec"
                >
                  <InstagramGlyph size={16} />
                  <span>Instagram</span>
                </a>
              )}

              {profile.youtube_url && (
                <a
                  href={profile.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  onClick={(e) => {
                    if (compactPreview) e.preventDefault()
                    else onTrackEvent?.('social_click')
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-elevated px-4 text-[13.5px] font-medium text-fg no-underline transition-colors [@media(hover:hover)]:hover:border-fg-sec"
                >
                  <YouTubeGlyph size={16} />
                  <span>YouTube</span>
                </a>
              )}

              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  onClick={(e) => {
                    if (compactPreview) e.preventDefault()
                    else onTrackEvent?.('social_click')
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-elevated px-4 text-[13.5px] font-medium text-fg no-underline transition-colors [@media(hover:hover)]:hover:border-fg-sec"
                >
                  <Globe size={15} />
                  <span>Tautan Lain</span>
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Template Gallery Section */}
      <section className="mt-6" aria-label="Koleksi template CapCut">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="m-0 text-[16px] font-bold tracking-[-0.02em] text-fg">
            Template CapCut
          </h2>
          <span className="font-mono text-[12px] tabular-nums text-fg-sec">
            {templates.length} template
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-2xl border border-edge bg-surface p-8 text-center">
            <p className="m-0 text-[14px] font-medium text-fg">
              Belum ada template yang dipublikasikan
            </p>
            <p className="mt-1 text-[13px] text-fg-sec">
              Kreator ini belum menambahkan tautan template CapCut ke halaman publiknya.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-3 sm:gap-4 ${
              compactPreview
                ? 'grid-cols-2'
                : templates.length === 1
                ? 'grid-cols-1 sm:max-w-[340px]'
                : 'grid-cols-2 lg:grid-cols-3'
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
        )}
      </section>

      <TemplateDetailModal
        template={selectedTpl}
        onClose={() => setSelectedTpl(null)}
        onTrackEvent={(type, tplId) => onTrackEvent?.(type, tplId)}
        onReportTemplate={onReportTemplate}
      />
    </div>
  )
}
