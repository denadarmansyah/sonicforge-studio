import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Ban, CheckCircle2, Crown, EyeOff, Search, ShieldAlert, Sparkles, Trash2 } from 'lucide-react'
import { PLANS } from '../config/plans'
import { useAuth } from '../context/AuthContext'
import {
  adminFetchModerationData,
  adminResolveReport,
  adminSetUserPlan,
  adminUpdateProfileFlags,
  adminUpdateTemplateStatus,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { getEffectivePlan } from '../lib/themeConfig'
import { AbuseReport, CreatorTemplate, Profile } from '../lib/types'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import { Avatar, Badge, Button, Card, Input, LinkButton, Skeleton, Tabs, useToast } from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

export function AdminPage() {
  const { loading: authLoading, user, isAdmin } = useAuth()
  const { pushToast } = useToast()

  const [tab, setTab] = useState<'reports' | 'users' | 'templates'>('reports')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<AbuseReport[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])

  useDocumentMeta({
    title: 'Moderasi Admin — Luven',
    description: 'Panel moderasi laporan, verifikasi kreator, dan kurasi template Luven.',
    path: '/admin',
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminFetchModerationData(search)
      setReports(data.reports)
      setProfiles(data.profiles)
      setTemplates(data.templates)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat data moderasi.', 'err')
    } finally {
      setLoading(false)
    }
  }, [search, pushToast])

  useEffect(() => {
    if (user && isAdmin) {
      void loadAll()
    }
  }, [user, isAdmin, loadAll])

  if (!authLoading && !user) return <Navigate to="/login" replace />
  if (!authLoading && !isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-[480px] px-4 py-16">
          <Card className="p-8 text-center">
            <ShieldAlert size={28} className="mx-auto text-fg" />
            <h1 className="mt-3 text-[20px] font-bold text-fg">Akses Terbatas</h1>
            <p className="mt-2 text-[14px] text-fg-sec">
              Halaman ini hanya dapat diakses oleh akun administrator yang terdaftar di tabel{' '}
              <code className="font-mono text-fg">public.admins</code>.
            </p>
            <div className="mt-5">
              <LinkButton to="/dashboard" variant="secondary">
                Kembali ke Dasbor
              </LinkButton>
            </div>
          </Card>
        </div>
      </SiteLayout>
    )
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-edge pb-6 md:flex-row md:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Ruang Kendali Moderator
            </span>
            <h1 className="mt-1 text-[26px] font-extrabold tracking-[-0.03em] text-fg">
              Moderasi & Kurasi Luven
            </h1>
          </div>

          <Tabs
            layoutGroupId="admin-tabs"
            active={tab}
            onChange={setTab}
            tabs={[
              {
                id: 'reports',
                label: 'Laporan Masuk',
                count: reports.filter((r) => r.status === 'open').length,
              },
              { id: 'users', label: 'Kreator', count: profiles.length },
              { id: 'templates', label: 'Template', count: templates.length },
            ]}
          />
        </div>

        {tab === 'users' && (
          <div className="mt-6 max-w-[420px]">
            <Input
              placeholder="Cari username atau nama tampilan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftAddon={<Search size={16} />}
            />
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : tab === 'reports' ? (
            reports.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="m-0 text-[14px] text-fg-sec">Tidak ada laporan pelanggaran saat ini.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <Card key={rep.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={rep.status === 'open' ? 'warn' : 'neutral'}>
                          {rep.status.toUpperCase()}
                        </Badge>
                        <Badge>{rep.target_type === 'profile' ? 'Profil' : 'Template'}</Badge>
                        <span className="font-mono text-[11.5px] text-fg-sec">
                          ID: {rep.target_id.slice(0, 12)}
                        </span>
                      </div>
                      <p className="mt-2 mb-0 text-[14.5px] font-semibold text-fg">{rep.reason}</p>
                      {rep.details && (
                        <p className="mt-1 mb-0 text-[13px] text-fg-sec">{rep.details}</p>
                      )}
                    </div>

                    {rep.status === 'open' && (
                      <div className="flex flex-wrap gap-2">
                        {rep.target_type === 'template' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              await adminUpdateTemplateStatus(rep.target_id, 'removed')
                              await adminResolveReport(rep.id, 'resolved')
                              await loadAll()
                              pushToast('Template dihapus dan laporan diselesaikan.')
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Hapus Template</span>
                          </Button>
                        )}
                        {rep.target_type === 'profile' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              await adminUpdateProfileFlags(rep.target_id, { is_banned: true })
                              await adminResolveReport(rep.id, 'resolved')
                              await loadAll()
                              pushToast('Akun ditangguhkan dan laporan diselesaikan.')
                            }}
                          >
                            <Ban size={14} />
                            <span>Tangguhkan Akun</span>
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await adminResolveReport(rep.id, 'dismissed')
                            await loadAll()
                            pushToast('Laporan ditutup.')
                          }}
                        >
                          Abaikan
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )
          ) : tab === 'users' ? (
            <div className="space-y-3">
              {profiles.map((p) => {
                const effPlan = getEffectivePlan(p.plan, p.plan_expires_at)
                return (
                  <Card key={p.id} className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={p.avatar_url} name={p.display_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/@${p.username}`} className="font-bold text-fg no-underline hover:underline">
                            {p.display_name}
                          </Link>
                          {p.is_verified && <VerifiedBadgeIcon size={14} />}
                          <Badge variant={effPlan === 'pro' ? 'accent' : 'neutral'}>
                            {effPlan === 'pro' ? 'PRO' : 'FREE'}
                          </Badge>
                          {p.is_featured && <Badge variant="ok">Pilihan</Badge>}
                          {p.is_banned && <Badge variant="err">Banned</Badge>}
                        </div>
                        <span className="block font-mono text-[12px] text-fg-sec">
                          @{p.username} · {p.category}
                          {effPlan === 'pro' && p.plan_expires_at
                            ? ` · s/d ${new Date(p.plan_expires_at).toLocaleDateString('id-ID')}`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {effPlan === 'pro' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await adminSetUserPlan(p.id, 'free', null, 0)
                              await loadAll()
                              pushToast(`Paket Pro @${p.username} dicabut ke Free.`)
                            } catch (err) {
                              pushToast(err instanceof Error ? err.message : 'Gagal mengubah paket.', 'err')
                            }
                          }}
                        >
                          <span>Cabut Pro</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const exp = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                await adminSetUserPlan(p.id, 'pro', exp, PLANS.pro.monthlyPriceIdr)
                                await loadAll()
                                pushToast(`Pro 30 hari diaktifkan untuk @${p.username}.`)
                              } catch (err) {
                                pushToast(err instanceof Error ? err.message : 'Gagal mengaktifkan Pro.', 'err')
                              }
                            }}
                          >
                            <Crown size={14} />
                            <span>Pro 30h</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                                await adminSetUserPlan(p.id, 'pro', exp, PLANS.pro.yearlyPriceIdr)
                                await loadAll()
                                pushToast(`Pro 1 tahun diaktifkan untuk @${p.username}.`)
                              } catch (err) {
                                pushToast(err instanceof Error ? err.message : 'Gagal mengaktifkan Pro.', 'err')
                              }
                            }}
                          >
                            <span>Pro 1th</span>
                          </Button>
                        </>
                      )}

                      <Button
                        variant={p.is_verified ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={async () => {
                          await adminUpdateProfileFlags(p.id, { is_verified: !p.is_verified })
                          await loadAll()
                          pushToast(
                            !p.is_verified ? `@${p.username} diverifikasi.` : `Verifikasi @${p.username} dicabut.`
                          )
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>{p.is_verified ? 'Cabut Verifikasi' : 'Verifikasi'}</span>
                      </Button>

                      <Button
                        variant={p.is_featured ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={async () => {
                          await adminUpdateProfileFlags(p.id, { is_featured: !p.is_featured })
                          await loadAll()
                          pushToast(
                            !p.is_featured
                              ? `@${p.username} ditambahkan ke Kreator Pilihan.`
                              : `@${p.username} dihapus dari Kreator Pilihan.`
                          )
                        }}
                      >
                        <Sparkles size={14} />
                        <span>{p.is_featured ? 'Hapus Pilihan' : 'Jadikan Pilihan'}</span>
                      </Button>

                      <Button
                        variant={p.is_banned ? 'primary' : 'destructive'}
                        size="sm"
                        onClick={async () => {
                          await adminUpdateProfileFlags(p.id, { is_banned: !p.is_banned })
                          await loadAll()
                          pushToast(
                            !p.is_banned ? `@${p.username} ditangguhkan.` : `Penangguhan @${p.username} dibuka.`
                          )
                        }}
                      >
                        <Ban size={14} />
                        <span>{p.is_banned ? 'Pulihkan Akun' : 'Ban Akun'}</span>
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <Card key={t.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-fg">{t.title}</span>
                      <Badge
                        variant={
                          t.status === 'active' ? 'ok' : t.status === 'hidden' ? 'warn' : 'err'
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <span className="block truncate font-mono text-[12px] text-fg-sec">
                      Oleh @{t.owner?.username || 'kreator'} · {t.capcut_url}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {t.status !== 'hidden' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          await adminUpdateTemplateStatus(t.id, 'hidden')
                          await loadAll()
                          pushToast('Template disembunyikan.')
                        }}
                      >
                        <EyeOff size={14} />
                        <span>Sembunyikan</span>
                      </Button>
                    )}
                    {t.status !== 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await adminUpdateTemplateStatus(t.id, 'active')
                          await loadAll()
                          pushToast('Template dipulihkan ke aktif.')
                        }}
                      >
                        Pulihkan
                      </Button>
                    )}
                    {t.status !== 'removed' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          await adminUpdateTemplateStatus(t.id, 'removed')
                          await loadAll()
                          pushToast('Template dihapus secara permanen dari publik.')
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Hapus</span>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
