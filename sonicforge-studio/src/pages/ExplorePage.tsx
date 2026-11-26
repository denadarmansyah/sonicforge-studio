import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search, Sparkles, UserPlus, X } from 'lucide-react'
import { fetchPublicFeed, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { CreatorTemplate, Profile } from '../lib/types'
import { CREATOR_CATEGORIES, POPULAR_TEMPLATE_TAGS } from '../lib/validators'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import { Avatar, Badge, Button, Card, Input, LinkButton, Select, Skeleton, Tabs } from '../ui/primitives'
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
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:py-12 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-edge pb-6 md:flex-row md:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Direktori Publik
            </span>
            <h1 className="mt-1.5 text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-fg">
              Jelajah Kreator & Template
            </h1>
            <p className="mt-1 max-w-[56ch] text-[14.5px] text-fg-sec">
              Cari template CapCut berdasarkan gaya edit, lagu, atau telusuri langsung halaman resmi kreatornya.
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

        {/* Admin-Controlled Featured Creators Strip */}
        {featured.length > 0 && !q && category === 'Semua' && !tag && (
          <section aria-label="Kreator pilihan" className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-accent" />
              <h2 className="m-0 text-[14px] font-bold uppercase tracking-wider font-mono text-fg">
                Kreator Pilihan
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((c) => (
                <Link key={c.id} to={`/@${c.username}`} className="no-underline">
                  <Card hoverLift className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={c.avatar_url} name={c.display_name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14.5px] font-bold text-fg">
                            {c.display_name}
                          </span>
                          {c.is_verified && <VerifiedBadgeIcon size={14} />}
                        </div>
                        <span className="block truncate font-mono text-[12px] text-fg-sec">
                          @{c.username} · {c.category}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight size={17} className="shrink-0 text-accent" />
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter Controls */}
        <section aria-label="Filter pencarian" className="mt-8 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_190px]">
            <Input
              placeholder="Cari judul template, nama kreator, atau @username…"
              aria-label="Cari kreator atau template"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              leftAddon={<Search size={16} />}
            />

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

            <Select
              aria-label="Urutan tampilan"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'popular')}
            >
              <option value="newest">Urutan: Terbaru</option>
              <option value="popular">Populer Minggu Ini</option>
            </Select>
          </div>

          {/* Tag Filter Chips */}
          {viewTab === 'templates' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                Tag:
              </span>
              {POPULAR_TEMPLATE_TAGS.map((t) => {
                const on = tag === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(on ? '' : t)}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full border px-3.5 font-mono text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                      on
                        ? 'border-accent bg-accent text-on-accent font-semibold'
                        : 'border-edge bg-surface text-fg-sec [@media(hover:hover)]:hover:border-fg-sec [@media(hover:hover)]:hover:text-fg'
                    }`}
                  >
                    <span>#{t}</span>
                    {on && <X size={12} />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Results Grid */}
        <section className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
              ))}
            </div>
          ) : viewTab === 'templates' ? (
            templates.length === 0 ? (
              <Card className="mx-auto my-6 max-w-[520px] p-8 text-center">
                <h2 className="m-0 text-[18px] font-bold text-fg">
                  {q || category !== 'Semua' || tag
                    ? 'Tidak ada template yang sesuai filter'
                    : 'Belum ada template yang dipublikasikan'}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                  {q || category !== 'Semua' || tag
                    ? 'Coba hapus kata kunci atau pilih kategori lain untuk melihat seluruh template.'
                    : 'Jadilah kreator pertama yang menempelkan tautan template CapCut dan muncul di halaman Jelajah.'}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
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
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {templates.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
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
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 flex justify-center">
                    <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                      Muat Lebih Banyak
                    </Button>
                  </div>
                )}
              </>
            )
          ) : creators.length === 0 ? (
            <Card className="mx-auto my-6 max-w-[520px] p-8 text-center">
              <h2 className="m-0 text-[18px] font-bold text-fg">Belum ada kreator ditemukan</h2>
              <p className="mt-2 text-[14px] text-fg-sec">
                Buat halaman profil resmi Anda sekarang agar mudah ditemukan oleh pengguna CapCut dan TikTok.
              </p>
              <div className="mt-5">
                <LinkButton to="/register" variant="primary">
                  <UserPlus size={16} />
                  <span>Buat Halaman Kreator</span>
                </LinkButton>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((c) => (
                <Link key={c.id} to={`/@${c.username}`} className="no-underline">
                  <Card hoverLift className="flex h-full flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center gap-3.5">
                        <Avatar src={c.avatar_url} name={c.display_name} size="lg" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="m-0 truncate text-[16px] font-bold text-fg">
                              {c.display_name}
                            </h3>
                            {c.is_verified && <VerifiedBadgeIcon size={15} />}
                          </div>
                          <span className="block truncate font-mono text-[12.5px] text-fg-sec">
                            @{c.username}
                          </span>
                          <Badge className="mt-1.5">{c.category}</Badge>
                        </div>
                      </div>
                      {c.bio && (
                        <p className="mt-3.5 mb-0 line-clamp-2 text-[13.5px] leading-relaxed text-fg-sec">
                          {c.bio}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-edge pt-3 text-[12.5px] font-medium text-accent">
                      <span>Buka halaman profil</span>
                      <ArrowUpRight size={15} />
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
        onTrackEvent={(type, tplId) => {
          if (selectedTpl) void recordAnalyticsEvent(selectedTpl.owner_id, type, tplId)
        }}
        onReportTemplate={(tpl) => setReportTpl(tpl)}
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
