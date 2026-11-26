import { useEffect, useRef, useState } from 'react'
import { Compass, UserX } from 'lucide-react'
import { getPublicProfileByUsername, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { CreatorTemplate, Profile } from '../lib/types'
import { Card, LinkButton, Skeleton } from '../ui/primitives'
import { PublicProfileRenderer } from '../ui/ProfileViewCard'
import { QrShareModal, ReportModal } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function PublicProfilePage({ username }: { username: string }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])
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

  useDocumentMeta({
    title: profile
      ? `${profile.display_name} (@${profile.username}) — Template CapCut & TikTok | Luven`
      : `Profil @${username} — Luven`,
    description:
      profile?.bio ||
      (profile
        ? `Koleksi template CapCut dan tautan resmi milik ${profile.display_name} (@${profile.username}) di Luven.`
        : 'Halaman profil kreator di Luven (luven.my.id).'),
    path: `/@${username}`,
    image: profile?.avatar_url || profile?.banner_url || undefined,
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:py-10 md:px-6">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            </div>
          </div>
        ) : !profile ? (
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
        ) : (
          <>
            <PublicProfileRenderer
              profile={profile}
              templates={templates}
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
              onTrackEvent={(type, tplId) => {
                void recordAnalyticsEvent(profile.id, type, tplId)
              }}
            />

            <QrShareModal
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              username={profile.username}
              displayName={profile.display_name}
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
        )}
      </div>
    </SiteLayout>
  )
}
