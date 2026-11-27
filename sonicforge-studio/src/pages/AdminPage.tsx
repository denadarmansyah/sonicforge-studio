import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  AtSign,
  Ban,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Flag,
  KeyRound,
  Layers,
  Lock,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  adminBulkSetPlan,
  adminChangeUsername,
  adminDeleteUserAccount,
  adminGetOverview,
  adminGetSettingsAndTeam,
  adminGetUserDetail,
  adminListAuditLogs,
  adminListContent,
  adminListReports,
  adminListSubscriptions,
  adminListUsernames,
  adminListUsers,
  adminManageReservedUsername,
  adminManageTeam,
  adminModerateContent,
  adminReleaseUsername,
  adminReorderFeatured,
  adminResolveReportV2,
  adminSendUserPasswordReset,
  adminSetUserFlags,
  adminSetUserPlan,
  adminUpdateSiteSettings,
  changeAdminPassphrase,
  checkUsernameAvailability,
  fetchAdminGateStatus,
  lockAdminGate,
  unlockAdminGate,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import {
  AbuseReport,
  AdminAuditLogEntry,
  AdminContentItem,
  AdminGateStatus,
  AdminOverviewData,
  AdminTeamMember,
  AdminUserDetail,
  AdminUserListItem,
  SiteSettings,
  SubscriptionRecord,
} from '../lib/types'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dropdown,
  IconButton,
  Input,
  LinkButton,
  Modal,
  PasswordInput,
  PasswordStrengthMeter,
  ProgressiveImage,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  useToast,
} from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'
import { NotFoundPage } from './SupportPages'

type AdminSection =
  | 'overview'
  | 'users'
  | 'usernames'
  | 'content'
  | 'reports'
  | 'subscriptions'
  | 'featured'
  | 'audit'
  | 'settings'

const SECTION_META: {
  id: AdminSection
  label: string
  shortLabel: string
  icon: typeof BarChart3
}[] = [
  { id: 'overview', label: 'Ringkasan', shortLabel: 'Ringkasan', icon: BarChart3 },
  { id: 'users', label: 'Pengguna', shortLabel: 'Pengguna', icon: Users },
  { id: 'usernames', label: 'Username', shortLabel: 'Username', icon: AtSign },
  { id: 'content', label: 'Template & Link', shortLabel: 'Konten', icon: Layers },
  { id: 'reports', label: 'Laporan', shortLabel: 'Laporan', icon: Flag },
  { id: 'subscriptions', label: 'Paket & Langganan', shortLabel: 'Paket', icon: CreditCard },
  { id: 'featured', label: 'Kreator Pilihan', shortLabel: 'Pilihan', icon: Star },
  { id: 'audit', label: 'Log Aktivitas', shortLabel: 'Log', icon: Activity },
  { id: 'settings', label: 'Pengaturan', shortLabel: 'Setelan', icon: Settings },
]

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTimeShort(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function futureIsoDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString()
}

export function AdminPage() {
  const { loading: authLoading, user, isAdmin, refreshAuth } = useAuth()
  const { pushToast } = useToast()

  // Gate state
  const [gateLoading, setGateLoading] = useState(true)
  const [gate, setGate] = useState<AdminGateStatus>({
    is_admin: false,
    unlocked: false,
    session_open: false,
    must_change: false,
    unlocked_until: null,
    is_primary: false,
  })
  const [gatePass, setGatePass] = useState('')
  const [gateErr, setGateErr] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  // Change passphrase state (forced & voluntary)
  const [newAdminPass, setNewAdminPass] = useState('')
  const [confirmAdminPass, setConfirmAdminPass] = useState('')
  const [passChangeErr, setPassChangeErr] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // Navigation & mobile drawer
  const [section, setSection] = useState<AdminSection>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Section 1: Overview
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewErr, setOverviewErr] = useState('')
  const [overview, setOverview] = useState<AdminOverviewData | null>(null)

  // Section 2: Users
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersErr, setUsersErr] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'pro'>('all')
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned' | 'unclaimed'>('all')
  const [userVerifiedFilter, setUserVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [userDateFrom, setUserDateFrom] = useState('')
  const [userDateTo, setUserDateTo] = useState('')
  const [userSort, setUserSort] = useState<'newest' | 'oldest' | 'username'>('newest')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userItems, setUserItems] = useState<AdminUserListItem[]>([])
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([])

  // User Detail & Action Modals
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null)

  const [banModalUser, setBanModalUser] = useState<AdminUserListItem | null>(null)
  const [banReasonInput, setBanReasonInput] = useState('')
  const [banSaving, setBanSaving] = useState(false)

  const [planModalUser, setPlanModalUser] = useState<AdminUserListItem | null>(null)
  const [planDuration, setPlanDuration] = useState<'30d' | '365d' | 'lifetime' | 'custom' | 'revoke'>('30d')
  const [planCustomDate, setPlanCustomDate] = useState('')
  const [planSaving, setPlanSaving] = useState(false)

  const [renameModalUser, setRenameModalUser] = useState<{
    id: string
    oldUsername: string
  } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameHint, setRenameHint] = useState('')
  const [renameErr, setRenameErr] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const [deleteModalUser, setDeleteModalUser] = useState<AdminUserListItem | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleteErr, setDeleteErr] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)

  // Section 3: Usernames & Reserved Words
  const [unameLoading, setUnameLoading] = useState(false)
  const [unameErr, setUnameErr] = useState('')
  const [unameSearch, setUnameSearch] = useState('')
  const [unameClaims, setUnameClaims] = useState<
    {
      user_id: string
      username: string
      display_name: string
      email: string
      is_verified: boolean
      is_banned: boolean
      created_at: string
    }[]
  >([])
  const [reservedWords, setReservedWords] = useState<{ word: string; reason: string; created_at: string }[]>([])
  const [newReservedWord, setNewReservedWord] = useState('')
  const [newReservedReason, setNewReservedReason] = useState('')
  const [savingReserved, setSavingReserved] = useState(false)
  const [releaseTarget, setReleaseTarget] = useState<{ userId: string; username: string } | null>(null)
  const [releasingSaving, setReleasingSaving] = useState(false)

  // Section 4: Content (Templates & Links)
  const [contentKind, setContentKind] = useState<'templates' | 'links'>('templates')
  const [contentStatus, setContentStatus] = useState('all')
  const [contentSearch, setContentSearch] = useState('')
  const [contentPage, setContentPage] = useState(1)
  const [contentTotal, setContentTotal] = useState(0)
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [contentErr, setContentErr] = useState('')

  // Section 5: Reports
  const [reportFilter, setReportFilter] = useState('all')
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsErr, setReportsErr] = useState('')
  const [reportItems, setReportItems] = useState<AbuseReport[]>([])
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({})

  // Section 6: Subscriptions & Bulk Plan
  const [subFilter, setSubFilter] = useState('all')
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsErr, setSubsErr] = useState('')
  const [activeProList, setActiveProList] = useState<
    { id: string; username: string; display_name: string; email: string; plan_expires_at: string | null }[]
  >([])
  const [expiringProList, setExpiringProList] = useState<
    { id: string; username: string; display_name: string; email: string; plan_expires_at: string | null }[]
  >([])
  const [subHistory, setSubHistory] = useState<SubscriptionRecord[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)

  // Section 7: Featured Creators
  const [featuredLoading, setFeaturedLoading] = useState(false)
  const [featuredList, setFeaturedList] = useState<AdminUserListItem[]>([])
  const [featuredCandidateSearch, setFeaturedCandidateSearch] = useState('')
  const [featuredCandidates, setFeaturedCandidates] = useState<AdminUserListItem[]>([])
  const [savingFeaturedOrder, setSavingFeaturedOrder] = useState(false)

  // Section 8: Audit Logs
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditErr, setAuditErr] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditItems, setAuditItems] = useState<AdminAuditLogEntry[]>([])

  // Section 9: Settings & Admin Team
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [siteForm, setSiteForm] = useState<SiteSettings>({
    announcement_text: '',
    announcement_active: false,
    maintenance_mode: false,
  })
  const [savingSiteSettings, setSavingSiteSettings] = useState(false)
  const [teamList, setTeamList] = useState<AdminTeamMember[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminNote, setNewAdminNote] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<AdminTeamMember | null>(null)
  const [revokingAdmin, setRevokingAdmin] = useState(false)

  useDocumentMeta({
    title: isAdmin ? 'Panel Admin — Luven' : '404 Halaman Tidak Ditemukan — Luven',
    description: isAdmin
      ? 'Panel administrasi pengguna, username, konten, laporan, dan keamanan Luven.'
      : 'Halaman yang Anda tuju tidak ditemukan di Luven.',
    path: isAdmin ? '/admin' : '/404',
  })

  const refreshGate = useCallback(async () => {
    if (!user || !isAdmin) {
      setGate({
        is_admin: false,
        unlocked: false,
        session_open: false,
        must_change: false,
        unlocked_until: null,
        is_primary: false,
      })
      setGateLoading(false)
      return
    }
    try {
      const st = await fetchAdminGateStatus()
      setGate(st)
    } finally {
      setGateLoading(false)
    }
  }, [user, isAdmin])

  useEffect(() => {
    if (!authLoading) {
      void refreshGate()
    }
  }, [authLoading, refreshGate])

  // Auto-lock setelah 30 menit: periksa berkala & saat tab aktif kembali
  useEffect(() => {
    if (!isAdmin || !gate.session_open) return
    const checkExpiry = () => {
      if (gate.unlocked_until && Date.parse(gate.unlocked_until) <= Date.now()) {
        setGate((prev) => ({
          ...prev,
          unlocked: false,
          session_open: false,
          must_change: false,
          unlocked_until: null,
        }))
        pushToast('Sesi admin otomatis dikunci setelah 30 menit.', 'info')
        return
      }
      void refreshGate()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') checkExpiry()
    }
    document.addEventListener('visibilitychange', onVis)
    const interval = window.setInterval(checkExpiry, 20000)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(interval)
    }
  }, [isAdmin, gate.session_open, gate.unlocked_until, refreshGate, pushToast])

  // Data loaders per section
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewErr('')
    try {
      const data = await adminGetOverview()
      setOverview(data)
    } catch (err) {
      setOverviewErr(err instanceof Error ? err.message : 'Gagal memuat ringkasan.')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersErr('')
    try {
      const res = await adminListUsers({
        search: userSearch,
        plan: userPlanFilter,
        status: userStatusFilter,
        verified: userVerifiedFilter,
        dateFrom: userDateFrom || undefined,
        dateTo: userDateTo || undefined,
        sort: userSort,
        page: userPage,
        pageSize: 15,
      })
      setUserItems(res.items)
      setUserTotal(res.total)
    } catch (err) {
      setUsersErr(err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.')
    } finally {
      setUsersLoading(false)
    }
  }, [
    userSearch,
    userPlanFilter,
    userStatusFilter,
    userVerifiedFilter,
    userDateFrom,
    userDateTo,
    userSort,
    userPage,
  ])

  const loadUsernames = useCallback(async () => {
    setUnameLoading(true)
    setUnameErr('')
    try {
      const res = await adminListUsernames(unameSearch, 1)
      setUnameClaims(res.claims)
      setReservedWords(res.reserved)
    } catch (err) {
      setUnameErr(err instanceof Error ? err.message : 'Gagal memuat data username.')
    } finally {
      setUnameLoading(false)
    }
  }, [unameSearch])

  const loadContent = useCallback(async () => {
    setContentLoading(true)
    setContentErr('')
    try {
      const res = await adminListContent({
        kind: contentKind,
        status: contentStatus,
        search: contentSearch,
        page: contentPage,
      })
      setContentItems(res.items)
      setContentTotal(res.total)
    } catch (err) {
      setContentErr(err instanceof Error ? err.message : 'Gagal memuat daftar konten.')
    } finally {
      setContentLoading(false)
    }
  }, [contentKind, contentStatus, contentSearch, contentPage])

  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsErr('')
    try {
      const res = await adminListReports(reportFilter, 1)
      setReportItems(res.items)
    } catch (err) {
      setReportsErr(err instanceof Error ? err.message : 'Gagal memuat antrean laporan.')
    } finally {
      setReportsLoading(false)
    }
  }, [reportFilter])

  const loadSubscriptions = useCallback(async () => {
    setSubsLoading(true)
    setSubsErr('')
    try {
      const [subRes, usersRes] = await Promise.all([
        adminListSubscriptions(subFilter, 1),
        adminListUsers({ page: 1, pageSize: 50 }),
      ])
      setActiveProList(subRes.active_pro)
      setExpiringProList(subRes.expiring_soon)
      setSubHistory(subRes.history)
      setUserItems(usersRes.items)
    } catch (err) {
      setSubsErr(err instanceof Error ? err.message : 'Gagal memuat data langganan.')
    } finally {
      setSubsLoading(false)
    }
  }, [subFilter])

  const loadFeatured = useCallback(async () => {
    setFeaturedLoading(true)
    try {
      const res = await adminListUsers({
        search: featuredCandidateSearch,
        status: 'active',
        page: 1,
        pageSize: 50,
      })
      const allActive = res.items
      const feat = allActive
        .filter((u) => u.is_featured)
        .sort((a, b) => (a.featured_order || 999) - (b.featured_order || 999))
      setFeaturedList(feat)
      setFeaturedCandidates(allActive.filter((u) => !u.is_featured))
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat kreator pilihan.', 'err')
    } finally {
      setFeaturedLoading(false)
    }
  }, [featuredCandidateSearch, pushToast])

  const loadAudit = useCallback(async () => {
    setAuditLoading(true)
    setAuditErr('')
    try {
      const res = await adminListAuditLogs(auditActionFilter, auditSearch, auditPage)
      setAuditItems(res.items)
      setAuditTotal(res.total)
    } catch (err) {
      setAuditErr(err instanceof Error ? err.message : 'Gagal memuat log audit.')
    } finally {
      setAuditLoading(false)
    }
  }, [auditActionFilter, auditSearch, auditPage])

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await adminGetSettingsAndTeam()
      setSiteForm(res.settings)
      setTeamList(res.team)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat pengaturan admin.', 'err')
    } finally {
      setSettingsLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    if (!gate.unlocked) return
    if (section === 'overview') void loadOverview()
    else if (section === 'users') void loadUsers()
    else if (section === 'usernames') void loadUsernames()
    else if (section === 'content') void loadContent()
    else if (section === 'reports') void loadReports()
    else if (section === 'subscriptions') void loadSubscriptions()
    else if (section === 'featured') void loadFeatured()
    else if (section === 'audit') void loadAudit()
    else if (section === 'settings') void loadSettings()
  }, [
    gate.unlocked,
    section,
    loadOverview,
    loadUsers,
    loadUsernames,
    loadContent,
    loadReports,
    loadSubscriptions,
    loadFeatured,
    loadAudit,
    loadSettings,
  ])

  // Real-time check inside Admin Rename Username modal
  useEffect(() => {
    if (!renameModalUser || !renameValue.trim()) {
      setRenameHint('')
      return
    }
    const timer = window.setTimeout(async () => {
      const res = await checkUsernameAvailability(renameValue, renameModalUser.id)
      setRenameHint(res.message)
    }, 240)
    return () => window.clearTimeout(timer)
  }, [renameModalUser, renameValue])

  // Loading skeleton before revealing either 404 or Admin Gate
  if (authLoading || gateLoading) {
    return (
      <SiteLayout hideFooter>
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 lg:px-8">
          <Skeleton className="h-10 w-56" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </SiteLayout>
    )
  }

  // Non-admin melihat halaman 404 yang identik dengan rute tidak ditemukan
  if (!user || !isAdmin || !gate.is_admin) {
    return <NotFoundPage />
  }

  // Handler: Buka kunci gerbang admin
  const handleUnlockSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGateErr('')
    setUnlocking(true)
    try {
      const res = await unlockAdminGate(gatePass)
      setGatePass('')
      if (!res.ok) {
        setGateErr(res.error || 'Verifikasi admin tidak berhasil atau akses sedang dikunci sementara.')
        return
      }
      await refreshGate()
      if (res.must_change) {
        pushToast('Silakan ganti password sementara admin sebelum melanjutkan.', 'info')
      } else {
        pushToast('Panel admin berhasil dibuka selama 30 menit.')
      }
    } finally {
      setUnlocking(false)
    }
  }

  // Handler: Kunci sekarang
  const handleLockNow = async () => {
    await lockAdminGate()
    await refreshGate()
    pushToast('Panel admin dikunci.')
  }

  // Handler: Ganti password admin (wajib pada pembukaan pertama atau dari tab Pengaturan)
  const handleChangeAdminPassphrase = async (e: FormEvent) => {
    e.preventDefault()
    setPassChangeErr('')
    if (newAdminPass.length < 12) {
      setPassChangeErr('Password khusus admin minimal 12 karakter.')
      return
    }
    if (newAdminPass !== confirmAdminPass) {
      setPassChangeErr('Konfirmasi password admin tidak sama.')
      return
    }
    setChangingPass(true)
    try {
      await changeAdminPassphrase(newAdminPass)
      setNewAdminPass('')
      setConfirmAdminPass('')
      await refreshGate()
      pushToast('Password khusus admin berhasil diperbarui.')
    } catch (err) {
      setPassChangeErr(err instanceof Error ? err.message : 'Gagal memperbarui password admin.')
    } finally {
      setChangingPass(false)
    }
  }

  // ============================================================================
  // LAYAR 1: VERIFIKASI GERBANG ADMIN (BELUM UNLOCKED)
  // ============================================================================
  if (!gate.session_open) {
    return (
      <SiteLayout hideFooter>
        <div className="mx-auto max-w-[420px] px-4 py-16 md:py-24">
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                <ShieldCheck size={19} />
              </div>
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                  Keamanan Berlapis
                </span>
                <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  Verifikasi admin
                </h1>
              </div>
            </div>

            <p className="m-0 text-[13.5px] leading-relaxed text-fg-sec">
              Masukkan password khusus admin untuk membuka panel selama 30 menit.
            </p>

            <form onSubmit={handleUnlockSubmit} noValidate className="mt-5 space-y-4">
              <PasswordInput
                name="admin-passphrase"
                label="Password khusus admin"
                placeholder="Masukkan password admin"
                autoComplete="current-password"
                value={gatePass}
                onChange={(e) => {
                  setGatePass(e.target.value)
                  setGateErr('')
                }}
                leftAddon={<Lock size={16} />}
                required
              />

              {gateErr && (
                <p
                  role="alert"
                  className="rounded-xl border border-fg border-l-4 border-l-fg bg-bg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                >
                  {gateErr}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={unlocking}>
                Buka panel admin
              </Button>
            </form>
          </Card>
        </div>
      </SiteLayout>
    )
  }

  // ============================================================================
  // LAYAR 2: PAKSA PENGGANTIAN PASSWORD SEMENTARA (must_change = true)
  // ============================================================================
  if (gate.must_change) {
    return (
      <SiteLayout hideFooter>
        <div className="mx-auto max-w-[440px] px-4 py-14 md:py-20">
          <Card className="p-6">
            <Badge variant="warn">WAJIB DIGANTI SEKARANG</Badge>
            <h1 className="mt-3 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
              Ganti password admin sementara
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-sec">
              Demi keamanan, buat password khusus admin baru minimal 12 karakter sebelum mengakses panel.
            </p>

            <form onSubmit={handleChangeAdminPassphrase} noValidate className="mt-5 space-y-4">
              <div>
                <PasswordInput
                  name="new-admin-passphrase"
                  label="Password admin baru"
                  placeholder="Minimal 12 karakter"
                  autoComplete="new-password"
                  value={newAdminPass}
                  onChange={(e) => {
                    setNewAdminPass(e.target.value)
                    setPassChangeErr('')
                  }}
                  leftAddon={<KeyRound size={16} />}
                  required
                />
                <PasswordStrengthMeter password={newAdminPass} minLength={12} />
              </div>

              <PasswordInput
                name="confirm-admin-passphrase"
                label="Konfirmasi password admin baru"
                placeholder="Ketik ulang password admin baru"
                autoComplete="new-password"
                value={confirmAdminPass}
                onChange={(e) => {
                  setConfirmAdminPass(e.target.value)
                  setPassChangeErr('')
                }}
                leftAddon={<Lock size={16} />}
                required
              />

              {passChangeErr && (
                <p
                  role="alert"
                  className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                >
                  {passChangeErr}
                </p>
              )}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Button variant="secondary" onClick={handleLockNow} className="sm:w-auto">
                  Kunci sekarang
                </Button>
                <Button type="submit" variant="primary" fullWidth loading={changingPass}>
                  Simpan password admin
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </SiteLayout>
    )
  }

  // ============================================================================
  // HELPER AKSI DASHBOARD PENGGUNA
  // ============================================================================
  const openUserDetailDrawer = async (userId: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setUserDetail(null)
    try {
      const d = await adminGetUserDetail(userId)
      setUserDetail(d)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memuat detail pengguna.', 'err')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleToggleVerify = async (u: AdminUserListItem) => {
    try {
      await adminSetUserFlags({ userId: u.id, is_verified: !u.is_verified })
      pushToast(u.is_verified ? 'Lencana verifikasi dicabut.' : 'Kreator berhasil diverifikasi.')
      await loadUsers()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengubah status verifikasi.', 'err')
    }
  }

  const handleConfirmBan = async (e: FormEvent) => {
    e.preventDefault()
    if (!banModalUser) return
    setBanSaving(true)
    try {
      const nextBan = !banModalUser.is_banned
      await adminSetUserFlags({
        userId: banModalUser.id,
        is_banned: nextBan,
        ban_reason: nextBan ? banReasonInput || 'Pelanggaran ketentuan komunitas' : '',
      })
      setBanModalUser(null)
      setBanReasonInput('')
      pushToast(nextBan ? 'Akun pengguna ditangguhkan.' : 'Penangguhan akun dicabut.')
      await loadUsers()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal memperbarui status ban.', 'err')
    } finally {
      setBanSaving(false)
    }
  }

  const handleConfirmPlan = async (e: FormEvent) => {
    e.preventDefault()
    if (!planModalUser) return
    setPlanSaving(true)
    try {
      if (planDuration === 'revoke') {
        await adminSetUserPlan(planModalUser.id, 'free', null)
        pushToast('Paket Pro dicabut ke Free.')
      } else {
        const expiresAt =
          planDuration === '30d'
            ? futureIsoDays(30)
            : planDuration === '365d'
              ? futureIsoDays(365)
              : planDuration === 'custom' && planCustomDate
                ? new Date(planCustomDate).toISOString()
                : null
        await adminSetUserPlan(planModalUser.id, 'pro', expiresAt)
        pushToast('Paket Pro diaktifkan.')
      }
      setPlanModalUser(null)
      await loadUsers()
      if (section === 'subscriptions') await loadSubscriptions()
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengubah paket pengguna.', 'err')
    } finally {
      setPlanSaving(false)
    }
  }

  const handleConfirmRename = async (e: FormEvent) => {
    e.preventDefault()
    if (!renameModalUser) return
    setRenameErr('')
    setRenameSaving(true)
    try {
      await adminChangeUsername(renameModalUser.id, renameValue)
      setRenameModalUser(null)
      setRenameValue('')
      pushToast('Username berhasil diubah oleh admin.')
      if (section === 'users') await loadUsers()
      if (section === 'usernames') await loadUsernames()
    } catch (err) {
      setRenameErr(err instanceof Error ? err.message : 'Gagal mengubah username.')
    } finally {
      setRenameSaving(false)
    }
  }

  const handleConfirmDeleteAccount = async (e: FormEvent) => {
    e.preventDefault()
    if (!deleteModalUser) return
    setDeleteErr('')
    setDeleteSaving(true)
    try {
      await adminDeleteUserAccount(deleteModalUser.id, deleteConfirmInput)
      setDeleteModalUser(null)
      setDeleteConfirmInput('')
      pushToast('Akun pengguna telah dihapus permanen.')
      await loadUsers()
    } catch (err) {
      setDeleteErr(err instanceof Error ? err.message : 'Gagal menghapus akun.')
    } finally {
      setDeleteSaving(false)
    }
  }

  const buildUserActions = (u: AdminUserListItem) => [
    {
      label: 'Detail pengguna',
      icon: <Eye size={15} />,
      onClick: () => void openUserDetailDrawer(u.id),
    },
    ...(u.username
      ? [
          {
            label: `Buka /@${u.username}`,
            icon: <ExternalLink size={15} />,
            onClick: () => window.open(`/@${u.username}`, '_blank', 'noopener,noreferrer'),
          },
          {
            label: u.is_verified ? 'Cabut verifikasi' : 'Beri verifikasi',
            icon: <UserCheck size={15} />,
            onClick: () => void handleToggleVerify(u),
          },
          {
            label: u.effective_plan === 'pro' ? 'Atur / cabut Pro' : 'Aktifkan Pro',
            icon: <Sparkles size={15} />,
            onClick: () => {
              setPlanModalUser(u)
              setPlanDuration(u.effective_plan === 'pro' ? 'revoke' : '30d')
            },
          },
          {
            label: 'Ubah username',
            icon: <AtSign size={15} />,
            onClick: () => {
              setRenameModalUser({ id: u.id, oldUsername: u.username! })
              setRenameValue(u.username!)
              setRenameErr('')
            },
          },
          ...(u.is_primary_admin
            ? []
            : [
                {
                  label: u.is_banned ? 'Cabut ban akun' : 'Ban akun',
                  icon: <Ban size={15} />,
                  onClick: () => {
                    setBanModalUser(u)
                    setBanReasonInput(u.ban_reason || '')
                  },
                },
              ]),
        ]
      : []),
    {
      label: 'Kirim link reset password',
      icon: <KeyRound size={15} />,
      onClick: async () => {
        try {
          await adminSendUserPasswordReset(u.email)
          pushToast(`Link reset password dikirim ke ${u.email}.`)
        } catch (err) {
          pushToast(err instanceof Error ? err.message : 'Gagal mengirim reset password.', 'err')
        }
      },
    },
    ...(u.is_primary_admin || u.id === user.id
      ? []
      : [
          {
            label: 'Hapus akun',
            icon: <Trash2 size={15} />,
            danger: true,
            onClick: () => {
              setDeleteModalUser(u)
              setDeleteConfirmInput('')
              setDeleteErr('')
            },
          },
        ]),
  ]

  const currentSectionMeta = SECTION_META.find((s) => s.id === section) || SECTION_META[0]
  const totalUserPages = Math.max(1, Math.ceil(userTotal / 15))
  const maxGrowthVal = Math.max(
    1,
    ...(overview?.growth_30d || []).map((g) => Math.max(g.new_users, g.views, g.clicks))
  )

  return (
    <SiteLayout hideFooter>
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-28 md:px-6 lg:px-8 lg:pb-16">
        {/* Top Admin Control Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-edge bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="ok">SESI ADMIN TERBUKA</Badge>
              {gate.unlocked_until && (
                <span className="font-mono text-[11.5px] text-fg-sec">
                  Kunci otomatis {formatDateTimeShort(gate.unlocked_until)}
                </span>
              )}
            </div>
            <h1 className="mt-1.5 truncate text-[clamp(1.25rem,2.4vw,1.625rem)] font-extrabold tracking-[-0.03em] text-fg">
              Panel Admin · {currentSectionMeta.label}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden"
            >
              <Menu size={15} />
              <span>Bagian ({currentSectionMeta.shortLabel})</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLockNow}>
              <Lock size={14} />
              <span>Kunci sekarang</span>
            </Button>
          </div>
        </div>

        {/* Main 12-Col Compatible Desktop Sidebar + Content Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start">
          {/* Desktop Left Sidebar (>=1024px) */}
          <aside aria-label="Navigasi panel admin" className="hidden lg:sticky lg:top-24 lg:block">
            <Card className="space-y-1 p-2">
              {SECTION_META.map((item) => {
                const Icon = item.icon
                const active = section === item.id
                const openRepCount =
                  item.id === 'reports' ? overview?.metrics.open_reports : undefined
                return (
                  <Button
                    key={item.id}
                    variant={active ? 'primary' : 'ghost'}
                    size="md"
                    fullWidth
                    onClick={() => setSection(item.id)}
                    className="justify-between! px-3!"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </span>
                    {typeof openRepCount === 'number' && openRepCount > 0 && (
                      <span className="font-mono text-[11px]">{openRepCount}</span>
                    )}
                  </Button>
                )
              })}
            </Card>
          </aside>

          {/* Active Section Workspace */}
          <div className="min-w-0 space-y-6">
            {/* ============================================================== */}
            {/* BAGIAN 1: RINGKASAN                                            */}
            {/* ============================================================== */}
            {section === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Ringkasan Platform</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Data langsung dari database tanpa angka simulasi.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadOverview} loading={overviewLoading}>
                    <RefreshCw size={14} />
                    <span>Muat ulang</span>
                  </Button>
                </div>

                {overviewErr && (
                  <Card className="border-fg p-4 text-[13.5px] text-fg">{overviewErr}</Card>
                )}

                {overviewLoading && !overview ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : overview ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                      {[
                        {
                          label: 'Total Pengguna',
                          val: overview.metrics.total_users,
                          sub: `+${overview.metrics.new_users_7d} (7h) · +${overview.metrics.new_users_30d} (30h)`,
                        },
                        {
                          label: 'Profil Aktif',
                          val: overview.metrics.active_profiles,
                          sub: 'Sudah klaim username',
                        },
                        {
                          label: 'Paket Pro Aktif',
                          val: overview.metrics.active_pro,
                          sub: 'Langganan berjalan',
                        },
                        {
                          label: 'Template & Link',
                          val: overview.metrics.total_templates + overview.metrics.total_links,
                          sub: `${overview.metrics.total_templates} tpl · ${overview.metrics.total_links} link`,
                        },
                        {
                          label: 'Laporan Terbuka',
                          val: overview.metrics.open_reports,
                          sub: `${overview.metrics.total_views} view · ${overview.metrics.total_clicks} klik`,
                        },
                      ].map((m) => (
                        <Card key={m.label} className="p-4">
                          <span className="block text-[12px] text-fg-sec">{m.label}</span>
                          <span className="mt-1.5 block font-mono text-[24px] font-bold tabular-nums text-fg">
                            {m.val}
                          </span>
                          <span className="mt-1 block truncate font-mono text-[11px] text-fg-sec" title={m.sub}>
                            {m.sub}
                          </span>
                        </Card>
                      ))}
                    </div>

                    {/* Grafik Pertumbuhan 30 Hari (Monokrom) */}
                    <Card className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="m-0 text-[16px] font-bold text-fg">Pertumbuhan 30 Hari Terakhir</h3>
                          <p className="mt-0.5 text-[12.5px] text-fg-sec">
                            Perbandingan pendaftaran akun baru, kunjungan profil, dan klik harian.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-fg-sec">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-fg" /> Klik & Pengguna
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-xs bg-fg-muted/50" /> Kunjungan
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid h-36 grid-cols-[repeat(30,minmax(0,1fr))] items-end gap-0.5 border-b border-edge pb-2">
                        {overview.growth_30d.map((pt) => {
                          const vH = Math.max(3, Math.round((pt.views / maxGrowthVal) * 116))
                          const cH = Math.max(
                            3,
                            Math.round(((pt.clicks + pt.new_users) / maxGrowthVal) * 116)
                          )
                          return (
                            <div
                              key={pt.date}
                              title={`${pt.date} — ${pt.new_users} daftar, ${pt.views} view, ${pt.clicks} klik`}
                              className="flex h-full items-end justify-center gap-px"
                            >
                              <span
                                style={{ height: vH }}
                                className="w-1 rounded-t-xs bg-fg-muted/50 sm:w-1.5"
                              />
                              <span style={{ height: cH }} className="w-1 rounded-t-xs bg-fg sm:w-1.5" />
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-2 flex justify-between font-mono text-[11px] text-fg-sec">
                        <span>{overview.growth_30d[0]?.date || ''}</span>
                        <span>{overview.growth_30d[overview.growth_30d.length - 1]?.date || ''}</span>
                      </div>
                    </Card>

                    {/* Aktivitas Audit Terbaru */}
                    <Card className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="m-0 text-[16px] font-bold text-fg">Aktivitas Admin Terbaru</h3>
                        <Button variant="ghost" size="sm" onClick={() => setSection('audit')}>
                          Lihat semua log
                        </Button>
                      </div>
                      {overview.recent_logs.length === 0 ? (
                        <p className="mt-3 text-[13.5px] text-fg-sec">Belum ada aktivitas tercatat.</p>
                      ) : (
                        <div className="mt-3 divide-y divide-edge">
                          {overview.recent_logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex flex-col justify-between gap-1 py-2.5 text-[13px] sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0">
                                <span className="font-mono font-semibold text-fg">{log.action}</span>
                                <span className="ml-2 text-fg-sec">
                                  oleh {log.actor_email || 'admin'}
                                </span>
                              </div>
                              <span className="shrink-0 font-mono text-[11.5px] text-fg-sec">
                                {formatDateTimeShort(log.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </>
                ) : null}
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 2: PENGGUNA                                             */}
            {/* ============================================================== */}
            {section === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Kelola Pengguna ({userTotal})</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Cari email atau username, saring status, dan kelola hak akun.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadUsers} loading={usersLoading}>
                    <RefreshCw size={14} />
                    <span>Segarkan</span>
                  </Button>
                </div>

                {/* Baris Pencarian & Filter */}
                <Card className="space-y-3 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <Input
                      placeholder="Cari email, @username, nama..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        setUserPage(1)
                      }}
                      leftAddon={<Search size={15} />}
                    />
                    <Select
                      aria-label="Filter paket"
                      value={userPlanFilter}
                      onChange={(e) => {
                        setUserPlanFilter(e.target.value as 'all' | 'free' | 'pro')
                        setUserPage(1)
                      }}
                    >
                      <option value="all">Semua Paket</option>
                      <option value="pro">Paket Pro</option>
                      <option value="free">Paket Free</option>
                    </Select>
                    <Select
                      aria-label="Filter status akun"
                      value={userStatusFilter}
                      onChange={(e) => {
                        setUserStatusFilter(e.target.value as 'all' | 'active' | 'banned' | 'unclaimed')
                        setUserPage(1)
                      }}
                    >
                      <option value="all">Semua Status</option>
                      <option value="active">Aktif</option>
                      <option value="banned">Banned</option>
                      <option value="unclaimed">Belum Klaim Username</option>
                    </Select>
                    <Select
                      aria-label="Filter verifikasi"
                      value={userVerifiedFilter}
                      onChange={(e) => {
                        setUserVerifiedFilter(e.target.value as 'all' | 'verified' | 'unverified')
                        setUserPage(1)
                      }}
                    >
                      <option value="all">Semua Verifikasi</option>
                      <option value="verified">Terverifikasi</option>
                      <option value="unverified">Belum Terverifikasi</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                      type="date"
                      label="Daftar dari tanggal"
                      value={userDateFrom}
                      onChange={(e) => {
                        setUserDateFrom(e.target.value)
                        setUserPage(1)
                      }}
                    />
                    <Input
                      type="date"
                      label="Sampai tanggal"
                      value={userDateTo}
                      onChange={(e) => {
                        setUserDateTo(e.target.value)
                        setUserPage(1)
                      }}
                    />
                    <Select
                      label="Urutkan"
                      value={userSort}
                      onChange={(e) => setUserSort(e.target.value as 'newest' | 'oldest' | 'username')}
                    >
                      <option value="newest">Terbaru mendaftar</option>
                      <option value="oldest">Terlama mendaftar</option>
                      <option value="username">Abjad username (A–Z)</option>
                    </Select>
                  </div>
                </Card>

                {usersErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{usersErr}</Card>}

                {usersLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : userItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="m-0 text-[14px] text-fg-sec">
                      Tidak ada pengguna yang cocok dengan pencarian dan filter saat ini.
                    </p>
                  </Card>
                ) : (
                  <>
                    {/* Mobile Cards (<768px): pasangan label-nilai tanpa horizontal scroll */}
                    <div className="space-y-3 md:hidden">
                      {userItems.map((u) => (
                        <Card key={u.id} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3">
                              <Avatar
                                src={u.avatar_url}
                                name={u.display_name || u.username || u.email}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-[14px] font-bold text-fg">
                                    {u.username ? `@${u.username}` : 'Belum klaim'}
                                  </span>
                                  {u.is_verified && <VerifiedBadgeIcon size={14} />}
                                </div>
                                <span className="block truncate font-mono text-[11.5px] text-fg-sec" title={u.email}>
                                  {u.email}
                                </span>
                              </div>
                            </div>
                            <Dropdown
                              trigger={
                                <IconButton label={`Aksi untuk ${u.username || u.email}`} size="sm">
                                  <MoreHorizontal size={16} />
                                </IconButton>
                              }
                              items={buildUserActions(u)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 rounded-xl border border-edge bg-bg p-3 text-[12px]">
                            <div>
                              <span className="block text-fg-sec">Paket</span>
                              <span className="font-mono font-semibold uppercase text-fg">
                                {u.effective_plan}
                              </span>
                            </div>
                            <div>
                              <span className="block text-fg-sec">Status</span>
                              <span className="font-mono font-semibold text-fg">
                                {u.is_banned ? 'Banned' : u.has_username ? 'Aktif' : 'Belum klaim'}
                              </span>
                            </div>
                            <div>
                              <span className="block text-fg-sec">Terdaftar</span>
                              <span className="font-mono text-fg">{formatDateShort(u.registered_at)}</span>
                            </div>
                            <div>
                              <span className="block text-fg-sec">Konten</span>
                              <span className="font-mono text-fg">
                                {u.templates_count} tpl · {u.links_count} link
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => void openUserDetailDrawer(u.id)}
                          >
                            Buka detail pengguna
                          </Button>
                        </Card>
                      ))}
                    </div>

                    {/* Tablet & Desktop Table (>=768px): kolom sekunder tersembunyi di tablet */}
                    <Card className="hidden overflow-visible md:block">
                      <table className="w-full border-collapse text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-edge text-[12px] text-fg-sec">
                            <th className="px-4 py-3 font-semibold">Pengguna</th>
                            <th className="px-4 py-3 font-semibold">Paket</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="hidden px-4 py-3 font-semibold xl:table-cell">Konten</th>
                            <th className="hidden px-4 py-3 font-semibold xl:table-cell">Daftar</th>
                            <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-edge">
                          {userItems.map((u) => (
                            <tr key={u.id}>
                              <td className="max-w-[260px] px-4 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <Avatar
                                    src={u.avatar_url}
                                    name={u.display_name || u.username || u.email}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate font-bold text-fg">
                                        {u.username ? `@${u.username}` : 'Belum klaim username'}
                                      </span>
                                      {u.is_verified && <VerifiedBadgeIcon size={14} />}
                                      {u.is_admin && <Badge variant="ok">ADMIN</Badge>}
                                    </div>
                                    <span
                                      className="block truncate font-mono text-[11.5px] text-fg-sec"
                                      title={u.email}
                                    >
                                      {u.email}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={u.effective_plan === 'pro' ? 'accent' : 'neutral'}>
                                  {u.effective_plan.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {u.is_banned ? (
                                  <Badge variant="err">BANNED</Badge>
                                ) : u.has_username ? (
                                  <Badge variant="ok">AKTIF</Badge>
                                ) : (
                                  <Badge variant="warn">BELUM KLAIM</Badge>
                                )}
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-[12px] text-fg-sec xl:table-cell">
                                {u.templates_count} tpl · {u.links_count} link
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-[12px] text-fg-sec xl:table-cell">
                                {formatDateShort(u.registered_at)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => void openUserDetailDrawer(u.id)}
                                  >
                                    Detail
                                  </Button>
                                  <Dropdown
                                    trigger={
                                      <IconButton label={`Menu aksi ${u.username || u.email}`} size="sm">
                                        <MoreHorizontal size={16} />
                                      </IconButton>
                                    }
                                    items={buildUserActions(u)}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>

                    {/* Pagination Server-Side */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="font-mono text-[12px] text-fg-sec">
                        Halaman {userPage} dari {totalUserPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={userPage <= 1}
                          onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={15} />
                          <span>Sebelumnya</span>
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={userPage >= totalUserPages}
                          onClick={() => setUserPage((p) => p + 1)}
                        >
                          <span>Berikutnya</span>
                          <ChevronRight size={15} />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 3: USERNAME & KATA CADANGAN                             */}
            {/* ============================================================== */}
            {section === 'usernames' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Klaim Username & Kata Cadangan</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Pindahkan atau lepas klaim username pengguna, serta kelola daftar kata yang dilindungi.
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <Input
                      placeholder="Cari username atau kata..."
                      value={unameSearch}
                      onChange={(e) => setUnameSearch(e.target.value)}
                      leftAddon={<Search size={15} />}
                    />
                  </div>
                </div>

                {unameErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{unameErr}</Card>}

                <Card className="p-5">
                  <h3 className="m-0 text-[16px] font-bold text-fg">
                    Username yang Diklaim ({unameClaims.length})
                  </h3>
                  {unameLoading ? (
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
                  ) : unameClaims.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-fg-sec">Belum ada username yang diklaim.</p>
                  ) : (
                    <div className="mt-4 divide-y divide-edge">
                      {unameClaims.map((c) => (
                        <div
                          key={c.user_id}
                          className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[14px] font-bold text-fg">@{c.username}</span>
                              <span className="truncate text-[13px] text-fg-sec">{c.display_name}</span>
                              {c.is_banned && <Badge variant="err">BANNED</Badge>}
                            </div>
                            <span className="block truncate font-mono text-[11.5px] text-fg-sec">
                              {c.email} · diklaim {formatDateShort(c.created_at)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setRenameModalUser({ id: c.user_id, oldUsername: c.username })
                                setRenameValue(c.username)
                                setRenameErr('')
                              }}
                            >
                              Pindahkan / Ubah
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setReleaseTarget({ userId: c.user_id, username: c.username })
                              }
                            >
                              Lepas Klaim
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="m-0 text-[16px] font-bold text-fg">
                    Daftar Kata Cadangan ({reservedWords.length})
                  </h3>
                  <p className="mt-1 text-[13px] text-fg-sec">
                    Kata di daftar ini tidak dapat diklaim oleh pendaftar baru.
                  </p>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newReservedWord.trim()) return
                      setSavingReserved(true)
                      try {
                        await adminManageReservedUsername(
                          newReservedWord,
                          'add',
                          newReservedReason || 'Ditambahkan admin'
                        )
                        setNewReservedWord('')
                        setNewReservedReason('')
                        pushToast('Kata cadangan ditambahkan.')
                        await loadUsernames()
                      } catch (err) {
                        pushToast(err instanceof Error ? err.message : 'Gagal menambah kata.', 'err')
                      } finally {
                        setSavingReserved(false)
                      }
                    }}
                    className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <Input
                      placeholder="Kata baru (mis. promo)"
                      value={newReservedWord}
                      onChange={(e) => setNewReservedWord(e.target.value.toLowerCase().trim())}
                      required
                    />
                    <Input
                      placeholder="Alasan singkat (opsional)"
                      value={newReservedReason}
                      onChange={(e) => setNewReservedReason(e.target.value)}
                    />
                    <Button type="submit" variant="primary" loading={savingReserved}>
                      <Plus size={15} />
                      <span>Tambah Kata</span>
                    </Button>
                  </form>

                  <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto pt-1">
                    {reservedWords.map((rw) => (
                      <div
                        key={rw.word}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-edge bg-bg pl-3 pr-1 py-1"
                      >
                        <span className="font-mono text-[12px] font-medium text-fg">{rw.word}</span>
                        <IconButton
                          size="sm"
                          variant="ghost"
                          label={`Hapus kata cadangan ${rw.word}`}
                          onClick={async () => {
                            try {
                              await adminManageReservedUsername(rw.word, 'remove')
                              pushToast(`Kata "${rw.word}" dilepas dari daftar cadangan.`)
                              await loadUsernames()
                            } catch (err) {
                              pushToast(err instanceof Error ? err.message : 'Gagal menghapus.', 'err')
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 4: MODERASI TEMPLATE & LINK                             */}
            {/* ============================================================== */}
            {section === 'content' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">
                      Moderasi Template & Link ({contentTotal})
                    </h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Sembunyikan, pulihkan, atau hapus tautan yang melanggar ketentuan.
                    </p>
                  </div>
                  <Tabs<'templates' | 'links'>
                    layoutGroupId="admin-content-kind"
                    active={contentKind}
                    onChange={(k) => {
                      setContentKind(k)
                      setContentPage(1)
                    }}
                    tabs={[
                      { id: 'templates', label: 'Template CapCut' },
                      { id: 'links', label: 'Link Bio' },
                    ]}
                  />
                </div>

                <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  <Input
                    placeholder="Cari judul, URL, atau @pemilik..."
                    value={contentSearch}
                    onChange={(e) => {
                      setContentSearch(e.target.value)
                      setContentPage(1)
                    }}
                    leftAddon={<Search size={15} />}
                  />
                  <Select
                    aria-label="Filter status konten"
                    value={contentStatus}
                    onChange={(e) => {
                      setContentStatus(e.target.value)
                      setContentPage(1)
                    }}
                  >
                    <option value="all">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="hidden">Disembunyikan</option>
                    {contentKind === 'templates' && <option value="removed">Dihapus</option>}
                  </Select>
                </Card>

                {contentErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{contentErr}</Card>}

                {contentLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : contentItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="m-0 text-[14px] text-fg-sec">Tidak ada item konten ditemukan.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {contentItems.map((item) => (
                      <Card
                        key={item.id}
                        className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {item.kind === 'template' && (
                            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-edge">
                              <ProgressiveImage
                                src={item.thumbnail_url}
                                alt={item.title}
                                ratio="4:5"
                                fallbackLabel="4:5"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  item.status === 'active'
                                    ? 'ok'
                                    : item.status === 'hidden'
                                      ? 'warn'
                                      : 'err'
                                }
                              >
                                {item.status.toUpperCase()}
                              </Badge>
                              <span className="truncate text-[14px] font-bold text-fg">{item.title}</span>
                            </div>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 block truncate font-mono text-[11.5px] text-fg-sec underline"
                              >
                                {item.url}
                              </a>
                            )}
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-fg-sec">
                              <span>Pemilik:</span>
                              <Link
                                to={`/@${item.owner_username}`}
                                className="font-mono font-semibold text-fg underline"
                              >
                                @{item.owner_username}
                              </Link>
                              <span>· {formatDateShort(item.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.status === 'active' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={async () => {
                                await adminModerateContent(item.kind, item.id, 'hidden')
                                pushToast('Konten disembunyikan.')
                                await loadContent()
                              }}
                            >
                              <EyeOff size={14} />
                              <span>Sembunyikan</span>
                            </Button>
                          )}
                          {item.status !== 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await adminModerateContent(item.kind, item.id, 'active')
                                pushToast('Konten dipulihkan.')
                                await loadContent()
                              }}
                            >
                              <span>Pulihkan</span>
                            </Button>
                          )}
                          {item.status !== 'removed' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                await adminModerateContent(item.kind, item.id, 'removed')
                                pushToast('Konten dihapus dari publik.')
                                await loadContent()
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
            )}

            {/* ============================================================== */}
            {/* BAGIAN 5: ANTREAN LAPORAN                                      */}
            {/* ============================================================== */}
            {section === 'reports' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Antrean Laporan Penyalahgunaan</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Tinjau laporan pengunjung, tulis catatan moderator, dan ambil tindakan cepat.
                    </p>
                  </div>
                  <Select
                    aria-label="Filter status laporan"
                    value={reportFilter}
                    onChange={(e) => setReportFilter(e.target.value)}
                    className="min-w-[180px]"
                  >
                    <option value="all">Semua Laporan</option>
                    <option value="open">Baru (Open)</option>
                    <option value="reviewed">Ditinjau</option>
                    <option value="resolved">Selesai</option>
                    <option value="dismissed">Diabaikan</option>
                  </Select>
                </div>

                {reportsErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{reportsErr}</Card>}

                {reportsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : reportItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="m-0 text-[14px] text-fg-sec">Tidak ada laporan pada filter ini.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {reportItems.map((rep) => {
                      const noteVal = reportNotes[rep.id] ?? rep.admin_note ?? ''
                      return (
                        <Card key={rep.id} className="space-y-3 p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  rep.status === 'open'
                                    ? 'err'
                                    : rep.status === 'reviewed'
                                      ? 'warn'
                                      : 'neutral'
                                }
                              >
                                {rep.status.toUpperCase()}
                              </Badge>
                              <Badge>{rep.target_type === 'profile' ? 'Profil' : 'Template'}</Badge>
                              <span className="font-mono text-[12px] font-semibold text-fg">
                                {rep.target_label || rep.target_id.slice(0, 10)}
                              </span>
                              {rep.owner_username && (
                                <Link
                                  to={`/@${rep.owner_username}`}
                                  className="font-mono text-[12px] text-fg-sec underline"
                                >
                                  /@{rep.owner_username}
                                </Link>
                              )}
                            </div>
                            <span className="font-mono text-[11.5px] text-fg-sec">
                              {formatDateTimeShort(rep.created_at)}
                            </span>
                          </div>

                          <div>
                            <p className="m-0 text-[14px] font-bold text-fg">{rep.reason}</p>
                            {rep.details && (
                              <p className="mt-1 mb-0 text-[13px] text-fg-sec">{rep.details}</p>
                            )}
                          </div>

                          <Input
                            placeholder="Catatan admin (alasan tindakan)..."
                            value={noteVal}
                            onChange={(e) =>
                              setReportNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                            }
                          />

                          <div className="flex flex-wrap gap-2">
                            {rep.status === 'open' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  await adminResolveReportV2(rep.id, 'reviewed', noteVal, 'none')
                                  pushToast('Laporan ditandai sedang ditinjau.')
                                  await loadReports()
                                }}
                              >
                                Tandai Ditinjau
                              </Button>
                            )}
                            {rep.target_type === 'template' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  await adminResolveReportV2(
                                    rep.id,
                                    'resolved',
                                    noteVal,
                                    'hide_content'
                                  )
                                  pushToast('Template disembunyikan & laporan selesai.')
                                  await loadReports()
                                }}
                              >
                                Sembunyikan Konten
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                await adminResolveReportV2(rep.id, 'resolved', noteVal, 'ban_user')
                                pushToast('Pemilik ditangguhkan & laporan diselesaikan.')
                                await loadReports()
                              }}
                            >
                              <Ban size={14} />
                              <span>Ban Pengguna</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await adminResolveReportV2(rep.id, 'dismissed', noteVal, 'none')
                                pushToast('Laporan diabaikan.')
                                await loadReports()
                              }}
                            >
                              Abaikan
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 6: PAKET & LANGGANAN                                    */}
            {/* ============================================================== */}
            {section === 'subscriptions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="m-0 text-[18px] font-bold text-fg">Paket Pro & Langganan</h2>
                  <p className="mt-0.5 text-[13px] text-fg-sec">
                    Pantau pelanggan Pro aktif, masa berlaku yang segera habis, dan kelola paket massal.
                  </p>
                </div>

                {subsErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{subsErr}</Card>}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="p-5">
                    <h3 className="m-0 text-[15px] font-bold text-fg">
                      Pro Aktif Saat Ini ({activeProList.length})
                    </h3>
                    {activeProList.length === 0 ? (
                      <p className="mt-2 text-[13px] text-fg-sec">Belum ada kreator dengan paket Pro aktif.</p>
                    ) : (
                      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                        {activeProList.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate font-mono font-semibold text-fg">@{p.username}</span>
                            <span className="shrink-0 font-mono text-[11.5px] text-fg-sec">
                              {p.plan_expires_at ? `s/d ${formatDateShort(p.plan_expires_at)}` : 'Tanpa batas'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <h3 className="m-0 text-[15px] font-bold text-fg">
                      Segera Berakhir ≤ 7 Hari ({expiringProList.length})
                    </h3>
                    {expiringProList.length === 0 ? (
                      <p className="mt-2 text-[13px] text-fg-sec">
                        Tidak ada paket Pro yang berakhir dalam 7 hari ke depan.
                      </p>
                    ) : (
                      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                        {expiringProList.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate font-mono font-semibold text-fg">@{p.username}</span>
                            <Badge variant="warn">{formatDateShort(p.plan_expires_at)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Aksi Massal Beri / Cabut Pro */}
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-[16px] font-bold text-fg">
                        Aksi Paket Massal ({selectedBulkIds.length} dipilih)
                      </h3>
                      <p className="mt-0.5 text-[12.5px] text-fg-sec">
                        Centang kreator di bawah untuk mengaktifkan Pro 30 hari atau mencabut Pro sekaligus.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={selectedBulkIds.length === 0}
                        loading={bulkBusy}
                        onClick={async () => {
                          setBulkBusy(true)
                          try {
                            const n = await adminBulkSetPlan(selectedBulkIds, 'pro', futureIsoDays(30))
                            setSelectedBulkIds([])
                            pushToast(`Paket Pro 30 hari diberikan ke ${n} akun.`)
                            await loadSubscriptions()
                          } catch (err) {
                            pushToast(err instanceof Error ? err.message : 'Gagal aksi massal.', 'err')
                          } finally {
                            setBulkBusy(false)
                          }
                        }}
                      >
                        <Sparkles size={14} />
                        <span>Beri Pro 30 Hari</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedBulkIds.length === 0}
                        loading={bulkBusy}
                        onClick={async () => {
                          setBulkBusy(true)
                          try {
                            const n = await adminBulkSetPlan(selectedBulkIds, 'free', null)
                            setSelectedBulkIds([])
                            pushToast(`Paket Pro dicabut dari ${n} akun.`)
                            await loadSubscriptions()
                          } catch (err) {
                            pushToast(err instanceof Error ? err.message : 'Gagal mencabut.', 'err')
                          } finally {
                            setBulkBusy(false)
                          }
                        }}
                      >
                        Cabut Pro Massal
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 max-h-56 divide-y divide-edge overflow-y-auto rounded-xl border border-edge bg-bg px-3">
                    {userItems
                      .filter((u) => u.has_username)
                      .map((u) => {
                        const checked = selectedBulkIds.includes(u.id)
                        return (
                          <label
                            key={u.id}
                            className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2 text-[13px]"
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setSelectedBulkIds((prev) =>
                                    e.target.checked
                                      ? [...prev, u.id]
                                      : prev.filter((x) => x !== u.id)
                                  )
                                }
                                className="h-4 w-4 accent-fg"
                              />
                              <span className="truncate font-mono font-semibold text-fg">
                                @{u.username}
                              </span>
                              <span className="hidden truncate text-fg-sec sm:inline">{u.email}</span>
                            </span>
                            <Badge variant={u.effective_plan === 'pro' ? 'accent' : 'neutral'}>
                              {u.effective_plan.toUpperCase()}
                            </Badge>
                          </label>
                        )
                      })}
                  </div>
                </Card>

                {/* Riwayat Pesanan / Langganan */}
                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="m-0 text-[16px] font-bold text-fg">Riwayat Langganan</h3>
                    <Select
                      aria-label="Filter riwayat langganan"
                      value={subFilter}
                      onChange={(e) => setSubFilter(e.target.value)}
                      className="min-w-[160px]"
                    >
                      <option value="all">Semua Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="revoked">Revoked</option>
                    </Select>
                  </div>

                  {subsLoading ? (
                    <Skeleton className="mt-4 h-24 w-full" />
                  ) : subHistory.length === 0 ? (
                    <p className="mt-3 text-[13.5px] text-fg-sec">Belum ada riwayat pesanan.</p>
                  ) : (
                    <div className="mt-4 divide-y divide-edge">
                      {subHistory.map((s) => (
                        <div
                          key={s.id}
                          className="flex flex-col justify-between gap-2 py-3 text-[13px] sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-semibold text-fg">
                              {s.username ? `@${s.username}` : s.email || s.user_id.slice(0, 8)}
                            </span>
                            <span className="ml-2 font-mono text-[12px] uppercase text-fg-sec">
                              {s.plan} · {s.provider}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={s.status === 'active' ? 'ok' : 'neutral'}>{s.status}</Badge>
                            <span className="font-mono text-[11.5px] text-fg-sec">
                              {formatDateShort(s.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 7: KREATOR PILIHAN                                      */}
            {/* ============================================================== */}
            {section === 'featured' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">Kurasi Kreator Pilihan</h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Atur urutan kreator unggulan yang tampil di Beranda dan halaman Jelajah.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={featuredList.length === 0}
                    loading={savingFeaturedOrder}
                    onClick={async () => {
                      setSavingFeaturedOrder(true)
                      try {
                        await adminReorderFeatured(featuredList.map((f) => f.id))
                        pushToast('Urutan kreator pilihan disimpan.')
                        await loadFeatured()
                      } catch (err) {
                        pushToast(err instanceof Error ? err.message : 'Gagal menyimpan urutan.', 'err')
                      } finally {
                        setSavingFeaturedOrder(false)
                      }
                    }}
                  >
                    Simpan urutan
                  </Button>
                </div>

                <Card className="p-5">
                  <h3 className="m-0 text-[15px] font-bold text-fg">
                    Daftar Aktif ({featuredList.length})
                  </h3>
                  {featuredLoading ? (
                    <Skeleton className="mt-3 h-20 w-full" />
                  ) : featuredList.length === 0 ? (
                    <p className="mt-2 text-[13.5px] text-fg-sec">
                      Belum ada kreator pilihan. Pilih dari daftar kreator di bawah.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {featuredList.map((f, idx) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-bg p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="font-mono text-[12px] font-bold text-fg-sec">
                              0{idx + 1}
                            </span>
                            <Avatar src={f.avatar_url} name={f.display_name || f.username || ''} size="sm" />
                            <div className="min-w-0">
                              <span className="block truncate text-[14px] font-bold text-fg">
                                @{f.username}
                              </span>
                              <span className="block truncate text-[12px] text-fg-sec">
                                {f.display_name}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <IconButton
                              size="sm"
                              label="Naikkan urutan"
                              disabled={idx === 0}
                              onClick={() => {
                                const copy = [...featuredList]
                                const [m] = copy.splice(idx, 1)
                                copy.splice(idx - 1, 0, m)
                                setFeaturedList(copy)
                              }}
                            >
                              <ArrowUp size={15} />
                            </IconButton>
                            <IconButton
                              size="sm"
                              label="Turunkan urutan"
                              disabled={idx === featuredList.length - 1}
                              onClick={() => {
                                const copy = [...featuredList]
                                const [m] = copy.splice(idx, 1)
                                copy.splice(idx + 1, 0, m)
                                setFeaturedList(copy)
                              }}
                            >
                              <ArrowDown size={15} />
                            </IconButton>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await adminSetUserFlags({
                                  userId: f.id,
                                  is_featured: false,
                                  featured_order: 0,
                                })
                                pushToast(`@${f.username} dikeluarkan dari pilihan.`)
                                await loadFeatured()
                              }}
                            >
                              Keluarkan
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="m-0 text-[15px] font-bold text-fg">Tambah Kreator ke Pilihan</h3>
                    <div className="w-full sm:w-64">
                      <Input
                        placeholder="Cari kreator..."
                        value={featuredCandidateSearch}
                        onChange={(e) => setFeaturedCandidateSearch(e.target.value)}
                        leftAddon={<Search size={15} />}
                      />
                    </div>
                  </div>
                  <div className="mt-3 divide-y divide-edge">
                    {featuredCandidates.slice(0, 12).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <span className="font-mono text-[13.5px] font-bold text-fg">@{c.username}</span>
                          <span className="ml-2 text-[13px] text-fg-sec">{c.display_name}</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await adminSetUserFlags({
                              userId: c.id,
                              is_featured: true,
                              featured_order: featuredList.length + 1,
                            })
                            pushToast(`@${c.username} ditambahkan ke Kreator Pilihan.`)
                            await loadFeatured()
                          }}
                        >
                          <Plus size={14} />
                          <span>Pilih</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 8: LOG AKTIVITAS (AUDIT)                                */}
            {/* ============================================================== */}
            {section === 'audit' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[18px] font-bold text-fg">
                      Log Aktivitas Audit ({auditTotal})
                    </h2>
                    <p className="mt-0.5 text-[13px] text-fg-sec">
                      Catatan permanen seluruh tindakan admin (tidak dapat diubah atau dihapus).
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={loadAudit} loading={auditLoading}>
                    <RefreshCw size={14} />
                    <span>Segarkan</span>
                  </Button>
                </div>

                <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                  <Input
                    placeholder="Cari email admin, aksi, atau ID target..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value)
                      setAuditPage(1)
                    }}
                    leftAddon={<Search size={15} />}
                  />
                  <Select
                    aria-label="Filter jenis aksi"
                    value={auditActionFilter}
                    onChange={(e) => {
                      setAuditActionFilter(e.target.value)
                      setAuditPage(1)
                    }}
                  >
                    <option value="all">Semua Aksi</option>
                    <option value="admin_unlock">Buka Panel (admin_unlock)</option>
                    <option value="admin_unlock_failed">Gagal Buka Panel</option>
                    <option value="admin_lockout">Penguncian 15 Menit</option>
                    <option value="admin_change_passphrase">Ganti Password Admin</option>
                    <option value="admin_set_user_flags">Verifikasi / Ban</option>
                    <option value="admin_grant_pro">Beri Pro</option>
                    <option value="admin_change_username">Ubah Username</option>
                    <option value="admin_delete_user_account">Hapus Akun</option>
                  </Select>
                </Card>

                {auditErr && <Card className="border-fg p-4 text-[13.5px] text-fg">{auditErr}</Card>}

                {auditLoading ? (
                  <div className="space-y-2.5">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : auditItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="m-0 text-[14px] text-fg-sec">Tidak ada catatan audit pada filter ini.</p>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {auditItems.map((log) => (
                      <Card key={log.id} className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="ok">{log.action}</Badge>
                            <span className="font-mono text-[12px] text-fg">
                              {log.actor_email || 'system'}
                            </span>
                          </div>
                          <span className="font-mono text-[11.5px] text-fg-sec">
                            {formatDateTimeShort(log.created_at)}
                          </span>
                        </div>
                        <div className="mt-2 font-mono text-[11.5px] break-all text-fg-sec">
                          Target: {log.target_type || '—'} ({log.target_id || '—'}){' '}
                          {Object.keys(log.details || {}).length > 0 &&
                            `· ${JSON.stringify(log.details)}`}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* BAGIAN 9: PENGATURAN SITUS, PASSWORD ADMIN & TIM ADMIN         */}
            {/* ============================================================== */}
            {section === 'settings' && (
              <div className="max-w-[640px] space-y-6">
                {/* 9A. Pengumuman Situs & Mode Pemeliharaan */}
                <Card className="p-5 sm:p-6">
                  <h2 className="m-0 text-[17px] font-bold text-fg">Pengumuman Situs & Pemeliharaan</h2>
                  <p className="mt-1 text-[13px] text-fg-sec">
                    Tampilkan pita informasi singkat di bagian atas seluruh halaman Luven.
                  </p>

                  {settingsLoading ? (
                    <Skeleton className="mt-4 h-32 w-full" />
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault()
                        setSavingSiteSettings(true)
                        try {
                          await adminUpdateSiteSettings(siteForm)
                          await refreshAuth()
                          pushToast('Pengaturan situs berhasil disimpan.')
                        } catch (err) {
                          pushToast(err instanceof Error ? err.message : 'Gagal menyimpan.', 'err')
                        } finally {
                          setSavingSiteSettings(false)
                        }
                      }}
                      className="mt-4 space-y-4"
                    >
                      <Textarea
                        label="Teks Banner Pengumuman (opsional)"
                        rows={2}
                        maxLength={280}
                        rightMeta={`${siteForm.announcement_text.length}/280`}
                        value={siteForm.announcement_text}
                        onChange={(e) =>
                          setSiteForm((s) => ({ ...s, announcement_text: e.target.value }))
                        }
                      />

                      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-edge bg-bg px-4 py-2.5 text-[13.5px]">
                        <span className="font-medium text-fg">Tampilkan banner pengumuman</span>
                        <input
                          type="checkbox"
                          checked={siteForm.announcement_active}
                          onChange={(e) =>
                            setSiteForm((s) => ({ ...s, announcement_active: e.target.checked }))
                          }
                          className="h-4 w-4 accent-fg"
                        />
                      </label>

                      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-edge bg-bg px-4 py-2.5 text-[13.5px]">
                        <span className="font-medium text-fg">Aktifkan pemberitahuan mode pemeliharaan</span>
                        <input
                          type="checkbox"
                          checked={siteForm.maintenance_mode}
                          onChange={(e) =>
                            setSiteForm((s) => ({ ...s, maintenance_mode: e.target.checked }))
                          }
                          className="h-4 w-4 accent-fg"
                        />
                      </label>

                      <Button
                        type="submit"
                        variant="primary"
                        loading={savingSiteSettings}
                        className="w-full sm:w-auto"
                      >
                        Simpan pengaturan situs
                      </Button>
                    </form>
                  )}
                </Card>

                {/* 9B. Ganti Password Khusus Admin */}
                <Card className="p-5 sm:p-6">
                  <h2 className="m-0 text-[17px] font-bold text-fg">Ganti Password Admin</h2>
                  <p className="mt-1 text-[13px] text-fg-sec">
                    Disimpan sebagai hash bcrypt di Supabase (minimal 12 karakter).
                  </p>

                  <form onSubmit={handleChangeAdminPassphrase} noValidate className="mt-4 space-y-4">
                    <div>
                      <PasswordInput
                        name="admin-new-pass"
                        label="Password admin baru"
                        placeholder="Minimal 12 karakter"
                        autoComplete="new-password"
                        value={newAdminPass}
                        onChange={(e) => {
                          setNewAdminPass(e.target.value)
                          setPassChangeErr('')
                        }}
                        leftAddon={<KeyRound size={16} />}
                        required
                      />
                      <PasswordStrengthMeter password={newAdminPass} minLength={12} />
                    </div>

                    <PasswordInput
                      name="admin-confirm-pass"
                      label="Konfirmasi password admin baru"
                      placeholder="Ketik ulang password baru"
                      autoComplete="new-password"
                      value={confirmAdminPass}
                      onChange={(e) => {
                        setConfirmAdminPass(e.target.value)
                        setPassChangeErr('')
                      }}
                      leftAddon={<Lock size={16} />}
                      required
                    />

                    {passChangeErr && (
                      <p role="alert" className="text-[13px] font-medium text-fg">
                        {passChangeErr}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      loading={changingPass}
                      className="w-full sm:w-auto"
                    >
                      Simpan password admin
                    </Button>
                  </form>
                </Card>

                {/* 9C. Daftar & Kelola Tim Admin */}
                <Card className="p-5 sm:p-6">
                  <h2 className="m-0 text-[17px] font-bold text-fg">Daftar Administrator</h2>
                  <p className="mt-1 text-[13px] text-fg-sec">
                    Tambahkan akun yang sudah terdaftar di Luven. Admin utama dilindungi dan tidak dapat dicabut.
                  </p>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!newAdminEmail.trim()) return
                      setAddingAdmin(true)
                      try {
                        await adminManageTeam(newAdminEmail, 'add', newAdminNote || 'Moderator')
                        setNewAdminEmail('')
                        setNewAdminNote('')
                        pushToast('Administrator baru berhasil ditambahkan.')
                        await loadSettings()
                      } catch (err) {
                        pushToast(err instanceof Error ? err.message : 'Gagal menambah admin.', 'err')
                      } finally {
                        setAddingAdmin(false)
                      }
                    }}
                    className="mt-4 space-y-3"
                  >
                    <Input
                      type="email"
                      label="Email Akun Terdaftar"
                      placeholder="moderator@domain.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      required
                    />
                    <Input
                      label="Catatan Peran (opsional)"
                      placeholder="Moderator Konten"
                      value={newAdminNote}
                      onChange={(e) => setNewAdminNote(e.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={addingAdmin}
                      className="w-full sm:w-auto"
                    >
                      <Plus size={15} />
                      <span>Tambah admin</span>
                    </Button>
                  </form>

                  <div className="mt-5 divide-y divide-edge border-t border-edge pt-2">
                    {teamList.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-mono text-[13.5px] font-bold text-fg">
                              {m.email}
                            </span>
                            {m.is_primary ? (
                              <Badge variant="ok">ADMIN UTAMA</Badge>
                            ) : (
                              <Badge variant="neutral">ADMIN</Badge>
                            )}
                          </div>
                          <span className="block text-[12px] text-fg-sec">
                            {m.username ? `@${m.username} · ` : ''}
                            {m.note || 'Administrator'}
                          </span>
                        </div>
                        {!m.is_primary && m.user_id !== user.id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRevokeTarget(m)}
                          >
                            Cabut Akses
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (<1024px) */}
      <nav
        aria-label="Navigasi bawah admin"
        className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 gap-1 border-t border-edge bg-surface px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        {(
          [
            { id: 'overview', label: 'Ringkas', icon: BarChart3 },
            { id: 'users', label: 'Pengguna', icon: Users },
            { id: 'reports', label: 'Laporan', icon: Flag },
            { id: 'content', label: 'Konten', icon: Layers },
          ] as const
        ).map((it) => {
          const Icon = it.icon
          return (
            <Button
              key={it.id}
              variant={section === it.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSection(it.id)}
              className="h-12! flex-col! gap-0.5! px-1! text-[11px]!"
            >
              <Icon size={16} />
              <span>{it.label}</span>
            </Button>
          )
        })}
        <Button
          variant={mobileNavOpen ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setMobileNavOpen(true)}
          className="h-12! flex-col! gap-0.5! px-1! text-[11px]!"
        >
          <Menu size={16} />
          <span>Semua</span>
        </Button>
      </nav>

      {/* Mobile 9-Section Sheet (<1024px) */}
      <Modal
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Bagian Panel Admin"
        description="Pilih bagian administrasi yang ingin dibuka."
      >
        <div className="grid grid-cols-1 gap-1.5">
          {SECTION_META.map((item) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <Button
                key={item.id}
                variant={active ? 'primary' : 'secondary'}
                size="lg"
                fullWidth
                onClick={() => {
                  setSection(item.id)
                  setMobileNavOpen(false)
                }}
                className="justify-start! px-4!"
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Button>
            )
          })}
        </div>
      </Modal>

      {/* MODAL / DRAWER DETAIL PENGGUNA */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detail Akun Pengguna"
        description="Informasi identitas login, status profil, riwayat langganan, dan laporan terkait."
        maxWidth="max-w-[600px]"
      >
        {detailLoading || !userDetail ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="space-y-4 text-[13.5px]">
            <div className="rounded-xl border border-edge bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-fg">{userDetail.account.email}</span>
                <div className="flex flex-wrap gap-1.5">
                  {userDetail.account.providers.map((p) => (
                    <Badge key={p} variant="ok">
                      {p.toUpperCase()}
                    </Badge>
                  ))}
                  {userDetail.account.has_password && <Badge variant="neutral">PASSWORD AKTIF</Badge>}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-fg-sec">
                <span>Terdaftar: {formatDateShort(userDetail.account.created_at)}</span>
                <span>Login terakhir: {formatDateTimeShort(userDetail.account.last_sign_in_at)}</span>
              </div>
            </div>

            {userDetail.profile ? (
              <div className="rounded-xl border border-edge bg-bg p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[15px] font-bold text-fg">
                      @{userDetail.profile.username}
                    </span>
                    <span className="ml-2 text-fg-sec">{userDetail.profile.display_name}</span>
                  </div>
                  <LinkButton
                    to={`/@${userDetail.profile.username}`}
                    variant="secondary"
                    size="sm"
                  >
                    Buka Profil
                  </LinkButton>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[12px] sm:grid-cols-4">
                  <div>
                    <span className="block text-fg-sec">Template</span>
                    <strong className="text-fg">{userDetail.stats.templates_count}</strong>
                  </div>
                  <div>
                    <span className="block text-fg-sec">Link Bio</span>
                    <strong className="text-fg">{userDetail.stats.links_count}</strong>
                  </div>
                  <div>
                    <span className="block text-fg-sec">Kunjungan</span>
                    <strong className="text-fg">{userDetail.stats.total_views}</strong>
                  </div>
                  <div>
                    <span className="block text-fg-sec">Total Klik</span>
                    <strong className="text-fg">{userDetail.stats.total_clicks}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-edge bg-bg p-4 text-fg-sec">
                Akun ini belum menyelesaikan klaim username.
              </p>
            )}

            <div>
              <h3 className="m-0 text-[14px] font-bold text-fg">
                Riwayat Paket ({userDetail.subscriptions.length})
              </h3>
              {userDetail.subscriptions.length === 0 ? (
                <p className="mt-1 text-[12.5px] text-fg-sec">Belum ada riwayat paket.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {userDetail.subscriptions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-edge px-3 py-2 font-mono text-[12px]"
                    >
                      <span>
                        {s.plan.toUpperCase()} ({s.status})
                      </span>
                      <span className="text-fg-sec">{formatDateShort(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="m-0 text-[14px] font-bold text-fg">
                Laporan Terkait ({userDetail.reports.length})
              </h3>
              {userDetail.reports.length === 0 ? (
                <p className="mt-1 text-[12.5px] text-fg-sec">Bersih dari laporan pelanggaran.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {userDetail.reports.map((r) => (
                    <div key={r.id} className="rounded-lg border border-edge px-3 py-2 text-[12.5px]">
                      <span className="font-semibold text-fg">{r.reason}</span>
                      <span className="ml-2 font-mono text-[11px] text-fg-sec">({r.status})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL KONFIRMASI BAN / UNBAN */}
      <Modal
        open={Boolean(banModalUser)}
        onClose={() => setBanModalUser(null)}
        title={banModalUser?.is_banned ? 'Cabut Penangguhan Akun' : 'Tangguhkan (Ban) Akun'}
        description={
          banModalUser?.is_banned
            ? `Pulihkan akses publik untuk @${banModalUser.username}?`
            : `Halaman publik @${banModalUser?.username} akan disembunyikan dari pengunjung.`
        }
      >
        <form onSubmit={handleConfirmBan} className="space-y-4">
          {!banModalUser?.is_banned && (
            <Textarea
              label="Alasan Penangguhan"
              placeholder="Contoh: Tautan phishing atau pelanggaran hak cipta berulang"
              value={banReasonInput}
              onChange={(e) => setBanReasonInput(e.target.value)}
              required
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBanModalUser(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant={banModalUser?.is_banned ? 'primary' : 'destructive'}
              loading={banSaving}
            >
              {banModalUser?.is_banned ? 'Pulihkan Akun' : 'Konfirmasi Ban'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL ATUR PAKET PRO / FREE */}
      <Modal
        open={Boolean(planModalUser)}
        onClose={() => setPlanModalUser(null)}
        title={`Atur Paket @${planModalUser?.username || ''}`}
        description="Pilih masa berlaku paket Pro atau kembalikan akun ke paket Free."
      >
        <form onSubmit={handleConfirmPlan} className="space-y-4">
          <Select
            label="Tindakan Paket"
            value={planDuration}
            onChange={(e) =>
              setPlanDuration(
                e.target.value as '30d' | '365d' | 'lifetime' | 'custom' | 'revoke'
              )
            }
          >
            <option value="30d">Aktifkan Pro — 30 Hari</option>
            <option value="365d">Aktifkan Pro — 1 Tahun</option>
            <option value="lifetime">Aktifkan Pro — Tanpa Batas Waktu</option>
            <option value="custom">Aktifkan Pro — Pilih Tanggal Berakhir</option>
            <option value="revoke">Cabut Pro (Kembali ke Free)</option>
          </Select>

          {planDuration === 'custom' && (
            <Input
              type="date"
              label="Tanggal Berakhir Pro"
              value={planCustomDate}
              onChange={(e) => setPlanCustomDate(e.target.value)}
              required
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPlanModalUser(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={planSaving}>
              Simpan Paket
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL UBAH USERNAME (KHUSUS ADMIN) */}
      <Modal
        open={Boolean(renameModalUser)}
        onClose={() => setRenameModalUser(null)}
        title="Ubah Username oleh Admin"
        description={`Mengubah @${renameModalUser?.oldUsername || ''} menjadi username baru tanpa menghapus link atau template pemilik.`}
      >
        <form onSubmit={handleConfirmRename} className="space-y-4">
          <Input
            label="Username Baru"
            value={renameValue}
            maxLength={24}
            onChange={(e) => {
              setRenameValue(e.target.value.toLowerCase().replace(/\s+/g, ''))
              setRenameErr('')
            }}
            leftAddon={<AtSign size={16} />}
            hint={renameHint || '3–24 karakter a–z, 0–9, titik, atau garis bawah.'}
            required
          />
          {renameErr && (
            <p role="alert" className="text-[13px] font-medium text-fg">
              {renameErr}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenameModalUser(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={renameSaving}>
              Konfirmasi Ubah Username
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL LEPAS KLAIM USERNAME */}
      <Modal
        open={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        title="Lepas Klaim Username"
        description={`Melepas klaim @${releaseTarget?.username || ''} akan menghapus profil publik beserta link/template di dalamnya, namun akun login tetap ada.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReleaseTarget(null)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            loading={releasingSaving}
            onClick={async () => {
              if (!releaseTarget) return
              setReleasingSaving(true)
              try {
                await adminReleaseUsername(releaseTarget.userId)
                setReleaseTarget(null)
                pushToast('Klaim username berhasil dilepas.')
                await loadUsernames()
              } catch (err) {
                pushToast(err instanceof Error ? err.message : 'Gagal melepas klaim.', 'err')
              } finally {
                setReleasingSaving(false)
              }
            }}
          >
            Lepas Klaim Sekarang
          </Button>
        </div>
      </Modal>

      {/* MODAL KONFIRMASI BERLAPIS HAPUS AKUN */}
      <Modal
        open={Boolean(deleteModalUser)}
        onClose={() => setDeleteModalUser(null)}
        title="Hapus Akun Permanen"
        description="Tindakan ini tidak dapat dibatalkan. Seluruh akun login, profil, link bio, dan template pengguna akan terhapus."
      >
        <form onSubmit={handleConfirmDeleteAccount} className="space-y-4">
          <Input
            label={`Ketik "${deleteModalUser?.username || deleteModalUser?.email || ''}" untuk mengonfirmasi`}
            placeholder={deleteModalUser?.username || deleteModalUser?.email || ''}
            value={deleteConfirmInput}
            onChange={(e) => {
              setDeleteConfirmInput(e.target.value)
              setDeleteErr('')
            }}
            required
          />
          {deleteErr && (
            <p role="alert" className="text-[13px] font-medium text-fg">
              {deleteErr}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteModalUser(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              loading={deleteSaving}
              disabled={
                deleteConfirmInput.trim().replace(/^@+/, '').toLowerCase() !==
                (deleteModalUser?.username || deleteModalUser?.email || '').toLowerCase()
              }
            >
              <Trash2 size={15} />
              <span>Hapus akun permanen</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL KONFIRMASI CABUT ADMIN */}
      <Modal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        title="Cabut Akses Administrator"
        description={`Cabut hak akses panel admin dari ${revokeTarget?.email || ''}?`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRevokeTarget(null)}>
            Batal
          </Button>
          <Button
            variant="destructive"
            loading={revokingAdmin}
            onClick={async () => {
              if (!revokeTarget) return
              setRevokingAdmin(true)
              try {
                await adminManageTeam(revokeTarget.email, 'remove')
                setRevokeTarget(null)
                pushToast('Akses administrator berhasil dicabut.')
                await loadSettings()
              } catch (err) {
                pushToast(err instanceof Error ? err.message : 'Gagal mencabut admin.', 'err')
              } finally {
                setRevokingAdmin(false)
              }
            }}
          >
            Ya, Cabut Admin
          </Button>
        </div>
      </Modal>
    </SiteLayout>
  )
}
