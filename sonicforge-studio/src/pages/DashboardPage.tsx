import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Layers,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  deleteOwnTemplate,
  getCreatorAnalytics,
  grantSandboxAdmin,
  listOwnTemplates,
  reorderOwnTemplates,
  saveCreatorTemplate,
  saveOwnProfile,
  uploadCreatorImage,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { isSandboxEnabled, SITE_ORIGIN } from '../lib/supabaseClient'
import { CreatorAnalyticsSummary, CreatorTemplate, Profile } from '../lib/types'
import {
  CREATOR_CATEGORIES,
  POPULAR_TEMPLATE_TAGS,
  validateAllowedUrl,
} from '../lib/validators'
import { CapCutGlyph } from '../ui/BrandIcons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  LinkButton,
  Modal,
  ProgressiveImage,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  useToast,
} from '../ui/primitives'
import { PublicProfileRenderer } from '../ui/ProfileViewCard'
import { QrShareModal, SupabaseSetupPanel } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

type DashTab = 'profile' | 'templates' | 'analytics' | 'preview'

export function DashboardPage() {
  const { loading: authLoading, user, profile, isAdmin, refreshAuth } = useAuth()
  const { pushToast } = useToast()

  const [activeTab, setActiveTab] = useState<DashTab>('templates')
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])
  const [analytics, setAnalytics] = useState<CreatorAnalyticsSummary | null>(null)
  const [rangeDays, setRangeDays] = useState<7 | 30>(7)
  const [loadingData, setLoadingData] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Profile Editor State (drives Live Side-by-Side Preview!)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<string>(CREATOR_CATEGORIES[0])
  const [bio, setBio] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingImg, setUploadingImg] = useState<'avatar' | 'banner' | 'thumbnail' | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  // Template Modal Form State
  const [tplModalOpen, setTplModalOpen] = useState(false)
  const [editingTplId, setEditingTplId] = useState<string | null>(null)
  const [tplCapcutUrl, setTplCapcutUrl] = useState('')
  const [tplTiktokUrl, setTplTiktokUrl] = useState('')
  const [tplTitle, setTplTitle] = useState('')
  const [tplDesc, setTplDesc] = useState('')
  const [tplSong, setTplSong] = useState('')
  const [tplThumb, setTplThumb] = useState<string | null>(null)
  const [tplTagsInput, setTplTagsInput] = useState('')
  const [tplSaving, setTplSaving] = useState(false)
  const [tplError, setTplError] = useState('')

  useDocumentMeta({
    title: 'Dasbor Kreator — Luven',
    description: 'Kelola halaman profil, urutan template CapCut, kode QR, dan analitik klik Anda.',
    path: '/dashboard',
  })

  useEffect(() => {
    if (!profile) return
    setUsername(profile.username)
    setDisplayName(profile.display_name)
    setCategory(profile.category)
    setBio(profile.bio)
    setTiktokUrl(profile.tiktok_url || '')
    setInstagramUrl(profile.instagram_url || '')
    setYoutubeUrl(profile.youtube_url || '')
    setWebsiteUrl(profile.website_url || '')
    setAvatarUrl(profile.avatar_url)
    setBannerUrl(profile.banner_url)
  }, [profile])

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    try {
      const tpls = await listOwnTemplates(user.id)
      setTemplates(tpls)
      const stats = await getCreatorAnalytics(user.id, tpls)
      setAnalytics(stats)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat data dasbor.', 'err')
    } finally {
      setLoadingData(false)
    }
  }, [user, pushToast])

  useEffect(() => {
    if (user && profile?.onboarding_completed) {
      void loadDashboardData()
    }
  }, [user, profile?.onboarding_completed, loadDashboardData])

  if (!authLoading && !user) return <Navigate to="/login" replace />
  if (!authLoading && user && !profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  const liveDraftProfile: Profile | null = profile
    ? {
        ...profile,
        username: username || profile.username,
        display_name: displayName || profile.display_name,
        category,
        bio,
        tiktok_url: tiktokUrl || null,
        instagram_url: instagramUrl || null,
        youtube_url: youtubeUrl || null,
        website_url: websiteUrl || null,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      }
    : null

  const publicUrl = profile ? `${SITE_ORIGIN}/@${profile.username}` : SITE_ORIGIN

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      pushToast('Tautan profil disalin!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      pushToast('Gagal menyalin tautan.', 'err')
    }
  }

  const handleUploadImage = async (file: File, kind: 'avatar' | 'banner' | 'thumbnail') => {
    if (!user) return
    setUploadingImg(kind)
    try {
      const url = await uploadCreatorImage(user.id, file, kind)
      if (kind === 'avatar') setAvatarUrl(url)
      else if (kind === 'banner') setBannerUrl(url)
      else setTplThumb(url)
      pushToast('Gambar berhasil dikompresi ke WebP dan diunggah.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengunggah gambar.', 'err')
    } finally {
      setUploadingImg(null)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      await saveOwnProfile(user.id, {
        username,
        display_name: displayName,
        bio,
        category,
        tiktok_url: tiktokUrl,
        instagram_url: instagramUrl,
        youtube_url: youtubeUrl,
        website_url: websiteUrl,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        onboarding_completed: true,
      })
      await refreshAuth()
      pushToast('Perubahan profil berhasil disimpan.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menyimpan profil.', 'err')
    } finally {
      setSavingProfile(false)
    }
  }

  const openNewTemplateModal = () => {
    setEditingTplId(null)
    setTplCapcutUrl('')
    setTplTiktokUrl('')
    setTplTitle('')
    setTplDesc('')
    setTplSong('')
    setTplThumb(null)
    setTplTagsInput('')
    setTplError('')
    setTplModalOpen(true)
  }

  const openEditTemplateModal = (t: CreatorTemplate) => {
    setEditingTplId(t.id)
    setTplCapcutUrl(t.capcut_url)
    setTplTiktokUrl(t.tiktok_url || '')
    setTplTitle(t.title)
    setTplDesc(t.description)
    setTplSong(t.song_title || '')
    setTplThumb(t.thumbnail_url)
    setTplTagsInput(t.tags.join(', '))
    setTplError('')
    setTplModalOpen(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setTplSaving(true)
    setTplError('')
    try {
      const tags = tplTagsInput
        .split(/[, ]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5)

      await saveCreatorTemplate(user.id, {
        id: editingTplId || undefined,
        title: tplTitle,
        description: tplDesc,
        capcut_url: tplCapcutUrl,
        tiktok_url: tplTiktokUrl,
        thumbnail_url: tplThumb,
        tags,
        song_title: tplSong,
      })
      setTplModalOpen(false)
      await loadDashboardData()
      pushToast(editingTplId ? 'Template diperbarui.' : 'Template baru ditambahkan.')
    } catch (err) {
      setTplError(err instanceof Error ? err.message : 'Gagal menyimpan template.')
    } finally {
      setTplSaving(false)
    }
  }

  const toggleTemplateVisibility = async (t: CreatorTemplate) => {
    if (!user) return
    const nextStatus = t.status === 'active' ? 'hidden' : 'active'
    try {
      await saveCreatorTemplate(user.id, {
        id: t.id,
        title: t.title,
        description: t.description,
        capcut_url: t.capcut_url,
        tiktok_url: t.tiktok_url || '',
        thumbnail_url: t.thumbnail_url,
        tags: t.tags,
        song_title: t.song_title || '',
        status: nextStatus,
      })
      await loadDashboardData()
      pushToast(nextStatus === 'hidden' ? 'Template disembunyikan dari publik.' : 'Template ditampilkan kembali.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengubah status template.', 'err')
    }
  }

  const handleDeleteTemplate = async (t: CreatorTemplate) => {
    if (!user) return
    try {
      await deleteOwnTemplate(user.id, t.id)
      await loadDashboardData()
      pushToast(`Template “${t.title}” dihapus.`)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menghapus template.', 'err')
    }
  }

  const handleReorder = (nextOrder: CreatorTemplate[]) => {
    setTemplates(nextOrder)
    if (user) {
      void reorderOwnTemplates(
        user.id,
        nextOrder.map((t) => t.id)
      )
    }
  }

  const moveItemByStep = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta
    if (targetIdx < 0 || targetIdx >= templates.length) return
    const copy = [...templates]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIdx, 0, moved)
    handleReorder(copy)
  }

  const capcutCheck = validateAllowedUrl(tplCapcutUrl, 'capcut', true)
  const chartPoints = rangeDays === 7 ? analytics?.series7d || [] : analytics?.series30d || []
  const maxChartVal = Math.max(1, ...chartPoints.map((p) => Math.max(p.views, p.clicks)))

  return (
    <SiteLayout hideFooter>
      <SupabaseSetupPanel compact />
      <div className="mx-auto max-w-[1280px] px-4 pt-6 pb-28 md:px-6 lg:px-8 lg:pb-14">
        {/* Top Action Bar */}
        {profile && (
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-edge bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <Avatar src={avatarUrl} name={profile.display_name} size="md" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em] text-fg">
                    Dasbor @{profile.username}
                  </h1>
                  {profile.is_banned && <Badge variant="err">Ditangguhkan</Badge>}
                </div>
                <p className="m-0 truncate font-mono text-[12px] text-fg-sec">
                  {publicUrl.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isSandboxEnabled() && !isAdmin && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    grantSandboxAdmin(user.id)
                    await refreshAuth()
                    pushToast('Akses Admin Sandbox diaktifkan untuk pengujian moderasi.')
                  }}
                >
                  <ShieldCheck size={15} className="text-accent" />
                  <span>Aktifkan Admin (Sandbox)</span>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={copyProfileUrl}>
                {copied ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
                <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode size={15} />
                <span>QR & Bagikan</span>
              </Button>
              <LinkButton to={`/@${profile.username}`} variant="primary" size="sm">
                <span>Lihat Profil</span>
                <ExternalLink size={14} />
              </LinkButton>
            </div>
          </div>
        )}

        {/* Desktop Tabs (>=1024px) */}
        <div className="mt-6 hidden lg:block">
          <Tabs<DashTab>
            layoutGroupId="dash-desktop-tabs"
            active={activeTab === 'preview' ? 'profile' : activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'templates', label: 'Kelola Template', count: templates.length },
              { id: 'profile', label: 'Edit Profil & Pratinjau' },
              { id: 'analytics', label: 'Analitik' },
            ]}
          />
        </div>

        {/* WORKSPACE CONTENT */}
        <div className="mt-6">
          {/* TAB 1: KELOLA TEMPLATE */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Daftar Template CapCut</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Tarik kartu untuk mengatur urutan tampilan di halaman publik Anda.
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={openNewTemplateModal}>
                    <Plus size={16} />
                    <span>Tambah Template</span>
                  </Button>
                </div>

                {loadingData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : templates.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-edge bg-elevated text-accent">
                      <CapCutGlyph size={22} />
                    </div>
                    <h3 className="mt-4 text-[17px] font-bold text-fg">
                      Tempel template CapCut pertama kamu
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-[42ch] text-[13.5px] text-fg-sec">
                      Cukup tempel tautan resmi CapCut, beri judul dan thumbnail, lalu template langsung tampil di profil publik dan halaman Jelajah.
                    </p>
                    <div className="mt-5">
                      <Button variant="primary" onClick={openNewTemplateModal}>
                        <Plus size={16} />
                        <span>Tambah Template Pertama</span>
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={templates}
                    onReorder={handleReorder}
                    className="m-0 list-none space-y-3 p-0"
                  >
                    {templates.map((tpl, index) => (
                      <Reorder.Item
                        key={tpl.id}
                        value={tpl}
                        className="flex flex-col gap-3 rounded-2xl border border-edge bg-surface p-3 shadow-xs select-none sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="cursor-grab rounded-lg p-1.5 text-fg-sec active:cursor-grabbing"
                          >
                            <GripVertical size={18} />
                          </div>

                          <div className="h-18 w-14 shrink-0 overflow-hidden rounded-lg border border-edge">
                            <ProgressiveImage
                              src={tpl.thumbnail_url}
                              alt={tpl.title}
                              ratio="4:5"
                              fallbackLabel="4:5"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[14.5px] font-bold text-fg">{tpl.title}</span>
                              {tpl.status === 'hidden' && <Badge variant="warn">Disembunyikan</Badge>}
                            </div>
                            <span className="mt-0.5 block truncate font-mono text-[11.5px] text-fg-sec">
                              {tpl.capcut_url}
                            </span>
                            {tpl.tags.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {tpl.tags.map((tag) => (
                                  <span key={tag} className="font-mono text-[10.5px] text-fg-sec">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-edge pt-2.5 sm:border-t-0 sm:pt-0">
                          <IconButton
                            label="Pindah ke atas"
                            disabled={index === 0}
                            onClick={() => moveItemByStep(index, -1)}
                          >
                            <ArrowUp size={15} />
                          </IconButton>
                          <IconButton
                            label="Pindah ke bawah"
                            disabled={index === templates.length - 1}
                            onClick={() => moveItemByStep(index, 1)}
                          >
                            <ArrowDown size={15} />
                          </IconButton>
                          <IconButton
                            label={tpl.status === 'active' ? 'Sembunyikan template' : 'Tampilkan template'}
                            onClick={() => toggleTemplateVisibility(tpl)}
                          >
                            {tpl.status === 'active' ? <Eye size={16} /> : <EyeOff size={16} />}
                          </IconButton>
                          <IconButton label="Ubah template" onClick={() => openEditTemplateModal(tpl)}>
                            <Edit3 size={16} />
                          </IconButton>
                          <IconButton label="Hapus template" onClick={() => handleDeleteTemplate(tpl)}>
                            <Trash2 size={16} className="text-err" />
                          </IconButton>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>

              {/* Desktop Live Compact Preview Column */}
              {liveDraftProfile && (
                <aside className="hidden lg:block">
                  <div className="sticky top-24">
                    <div className="mb-2.5 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                        Pratinjau Langsung
                      </span>
                      <span className="font-mono text-[11px] text-accent">@{liveDraftProfile.username}</span>
                    </div>
                    <div className="max-h-[calc(100dvh-140px)] overflow-y-auto rounded-3xl border border-edge bg-bg p-3">
                      <PublicProfileRenderer
                        profile={liveDraftProfile}
                        templates={templates.filter((t) => t.status === 'active')}
                        compactPreview
                      />
                    </div>
                  </div>
                </aside>
              )}
            </div>
          )}

          {/* TAB 2: EDIT PROFIL & LIVE PREVIEW */}
          {activeTab === 'profile' && liveDraftProfile && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_420px]">
              <Card className="p-5 sm:p-7">
                <h2 className="m-0 text-[18px] font-bold text-fg">Identitas & Tautan Sosial</h2>
                <p className="mt-1 text-[13px] text-fg-sec">
                  Gambar yang diunggah otomatis diperkecil dan dikonversi ke WebP maks. 2 MB.
                </p>

                {/* Hidden Image Inputs */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleUploadImage(f, 'avatar')
                    e.target.value = ''
                  }}
                />
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleUploadImage(f, 'banner')
                    e.target.value = ''
                  }}
                />

                {/* Avatar & Banner Upload Controls */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-bg p-3.5">
                    <Avatar src={avatarUrl} name={displayName || username} size="lg" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-fg">Foto Profil (1:1)</span>
                      <span className="block text-[11.5px] text-fg-sec">Otomatis 512×512 WebP</span>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={uploadingImg === 'avatar'}
                          onClick={() => avatarInputRef.current?.click()}
                        >
                          <ImagePlus size={14} />
                          <span>Unggah</span>
                        </Button>
                        {avatarUrl && (
                          <Button variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
                            Hapus
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl border border-edge bg-bg p-3.5">
                    <div>
                      <span className="block text-[13px] font-semibold text-fg">Banner Sampul (3:1)</span>
                      <span className="block text-[11.5px] text-fg-sec">Opsional · 1600×534 WebP</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={uploadingImg === 'banner'}
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        <ImagePlus size={14} />
                        <span>{bannerUrl ? 'Ganti Banner' : 'Unggah Banner'}</span>
                      </Button>
                      {bannerUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setBannerUrl(null)}>
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Username (@)"
                      value={username}
                      maxLength={24}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    />
                    <Input
                      label="Nama Tampilan"
                      value={displayName}
                      maxLength={50}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <Select
                    label="Kategori Kreator"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CREATOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>

                  <Textarea
                    label="Bio Singkat"
                    value={bio}
                    maxLength={160}
                    rightMeta={`${bio.length}/160`}
                    onChange={(e) => setBio(e.target.value)}
                  />

                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                    <Input
                      label="Tautan TikTok"
                      placeholder="https://www.tiktok.com/@username"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                    />
                    <Input
                      label="Tautan Instagram"
                      placeholder="https://www.instagram.com/username"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                    />
                    <Input
                      label="Tautan YouTube"
                      placeholder="https://www.youtube.com/@channel"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                    />
                    <Input
                      label="Situs Web Resmi (HTTPS)"
                      placeholder="https://domainanda.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" loading={savingProfile}>
                      Simpan Perubahan Profil
                    </Button>
                  </div>
                </form>
              </Card>

              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                      Pratinjau Halaman Publik
                    </span>
                    <span className="font-mono text-[11px] text-accent">Real-time</span>
                  </div>
                  <div className="max-h-[calc(100dvh-140px)] overflow-y-auto rounded-3xl border border-edge bg-bg p-3">
                    <PublicProfileRenderer
                      profile={liveDraftProfile}
                      templates={templates.filter((t) => t.status === 'active')}
                      compactPreview
                    />
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* TAB 3: ANALITIK */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {[
                  {
                    label: 'Total Kunjungan Profil',
                    val: analytics?.totalProfileViews ?? 0,
                    sub: `${analytics?.views7d ?? 0} dalam 7 hari terakhir`,
                  },
                  {
                    label: 'Klik Pakai di CapCut',
                    val: analytics?.totalCapcutClicks ?? 0,
                    sub: 'Total pembukaan template',
                  },
                  {
                    label: 'Klik Profil TikTok',
                    val: analytics?.totalTiktokClicks ?? 0,
                    sub: 'Kunjungan ke akun TikTok',
                  },
                  {
                    label: 'Klik Tautan Sosial Lain',
                    val: analytics?.totalSocialClicks ?? 0,
                    sub: `${analytics?.clicks7d ?? 0} total klik 7 hari`,
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="p-5">
                    <span className="block text-[12.5px] text-fg-sec">{stat.label}</span>
                    <span className="mt-2 block font-mono text-[28px] font-bold tabular-nums text-fg">
                      {stat.val}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] tabular-nums text-accent">
                      {stat.sub}
                    </span>
                  </Card>
                ))}
              </div>

              {/* 7 / 30 Day Chart */}
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[16px] font-bold text-fg">Tren Kunjungan & Klik</h2>
                    <p className="mt-0.5 text-[12.5px] text-fg-sec">
                      Dihitung secara agregat harian tanpa merekam identitas pribadi pengunjung.
                    </p>
                  </div>
                  <div className="inline-flex rounded-xl border border-edge bg-bg p-1">
                    {([7, 30] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setRangeDays(d)}
                        className={`min-h-9 cursor-pointer rounded-lg px-3 font-mono text-[12px] transition-colors ${
                          rangeDays === d ? 'bg-accent text-on-accent font-semibold' : 'text-fg-sec'
                        }`}
                      >
                        {d} Hari
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex h-44 items-end gap-1.5 border-b border-edge pb-2 pt-4">
                  {chartPoints.map((pt) => {
                    const vH = Math.max(4, Math.round((pt.views / maxChartVal) * 128))
                    const cH = Math.max(4, Math.round((pt.clicks / maxChartVal) * 128))
                    return (
                      <div key={pt.date} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="flex w-full items-end justify-center gap-0.5 h-32">
                          <div
                            title={`${pt.date}: ${pt.views} view`}
                            style={{ height: vH }}
                            className="w-2 max-w-[10px] rounded-t-xs bg-fg-muted/60"
                          />
                          <div
                            title={`${pt.date}: ${pt.clicks} klik`}
                            style={{ height: cH }}
                            className="w-2 max-w-[10px] rounded-t-xs bg-accent"
                          />
                        </div>
                        {rangeDays === 7 && (
                          <span className="font-mono text-[10px] tabular-nums text-fg-sec">
                            {pt.date.slice(5)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center gap-5 font-mono text-[11.5px] text-fg-sec">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-fg-muted/60" /> View
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-accent" /> Klik Tautan
                  </span>
                </div>
              </Card>

              {/* Top Templates Leaderboard */}
              <Card className="p-5 sm:p-6">
                <h2 className="m-0 text-[16px] font-bold text-fg">Template Terpopuler Anda</h2>
                {!analytics || analytics.topTemplates.length === 0 ? (
                  <p className="mt-3 text-[13.5px] text-fg-sec">
                    Data performa per template akan muncul setelah Anda menambahkan template dan membagikan profil.
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-edge">
                    {analytics.topTemplates.map((item, i) => (
                      <div key={item.template_id} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="font-mono text-[12px] text-accent">0{i + 1}</span>
                          <span className="truncate text-[14px] font-medium text-fg">{item.title}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 font-mono text-[12px] tabular-nums">
                          <span className="text-fg-sec">{item.views} view</span>
                          <span className="font-semibold text-accent">{item.clicks} klik CapCut</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 4 (Mobile Only): FULL LIVE PREVIEW */}
          {activeTab === 'preview' && liveDraftProfile && (
            <div className="lg:hidden">
              <PublicProfileRenderer
                profile={liveDraftProfile}
                templates={templates.filter((t) => t.status === 'active')}
                previewBadge="PRATINJAU LANGSUNG"
                compactPreview
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (<1024px) */}
      <nav
        aria-label="Navigasi dasbor kreator"
        className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-4 border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {[
          { id: 'templates' as const, label: 'Template', icon: Layers },
          { id: 'profile' as const, label: 'Profil', icon: UserCircle2 },
          { id: 'analytics' as const, label: 'Analitik', icon: BarChart3 },
          { id: 'preview' as const, label: 'Pratinjau', icon: Eye },
        ].map((item) => {
          const Icon = item.icon
          const on = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 border-t-2 text-[11px] font-medium transition-colors ${
                on ? 'border-accent text-accent' : 'border-transparent text-fg-sec'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Add / Edit Template Modal (Paste CapCut URL -> Instant Live Card Preview) */}
      <Modal
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        title={editingTplId ? 'Ubah Template CapCut' : 'Tambah Template CapCut'}
        description="Tempel tautan resmi template CapCut Anda, unggah thumbnail 4:5, dan beri judul."
        maxWidth="max-w-[660px]"
      >
        <input
          ref={thumbInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleUploadImage(f, 'thumbnail')
            e.target.value = ''
          }}
        />

        <form onSubmit={handleSaveTemplate} className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_200px]">
          <div className="space-y-4">
            <Input
              label="Tautan Template CapCut (Wajib)"
              placeholder="https://www.capcut.com/t/..."
              value={tplCapcutUrl}
              onChange={(e) => setTplCapcutUrl(e.target.value)}
              error={tplCapcutUrl.trim() && !capcutCheck.ok ? capcutCheck.error : undefined}
              hint="Mendukung capcut.com dan subdomain bagikan resminya."
              required
            />

            <Input
              label="Judul Template"
              placeholder="Transisi Beat Sync 12 Foto"
              value={tplTitle}
              maxLength={80}
              rightMeta={`${tplTitle.length}/80`}
              onChange={(e) => setTplTitle(e.target.value)}
              required
            />

            <Textarea
              label="Deskripsi Singkat (opsional)"
              placeholder="Cocok untuk kompilasi perjalanan atau foto bersama teman."
              rows={2}
              value={tplDesc}
              maxLength={200}
              rightMeta={`${tplDesc.length}/200`}
              onChange={(e) => setTplDesc(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Judul Lagu / Sound (opsional)"
                placeholder="DJ Slow Bass Viral"
                value={tplSong}
                maxLength={80}
                onChange={(e) => setTplSong(e.target.value)}
              />
              <Input
                label="Video Contoh di TikTok (opsional)"
                placeholder="https://vt.tiktok.com/..."
                value={tplTiktokUrl}
                onChange={(e) => setTplTiktokUrl(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Tag (maksimal 5, pisahkan koma)"
                placeholder="transisi, beat-sync, slowmo"
                value={tplTagsInput}
                onChange={(e) => setTplTagsInput(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {POPULAR_TEMPLATE_TAGS.slice(0, 6).map((tg) => (
                  <button
                    key={tg}
                    type="button"
                    onClick={() => {
                      const cur = tplTagsInput
                        .split(/[, ]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      if (!cur.includes(tg) && cur.length < 5) {
                        setTplTagsInput([...cur, tg].join(', '))
                      }
                    }}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-edge bg-elevated px-3 font-mono text-[11.5px] text-fg-sec [@media(hover:hover)]:hover:border-accent [@media(hover:hover)]:hover:text-fg"
                  >
                    +#{tg}
                  </button>
                ))}
              </div>
            </div>

            {tplError && <p className="text-[13px] text-err">{tplError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setTplModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" loading={tplSaving}>
                {editingTplId ? 'Simpan Perubahan' : 'Publikasikan Template'}
              </Button>
            </div>
          </div>

          {/* Live Thumbnail & Card Preview */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
              Thumbnail (4:5)
            </span>
            <div className="overflow-hidden rounded-2xl border border-edge bg-bg">
              <ProgressiveImage
                src={tplThumb}
                alt="Pratinjau thumbnail template"
                ratio="4:5"
                fallbackLabel="UNGGAH 4:5"
              />
              <div className="p-3">
                <p className="m-0 line-clamp-2 text-[13px] font-bold text-fg">
                  {tplTitle || 'Judul template tampil di sini'}
                </p>
                <span className="mt-1 block font-mono text-[11px] text-accent">
                  {capcutCheck.ok ? 'Domain CapCut terverifikasi' : 'Menunggu link CapCut'}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              loading={uploadingImg === 'thumbnail'}
              onClick={() => thumbInputRef.current?.click()}
            >
              <ImagePlus size={15} />
              <span>{tplThumb ? 'Ganti Thumbnail' : 'Unggah Gambar'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {profile && (
        <QrShareModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          username={profile.username}
          displayName={profile.display_name}
        />
      )}
    </SiteLayout>
  )
}
