import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, Search, Sparkles, UserPlus, X } from 'lucide-react'
import { fetchPublicFeed, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { CreatorTemplate, Profile } from '../lib/types'
import { CREATOR_CATEGORIES, POPULAR_TEMPLATE_TAGS } from '../lib/validators'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  LinkButton,
  Select,
  Skeleton,
  Tabs,
} from '../ui/primitives'
import { TemplateCard, TemplateDetailModal } from '../ui/ProfileViewCard'
import { ReportModal, SupabaseSetupPanel } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function ExplorePage() {
  const [viewTab, setViewTab] = useState<'templates' | 'creators'>('templates')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('Semua')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<'newest' | 'popular'>('newest')
  const [page, setPage] = useState(0)

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [featured, setFeatured] = useState<Profile[]>([])
  const [creators, setCreators] = useState<Profile[]>([])
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])
  const [hasMore, setHasMore] = useState(false)

  const [selectedTpl, setSelectedTpl] = useState<CreatorTemplate | null>(null)
  const [reportTpl, setReportTpl] = useState<CreatorTemplate | null>(null)

  useDocumentMeta({
    title: 'Jelajah Kreator & Template CapCut — Luven',
    description:
      'Temukan kreator TikTok dan koleksi template CapCut siap pakai berdasarkan kategori dan tag di Luven.',
    path: '/explore',
  })

  useEffect(() => {
    let active = true
    setLoading(true)
    setPage(0)
    const timer = window.setTimeout(() => {
      fetchPublicFeed({ q, category, tag, sort, page: 0, pageSize: 12 })
        .then((res) => {
          if (!active) return
          setFeatured(res.featuredCreators)
          setCreators(res.creators)
          setTemplates(res.templates)
          setHasMore(res.hasMore)
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 180)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [q, category, tag, sort])

  const loadMore = async () => {
    const next = page + 1
    setLoadingMore(true)
    try {
      const res = await fetchPublicFeed({ q, category, tag, sort, page: next, pageSize: 12 })
      setCreators((prev) => [...prev, ...res.creators])
      setTemplates((prev) => [...prev, ...res.templates])
      setHasMore(res.hasMore)
      setPage(next)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <SiteLayout>
      <SupabaseSetupPanel compact />
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col justify-between gap-6 border-b border-edge pb-8 lg:flex-row lg:items-end">
          <div className="max-w-[560px]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
              Direktori Publik
            </span>
            <h1 className="mt-2 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg sm:text-[44px]">
              Jelajah Kreator & Template
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
              Cari template CapCut berdasarkan gaya edit, lagu, atau buka langsung halaman resmi kreatornya.
            </p>
          </div>

          <Tabs
            layoutGroupId="explore-tab"
            active={viewTab}
            onChange={setViewTab}
            tabs={[
              { id: 'templates', label: 'Template', count: templates.length },
              { id: 'creators', label: 'Kreator', count: creators.length },
            ]}
          />
        </div>

        {/* Featured Creators */}
        {featured.length > 0 && !q && category === 'Semua' && !tag && (
          <section aria-label="Kreator pilihan" className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-fg" />
              <h2 className="m-0 font-mono text-[12px] font-semibold uppercase tracking-wider text-fg">
                Kreator Pilihan
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
              {featured.map((c) => (
                <Link
                  key={c.id}
                  to={`/@${c.username}`}
                  className="col-span-4 no-underline md:col-span-4 lg:col-span-4"
                >
                  <Card hoverLift className="flex h-full items-center justify-between gap-3 p-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={c.avatar_url} name={c.display_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-bold text-fg">
                            {c.display_name}
                          </span>
                          {c.is_verified && <VerifiedBadgeIcon size={14} />}
                        </div>
                        <span className="block truncate font-mono text-[12px] text-fg-sec">
                          @{c.username} · {c.category}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight size={17} className="shrink-0 text-fg" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter Controls */}
        <section aria-label="Filter pencarian" className="mt-10 space-y-4">
          <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
            <div className="col-span-4 md:col-span-8 lg:col-span-6">
              <Input
                placeholder="Cari judul template, nama kreator, atau @username…"
                aria-label="Cari kreator atau template"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                leftAddon={<Search size={16} />}
              />
            </div>

            <div className="col-span-2 md:col-span-4 lg:col-span-3">
              <Select
                aria-label="Filter kategori"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Semua">Semua Kategori</option>
                {CREATOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div className="col-span-2 md:col-span-4 lg:col-span-3">
              <Select
                aria-label="Urutan tampilan"
                value={sort}
                onChange={(e) => setSort(e.target.value as 'newest' | 'popular')}
              >
                <option value="newest">Urutan: Terbaru</option>
                <option value="popular">Populer Minggu Ini</option>
              </Select>
            </div>
          </div>

          {viewTab === 'templates' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                Tag:
              </span>
              {POPULAR_TEMPLATE_TAGS.map((t) => {
                const on = tag === t
                return (
                  <Button
                    key={t}
                    variant={on ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setTag(on ? '' : t)}
                  >
                    <span className="font-mono text-[12px]">#{t}</span>
                    {on && <X size={13} />}
                  </Button>
                )
              })}
            </div>
          )}
        </section>

        {/* Results Grid */}
        <section className="mt-10">
          {loading ? (
            <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="col-span-2 aspect-[4/5] w-full rounded-2xl md:col-span-4 lg:col-span-3"
                />
              ))}
            </div>
          ) : viewTab === 'templates' ? (
            templates.length === 0 ? (
              <Card className="mx-auto max-w-[480px] p-6 text-center">
                {hasIllustration('empty-explore') ? (
                  <div className="mx-auto mb-6 max-w-[240px]">
                    <Illustration
                      name="empty-explore"
                      alt="Ilustrasi kaca pembesar di atas kotak kosong"
                      sizes="240px"
                    />
                  </div>
                ) : (
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                    <Compass size={20} />
                  </div>
                )}
                <h2 className="m-0 text-[20px] font-bold text-fg">
                  {q || category !== 'Semua' || tag
                    ? 'Tidak ada template yang sesuai filter'
                    : 'Belum ada template yang dipublikasikan'}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  {q || category !== 'Semua' || tag
                    ? 'Coba hapus kata kunci atau pilih kategori lain untuk melihat seluruh template.'
                    : 'Jadilah kreator pertama yang menempelkan tautan template CapCut dan tampil di halaman Jelajah.'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {(q || category !== 'Semua' || tag) && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setQ('')
                        setCategory('Semua')
                        setTag('')
                      }}
                    >
                      Reset Filter
                    </Button>
                  )}
                  <LinkButton to="/register" variant="primary">
                    <UserPlus size={16} />
                    <span>Unggah Template Kamu</span>
                  </LinkButton>
                </div>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="col-span-2 md:col-span-4 lg:col-span-3">
                      <TemplateCard
                        template={tpl}
                        showCreator
                        onSelect={(t) => {
                          void recordAnalyticsEvent(t.owner_id, 'template_view', t.id)
                          setSelectedTpl(t)
                        }}
                        onCapcutClick={(t) => {
                          void recordAnalyticsEvent(t.owner_id, 'capcut_click', t.id)
                        }}
                      />
                    </div>
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-10 flex justify-center">
                    <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                      Muat Lebih Banyak
                    </Button>
                  </div>
                )}
              </>
            )
          ) : creators.length === 0 ? (
            <Card className="mx-auto max-w-[480px] p-6 text-center">
              {hasIllustration('empty-explore') ? (
                <div className="mx-auto mb-6 max-w-[240px]">
                  <Illustration
                    name="empty-explore"
                    alt="Ilustrasi kaca pembesar di atas kotak kosong"
                    sizes="240px"
                  />
                </div>
              ) : (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                  <Compass size={20} />
                </div>
              )}
              <h2 className="m-0 text-[20px] font-bold text-fg">Belum ada kreator ditemukan</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                Buat halaman profil resmi kamu sekarang agar mudah ditemukan oleh pengguna CapCut dan TikTok.
              </p>
              <div className="mt-6">
                <LinkButton to="/register" variant="primary">
                  <UserPlus size={16} />
                  <span>Buat Halaman Kreator</span>
                </LinkButton>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
              {creators.map((c) => (
                <Link
                  key={c.id}
                  to={`/@${c.username}`}
                  className="col-span-4 no-underline md:col-span-4 lg:col-span-4"
                >
                  <Card hoverLift className="flex h-full flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-3.5">
                        <Avatar src={c.avatar_url} name={c.display_name} size="lg" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="m-0 truncate text-[18px] font-bold text-fg">
                              {c.display_name}
                            </h3>
                            {c.is_verified && <VerifiedBadgeIcon size={15} />}
                          </div>
                          <span className="block truncate font-mono text-[12.5px] text-fg-sec">
                            @{c.username}
                          </span>
                        </div>
                      </div>
                      {c.bio && (
                        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-fg-sec">
                          {c.bio}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-edge pt-3">
                      <Badge>{c.category}</Badge>
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg">
                        Lihat Profil <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <TemplateDetailModal
        template={selectedTpl}
        onClose={() => setSelectedTpl(null)}
        onReportTemplate={(t) => setReportTpl(t)}
        onTrackEvent={(type, tplId) => {
          if (selectedTpl) void recordAnalyticsEvent(selectedTpl.owner_id, type, tplId)
        }}
      />

      {reportTpl && (
        <ReportModal
          open={Boolean(reportTpl)}
          onClose={() => setReportTpl(null)}
          targetType="template"
          targetId={reportTpl.id}
          targetLabel={reportTpl.title}
        />
      )}
    </SiteLayout>
  )
}
