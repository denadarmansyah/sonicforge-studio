import { useEffect, useRef, useState } from 'react'
import { Compass, UserX } from 'lucide-react'
import { getPublicProfileByUsername, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { getEffectivePlan } from '../lib/themeConfig'
import { CreatorTemplate, LinkItem, Profile } from '../lib/types'
import { Card, LinkButton, Skeleton } from '../ui/primitives'
import { PublicProfileRenderer } from '../ui/ProfileViewCard'
import { QrShareModal, ReportModal } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function PublicProfilePage({ username }: { username: string }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])
  const [links, setLinks] = useState<LinkItem[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{
    type: 'profile' | 'template'
    id: string
    label: string
  } | null>(null)
  const trackedOwnerRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getPublicProfileByUsername(username)
      .then((res) => {
        if (!active) return
        setProfile(res.profile)
        setTemplates(res.templates)
        setLinks(res.links)
        if (res.profile && trackedOwnerRef.current !== res.profile.id) {
          trackedOwnerRef.current = res.profile.id
          void recordAnalyticsEvent(res.profile.id, 'profile_view')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [username])

  const isPro = profile ? getEffectivePlan(profile.plan, profile.plan_expires_at) === 'pro' : false

  useDocumentMeta({
    title:
      isPro && profile?.settings?.seoTitle
        ? profile.settings.seoTitle
        : profile
          ? `${profile.display_name} (@${profile.username}) — Link & Template | Luven`
          : `Profil @${username} — Luven`,
    description:
      (isPro && profile?.settings?.seoDescription) ||
      profile?.bio ||
      (profile
        ? `Tautan resmi dan koleksi template milik ${profile.display_name} (@${profile.username}) di Luven.`
        : 'Halaman link-in-bio kreator di Luven (luven.my.id).'),
    path: `/@${username}`,
    image:
      (isPro && profile?.settings?.customOgImageUrl) ||
      profile?.avatar_url ||
      profile?.banner_url ||
      undefined,
  })

  if (loading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-[680px] px-4 py-10 md:px-6">
          <div className="min-h-[360px] space-y-5">
            <Skeleton className="mx-auto h-24 w-24 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48 rounded-lg" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </SiteLayout>
    )
  }

  if (!profile) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-[880px] px-4 py-8 sm:py-10 md:px-6">
          <Card className="mx-auto my-10 max-w-[480px] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-edge bg-elevated text-fg-sec">
              <UserX size={22} />
            </div>
            <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
              Profil tidak ditemukan
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
              Halaman <span className="font-mono text-fg">@{username}</span> belum terdaftar di Luven atau telah dinonaktifkan karena pelanggaran ketentuan.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <LinkButton to="/explore" variant="secondary" fullWidth>
                <Compass size={16} />
                <span>Jelajahi Kreator Lain</span>
              </LinkButton>
              <LinkButton to="/register" variant="primary" fullWidth>
                <span>Klaim @{username}</span>
              </LinkButton>
            </div>
          </Card>
        </div>
      </SiteLayout>
    )
  }

  return (
    <>
      <PublicProfileRenderer
        profile={profile}
        templates={templates}
        links={links}
        fullPage
        onShare={() => setShareOpen(true)}
        onReportProfile={() =>
          setReportTarget({
            type: 'profile',
            id: profile.id,
            label: `@${profile.username}`,
          })
        }
        onReportTemplate={(tpl) =>
          setReportTarget({
            type: 'template',
            id: tpl.id,
            label: tpl.title,
          })
        }
        onTrackEvent={(type, tplId, linkId) => {
          void recordAnalyticsEvent(profile.id, type, tplId, linkId)
        }}
      />

      <QrShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        username={profile.username}
        displayName={profile.display_name}
        fgColor={isPro ? profile.settings?.qrFgColor : undefined}
        bgColor={isPro ? profile.settings?.qrBgColor : undefined}
      />

      {reportTarget && (
        <ReportModal
          open={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
        />
      )}
    </>
  )
}
