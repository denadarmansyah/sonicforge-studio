import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  ImagePlus,
  Layers,
  Link2,
  Lock,
  Palette,
  Plus,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
} from 'lucide-react'
import { PLANS } from '../config/plans'
import { useAuth } from '../context/AuthContext'
import {
  deleteOwnLink,
  deleteOwnTemplate,
  getCreatorAnalytics,
  grantSandboxAdmin,
  listOwnLinks,
  listOwnSubscriptions,
  listOwnTemplates,
  reorderOwnLinks,
  reorderOwnTemplates,
  saveCreatorTemplate,
  saveLinkItem,
  saveOwnAppearance,
  saveOwnProfile,
  uploadCreatorImage,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, isSandboxEnabled, SITE_ORIGIN } from '../lib/supabaseClient'
import {
  DEFAULT_FREE_THEME,
  DEFAULT_PROFILE_SETTINGS,
  getEffectivePlan,
  ProfileSettings,
  ProfileThemeConfig,
  sanitizeProfileSettings,
  sanitizeProfileTheme,
} from '../lib/themeConfig'
import {
  CreatorAnalyticsSummary,
  CreatorTemplate,
  LinkItem,
  LinkItemType,
  Profile,
  SubscriptionRecord,
} from '../lib/types'
import {
  CREATOR_CATEGORIES,
  POPULAR_TEMPLATE_TAGS,
  validateAllowedUrl,
} from '../lib/validators'
import { AppearanceStudio } from '../ui/AppearanceStudio'
import { hasIllustration, Illustration } from '../ui/Illustration'
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
import { UpgradeProModal } from '../ui/UpgradeProModal'

type DashTab = 'links' | 'templates' | 'appearance' | 'profile' | 'analytics' | 'billing' | 'preview'

const LINK_TYPE_OPTIONS: { value: LinkItemType; label: string; proOnly?: boolean; hint: string }[] = [
  { value: 'link', label: 'Tautan Umum (HTTPS)', hint: 'Toko online, portofolio, formulir, atau tautan resmi lain.' },
  { value: 'capcut', label: 'Template CapCut', hint: 'Tautan bagikan resmi capcut.com.' },
  { value: 'tiktok', label: 'Profil / Video TikTok', hint: 'Tautan resmi tiktok.com atau vt.tiktok.com.' },
  { value: 'whatsapp', label: 'Kontak WhatsApp', hint: 'Gunakan format https://wa.me/628...' },
  { value: 'instagram', label: 'Instagram', hint: 'Tautan profil atau reel instagram.com.' },
  { value: 'youtube', label: 'YouTube', hint: 'Tautan channel atau video youtube.com / youtu.be.' },
  { value: 'website', label: 'Situs Web Pribadi', hint: 'Alamat HTTPS domain resmi kamu.' },
  { value: 'heading', label: 'Judul Bagian (Pemisah)', hint: 'Teks pemisah antar-kelompok link (tidak dihitung kuota link).' },
  { value: 'announcement', label: 'Pita Pengumuman (Pro)', proOnly: true, hint: 'Kotak info penting tanpa URL di bagian atas daftar.' },
  { value: 'embed_tiktok', label: 'Sematkan Video TikTok (Pro)', proOnly: true, hint: 'Tampilkan pemutar video TikTok langsung di halaman profil.' },
  { value: 'embed_youtube', label: 'Sematkan Video YouTube (Pro)', proOnly: true, hint: 'Tampilkan pemutar video YouTube langsung di halaman profil.' },
]

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DashboardPage() {
  const { loading: authLoading, user, profile, hasClaimedUsername, isAdmin, refreshAuth } = useAuth()
  const { pushToast } = useToast()

  const [activeTab, setActiveTab] = useState<DashTab>('links')
  const [links, setLinks] = useState<LinkItem[]>([])
  const [templates, setTemplates] = useState<CreatorTemplate[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [analytics, setAnalytics] = useState<CreatorAnalyticsSummary | null>(null)
  const [rangeDays, setRangeDays] = useState<'7' | '30' | '90'>('7')
  const [loadingData, setLoadingData] = useState(true)
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null)

  // Profile Editor State
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
  const [uploadingImg, setUploadingImg] = useState<'avatar' | 'banner' | 'thumbnail' | 'link_thumb' | null>(null)

  // Appearance Studio State (debounced preview sync for 60fps smoothness)
  const [draftTheme, setDraftTheme] = useState<ProfileThemeConfig>(DEFAULT_FREE_THEME)
  const [draftSettings, setDraftSettings] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS)
  const [debouncedTheme, setDebouncedTheme] = useState<ProfileThemeConfig>(DEFAULT_FREE_THEME)
  const [savingAppearance, setSavingAppearance] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const thumbInputRef = useRef<HTMLInputElement>(null)
  const linkThumbInputRef = useRef<HTMLInputElement>(null)

  // Link Item Modal Form State
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [linkType, setLinkType] = useState<LinkItemType>('link')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkThumb, setLinkThumb] = useState<string | null>(null)
  const [linkActive, setLinkActive] = useState(true)
  const [linkFeatured, setLinkFeatured] = useState(false)
  const [linkGroup, setLinkGroup] = useState('')
  const [linkSchedStart, setLinkSchedStart] = useState('')
  const [linkSchedEnd, setLinkSchedEnd] = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkError, setLinkError] = useState('')

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
    description: 'Kelola link-in-bio, Studio Tampilan, urutan template CapCut, kode QR, dan analitik klik kamu.',
    path: '/dashboard',
  })

  const effectivePlan = profile ? getEffectivePlan(profile.plan, profile.plan_expires_at) : 'free'
  const isPro = effectivePlan === 'pro'

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedTheme(draftTheme), 90)
    return () => window.clearTimeout(t)
  }, [draftTheme])

  useEffect(() => {
    if (!profile) return
    const eff = getEffectivePlan(profile.plan, profile.plan_expires_at)
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
    const cleanT = sanitizeProfileTheme(profile.theme, eff)
    setDraftTheme(cleanT)
    setDebouncedTheme(cleanT)
    setDraftSettings(sanitizeProfileSettings(profile.settings, eff))
  }, [profile])

  const loadDashboardData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    try {
      const [ownLinks, tpls, subs] = await Promise.all([
        listOwnLinks(user.id),
        listOwnTemplates(user.id),
        listOwnSubscriptions(user.id),
      ])
      setLinks(ownLinks)
      setTemplates(tpls)
      setSubscriptions(subs)
      const stats = await getCreatorAnalytics(user.id, tpls, ownLinks, profile?.username || '')
      setAnalytics(stats)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat data dasbor.', 'err')
    } finally {
      setLoadingData(false)
    }
  }, [user, profile?.username, pushToast])

  useEffect(() => {
    if (user && hasClaimedUsername) {
      void loadDashboardData()
    }
  }, [user, hasClaimedUsername, loadDashboardData])

  const expiryNotice = useMemo(() => {
    if (!profile?.plan_expires_at) return null
    const expMs = new Date(profile.plan_expires_at).getTime()
    if (Number.isNaN(expMs)) return null
    const diffDays = Math.ceil((expMs - Date.now()) / (24 * 60 * 60 * 1000))
    if (profile.plan === 'pro' && diffDays <= 0) {
      return {
        expired: true,
        text: 'Masa aktif paket Pro kamu telah berakhir. Halaman kembali memakai tema dasar Free sementara seluruh data link & pengaturan Pro tetap tersimpan.',
      }
    }
    if (isPro && diffDays <= 7) {
      return {
        expired: false,
        text: `Masa aktif paket Pro berakhir dalam ${diffDays} hari (${new Date(profile.plan_expires_at).toLocaleDateString('id-ID')}). Perpanjang agar tema kustom tetap aktif.`,
      }
    }
    return null
  }, [profile?.plan, profile?.plan_expires_at, isPro])

  if (!authLoading && !user) return <Navigate to="/login" replace />
  if (!authLoading && user && !hasClaimedUsername) {
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
        theme: debouncedTheme,
        settings: draftSettings,
      }
    : null

  const activeTemplates = templates.filter((t) => t.status === 'active')
  const activeNonHeadingCount = links.filter((l) => l.type !== 'heading' && l.is_active).length
  const freeQuotaReached = !isPro && activeNonHeadingCount >= (PLANS.free.maxActiveLinks ?? 8)

  const publicUrl = profile ? `${SITE_ORIGIN}/@${profile.username}` : SITE_ORIGIN
  const referralUrl = profile ? `${SITE_ORIGIN}/register?ref=${profile.username}` : SITE_ORIGIN

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      pushToast('Tautan profil disalin.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      pushToast('Gagal menyalin tautan.', 'err')
    }
  }

  const copyReferralUrl = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopiedRef(true)
      pushToast('Tautan referral disalin.')
      setTimeout(() => setCopiedRef(false), 2000)
    } catch {
      pushToast('Gagal menyalin tautan referral.', 'err')
    }
  }

  const handleUploadImage = async (
    file: File,
    kind: 'avatar' | 'banner' | 'thumbnail',
    forLink = false
  ) => {
    if (!user) return
    setUploadingImg(forLink ? 'link_thumb' : kind)
    try {
      const url = await uploadCreatorImage(user.id, file, kind)
      if (forLink) setLinkThumb(url)
      else if (kind === 'avatar') setAvatarUrl(url)
      else if (kind === 'banner') setBannerUrl(url)
      else setTplThumb(url)
      pushToast('Gambar dikonversi ke WebP dan diunggah.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengunggah gambar.', 'err')
    } finally {
      setUploadingImg(null)
    }
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingProfile(true)
    try {
      await saveOwnProfile(user.id, {
        display_name: displayName,
        bio,
        category,
        tiktok_url: tiktokUrl,
        instagram_url: instagramUrl,
        youtube_url: youtubeUrl,
        website_url: websiteUrl,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })
      await refreshAuth()
      pushToast('Perubahan profil disimpan.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menyimpan profil.', 'err')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveAppearance = async () => {
    if (!user) return
    setSavingAppearance(true)
    try {
      await saveOwnAppearance(user.id, draftTheme, draftSettings)
      await refreshAuth()
      pushToast('Tampilan halaman publik disimpan.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menyimpan tampilan.', 'err')
    } finally {
      setSavingAppearance(false)
    }
  }

  // LINK CRUD HANDLERS
  const openNewLinkModal = (presetType: LinkItemType = 'link') => {
    if (!isPro && presetType !== 'heading' && freeQuotaReached) {
      setUpgradeFeature('Link Tanpa Batas (lebih dari 8 link aktif)')
      return
    }
    setEditingLinkId(null)
    setLinkType(presetType)
    setLinkTitle('')
    setLinkUrl('')
    setLinkThumb(null)
    setLinkActive(true)
    setLinkFeatured(false)
    setLinkGroup('')
    setLinkSchedStart('')
    setLinkSchedEnd('')
    setLinkError('')
    setLinkModalOpen(true)
  }

  const openEditLinkModal = (item: LinkItem) => {
    setEditingLinkId(item.id)
    setLinkType(item.type)
    setLinkTitle(item.title)
    setLinkUrl(item.url || '')
    setLinkThumb(item.thumbnail_url)
    setLinkActive(item.is_active)
    setLinkFeatured(item.is_featured)
    setLinkGroup(item.group_id || '')
    setLinkSchedStart(toDatetimeLocalValue(item.schedule_start))
    setLinkSchedEnd(toDatetimeLocalValue(item.schedule_end))
    setLinkError('')
    setLinkModalOpen(true)
  }

  const handleSaveLink = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLinkSaving(true)
    setLinkError('')
    try {
      await saveLinkItem(user.id, {
        id: editingLinkId || undefined,
        type: linkType,
        title: linkTitle,
        url: linkType === 'heading' || linkType === 'announcement' ? null : linkUrl,
        thumbnail_url: linkThumb,
        is_active: linkActive,
        is_featured: isPro ? linkFeatured : false,
        group_id: isPro && linkGroup.trim() ? linkGroup.trim() : null,
        schedule_start: isPro && linkSchedStart ? new Date(linkSchedStart).toISOString() : null,
        schedule_end: isPro && linkSchedEnd ? new Date(linkSchedEnd).toISOString() : null,
      })
      setLinkModalOpen(false)
      await loadDashboardData()
      pushToast(editingLinkId ? 'Item link diperbarui.' : 'Item link ditambahkan.')
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Gagal menyimpan link.')
    } finally {
      setLinkSaving(false)
    }
  }

  const toggleLinkActive = async (item: LinkItem) => {
    if (!user) return
    if (!item.is_active && item.type !== 'heading' && freeQuotaReached) {
      setUpgradeFeature('Link Tanpa Batas (lebih dari 8 link aktif)')
      return
    }
    try {
      await saveLinkItem(user.id, {
        id: item.id,
        type: item.type,
        title: item.title,
        url: item.url,
        thumbnail_url: item.thumbnail_url,
        is_active: !item.is_active,
        is_featured: item.is_featured,
        group_id: item.group_id,
        schedule_start: item.schedule_start,
        schedule_end: item.schedule_end,
      })
      await loadDashboardData()
      pushToast(!item.is_active ? 'Link diaktifkan.' : 'Link disembunyikan.')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengubah status link.', 'err')
    }
  }

  const handleDeleteLink = async (item: LinkItem) => {
    if (!user) return
    try {
      await deleteOwnLink(user.id, item.id)
      await loadDashboardData()
      pushToast(`“${item.title}” dihapus.`)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal menghapus link.', 'err')
    }
  }

  const handleReorderLinks = (nextOrder: LinkItem[]) => {
    setLinks(nextOrder)
    if (user) {
      void reorderOwnLinks(
        user.id,
        nextOrder.map((l) => l.id)
      )
    }
  }

  const moveLinkByStep = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta
    if (targetIdx < 0 || targetIdx >= links.length) return
    const copy = [...links]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIdx, 0, moved)
    handleReorderLinks(copy)
  }

  // TEMPLATE CRUD HANDLERS
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

  const handleSaveTemplate = async (e: FormEvent) => {
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
      pushToast(nextStatus === 'hidden' ? 'Template disembunyikan.' : 'Template ditampilkan kembali.')
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

  const handleReorderTemplates = (nextOrder: CreatorTemplate[]) => {
    setTemplates(nextOrder)
    if (user) {
      void reorderOwnTemplates(
        user.id,
        nextOrder.map((t) => t.id)
      )
    }
  }

  const moveTemplateByStep = (index: number, delta: -1 | 1) => {
    const targetIdx = index + delta
    if (targetIdx < 0 || targetIdx >= templates.length) return
    const copy = [...templates]
    const [moved] = copy.splice(index, 1)
    copy.splice(targetIdx, 0, moved)
    handleReorderTemplates(copy)
  }

  const capcutCheck = validateAllowedUrl(tplCapcutUrl, 'capcut', true)
  const chartPoints =
    rangeDays === '90' && isPro
      ? analytics?.series90d || []
      : rangeDays === '30' && isPro
        ? analytics?.series30d || []
        : analytics?.series7d || []
  const maxChartVal = Math.max(1, ...chartPoints.map((p) => Math.max(p.views, p.clicks)))

  const renderPhonePreview = () =>
    liveDraftProfile ? (
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
              Pratinjau Halaman Bio
            </span>
            <span className="font-mono text-[11px] text-fg">@{liveDraftProfile.username}</span>
          </div>
          <div className="mx-auto max-h-[calc(100dvh-140px)] w-full max-w-[390px] overflow-y-auto rounded-[32px] border-2 border-edge bg-bg p-2.5 shadow-xl">
            <PublicProfileRenderer
              profile={liveDraftProfile}
              templates={activeTemplates}
              links={links}
              compactPreview
            />
          </div>
        </div>
      </aside>
    ) : null

  const selectedLinkOption = LINK_TYPE_OPTIONS.find((o) => o.value === linkType) || LINK_TYPE_OPTIONS[0]
  const canUploadLinkThumb = isPro || linkType === 'capcut'

  return (
    <SiteLayout hideFooter>
      <SupabaseSetupPanel compact />
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-28 md:px-6 lg:px-8 lg:pb-16">
        {/* Expiry Warning Banner */}
        {expiryNotice && (
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-fg bg-elevated p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-fg" />
              <p className="m-0 text-[13.5px] leading-relaxed text-fg">{expiryNotice.text}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setUpgradeFeature('Perpanjang Paket Pro')}>
              <Sparkles size={15} />
              <span>Perpanjang Pro</span>
            </Button>
          </div>
        )}

        {/* Top Header Action Bar */}
        {profile && (
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-edge bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex min-w-0 items-center gap-3.5">
              <Avatar src={avatarUrl} name={profile.display_name} size="md" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em] text-fg">
                    @{profile.username}
                  </h1>
                  <Badge variant={isPro ? 'accent' : 'neutral'}>{isPro ? 'PRO' : 'FREE'}</Badge>
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
                    pushToast('Akses Admin Sandbox diaktifkan.')
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Admin Sandbox</span>
                </Button>
              )}
              {!isPro && (
                <Button variant="outline" size="sm" onClick={() => setUpgradeFeature('Upgrade ke Luven Pro')}>
                  <Sparkles size={15} />
                  <span>Upgrade ke Pro</span>
                </Button>
              )}
              <LinkButton to="/dashboard/settings" variant="secondary" size="sm">
                <Settings size={15} />
                <span>Pengaturan Akun</span>
              </LinkButton>
              <Button variant="secondary" size="sm" onClick={copyProfileUrl}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
                <QrCode size={15} />
                <span>Kode QR</span>
              </Button>
              <LinkButton to={`/@${profile.username}`} variant="primary" size="sm">
                <span>Buka Bio</span>
                <ExternalLink size={15} />
              </LinkButton>
            </div>
          </div>
        )}

        {/* Mobile/Tablet Section Selector (<1024px) + Desktop Sidebar Layout */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:hidden">
          {(
            [
              { id: 'links', label: `Link Bio (${activeNonHeadingCount})` },
              { id: 'appearance', label: 'Tampilan' },
              { id: 'templates', label: `CapCut (${templates.length})` },
              { id: 'profile', label: 'Profil & Sosial' },
              { id: 'analytics', label: 'Analitik' },
              { id: 'billing', label: 'Paket & Tagihan' },
            ] as const
          ).map((t) => (
            <Button
              key={t.id}
              variant={activeTab === t.id ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab(t.id)}
              className="px-2.5! text-[12.5px]!"
            >
              <span className="truncate">{t.label}</span>
            </Button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          {/* Desktop Left Sidebar (>=1024px) */}
          <aside aria-label="Menu bagian dasbor" className="hidden lg:sticky lg:top-24 lg:block">
            <Card className="space-y-1 p-2">
              {(
                [
                  { id: 'links', label: 'Link Bio', icon: Link2, count: activeNonHeadingCount },
                  { id: 'appearance', label: 'Tampilan', icon: Palette },
                  { id: 'templates', label: 'Template CapCut', icon: Layers, count: templates.length },
                  { id: 'profile', label: 'Profil & Sosial', icon: UserCircle2 },
                  { id: 'analytics', label: 'Analitik', icon: BarChart3 },
                  { id: 'billing', label: 'Paket & Tagihan', icon: CreditCard },
                ] as const
              ).map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <Button
                    key={item.id}
                    variant={active ? 'primary' : 'ghost'}
                    size="md"
                    fullWidth
                    onClick={() => setActiveTab(item.id)}
                    className="justify-between! px-3!"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </span>
                    {'count' in item && typeof item.count === 'number' && (
                      <span className="font-mono text-[11px] opacity-80">{item.count}</span>
                    )}
                  </Button>
                )
              })}
              <div className="my-1 border-t border-edge pt-1">
                <LinkButton
                  to="/dashboard/settings"
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="justify-start! px-3!"
                >
                  <Settings size={16} />
                  <span>Pengaturan Akun</span>
                </LinkButton>
              </div>
            </Card>
          </aside>

          {/* WORKSPACE CONTENT */}
          <div className="min-w-0">
          {/* TAB 1: KELOLA LINK-IN-BIO */}
          {activeTab === 'links' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-[18px] font-bold text-fg">Daftar Link Halaman Bio</h2>
                      <Badge variant={freeQuotaReached ? 'warn' : 'neutral'}>
                        {isPro
                          ? `${activeNonHeadingCount} aktif · Tanpa batas`
                          : `${activeNonHeadingCount} / ${PLANS.free.maxActiveLinks} link aktif`}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Urutkan tautan yang tampil di halaman <span className="font-mono text-fg">/@{profile?.username}</span>. Judul bagian tidak mengurangi kuota Free.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openNewLinkModal('heading')}>
                      <Plus size={15} />
                      <span>Judul Bagian</span>
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => openNewLinkModal('link')}>
                      <Plus size={15} />
                      <span>Tambah Link</span>
                    </Button>
                  </div>
                </div>

                {freeQuotaReached && (
                  <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-edge bg-elevated p-4 sm:flex-row sm:items-center">
                    <p className="m-0 text-[13px] text-fg-sec">
                      Batas 8 link aktif pada paket Free telah tercapai. Upgrade ke Pro untuk menambahkan link, video embed, dan grup lipat tanpa batas.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setUpgradeFeature('Link Tanpa Batas')}
                    >
                      <Sparkles size={15} />
                      <span>Upgrade ke Pro</span>
                    </Button>
                  </div>
                )}

                {loadingData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : links.length === 0 ? (
                  <Card className="p-6 text-center sm:p-8">
                    {hasIllustration('empty-dashboard') ? (
                      <div className="mx-auto mb-6 max-w-[240px]">
                        <Illustration
                          name="empty-dashboard"
                          alt="Ilustrasi papan kosong dengan tanda tambah di ruang kreatif"
                          sizes="240px"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                        <Link2 size={20} />
                      </div>
                    )}
                    <h3 className="m-0 text-[18px] font-bold text-fg">
                      Tambahkan tautan pertama ke halaman bio kamu
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-[44ch] text-[14px] text-fg-sec">
                      Tempel link toko, kontak WhatsApp, sosial media, atau template CapCut agar pengunjung TikTok langsung menuju halaman resmimu.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <Button variant="primary" onClick={() => openNewLinkModal('link')}>
                        <Plus size={16} />
                        <span>Tambah Link Pertama</span>
                      </Button>
                      <Button variant="secondary" onClick={() => openNewLinkModal('whatsapp')}>
                        <span>Tambah WhatsApp</span>
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={links}
                    onReorder={handleReorderLinks}
                    className="m-0 list-none space-y-2.5 p-0"
                  >
                    {links.map((item, index) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        className={`flex flex-col gap-3 rounded-2xl border p-3.5 select-none sm:flex-row sm:items-center ${
                          item.type === 'heading'
                            ? 'border-dashed border-edge bg-bg'
                            : 'border-edge bg-surface'
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            aria-hidden="true"
                            className="cursor-grab rounded-lg p-1 text-fg-sec active:cursor-grabbing"
                          >
                            <GripVertical size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={item.type === 'heading' ? 'neutral' : 'ok'}>
                                {item.type.toUpperCase()}
                              </Badge>
                              <span className="truncate text-[14px] font-bold text-fg">{item.title}</span>
                              {!item.is_active && <Badge variant="warn">Nonaktif</Badge>}
                              {item.is_featured && isPro && <Badge variant="accent">Sorotan</Badge>}
                              {item.group_id && isPro && (
                                <Badge variant="neutral">Grup: {item.group_id}</Badge>
                              )}
                            </div>
                            {item.url && (
                              <span className="mt-1 block truncate font-mono text-[11.5px] text-fg-sec">
                                {item.url}
                              </span>
                            )}
                            {(item.schedule_start || item.schedule_end) && isPro && (
                              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-fg-muted">
                                <Calendar size={12} />
                                <span>Terjadwal otomatis</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-edge pt-2.5 sm:border-t-0 sm:pt-0">
                          <IconButton
                            size="sm"
                            label="Pindah ke atas"
                            disabled={index === 0}
                            onClick={() => moveLinkByStep(index, -1)}
                          >
                            <ArrowUp size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            label="Pindah ke bawah"
                            disabled={index === links.length - 1}
                            onClick={() => moveLinkByStep(index, 1)}
                          >
                            <ArrowDown size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            label={item.is_active ? 'Nonaktifkan link' : 'Aktifkan link'}
                            onClick={() => toggleLinkActive(item)}
                          >
                            {item.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                          </IconButton>
                          <IconButton size="sm" label="Ubah link" onClick={() => openEditLinkModal(item)}>
                            <Edit3 size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            variant="destructive"
                            label="Hapus link"
                            onClick={() => handleDeleteLink(item)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>

              {renderPhonePreview()}
            </div>
          )}

          {/* TAB 2: STUDIO TAMPILAN (APPEARANCE) */}
          {activeTab === 'appearance' && user && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
              <AppearanceStudio
                userId={user.id}
                effectivePlan={effectivePlan}
                theme={draftTheme}
                settings={draftSettings}
                onChangeTheme={setDraftTheme}
                onChangeSettings={setDraftSettings}
                onSave={handleSaveAppearance}
                saving={savingAppearance}
                onRequirePro={(feat) => setUpgradeFeature(feat)}
              />
              {renderPhonePreview()}
            </div>
          )}

          {/* TAB 3: KELOLA TEMPLATE CAPCUT */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Koleksi Template CapCut</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Tarik kartu untuk mengatur urutan tampilan di profil publik dan halaman Jelajah.
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
                  <Card className="p-6 text-center sm:p-8">
                    {hasIllustration('empty-templates') ? (
                      <div className="mx-auto mb-6 max-w-[240px]">
                        <Illustration
                          name="empty-templates"
                          alt="Ilustrasi map terbuka kosong dengan satu klip video"
                          sizes="240px"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                        <Layers size={20} />
                      </div>
                    )}
                    <h3 className="m-0 text-[18px] font-bold text-fg">
                      Tempel template CapCut pertama kamu
                    </h3>
                    <p className="mx-auto mt-2 max-w-[42ch] text-[14px] text-fg-sec">
                      Masukkan tautan resmi CapCut dan unggah poster pratinjau agar template langsung muncul di profil dan halaman Jelajah.
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
                    onReorder={handleReorderTemplates}
                    className="m-0 list-none space-y-3 p-0"
                  >
                    {templates.map((tpl, index) => (
                      <Reorder.Item
                        key={tpl.id}
                        value={tpl}
                        className="flex flex-col gap-3 rounded-2xl border border-edge bg-surface p-3 select-none sm:flex-row sm:items-center"
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
                              fallbackLabel="POSTER"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[14px] font-bold text-fg">{tpl.title}</span>
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
                            size="sm"
                            label="Pindah ke atas"
                            disabled={index === 0}
                            onClick={() => moveTemplateByStep(index, -1)}
                          >
                            <ArrowUp size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            label="Pindah ke bawah"
                            disabled={index === templates.length - 1}
                            onClick={() => moveTemplateByStep(index, 1)}
                          >
                            <ArrowDown size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            label={tpl.status === 'active' ? 'Sembunyikan template' : 'Tampilkan template'}
                            onClick={() => toggleTemplateVisibility(tpl)}
                          >
                            {tpl.status === 'active' ? <Eye size={15} /> : <EyeOff size={15} />}
                          </IconButton>
                          <IconButton size="sm" label="Ubah template" onClick={() => openEditTemplateModal(tpl)}>
                            <Edit3 size={15} />
                          </IconButton>
                          <IconButton
                            size="sm"
                            variant="destructive"
                            label="Hapus template"
                            onClick={() => handleDeleteTemplate(tpl)}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>

              {renderPhonePreview()}
            </div>
          )}

          {/* TAB 4: EDIT IDENTITAS PROFIL */}
          {activeTab === 'profile' && liveDraftProfile && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
              <Card className="p-5 sm:p-7">
                <h2 className="m-0 text-[18px] font-bold text-fg">Identitas & Baris Ikon Sosial</h2>
                <p className="mt-1 text-[13px] text-fg-sec">
                  Foto profil dan banner otomatis dikonversi ke WebP maks. 2 MB.
                </p>

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

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3.5 rounded-xl border border-edge bg-bg p-3.5">
                    <Avatar src={avatarUrl} name={displayName || username} size="lg" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-fg">Foto Profil</span>
                      <span className="block text-[11.5px] text-fg-sec">Dioptimasi otomatis ke WebP</span>
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
                      <span className="block text-[13px] font-semibold text-fg">Banner Sampul</span>
                      <span className="block text-[11.5px] text-fg-sec">Opsional · Dioptimasi ke WebP</span>
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
                      value={`@${username}`}
                      hint={`Terkunci permanen. Hubungi TikTok ${ADMIN_TIKTOK_HANDLE} bila perlu bantuan.`}
                      disabled
                      readOnly
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
                      placeholder="https://domainkamu.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" variant="primary" loading={savingProfile}>
                      Simpan Perubahan
                    </Button>
                  </div>
                </form>
              </Card>

              {renderPhonePreview()}
            </div>
          )}

          {/* TAB 5: ANALITIK & REFERRAL */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {[
                  {
                    label: 'Kunjungan Halaman Bio',
                    val: analytics?.totalProfileViews ?? 0,
                    sub: `${analytics?.views7d ?? 0} dalam 7 hari`,
                  },
                  {
                    label: 'Klik Daftar Link Bio',
                    val: analytics?.totalLinkClicks ?? 0,
                    sub: `${analytics?.clicks7d ?? 0} total klik 7 hari`,
                  },
                  {
                    label: 'Klik Pakai CapCut',
                    val: analytics?.totalCapcutClicks ?? 0,
                    sub: `${analytics?.totalTiktokClicks ?? 0} klik ikon TikTok`,
                  },
                  {
                    label: 'Kreator dari Referralmu',
                    val: analytics?.referralCount ?? 0,
                    sub: `via ?ref=${profile?.username || ''}`,
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="p-5">
                    <span className="block text-[12.5px] text-fg-sec">{stat.label}</span>
                    <span className="mt-2 block font-mono text-[28px] font-bold tabular-nums text-fg">
                      {stat.val}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] tabular-nums text-fg-sec">
                      {stat.sub}
                    </span>
                  </Card>
                ))}
              </div>

              {/* Referral Share Box */}
              <Card className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-edge bg-elevated text-fg">
                    <Users size={18} />
                  </div>
                  <div>
                    <h2 className="m-0 text-[15px] font-bold text-fg">Tautan Undangan Kreator</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Setiap pendaftaran baru dari tombol bawah halaman bio atau link{' '}
                      <span className="font-mono text-fg">{referralUrl.replace(/^https?:\/\//, '')}</span> tercatat otomatis di akunmu.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={copyReferralUrl}>
                  {copiedRef ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedRef ? 'Tersalin' : 'Salin Link Referral'}</span>
                </Button>
              </Card>

              {/* Daily Chart 7 / 30 / 90 Days */}
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[16px] font-bold text-fg">Tren Kunjungan & Klik Harian</h2>
                    <p className="mt-0.5 text-[12.5px] text-fg-sec">
                      Agregat harian anonim tanpa melacak data pribadi pengunjung.
                    </p>
                  </div>
                  <Tabs<'7' | '30' | '90'>
                    layoutGroupId="analytics-range-tabs"
                    active={isPro ? rangeDays : '7'}
                    onChange={(next) => {
                      if (!isPro && next !== '7') {
                        setUpgradeFeature('Analitik Rentang 30 & 90 Hari')
                        return
                      }
                      setRangeDays(next)
                    }}
                    tabs={[
                      { id: '7', label: '7 Hari' },
                      { id: '30', label: isPro ? '30 Hari' : '30 Hari · Pro' },
                      { id: '90', label: isPro ? '90 Hari' : '90 Hari · Pro' },
                    ]}
                  />
                </div>

                <div className="mt-6 flex h-44 items-end gap-1 border-b border-edge pb-2 pt-4 overflow-x-auto">
                  {chartPoints.map((pt) => {
                    const vH = Math.max(4, Math.round((pt.views / maxChartVal) * 128))
                    const cH = Math.max(4, Math.round((pt.clicks / maxChartVal) * 128))
                    return (
                      <div key={pt.date} className="flex min-w-[10px] flex-1 flex-col items-center gap-1.5">
                        <div className="flex h-32 w-full items-end justify-center gap-0.5">
                          <div
                            title={`${pt.date}: ${pt.views} kunjungan`}
                            style={{ height: vH }}
                            className="w-2 max-w-[10px] rounded-t-xs bg-fg-muted/60"
                          />
                          <div
                            title={`${pt.date}: ${pt.clicks} klik`}
                            style={{ height: cH }}
                            className="w-2 max-w-[10px] rounded-t-xs bg-fg"
                          />
                        </div>
                        {chartPoints.length <= 14 && (
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
                    <span className="h-2.5 w-2.5 rounded-xs bg-fg-muted/60" /> Kunjungan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-xs bg-fg" /> Klik Tautan
                  </span>
                </div>
              </Card>

              {/* Top Links & Top Templates */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card className="p-5 sm:p-6">
                  <h2 className="m-0 text-[16px] font-bold text-fg">Performa Klik per Link</h2>
                  {!analytics || analytics.topLinks.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-fg-sec">
                      Belum ada klik tercatat pada item link bio kamu.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-edge">
                      {analytics.topLinks.map((item, i) => (
                        <div key={item.link_id} className="flex items-center justify-between gap-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="font-mono text-[12px] text-fg-sec">0{i + 1}</span>
                            <span className="truncate text-[14px] font-medium text-fg">{item.title}</span>
                          </div>
                          <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-fg">
                            {item.clicks} klik
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5 sm:p-6">
                  <h2 className="m-0 text-[16px] font-bold text-fg">Template CapCut Terpopuler</h2>
                  {!analytics || analytics.topTemplates.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-fg-sec">
                      Belum ada data klik pada koleksi template CapCut.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-edge">
                      {analytics.topTemplates.map((item, i) => (
                        <div key={item.template_id} className="flex items-center justify-between gap-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="font-mono text-[12px] text-fg-sec">0{i + 1}</span>
                            <span className="truncate text-[14px] font-medium text-fg">{item.title}</span>
                          </div>
                          <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-fg">
                            {item.clicks} klik
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Pro Audience Insights */}
              {isPro ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <Card className="p-5">
                    <h3 className="m-0 text-[15px] font-bold text-fg">Sumber Pengunjung</h3>
                    <div className="mt-3 space-y-2 text-[13px]">
                      {(analytics?.topReferrers || []).length === 0 ? (
                        <p className="text-fg-sec">Belum ada data sumber kunjungan.</p>
                      ) : (
                        analytics!.topReferrers.map((r) => (
                          <div key={r.host} className="flex items-center justify-between">
                            <span className="truncate text-fg-sec">{r.host}</span>
                            <span className="font-mono font-semibold text-fg">{r.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="m-0 text-[15px] font-bold text-fg">Perangkat Pengunjung</h3>
                    <div className="mt-3 space-y-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="text-fg-sec">Ponsel (Mobile)</span>
                        <span className="font-mono font-semibold text-fg">
                          {analytics?.deviceBreakdown.mobile ?? 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-fg-sec">Komputer (Desktop)</span>
                        <span className="font-mono font-semibold text-fg">
                          {analytics?.deviceBreakdown.desktop ?? 0}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="m-0 text-[15px] font-bold text-fg">Jam Kunjungan Puncak</h3>
                    <div className="mt-3 space-y-2 text-[13px]">
                      {(analytics?.peakHours || []).length === 0 ? (
                        <p className="text-fg-sec">Belum ada data jam kunjungan.</p>
                      ) : (
                        analytics!.peakHours.map((h) => (
                          <div key={h.hour} className="flex items-center justify-between">
                            <span className="font-mono text-fg-sec">
                              {String(h.hour).padStart(2, '0')}:00 WIB
                            </span>
                            <span className="font-mono font-semibold text-fg">{h.count} kunjungan</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="flex flex-col justify-between gap-4 border-dashed p-6 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <Lock size={18} className="mt-0.5 shrink-0 text-fg" />
                    <div>
                      <h3 className="m-0 text-[15px] font-bold text-fg">
                        Analitik Mendalam 90 Hari (Khusus Pro)
                      </h3>
                      <p className="mt-1 text-[13px] text-fg-sec">
                        Lihat asal aplikasi pengunjung (TikTok, Instagram, WhatsApp), pembagian perangkat HP vs Desktop, dan jam kunjungan teramai.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setUpgradeFeature('Analitik Mendalam 90 Hari')}
                  >
                    <Sparkles size={15} />
                    <span>Buka Analitik Pro</span>
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* TAB 6: PAKET & TAGIHAN */}
          {activeTab === 'billing' && profile && (
            <div className="space-y-6">
              <Card className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant={isPro ? 'accent' : 'neutral'}>
                      {isPro ? 'PAKET PRO AKTIF' : 'PAKET FREE'}
                    </Badge>
                    {profile.plan_expires_at && isPro && (
                      <span className="font-mono text-[12px] text-fg-sec">
                        Berlaku s/d {new Date(profile.plan_expires_at).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-[24px] font-extrabold tracking-[-0.03em] text-fg">
                    {isPro ? 'Luven Pro' : 'Luven Free'}
                  </h2>
                  <p className="mt-1 max-w-[54ch] text-[14px] text-fg-sec">
                    {isPro
                      ? 'Seluruh fitur Studio Tampilan, link tanpa batas, jadwal tayang, dan analitik 90 hari aktif di akunmu.'
                      : 'Kamu menggunakan paket gratis dengan kuota maksimal 8 link aktif, 3 tema monokrom, dan analitik 7 hari.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <LinkButton to="/pricing" variant="secondary">
                    <span>Bandingkan Paket</span>
                  </LinkButton>
                  <Button
                    variant="primary"
                    onClick={() => setUpgradeFeature(isPro ? 'Perpanjang Paket Pro' : 'Upgrade ke Luven Pro')}
                  >
                    <Sparkles size={16} />
                    <span>{isPro ? 'Perpanjang Pro' : 'Upgrade ke Pro'}</span>
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="m-0 text-[16px] font-bold text-fg">Riwayat Langganan & Aktivasi</h3>
                {subscriptions.length === 0 ? (
                  <p className="mt-3 text-[13.5px] text-fg-sec">
                    Belum ada riwayat transaksi atau aktivasi paket Pro pada akun ini.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 space-y-3 sm:hidden">
                      {subscriptions.map((s) => (
                        <div key={s.id} className="space-y-1.5 rounded-xl border border-edge bg-bg p-3.5 text-[13px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold uppercase text-fg">{s.plan}</span>
                            <Badge
                              variant={
                                s.status === 'active'
                                  ? 'ok'
                                  : s.status === 'pending'
                                    ? 'warn'
                                    : 'neutral'
                              }
                            >
                              {s.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[12px] text-fg-sec">
                            <span>Tanggal</span>
                            <span className="font-mono">{new Date(s.created_at).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div className="flex items-center justify-between text-[12px] text-fg-sec">
                            <span>Masa berlaku</span>
                            <span className="font-mono">
                              {s.expires_at ? new Date(s.expires_at).toLocaleDateString('id-ID') : 'Selamanya'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 hidden overflow-x-auto sm:block">
                      <table className="w-full border-collapse text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-edge text-fg-sec">
                            <th className="py-2.5 pr-4 font-semibold">Tanggal</th>
                            <th className="py-2.5 pr-4 font-semibold">Paket</th>
                            <th className="py-2.5 pr-4 font-semibold">Status</th>
                            <th className="py-2.5 pr-4 font-semibold">Metode</th>
                            <th className="py-2.5 font-semibold">Masa Berlaku</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-edge">
                          {subscriptions.map((s) => (
                            <tr key={s.id}>
                              <td className="py-3 pr-4 font-mono text-fg-sec">
                                {new Date(s.created_at).toLocaleDateString('id-ID')}
                              </td>
                              <td className="py-3 pr-4 font-semibold uppercase text-fg">{s.plan}</td>
                              <td className="py-3 pr-4">
                                <Badge
                                  variant={
                                    s.status === 'active'
                                      ? 'ok'
                                      : s.status === 'pending'
                                        ? 'warn'
                                        : 'neutral'
                                  }
                                >
                                  {s.status}
                                </Badge>
                              </td>
                              <td className="py-3 pr-4 font-mono text-fg-sec">{s.provider}</td>
                              <td className="py-3 font-mono text-fg-sec">
                                {s.expires_at
                                  ? new Date(s.expires_at).toLocaleDateString('id-ID')
                                  : 'Selamanya'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* TAB 7 (Mobile Preview): FULL LIVE PREVIEW */}
          {activeTab === 'preview' && liveDraftProfile && (
            <div className="mx-auto max-w-[440px] lg:hidden">
              <PublicProfileRenderer
                profile={liveDraftProfile}
                templates={activeTemplates}
                links={links}
                previewBadge="PRATINJAU LANGSUNG"
                compactPreview
              />
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (<1024px) using standardized Button */}
      <nav
        aria-label="Navigasi cepat dasbor"
        className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 gap-1 border-t border-edge bg-surface px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {(
          [
            { id: 'links', label: 'Link', icon: Link2 },
            { id: 'appearance', label: 'Tampilan', icon: Palette },
            { id: 'templates', label: 'CapCut', icon: Layers },
            { id: 'analytics', label: 'Analitik', icon: BarChart3 },
            { id: 'preview', label: 'Pratinjau', icon: Eye },
          ] as const
        ).map((item) => {
          const Icon = item.icon
          const on = activeTab === item.id
          return (
            <Button
              key={item.id}
              variant={on ? 'secondary' : 'ghost'}
              size="sm"
              stackVertical
              onClick={() => setActiveTab(item.id)}
              className="h-12! px-1! text-[10.5px]!"
            >
              <Icon size={16} />
              <span className="max-w-full truncate">{item.label}</span>
            </Button>
          )
        })}
      </nav>

      {/* ADD / EDIT LINK MODAL */}
      <Modal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title={editingLinkId ? 'Ubah Item Link Bio' : 'Tambah Item Link Bio'}
        description="Pilih jenis blok, isi judul yang jelas, dan tempel tautan HTTPS resmi."
        maxWidth="max-w-[580px]"
      >
        <input
          ref={linkThumbInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleUploadImage(f, 'thumbnail', true)
            e.target.value = ''
          }}
        />

        <form onSubmit={handleSaveLink} className="space-y-4">
          <Select
            label="Jenis Blok"
            value={linkType}
            hint={selectedLinkOption.hint}
            onChange={(e) => {
              const next = e.target.value as LinkItemType
              const opt = LINK_TYPE_OPTIONS.find((o) => o.value === next)
              if (opt?.proOnly && !isPro) {
                setUpgradeFeature(opt.label)
                return
              }
              setLinkType(next)
            }}
          >
            {LINK_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Input
            label={linkType === 'heading' ? 'Teks Judul Bagian' : 'Judul Tombol / Blok'}
            placeholder={
              linkType === 'heading'
                ? 'Template Terbaru Minggu Ini'
                : linkType === 'whatsapp'
                  ? 'Kerja Sama & Endorse (WhatsApp)'
                  : 'Preset & Template CapCut Utama'
            }
            value={linkTitle}
            maxLength={120}
            rightMeta={`${linkTitle.length}/120`}
            onChange={(e) => setLinkTitle(e.target.value)}
            required
          />

          {linkType !== 'heading' && linkType !== 'announcement' && (
            <Input
              label="Tautan Tujuan (HTTPS)"
              placeholder={
                linkType === 'whatsapp'
                  ? 'https://wa.me/6281234567890'
                  : linkType === 'capcut'
                    ? 'https://www.capcut.com/t/...'
                    : linkType === 'tiktok' || linkType === 'embed_tiktok'
                      ? 'https://www.tiktok.com/@username/video/...'
                      : linkType === 'youtube' || linkType === 'embed_youtube'
                        ? 'https://www.youtube.com/watch?v=...'
                        : 'https://...'
              }
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
          )}

          {/* Thumbnail on Link */}
          {linkType !== 'heading' && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-bg p-3.5">
              <div className="min-w-0">
                <span className="block text-[13px] font-semibold text-fg">
                  Gambar Thumbnail Kecil {!canUploadLinkThumb && '· Pro'}
                </span>
                <span className="block text-[12px] text-fg-sec">
                  {canUploadLinkThumb
                    ? 'Opsional · Ditampilkan di sisi kiri tombol link.'
                    : 'Thumbnail untuk semua jenis link terbuka di paket Pro (Free khusus link CapCut).'}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {linkThumb && (
                  <Button variant="ghost" size="sm" onClick={() => setLinkThumb(null)}>
                    Hapus
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploadingImg === 'link_thumb'}
                  onClick={() => {
                    if (!canUploadLinkThumb) {
                      setUpgradeFeature('Thumbnail di Semua Jenis Link')
                      return
                    }
                    linkThumbInputRef.current?.click()
                  }}
                >
                  {canUploadLinkThumb ? <ImagePlus size={14} /> : <Lock size={14} />}
                  <span>{linkThumb ? 'Ganti' : 'Unggah'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* PRO Link Features: Spotlight, Collapsible Group, Schedule */}
          {linkType !== 'heading' && (
            <div className="space-y-3 rounded-xl border border-edge bg-bg p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-fg-sec">
                  Pengaturan Lanjutan Pro
                </span>
                {!isPro && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUpgradeFeature('Jadwal Link, Grup Lipat & Link Sorotan')}
                  >
                    <Lock size={13} />
                    <span>Buka Fitur Pro</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[13px] font-medium text-fg">Jadikan Link Sorotan</span>
                  <span className="block text-[12px] text-fg-sec">
                    Beri penekanan visual lembut agar paling menonjol di halaman bio.
                  </span>
                </div>
                <Button
                  variant={linkFeatured && isPro ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    if (!isPro) {
                      setUpgradeFeature('Link Sorotan Beranimasi')
                      return
                    }
                    setLinkFeatured((v) => !v)
                  }}
                >
                  <Sparkles size={14} />
                  <span>{linkFeatured && isPro ? 'Aktif' : 'Nonaktif'}</span>
                </Button>
              </div>

              <Input
                label="Nama Grup Lipat (opsional)"
                placeholder="Contoh: Perlengkapan Kamera"
                value={linkGroup}
                disabled={!isPro}
                leftAddon={<FolderTree size={15} />}
                onChange={(e) => setLinkGroup(e.target.value)}
                hint="Link dengan nama grup yang sama dikelompokkan dalam satu akordeon rapi."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="datetime-local"
                  label="Mulai Tayang (opsional)"
                  value={linkSchedStart}
                  disabled={!isPro}
                  onChange={(e) => setLinkSchedStart(e.target.value)}
                />
                <Input
                  type="datetime-local"
                  label="Berakhir Tayang (opsional)"
                  value={linkSchedEnd}
                  disabled={!isPro}
                  onChange={(e) => setLinkSchedEnd(e.target.value)}
                />
              </div>
            </div>
          )}

          {linkError && (
            <p role="alert" className="rounded-lg border-2 border-fg px-3 py-2 text-[13px] font-medium text-fg">
              {linkError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setLinkModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={linkSaving}>
              {editingLinkId ? 'Simpan Perubahan' : 'Simpan ke Halaman Bio'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT TEMPLATE CAPCUT MODAL */}
      <Modal
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        title={editingTplId ? 'Ubah Template CapCut' : 'Tambah Template CapCut'}
        description="Tempel tautan resmi template CapCut kamu, unggah poster pratinjau, dan beri judul."
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
                placeholder="Potongan Sound Original"
                value={tplSong}
                maxLength={80}
                onChange={(e) => setTplSong(e.target.value)}
              />
              <Input
                label="Video di TikTok (opsional)"
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
              <div className="mt-2 flex flex-wrap gap-2">
                {POPULAR_TEMPLATE_TAGS.slice(0, 6).map((tg) => (
                  <Button
                    key={tg}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const cur = tplTagsInput
                        .split(/[, ]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                      if (!cur.includes(tg) && cur.length < 5) {
                        setTplTagsInput([...cur, tg].join(', '))
                      }
                    }}
                  >
                    <span>+#{tg}</span>
                  </Button>
                ))}
              </div>
            </div>

            {tplError && (
              <p role="alert" className="rounded-lg border-2 border-fg px-3 py-2 text-[13px] font-medium text-fg">
                {tplError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setTplModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" loading={tplSaving}>
                {editingTplId ? 'Simpan Perubahan' : 'Publikasikan Template'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
              Poster Pratinjau
            </span>
            <div className="overflow-hidden rounded-2xl border border-edge bg-bg">
              <ProgressiveImage
                src={tplThumb}
                alt="Pratinjau thumbnail template"
                ratio="4:5"
                fallbackLabel="UNGGAH POSTER"
              />
              <div className="p-3">
                <p className="m-0 line-clamp-2 text-[13px] font-bold text-fg">
                  {tplTitle || 'Judul template tampil di sini'}
                </p>
                <span className="mt-1 block font-mono text-[11px] text-fg-sec">
                  {capcutCheck.ok ? 'Domain CapCut valid' : 'Menunggu link CapCut'}
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
          fgColor={isPro ? draftSettings.qrFgColor : undefined}
          bgColor={isPro ? draftSettings.qrBgColor : undefined}
        />
      )}

      <UpgradeProModal
        open={Boolean(upgradeFeature)}
        onClose={() => setUpgradeFeature(null)}
        featureName={upgradeFeature || undefined}
      />
    </SiteLayout>
  )
}
