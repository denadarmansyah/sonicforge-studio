import { BillingCycle, PlanId } from '../config/plans'
import { ImageKind, processImageToWebp } from './imageProcessor'
import {
  getAnonymousRateBucket,
  getLiveSupabaseClient,
  isSandboxEnabled,
} from './supabaseClient'
import {
  DEFAULT_FREE_THEME,
  DEFAULT_PROFILE_SETTINGS,
  getEffectivePlan,
  ProfileSettings,
  ProfileThemeConfig,
  sanitizeProfileSettings,
  sanitizeProfileTheme,
} from './themeConfig'
import {
  AbuseReport,
  AdminAuditLogEntry,
  AdminContentItem,
  AdminGateStatus,
  AdminOverviewData,
  AdminTeamMember,
  AdminUserDetail,
  AdminUserListItem,
  AnalyticsEventType,
  AuthProviderKind,
  AuthSessionUser,
  CreatorAnalyticsSummary,
  CreatorTemplate,
  DailyMetricPoint,
  LinkItem,
  LinkItemType,
  Profile,
  SiteSettings,
  SubscriptionRecord,
  UsernameCheckResult,
} from './types'
import {
  normalizeUsername,
  RESERVED_USERNAMES,
  sanitizePlainText,
  validateAllowedUrl,
  validateUsernameDetailed,
  validateUsernameFormat,
} from './validators'

// ============================================================================
// REFERRAL TRACKING (?ref=username)
// ============================================================================
const REF_STORAGE_KEY = 'luven.pending_referral'

export function captureReferralCode(rawRef: string | null | undefined): void {
  if (typeof window === 'undefined' || !rawRef) return
  const fmt = validateUsernameFormat(rawRef)
  if (fmt.ok) {
    try {
      localStorage.setItem(REF_STORAGE_KEY, fmt.normalized)
    } catch {
      /* ignore */
    }
  }
}

export function getPendingReferral(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(REF_STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function clearPendingReferral(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(REF_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function normalizeProfile(
  raw: Partial<Profile> & { id: string; username: string; display_name: string }
): Profile {
  const effPlan = getEffectivePlan(raw.plan, raw.plan_expires_at)
  const normUsername = normalizeUsername(raw.username)
  return {
    id: raw.id,
    username: normUsername,
    display_name: raw.display_name,
    bio: raw.bio || '',
    avatar_url: raw.avatar_url ?? null,
    banner_url: raw.banner_url ?? null,
    tiktok_url: raw.tiktok_url ?? null,
    instagram_url: raw.instagram_url ?? null,
    youtube_url: raw.youtube_url ?? null,
    website_url: raw.website_url ?? null,
    category: raw.category || 'Transisi',
    is_verified: Boolean(raw.is_verified),
    is_featured: Boolean(raw.is_featured),
    featured_order: Number(raw.featured_order || 0),
    is_banned: Boolean(raw.is_banned),
    ban_reason: raw.ban_reason || '',
    onboarding_completed: Boolean(normUsername) || Boolean(raw.onboarding_completed),
    plan: raw.plan === 'pro' ? 'pro' : 'free',
    plan_expires_at: raw.plan_expires_at ?? null,
    theme: sanitizeProfileTheme(raw.theme, effPlan),
    settings: sanitizeProfileSettings(raw.settings, effPlan),
    referred_by: raw.referred_by ?? null,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at,
  }
}

export function formatFriendlyAuthError(rawMessage: string): string {
  const msg = rawMessage || ''
  if (/invalid login credentials|invalid_credentials|email atau kata sandi/i.test(msg)) {
    return 'Email atau password salah. Jika akun ini didaftarkan lewat Google, silakan masuk dengan Google lalu buat password di Pengaturan Akun.'
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Email belum diverifikasi. Periksa kotak masuk atau folder spam untuk mengaktifkan akun.'
  }
  if (/already registered|user already exists/i.test(msg)) {
    return 'Email ini sudah terdaftar. Silakan masuk dengan email atau Google.'
  }
  if (/reauthentication|recent login|session_not_found|jwt expired/i.test(msg)) {
    return 'Demi keamanan, silakan masuk ulang lalu coba lagi'
  }
  if (/different from the old password|sama dengan password/i.test(msg)) {
    return 'Password baru harus berbeda dari password yang sedang digunakan.'
  }
  if (/rate limit|too many requests/i.test(msg)) {
    return 'Terlalu banyak percobaan dalam waktu singkat. Tunggu beberapa saat lalu coba lagi.'
  }
  return msg || 'Terjadi kendala autentikasi. Silakan coba lagi.'
}

// ============================================================================
// LOCAL SANDBOX STORE (Used ONLY when developer explicitly enables Sandbox
// mode on localhost / Playwright E2E tests; starts 100% EMPTY, zero fake data)
// ============================================================================
interface SandboxUserRecord {
  id: string
  email: string
  passwordHash: string
  confirmed: boolean
  providers: AuthProviderKind[]
  created_at: string
  last_sign_in_at: string | null
}

interface SandboxAdminRecord {
  user_id: string
  note: string
  is_primary: boolean
  created_at: string
}

interface SandboxAdminSecretRecord {
  user_id: string
  passphraseHash: string
  must_change: boolean
  failed_attempts: number
  locked_until: string | null
  unlocked_until: string | null
  updated_at: string
}

interface SandboxState {
  users: SandboxUserRecord[]
  currentUserId: string | null
  admins: SandboxAdminRecord[]
  adminSecrets: SandboxAdminSecretRecord[]
  auditLogs: AdminAuditLogEntry[]
  reservedWords: { word: string; reason: string; created_at: string }[]
  siteSettings: SiteSettings
  profiles: Profile[]
  templates: CreatorTemplate[]
  links: LinkItem[]
  subscriptions: SubscriptionRecord[]
  events: {
    owner_id: string
    template_id: string | null
    link_id?: string | null
    event_type: AnalyticsEventType
    event_day: string
    referrer_host?: string
    device_type?: 'mobile' | 'desktop'
    event_hour?: number
    hit_count: number
  }[]
  reports: AbuseReport[]
  contacts: { name: string; email: string; subject: string; body: string; created_at: string }[]
}

const SBX_STORAGE_KEY = 'luven.sandbox_db_v1'

function defaultReservedList(): { word: string; reason: string; created_at: string }[] {
  const ts = '2026-01-01T00:00:00.000Z'
  return Array.from(RESERVED_USERNAMES).map((word) => ({
    word,
    reason: 'Sistem / rute aplikasi',
    created_at: ts,
  }))
}

function emptySandbox(): SandboxState {
  return {
    users: [],
    currentUserId: null,
    admins: [],
    adminSecrets: [],
    auditLogs: [],
    reservedWords: defaultReservedList(),
    siteSettings: {
      announcement_text: '',
      announcement_active: false,
      maintenance_mode: false,
      updated_at: new Date().toISOString(),
    },
    profiles: [],
    templates: [],
    links: [],
    subscriptions: [],
    events: [],
    reports: [],
    contacts: [],
  }
}

function encodeSbxHash(val: string): string {
  return `sbx$bf$${btoa(encodeURIComponent(val))}`
}

function verifySbxHash(val: string, hash: string): boolean {
  if (!hash) return false
  if (hash.startsWith('sbx$bf$')) {
    return hash === encodeSbxHash(val)
  }
  return hash === btoa(encodeURIComponent(val))
}

function readSbx(): SandboxState {
  try {
    const raw = localStorage.getItem(SBX_STORAGE_KEY)
    if (!raw) return emptySandbox()
    const parsed = JSON.parse(raw) as Partial<SandboxState> & { admins?: Array<string | SandboxAdminRecord> }
    const base = emptySandbox()
    const migratedAdmins: SandboxAdminRecord[] = (parsed.admins || []).map((entry, idx) =>
      typeof entry === 'string'
        ? { user_id: entry, note: 'Admin Sandbox', is_primary: idx === 0, created_at: new Date().toISOString() }
        : entry
    )
    const migratedUsers: SandboxUserRecord[] = (parsed.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash || '',
      confirmed: u.confirmed ?? true,
      providers:
        Array.isArray(u.providers) && u.providers.length > 0
          ? u.providers
          : u.passwordHash
            ? ['email']
            : ['google'],
      created_at: u.created_at || new Date().toISOString(),
      last_sign_in_at: u.last_sign_in_at ?? new Date().toISOString(),
    }))
    return {
      ...base,
      ...parsed,
      users: migratedUsers,
      admins: migratedAdmins,
      adminSecrets: parsed.adminSecrets || [],
      auditLogs: parsed.auditLogs || [],
      reservedWords:
        parsed.reservedWords && parsed.reservedWords.length > 0
          ? parsed.reservedWords
          : defaultReservedList(),
      siteSettings: parsed.siteSettings || base.siteSettings,
    }
  } catch {
    return emptySandbox()
  }
}

function writeSbx(state: SandboxState): void {
  try {
    localStorage.setItem(SBX_STORAGE_KEY, JSON.stringify(state))
  } catch {
    throw new Error('Penyimpanan lokal browser penuh. Hapus sebagian gambar ukuran besar.')
  }
}

function sbxWriteAudit(
  db: SandboxState,
  action: string,
  targetType = '',
  targetId = '',
  details: Record<string, unknown> = {}
): void {
  const actor = db.users.find((u) => u.id === db.currentUserId)
  db.auditLogs.unshift({
    id: crypto.randomUUID(),
    actor_id: db.currentUserId,
    actor_email: actor?.email || '',
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    created_at: new Date().toISOString(),
  })
}

function sbxIsAdmin(db: SandboxState, userId: string | null): boolean {
  if (!userId) return false
  return db.admins.some((a) => a.user_id === userId)
}

function sbxIsAdminSessionOpen(db: SandboxState, userId: string | null): boolean {
  if (!userId || !sbxIsAdmin(db, userId)) return false
  const sec = db.adminSecrets.find((s) => s.user_id === userId)
  if (!sec || !sec.unlocked_until) return false
  const now = Date.now()
  if (Date.parse(sec.unlocked_until) <= now) return false
  if (sec.locked_until && Date.parse(sec.locked_until) > now) return false
  return true
}

function sbxRequireAdminUnlocked(db: SandboxState): string {
  const uid = db.currentUserId
  if (!uid || !sbxIsAdminSessionOpen(db, uid)) {
    throw new Error('Akses admin terkunci.')
  }
  const sec = db.adminSecrets.find((s) => s.user_id === uid)
  if (!sec || sec.must_change) {
    throw new Error('Akses admin terkunci.')
  }
  return uid
}

export function resetSandboxDatabase(): void {
  try {
    localStorage.removeItem(SBX_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function pastDaysIso(days: number): string[] {
  const list: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    list.push(d.toISOString().slice(0, 10))
  }
  return list
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'))
    reader.readAsDataURL(file)
  })
}

// ============================================================================
// SITE SETTINGS (Announcement Banner & Maintenance Mode)
// ============================================================================
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const fallback: SiteSettings = {
    announcement_text: '',
    announcement_active: false,
    maintenance_mode: false,
  }
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
    if (!data) return fallback
    return {
      announcement_text: String(data.announcement_text || ''),
      announcement_active: Boolean(data.announcement_active),
      maintenance_mode: Boolean(data.maintenance_mode),
      updated_at: data.updated_at,
    }
  }
  if (isSandboxEnabled()) {
    return readSbx().siteSettings
  }
  return fallback
}

// ============================================================================
// UNIFIED AUTHENTICATION & PASSWORD MANAGEMENT
// ============================================================================

function parseSupabaseProviders(user: {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  identities?: Array<{ provider?: string }>
}): { providers: AuthProviderKind[]; hasPassword: boolean } {
  const set = new Set<AuthProviderKind>()
  const appProviders = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata?.providers as string[])
    : []
  for (const p of appProviders) {
    if (p === 'google' || p === 'email') set.add(p)
  }
  if (user.app_metadata?.provider === 'google' || user.app_metadata?.provider === 'email') {
    set.add(user.app_metadata.provider)
  }
  for (const id of user.identities || []) {
    if (id.provider === 'google' || id.provider === 'email') {
      set.add(id.provider)
    }
  }
  if (user.user_metadata?.password_configured === true) {
    set.add('email')
  }
  if (set.size === 0) set.add('email')
  const providers = Array.from(set)
  const hasPassword = providers.includes('email')
  return { providers, hasPassword }
}

export async function getCurrentSessionUser(): Promise<AuthSessionUser | null> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    const { providers, hasPassword } = parseSupabaseProviders(data.user)
    return {
      id: data.user.id,
      email: data.user.email || '',
      email_confirmed: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
      providers,
      has_password: hasPassword,
    }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const u = db.users.find((x) => x.id === db.currentUserId)
    if (!u) return null
    return {
      id: u.id,
      email: u.email,
      email_confirmed: u.confirmed,
      providers: u.providers,
      has_password: Boolean(u.passwordHash),
    }
  }
  return null
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: AuthSessionUser; needsEmailVerification: boolean }> {
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Masukkan alamat email yang valid.')
  }
  if (password.length < 8) {
    throw new Error('Password minimal terdiri dari 8 karakter.')
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { password_configured: true },
      },
    })
    if (error) {
      throw new Error(formatFriendlyAuthError(error.message))
    }
    if (!data.user) throw new Error('Pendaftaran gagal diproses. Coba lagi.')
    const confirmed = Boolean(data.session)
    const { providers, hasPassword } = parseSupabaseProviders(data.user)
    return {
      user: {
        id: data.user.id,
        email: data.user.email || cleanEmail,
        email_confirmed: confirmed,
        providers,
        has_password: hasPassword,
      },
      needsEmailVerification: !confirmed,
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const existing = db.users.find((u) => u.email === cleanEmail)
    if (existing) {
      if (existing.providers.includes('google') && !existing.passwordHash) {
        throw new Error(
          'Email ini sudah terdaftar lewat Google. Masuk dengan Google lalu buat password di Pengaturan Akun.'
        )
      }
      throw new Error('Email ini sudah terdaftar. Silakan masuk ke akun kamu.')
    }
    const now = new Date().toISOString()
    const newUser: SandboxUserRecord = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      passwordHash: encodeSbxHash(password),
      confirmed: true,
      providers: ['email'],
      created_at: now,
      last_sign_in_at: now,
    }
    db.users.push(newUser)
    db.currentUserId = newUser.id
    writeSbx(db)
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        email_confirmed: true,
        providers: ['email'],
        has_password: true,
      },
      needsEmailVerification: false,
    }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSessionUser> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password) {
    throw new Error('Masukkan email dan password kamu.')
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error || !data.user) {
      throw new Error(formatFriendlyAuthError(error?.message || 'invalid login credentials'))
    }
    const { providers, hasPassword } = parseSupabaseProviders(data.user)
    return {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      email_confirmed: true,
      providers,
      has_password: hasPassword,
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const byEmail = db.users.find((x) => x.email === cleanEmail)
    if (byEmail && !byEmail.passwordHash && byEmail.providers.includes('google')) {
      throw new Error(
        'Akun ini terdaftar lewat Google dan belum memiliki password. Silakan masuk dengan Google atau buat password di Pengaturan Akun.'
      )
    }
    if (!byEmail || !verifySbxHash(password, byEmail.passwordHash)) {
      throw new Error('Email atau password salah.')
    }
    byEmail.last_sign_in_at = new Date().toISOString()
    db.currentUserId = byEmail.id
    writeSbx(db)
    return {
      id: byEmail.id,
      email: byEmail.email,
      email_confirmed: byEmail.confirmed,
      providers: byEmail.providers,
      has_password: true,
    }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function signInWithGoogleOAuth(sandboxEmail?: string): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Mengarah ke /dashboard agar penentuan onboarding diambil murni dari database
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      throw new Error('Login Google belum diaktifkan pada proyek Supabase ini.')
    }
    return
  }

  if (isSandboxEnabled() && sandboxEmail) {
    const cleanEmail = sandboxEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Email Google tidak valid.')
    }
    const db = readSbx()
    const now = new Date().toISOString()
    // Identity linking: email terverifikasi yang sama ditautkan ke satu akun tunggal
    let user = db.users.find((u) => u.email === cleanEmail)
    if (user) {
      if (!user.providers.includes('google')) {
        user.providers = [...user.providers, 'google']
      }
      user.confirmed = true
      user.last_sign_in_at = now
    } else {
      user = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        passwordHash: '',
        confirmed: true,
        providers: ['google'],
        created_at: now,
        last_sign_in_at: now,
      }
      db.users.push(user)
    }
    db.currentUserId = user.id
    writeSbx(db)
    return
  }

  throw new Error('Login Google memerlukan koneksi proyek Supabase aktif.')
}

export async function updateOwnPassword(newPassword: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password baru minimal terdiri dari 8 karakter.')
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { password_configured: true },
    })
    if (error) {
      throw new Error(formatFriendlyAuthError(error.message))
    }
    return
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const user = db.users.find((u) => u.id === db.currentUserId)
    if (!user) {
      throw new Error('Demi keamanan, silakan masuk ulang lalu coba lagi')
    }
    if (user.passwordHash && verifySbxHash(newPassword, user.passwordHash)) {
      throw new Error('Password baru harus berbeda dari password yang sedang digunakan.')
    }
    user.passwordHash = encodeSbxHash(newPassword)
    if (!user.providers.includes('email')) {
      user.providers = [...user.providers, 'email']
    }
    writeSbx(db)
    return
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function requestPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Masukkan alamat email akun yang valid.')
  }
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/login?mode=update-password`,
    })
    if (error) throw new Error(formatFriendlyAuthError(error.message))
    return
  }
  if (isSandboxEnabled()) {
    return
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function signOutSession(): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    try {
      await supabase.rpc('admin_lock')
    } catch {
      /* ignore if not admin */
    }
    await supabase.auth.signOut()
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (db.currentUserId) {
      const sec = db.adminSecrets.find((s) => s.user_id === db.currentUserId)
      if (sec) sec.unlocked_until = null
    }
    db.currentUserId = null
    writeSbx(db)
  }
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('is_admin')
    if (!error && typeof data === 'boolean') return data
    const { data: row } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
    return Boolean(row?.user_id)
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    return sbxIsAdmin(db, userId)
  }
  return false
}

export function grantSandboxAdmin(
  userId: string,
  tempPassphrase?: string,
  isPrimary = true
): void {
  if (!isSandboxEnabled()) return
  const db = readSbx()
  if (!db.admins.some((a) => a.user_id === userId)) {
    db.admins.push({
      user_id: userId,
      note: isPrimary ? 'Admin Utama Sandbox' : 'Administrator Sandbox',
      is_primary: isPrimary,
      created_at: new Date().toISOString(),
    })
  }
  if (tempPassphrase) {
    const existing = db.adminSecrets.find((s) => s.user_id === userId)
    const nextSec: SandboxAdminSecretRecord = {
      user_id: userId,
      passphraseHash: encodeSbxHash(tempPassphrase),
      must_change: true,
      failed_attempts: 0,
      locked_until: null,
      unlocked_until: null,
      updated_at: new Date().toISOString(),
    }
    if (existing) Object.assign(existing, nextSec)
    else db.adminSecrets.push(nextSec)
  }
  writeSbx(db)
}

// ============================================================================
// USERNAME AVAILABILITY & ATOMIC ONE-TIME CLAIM
// ============================================================================

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUserId?: string
): Promise<UsernameCheckResult> {
  const localCheck = validateUsernameDetailed(rawUsername)
  if (!localCheck.ok) {
    return {
      available: false,
      status: localCheck.status === 'reserved' ? 'reserved' : 'invalid',
      normalized: localCheck.normalized,
      message: localCheck.error || 'Format username tidak valid.',
    }
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('check_username_status', {
      p_username: localCheck.normalized,
    })
    if (!error && data && typeof data === 'object' && 'available' in data) {
      const res = data as UsernameCheckResult
      return {
        available: Boolean(res.available),
        status: res.status || (res.available ? 'available' : 'taken'),
        normalized: res.normalized || localCheck.normalized,
        message: res.message || (res.available ? `luven.my.id/@${localCheck.normalized} tersedia.` : 'Username sudah dipakai.'),
      }
    }

    // Fallback bila migrasi 003 belum dijalankan (fungsi lama mengembalikan boolean)
    const { data: boolData, error: boolErr } = await supabase.rpc('check_username_available', {
      p_username: localCheck.normalized,
    })
    if (boolErr) {
      return {
        available: false,
        status: 'invalid',
        normalized: localCheck.normalized,
        message: 'Gagal memeriksa ketersediaan username. Periksa koneksi internet kamu.',
      }
    }
    const ok = typeof boolData === 'boolean' ? boolData : Boolean((boolData as { available?: boolean })?.available)
    return {
      available: ok,
      status: ok ? 'available' : 'taken',
      normalized: localCheck.normalized,
      message: ok ? `luven.my.id/@${localCheck.normalized} tersedia.` : 'Username sudah dipakai.',
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const isReserved = db.reservedWords.some((r) => r.word === localCheck.normalized)
    if (isReserved) {
      return {
        available: false,
        status: 'reserved',
        normalized: localCheck.normalized,
        message: `Username @${localCheck.normalized} dicadangkan oleh sistem.`,
      }
    }
    const taken = db.profiles.some(
      (p) => p.username.toLowerCase() === localCheck.normalized && p.id !== currentUserId
    )
    if (taken) {
      return {
        available: false,
        status: 'taken',
        normalized: localCheck.normalized,
        message: 'Username sudah dipakai.',
      }
    }
    return {
      available: true,
      status: 'available',
      normalized: localCheck.normalized,
      message: `luven.my.id/@${localCheck.normalized} tersedia.`,
    }
  }

  return {
    available: true,
    status: 'available',
    normalized: localCheck.normalized,
    message: `luven.my.id/@${localCheck.normalized} tersedia.`,
  }
}

export interface ClaimUsernameInput {
  username: string
  display_name: string
  bio?: string
  category?: string
  tiktok_url?: string
  referred_by?: string | null
}

export async function claimUsername(input: ClaimUsernameInput): Promise<Profile> {
  const norm = normalizeUsername(input.username)
  const displayName = sanitizePlainText(input.display_name || norm, 50)
  if (!displayName) {
    throw new Error('Nama tampilan wajib diisi.')
  }
  const bio = sanitizePlainText(input.bio || '', 160)
  const category = sanitizePlainText(input.category || 'Transisi', 40)
  const tt = validateAllowedUrl(input.tiktok_url || '', 'tiktok', false)
  if (!tt.ok) throw new Error(`TikTok: ${tt.error}`)

  const cleanRef = input.referred_by ? normalizeUsername(input.referred_by) : null
  const validRef = cleanRef && cleanRef !== norm ? cleanRef : null

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('claim_username', {
      p_username: norm,
      p_display_name: displayName,
      p_bio: bio,
      p_category: category,
      p_tiktok_url: tt.clean,
      p_referred_by: validRef,
    })
    if (error) {
      if (/unique|sudah dipakai/i.test(error.message)) {
        throw new Error('Username sudah dipakai')
      }
      throw new Error(error.message)
    }
    return normalizeProfile(data as Profile)
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const uid = db.currentUserId
    if (!uid) throw new Error('Silakan masuk ke akun terlebih dahulu sebelum mengklaim username.')

    if (db.profiles.some((p) => p.id === uid)) {
      throw new Error(
        'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.'
      )
    }

    const chk = validateUsernameDetailed(norm)
    if (!chk.ok && chk.status === 'invalid') {
      throw new Error(chk.error || 'Format username tidak valid.')
    }
    if (db.reservedWords.some((r) => r.word === norm) || chk.status === 'reserved') {
      throw new Error(`Username @${norm} dicadangkan oleh sistem. Pilih username lain.`)
    }
    if (db.profiles.some((p) => p.username.toLowerCase() === norm)) {
      throw new Error('Username sudah dipakai')
    }

    const now = new Date().toISOString()
    const created = normalizeProfile({
      id: uid,
      username: norm,
      display_name: displayName,
      bio,
      category,
      tiktok_url: tt.clean,
      referred_by: validRef,
      onboarding_completed: true,
      created_at: now,
      updated_at: now,
    })
    db.profiles.push(created)
    writeSbx(db)
    return created
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  if (!userId) return null
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      // Satu kali percobaan ulang bila koneksi sesaat terputus saat callback login
      const retry = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      data = retry.data
      error = retry.error
      if (error) {
        throw new Error(error.message)
      }
    }
    return data ? normalizeProfile(data as Profile) : null
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const hit = db.profiles.find((p) => p.id === userId)
    return hit ? normalizeProfile(hit) : null
  }
  return null
}

export async function getPublicProfileByUsername(username: string): Promise<{
  profile: Profile | null
  templates: CreatorTemplate[]
  links: LinkItem[]
}> {
  const clean = normalizeUsername(username)
  if (!clean) return { profile: null, templates: [], links: [] }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data: profRaw } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', clean)
      .eq('is_banned', false)
      .maybeSingle()

    if (!profRaw) return { profile: null, templates: [], links: [] }
    const prof = normalizeProfile(profRaw as Profile)
    const effPlan = getEffectivePlan(prof.plan, prof.plan_expires_at)

    const [{ data: tpls }, { data: linksData }] = await Promise.all([
      supabase
        .from('templates')
        .select('*')
        .eq('owner_id', prof.id)
        .eq('status', 'active')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('links')
        .select('*')
        .eq('owner_id', prof.id)
        .eq('is_active', true)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    const nowMs = Date.now()
    const visibleLinks = ((linksData as LinkItem[]) || [])
      .filter((l) => {
        if (l.schedule_start && Date.parse(l.schedule_start) > nowMs) return false
        if (l.schedule_end && Date.parse(l.schedule_end) < nowMs) return false
        if (effPlan === 'free' && ['embed_tiktok', 'embed_youtube', 'announcement'].includes(l.type)) return false
        return true
      })
      .map((l) =>
        effPlan === 'free'
          ? {
              ...l,
              is_featured: false,
              group_id: null,
              thumbnail_url: l.type === 'capcut' ? l.thumbnail_url : null,
            }
          : l
      )

    return {
      profile: prof,
      templates: (tpls as CreatorTemplate[]) || [],
      links: effPlan === 'free' ? visibleLinks.slice(0, 14) : visibleLinks,
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const profRaw = db.profiles.find((p) => p.username.toLowerCase() === clean && !p.is_banned) ?? null
    if (!profRaw) return { profile: null, templates: [], links: [] }
    const prof = normalizeProfile(profRaw)
    const effPlan = getEffectivePlan(prof.plan, prof.plan_expires_at)
    const tpls = db.templates
      .filter((t) => t.owner_id === prof.id && t.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at))

    const nowMs = Date.now()
    const links = db.links
      .filter((l) => l.owner_id === prof.id && l.is_active)
      .filter(
        (l) =>
          (!l.schedule_start || Date.parse(l.schedule_start) <= nowMs) &&
          (!l.schedule_end || Date.parse(l.schedule_end) >= nowMs)
      )
      .filter((l) => effPlan === 'pro' || !['embed_tiktok', 'embed_youtube', 'announcement'].includes(l.type))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((l) =>
        effPlan === 'free'
          ? {
              ...l,
              is_featured: false,
              group_id: null,
              thumbnail_url: l.type === 'capcut' ? l.thumbnail_url : null,
            }
          : l
      )
    return { profile: prof, templates: tpls, links }
  }

  return { profile: null, templates: [], links: [] }
}

export interface UpdateProfileInput {
  username?: string
  display_name: string
  bio?: string
  category?: string
  tiktok_url?: string
  instagram_url?: string
  youtube_url?: string
  website_url?: string
  avatar_url?: string | null
  banner_url?: string | null
}

export async function saveOwnProfile(userId: string, input: UpdateProfileInput): Promise<Profile> {
  const displayName = sanitizePlainText(input.display_name, 50)
  if (displayName.length < 1) {
    throw new Error('Nama tampilan wajib diisi.')
  }

  const bio = sanitizePlainText(input.bio || '', 160)
  const category = sanitizePlainText(input.category || 'Transisi', 40)

  const tt = validateAllowedUrl(input.tiktok_url || '', 'tiktok', false)
  if (!tt.ok) throw new Error(`TikTok: ${tt.error}`)
  const ig = validateAllowedUrl(input.instagram_url || '', 'instagram', false)
  if (!ig.ok) throw new Error(`Instagram: ${ig.error}`)
  const yt = validateAllowedUrl(input.youtube_url || '', 'youtube', false)
  if (!yt.ok) throw new Error(`YouTube: ${yt.error}`)
  const web = validateAllowedUrl(input.website_url || '', 'website', false)
  if (!web.ok) throw new Error(`Website: ${web.error}`)

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const existing = await getProfileByUserId(userId)
    if (!existing) {
      throw new Error('Klaim username kamu terlebih dahulu di halaman onboarding.')
    }
    if (input.username !== undefined && normalizeUsername(input.username) !== existing.username) {
      // Teruskan ke database agar trigger Postgres menolak perubahan username secara eksplisit
      const { error: mutErr } = await supabase
        .from('profiles')
        .update({ username: normalizeUsername(input.username) })
        .eq('id', userId)
      if (mutErr) throw new Error(mutErr.message)
    }

    const payload = {
      display_name: displayName,
      bio,
      category,
      tiktok_url: tt.clean,
      instagram_url: ig.clean,
      youtube_url: yt.clean,
      website_url: web.clean,
      ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
      ...(input.banner_url !== undefined ? { banner_url: input.banner_url } : {}),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return normalizeProfile(data as Profile)
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    if (db.currentUserId !== userId) {
      throw new Error('Akses ditolak: Anda hanya dapat mengubah profil milik sendiri.')
    }
    const idx = db.profiles.findIndex((p) => p.id === userId)
    if (idx < 0) {
      throw new Error('Klaim username kamu terlebih dahulu di halaman onboarding.')
    }
    const existing = normalizeProfile(db.profiles[idx])
    if (input.username !== undefined && normalizeUsername(input.username) !== existing.username) {
      throw new Error(
        'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.'
      )
    }
    if (existing.is_banned) {
      throw new Error('Akun ini sedang ditangguhkan oleh moderator.')
    }
    const now = new Date().toISOString()
    const merged: Profile = normalizeProfile({
      ...existing,
      display_name: displayName,
      bio,
      category,
      tiktok_url: tt.clean,
      instagram_url: ig.clean,
      youtube_url: yt.clean,
      website_url: web.clean,
      avatar_url: input.avatar_url !== undefined ? input.avatar_url : existing.avatar_url,
      banner_url: input.banner_url !== undefined ? input.banner_url : existing.banner_url,
      onboarding_completed: true,
      updated_at: now,
    })
    db.profiles[idx] = merged
    writeSbx(db)
    return merged
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

/**
 * Digunakan oleh pengujian keamanan untuk memastikan upaya mengubah kolom terlarang dari klien ditolak.
 */
export async function attemptClientForbiddenProfileUpdate(
  userId: string,
  forbiddenPatch: Record<string, unknown>
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.from('profiles').update(forbiddenPatch).eq('id', userId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (db.currentUserId !== userId) {
      throw new Error('Akses ditolak oleh kebijakan RLS.')
    }
    const hit = db.profiles.find((p) => p.id === userId)
    if (!hit) throw new Error('Profil tidak ditemukan.')
    if ('username' in forbiddenPatch && forbiddenPatch.username !== hit.username) {
      throw new Error(
        'Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok @luvenindonesia bila perlu bantuan.'
      )
    }
    for (const k of ['plan', 'plan_expires_at', 'is_verified', 'is_banned', 'ban_reason', 'is_featured']) {
      if (k in forbiddenPatch) {
        throw new Error('Kolom status akun tidak dapat diubah dari klien.')
      }
    }
  }
}

export async function saveOwnAppearance(
  userId: string,
  themeInput: ProfileThemeConfig,
  settingsInput: ProfileSettings
): Promise<Profile> {
  const existing = await getProfileByUserId(userId)
  if (!existing) throw new Error('Profil tidak ditemukan.')
  const effPlan = getEffectivePlan(existing.plan, existing.plan_expires_at)
  const cleanTheme = sanitizeProfileTheme(themeInput, effPlan)
  const cleanSettings = sanitizeProfileSettings(settingsInput, effPlan)

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ theme: cleanTheme, settings: cleanSettings })
      .eq('id', userId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return normalizeProfile(data as Profile)
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const idx = db.profiles.findIndex((p) => p.id === userId)
    if (idx < 0) throw new Error('Profil tidak ditemukan.')
    db.profiles[idx] = {
      ...normalizeProfile(db.profiles[idx]),
      theme: cleanTheme,
      settings: cleanSettings,
      updated_at: new Date().toISOString(),
    }
    writeSbx(db)
    return db.profiles[idx]
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function uploadCreatorImage(
  userId: string,
  file: File,
  kind: ImageKind
): Promise<string> {
  const webpFile = await processImageToWebp(file, kind)
  const bucket =
    kind === 'avatar'
      ? 'avatars'
      : kind === 'banner' || kind === 'background' || kind === 'og'
        ? 'banners'
        : 'thumbnails'
  const path = `${userId}/${kind}-${Date.now()}.webp`

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.storage.from(bucket).upload(path, webpFile, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (error) throw new Error(`Gagal mengunggah gambar: ${error.message}`)
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  if (isSandboxEnabled()) {
    return fileToDataUrl(webpFile)
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

// ============================================================================
// TEMPLATES CRUD & REORDERING
// ============================================================================

export async function listOwnTemplates(userId: string): Promise<CreatorTemplate[]> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('owner_id', userId)
      .neq('status', 'removed')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as CreatorTemplate[]) || []
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    return db.templates
      .filter((t) => t.owner_id === userId && t.status !== 'removed')
      .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at))
  }
  return []
}

export interface SaveTemplateInput {
  id?: string
  title: string
  description?: string
  capcut_url: string
  tiktok_url?: string
  thumbnail_url?: string | null
  tags?: string[]
  song_title?: string
  status?: 'active' | 'hidden'
}

export async function saveCreatorTemplate(
  userId: string,
  input: SaveTemplateInput
): Promise<CreatorTemplate> {
  const title = sanitizePlainText(input.title, 80)
  if (!title) throw new Error('Judul template wajib diisi (maksimal 80 karakter).')

  const description = sanitizePlainText(input.description || '', 200)
  const songTitle = sanitizePlainText(input.song_title || '', 80) || null

  const cc = validateAllowedUrl(input.capcut_url, 'capcut', true)
  if (!cc.ok || !cc.clean) throw new Error(`Link CapCut: ${cc.error}`)

  const tt = validateAllowedUrl(input.tiktok_url || '', 'tiktok', false)
  if (!tt.ok) throw new Error(`Link video TikTok: ${tt.error}`)

  const cleanTags = Array.from(
    new Set(
      (input.tags || [])
        .map((t) => sanitizePlainText(t.toLowerCase().replace(/^#+/, ''), 24))
        .filter(Boolean)
    )
  ).slice(0, 5)

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    if (input.id) {
      const { data, error } = await supabase
        .from('templates')
        .update({
          title,
          description,
          capcut_url: cc.clean,
          tiktok_url: tt.clean,
          ...(input.thumbnail_url !== undefined ? { thumbnail_url: input.thumbnail_url } : {}),
          tags: cleanTags,
          song_title: songTitle,
          ...(input.status ? { status: input.status } : {}),
        })
        .eq('id', input.id)
        .eq('owner_id', userId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as CreatorTemplate
    } else {
      const existing = await listOwnTemplates(userId)
      const nextSort = existing.length ? Math.min(...existing.map((x) => x.sort_order)) - 1 : 0
      const { data, error } = await supabase
        .from('templates')
        .insert({
          owner_id: userId,
          title,
          description,
          capcut_url: cc.clean,
          tiktok_url: tt.clean,
          thumbnail_url: input.thumbnail_url ?? null,
          tags: cleanTags,
          song_title: songTitle,
          sort_order: nextSort,
          status: input.status || 'active',
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as CreatorTemplate
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const ownerProf = db.profiles.find((p) => p.id === userId)
    if (!ownerProf) throw new Error('Lengkapi profil kreator terlebih dahulu.')
    if (ownerProf.is_banned) throw new Error('Akun yang ditangguhkan tidak dapat mengelola template.')

    const now = new Date().toISOString()
    if (input.id) {
      const idx = db.templates.findIndex((t) => t.id === input.id && t.owner_id === userId)
      if (idx < 0) throw new Error('Template tidak ditemukan.')
      if (db.templates[idx].status === 'removed') {
        throw new Error('Template ini telah dihapus oleh moderator.')
      }
      db.templates[idx] = {
        ...db.templates[idx],
        title,
        description,
        capcut_url: cc.clean,
        tiktok_url: tt.clean,
        thumbnail_url:
          input.thumbnail_url !== undefined ? input.thumbnail_url : db.templates[idx].thumbnail_url,
        tags: cleanTags,
        song_title: songTitle,
        status: input.status || db.templates[idx].status,
        updated_at: now,
      }
      writeSbx(db)
      return db.templates[idx]
    } else {
      const own = db.templates.filter((t) => t.owner_id === userId)
      const nextSort = own.length ? Math.min(...own.map((x) => x.sort_order)) - 1 : 0
      const created: CreatorTemplate = {
        id: crypto.randomUUID(),
        owner_id: userId,
        title,
        description,
        capcut_url: cc.clean,
        tiktok_url: tt.clean,
        thumbnail_url: input.thumbnail_url ?? null,
        tags: cleanTags,
        song_title: songTitle,
        sort_order: nextSort,
        status: input.status || 'active',
        created_at: now,
        updated_at: now,
      }
      db.templates.push(created)
      writeSbx(db)
      return created
    }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function deleteOwnTemplate(userId: string, templateId: string): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)
      .eq('owner_id', userId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    db.templates = db.templates.filter((t) => !(t.id === templateId && t.owner_id === userId))
    writeSbx(db)
  }
}

export async function reorderOwnTemplates(userId: string, orderedIds: string[]): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase!
          .from('templates')
          .update({ sort_order: idx })
          .eq('id', id)
          .eq('owner_id', userId)
      )
    )
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    orderedIds.forEach((id, idx) => {
      const hit = db.templates.find((t) => t.id === id && t.owner_id === userId)
      if (hit) hit.sort_order = idx
    })
    writeSbx(db)
  }
}

// ============================================================================
// LINK-IN-BIO ITEMS CRUD, SCHEDULING & FREE PLAN ENFORCEMENT
// ============================================================================

export async function listOwnLinks(userId: string): Promise<LinkItem[]> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('owner_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return []
    return (data as LinkItem[]) || []
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    return db.links
      .filter((l) => l.owner_id === userId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }
  return []
}

export interface SaveLinkInput {
  id?: string
  type: LinkItemType
  title: string
  url?: string | null
  thumbnail_url?: string | null
  is_active?: boolean
  is_featured?: boolean
  group_id?: string | null
  schedule_start?: string | null
  schedule_end?: string | null
}

function validateLinkUrlByType(type: LinkItemType, rawUrl: string | null | undefined): string | null {
  if (type === 'heading' || type === 'announcement') return null
  const val = (rawUrl || '').trim()
  const platform =
    type === 'capcut'
      ? 'capcut'
      : type === 'tiktok' || type === 'embed_tiktok'
        ? 'tiktok'
        : type === 'youtube' || type === 'embed_youtube'
          ? 'youtube'
          : type === 'instagram'
            ? 'instagram'
            : type === 'whatsapp'
              ? 'whatsapp'
              : 'link'
  const chk = validateAllowedUrl(val, platform, true)
  if (!chk.ok || !chk.clean) throw new Error(chk.error || 'Tautan HTTPS tidak valid.')
  return chk.clean
}

export async function saveLinkItem(userId: string, input: SaveLinkInput): Promise<LinkItem> {
  const title = sanitizePlainText(input.title, 120)
  if (!title) throw new Error('Judul link wajib diisi (maks. 120 karakter).')

  const cleanUrl = validateLinkUrlByType(input.type, input.url)
  const cleanGroup = input.group_id ? sanitizePlainText(input.group_id, 60) : null
  const ownerProfile = await getProfileByUserId(userId)
  if (!ownerProfile) throw new Error('Profil kreator tidak ditemukan.')
  if (ownerProfile.is_banned) throw new Error('Akun yang ditangguhkan tidak dapat mengelola link.')
  const effPlan = getEffectivePlan(ownerProfile.plan, ownerProfile.plan_expires_at)

  if (effPlan === 'free') {
    if (['embed_tiktok', 'embed_youtube', 'announcement'].includes(input.type)) {
      throw new Error('Tipe blok ini hanya tersedia pada paket Pro.')
    }
    const existing = await listOwnLinks(userId)
    const activeNonHeadings = existing.filter(
      (l) => l.type !== 'heading' && l.is_active && l.id !== input.id
    )
    if (input.type !== 'heading' && (input.is_active ?? true) && activeNonHeadings.length >= 8) {
      throw new Error(
        'Paket Free dibatasi maksimal 8 link aktif (tidak termasuk judul bagian). Upgrade ke Pro untuk link tanpa batas.'
      )
    }
  }

  const payload = {
    type: input.type,
    title,
    url: cleanUrl,
    thumbnail_url: effPlan === 'pro' || input.type === 'capcut' ? input.thumbnail_url ?? null : null,
    is_active: input.is_active ?? true,
    is_featured: effPlan === 'pro' ? Boolean(input.is_featured) : false,
    group_id: effPlan === 'pro' ? cleanGroup : null,
    schedule_start: effPlan === 'pro' ? input.schedule_start || null : null,
    schedule_end: effPlan === 'pro' ? input.schedule_end || null : null,
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    if (input.id) {
      const { data, error } = await supabase
        .from('links')
        .update(payload)
        .eq('id', input.id)
        .eq('owner_id', userId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as LinkItem
    } else {
      const existing = await listOwnLinks(userId)
      const nextPos = existing.length ? Math.max(...existing.map((x) => x.position)) + 1 : 0
      const { data, error } = await supabase
        .from('links')
        .insert({ owner_id: userId, position: nextPos, ...payload })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as LinkItem
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const now = new Date().toISOString()
    if (input.id) {
      const idx = db.links.findIndex((l) => l.id === input.id && l.owner_id === userId)
      if (idx < 0) throw new Error('Link tidak ditemukan.')
      db.links[idx] = { ...db.links[idx], ...payload, updated_at: now }
      writeSbx(db)
      return db.links[idx]
    } else {
      const own = db.links.filter((l) => l.owner_id === userId)
      const nextPos = own.length ? Math.max(...own.map((x) => x.position)) + 1 : 0
      const created: LinkItem = {
        id: crypto.randomUUID(),
        owner_id: userId,
        position: nextPos,
        created_at: now,
        updated_at: now,
        ...payload,
      }
      db.links.push(created)
      writeSbx(db)
      return created
    }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function deleteOwnLink(userId: string, linkId: string): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.from('links').delete().eq('id', linkId).eq('owner_id', userId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    db.links = db.links.filter((l) => !(l.id === linkId && l.owner_id === userId))
    writeSbx(db)
  }
}

export async function reorderOwnLinks(userId: string, orderedIds: string[]): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    await Promise.all(
      orderedIds.map((id, idx) =>
        supabase!.from('links').update({ position: idx }).eq('id', id).eq('owner_id', userId)
      )
    )
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    orderedIds.forEach((id, idx) => {
      const hit = db.links.find((l) => l.id === id && l.owner_id === userId)
      if (hit) hit.position = idx
    })
    writeSbx(db)
  }
}

// ============================================================================
// SUBSCRIPTIONS & MIDTRANS CHECKOUT
// ============================================================================

export async function listOwnSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    return (data as SubscriptionRecord[]) || []
  }
  if (isSandboxEnabled()) {
    return readSbx().subscriptions.filter((s) => s.user_id === userId)
  }
  return []
}

export async function createMidtransCheckout(
  billing: BillingCycle
): Promise<{ token: string; redirectUrl: string | null; orderId: string }> {
  const supabase = getLiveSupabaseClient()
  if (!supabase) {
    throw new Error(
      'Pembayaran otomatis memerlukan koneksi Supabase aktif. Hubungi admin via TikTok @luvenindonesia untuk aktivasi manual.'
    )
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const jwt = sessionData.session?.access_token
  if (!jwt) throw new Error('Silakan masuk akun terlebih dahulu.')

  const resp = await fetch('/api/midtrans-create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ billing }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(
      data.error || 'Gateway pembayaran belum aktif. Hubungi admin lewat TikTok @luvenindonesia.'
    )
  }
  return data as { token: string; redirectUrl: string | null; orderId: string }
}

// ============================================================================
// EXPLORE & HOME PUBLIC FEED
// ============================================================================

export interface ExploreQuery {
  q?: string
  category?: string
  tag?: string
  sort?: 'newest' | 'popular'
  page?: number
  pageSize?: number
}

export async function fetchPublicFeed(query: ExploreQuery = {}): Promise<{
  featuredCreators: Profile[]
  creators: Profile[]
  templates: CreatorTemplate[]
  hasMore: boolean
}> {
  const q = (query.q || '').trim().toLowerCase()
  const category = query.category && query.category !== 'Semua' ? query.category : ''
  const tag = (query.tag || '').trim().toLowerCase()
  const sort = query.sort || 'newest'
  const page = Math.max(0, query.page || 0)
  const pageSize = query.pageSize || 12

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    try {
      let profQuery = supabase
        .from('profiles')
        .select('*')
        .eq('is_banned', false)
        .eq('onboarding_completed', true)

      if (category) profQuery = profQuery.eq('category', category)
      if (q) profQuery = profQuery.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)

      let tplQuery = supabase
        .from('templates')
        .select('*, owner:profiles!inner(id, username, display_name, avatar_url, is_verified, category, is_banned)')
        .eq('status', 'active')
        .eq('owner.is_banned', false)

      if (category) tplQuery = tplQuery.eq('owner.category', category)
      if (tag) tplQuery = tplQuery.contains('tags', [tag])
      if (q) tplQuery = tplQuery.ilike('title', `%${q}%`)

      const [{ data: feat }, { data: profs }, { data: tpls }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('is_banned', false)
          .eq('onboarding_completed', true)
          .eq('is_featured', true)
          .order('featured_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(8),
        profQuery
          .order('is_featured', { ascending: false })
          .order('featured_order', { ascending: true })
          .order('created_at', { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize - 1),
        tplQuery
          .order('created_at', { ascending: false })
          .range(page * pageSize, page * pageSize + pageSize),
      ])

      let list = ((tpls as CreatorTemplate[]) || []).slice(0, pageSize)

      if (sort === 'popular' && list.length > 0) {
        const weekAgo = pastDaysIso(7)[0]
        const ids = list.map((t) => t.id)
        const { data: evs } = await supabase
          .from('events')
          .select('template_id, hit_count')
          .in('template_id', ids)
          .gte('event_day', weekAgo)
        const scoreMap = new Map<string, number>()
        for (const row of (evs as { template_id: string; hit_count: number }[]) || []) {
          scoreMap.set(row.template_id, (scoreMap.get(row.template_id) || 0) + Number(row.hit_count))
        }
        list = list
          .map((t) => ({ ...t, weekly_clicks: scoreMap.get(t.id) || 0 }))
          .sort((a, b) => (b.weekly_clicks || 0) - (a.weekly_clicks || 0))
      }

      return {
        featuredCreators: ((feat as Profile[]) || []).map((p) => normalizeProfile(p)),
        creators: ((profs as Profile[]) || []).map((p) => normalizeProfile(p)),
        templates: list,
        hasMore: (tpls || []).length > pageSize,
      }
    } catch {
      return { featuredCreators: [], creators: [], templates: [], hasMore: false }
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const activeProfiles = db.profiles
      .filter((p) => !p.is_banned && Boolean(p.username))
      .map((p) => normalizeProfile(p))
    const profileMap = new Map(activeProfiles.map((p) => [p.id, p]))

    const featuredCreators = activeProfiles
      .filter((p) => p.is_featured)
      .sort((a, b) => (a.featured_order || 999) - (b.featured_order || 999) || b.created_at.localeCompare(a.created_at))
      .slice(0, 8)

    const filteredCreators = activeProfiles
      .filter((p) => !category || p.category === category)
      .filter((p) => !q || p.username.includes(q) || p.display_name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          (a.featured_order || 999) - (b.featured_order || 999) ||
          b.created_at.localeCompare(a.created_at)
      )

    const weekAgo = pastDaysIso(7)[0]
    const weeklyByTpl = new Map<string, number>()
    for (const ev of db.events) {
      if (ev.template_id && ev.event_day >= weekAgo) {
        weeklyByTpl.set(ev.template_id, (weeklyByTpl.get(ev.template_id) || 0) + ev.hit_count)
      }
    }

    let allTpls = db.templates
      .filter((t) => t.status === 'active' && profileMap.has(t.owner_id))
      .map((t) => {
        const o = profileMap.get(t.owner_id)!
        return {
          ...t,
          owner: {
            id: o.id,
            username: o.username,
            display_name: o.display_name,
            avatar_url: o.avatar_url,
            is_verified: o.is_verified,
            category: o.category,
          },
          weekly_clicks: weeklyByTpl.get(t.id) || 0,
        }
      })
      .filter((t) => !category || t.owner?.category === category)
      .filter((t) => !tag || t.tags.includes(tag))
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.owner?.username.includes(q) ||
          t.owner?.display_name.toLowerCase().includes(q)
      )

    if (sort === 'popular') {
      allTpls = allTpls.sort(
        (a, b) => (b.weekly_clicks || 0) - (a.weekly_clicks || 0) || b.created_at.localeCompare(a.created_at)
      )
    } else {
      allTpls = allTpls.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }

    const start = page * pageSize
    return {
      featuredCreators,
      creators: filteredCreators.slice(start, start + pageSize),
      templates: allTpls.slice(start, start + pageSize),
      hasMore: start + pageSize < allTpls.length,
    }
  }

  return { featuredCreators: [], creators: [], templates: [], hasMore: false }
}

// ============================================================================
// ANALYTICS EVENTS (Privacy-Preserving Daily Aggregates)
// ============================================================================

export async function recordAnalyticsEvent(
  ownerId: string,
  eventType: AnalyticsEventType,
  templateId?: string | null,
  linkId?: string | null
): Promise<void> {
  if (!ownerId) return
  const bucket = getAnonymousRateBucket()
  let referrerHost = ''
  let deviceType: 'mobile' | 'desktop' = 'mobile'
  const eventHour = new Date().getHours()

  if (typeof window !== 'undefined') {
    deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop'
    try {
      if (document.referrer) {
        referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase().slice(0, 64)
      }
    } catch {
      referrerHost = ''
    }
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    await supabase.rpc('record_event', {
      p_owner_id: ownerId,
      p_event_type: eventType,
      p_template_id: templateId ?? null,
      p_client_bucket: bucket,
      p_link_id: linkId ?? null,
      p_referrer_host: referrerHost,
      p_device_type: deviceType,
      p_event_hour: eventHour,
    })
    return
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const day = todayIso()
    const hit = db.events.find(
      (e) =>
        e.owner_id === ownerId &&
        (e.template_id || null) === (templateId || null) &&
        (e.link_id || null) === (linkId || null) &&
        e.event_type === eventType &&
        e.event_day === day &&
        (e.referrer_host || '') === referrerHost &&
        (e.device_type || 'mobile') === deviceType &&
        (e.event_hour ?? 0) === eventHour
    )
    if (hit) hit.hit_count += 1
    else {
      db.events.push({
        owner_id: ownerId,
        template_id: templateId ?? null,
        link_id: linkId ?? null,
        event_type: eventType,
        event_day: day,
        referrer_host: referrerHost,
        device_type: deviceType,
        event_hour: eventHour,
        hit_count: 1,
      })
    }
    writeSbx(db)
  }
}

export async function getCreatorAnalytics(
  ownerId: string,
  ownTemplates: CreatorTemplate[],
  ownLinks: LinkItem[] = [],
  ownerUsername = ''
): Promise<CreatorAnalyticsSummary> {
  const days90 = pastDaysIso(90)
  const days30 = days90.slice(-30)
  const days7 = days90.slice(-7)
  const min90 = days90[0]
  const min30 = days30[0]
  const min7 = days7[0]

  type RawEvent = {
    template_id: string | null
    link_id?: string | null
    event_type: AnalyticsEventType
    event_day: string
    referrer_host?: string
    device_type?: 'mobile' | 'desktop'
    event_hour?: number
    hit_count: number
  }
  let rows: RawEvent[] = []
  let referralCount = 0

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const [{ data: evData }, { count: refCount }] = await Promise.all([
      supabase
        .from('events')
        .select('template_id, link_id, event_type, event_day, referrer_host, device_type, event_hour, hit_count')
        .eq('owner_id', ownerId),
      ownerUsername
        ? supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('referred_by', ownerUsername)
        : Promise.resolve({ count: 0 }),
    ])
    rows = (evData as RawEvent[]) || []
    referralCount = refCount || 0
  } else if (isSandboxEnabled()) {
    const db = readSbx()
    rows = db.events.filter((e) => e.owner_id === ownerId)
    if (ownerUsername) {
      referralCount = db.profiles.filter((p) => p.referred_by === ownerUsername).length
    }
  }

  let totalProfileViews = 0
  let views7d = 0
  let views30d = 0
  let views90d = 0
  let totalCapcutClicks = 0
  let totalTiktokClicks = 0
  let totalSocialClicks = 0
  let totalLinkClicks = 0
  let clicks7d = 0

  const dailyMap = new Map<string, { views: number; clicks: number }>()
  for (const d of days90) dailyMap.set(d, { views: 0, clicks: 0 })

  const tplStats = new Map<string, { clicks: number; views: number }>()
  const linkStats = new Map<string, number>()
  const refMap = new Map<string, number>()
  const deviceBreakdown = { mobile: 0, desktop: 0 }
  const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))

  for (const r of rows) {
    const c = Number(r.hit_count) || 0
    const isView = r.event_type === 'profile_view' || r.event_type === 'template_view'
    const isClick =
      r.event_type === 'capcut_click' ||
      r.event_type === 'tiktok_click' ||
      r.event_type === 'social_click' ||
      r.event_type === 'link_click'

    if (r.event_type === 'profile_view') {
      totalProfileViews += c
      if (r.event_day >= min7) views7d += c
      if (r.event_day >= min30) views30d += c
      if (r.event_day >= min90) views90d += c
      if (r.device_type === 'desktop') deviceBreakdown.desktop += c
      else deviceBreakdown.mobile += c
      const hostLabel = r.referrer_host || 'Langsung / Bio'
      refMap.set(hostLabel, (refMap.get(hostLabel) || 0) + c)
      const hr = Math.max(0, Math.min(23, Number(r.event_hour) || 0))
      hourCounts[hr].count += c
    }
    if (r.event_type === 'capcut_click') totalCapcutClicks += c
    if (r.event_type === 'tiktok_click') totalTiktokClicks += c
    if (r.event_type === 'social_click') totalSocialClicks += c
    if (r.event_type === 'link_click') totalLinkClicks += c
    if (isClick && r.event_day >= min7) clicks7d += c

    if (r.event_day >= min90) {
      const slot = dailyMap.get(r.event_day) || { views: 0, clicks: 0 }
      if (isView) slot.views += c
      if (isClick) slot.clicks += c
      dailyMap.set(r.event_day, slot)
    }

    if (r.template_id) {
      const ts = tplStats.get(r.template_id) || { clicks: 0, views: 0 }
      if (isClick) ts.clicks += c
      if (isView) ts.views += c
      tplStats.set(r.template_id, ts)
    }
    if (r.link_id && isClick) {
      linkStats.set(r.link_id, (linkStats.get(r.link_id) || 0) + c)
    }
  }

  const series90d: DailyMetricPoint[] = days90.map((date) => ({
    date,
    ...(dailyMap.get(date) || { views: 0, clicks: 0 }),
  }))
  const series30d = series90d.slice(-30)
  const series7d = series90d.slice(-7)

  const titleById = new Map(ownTemplates.map((t) => [t.id, t.title]))
  const topTemplates = ownTemplates
    .map((t) => {
      const st = tplStats.get(t.id) || { clicks: 0, views: 0 }
      return {
        template_id: t.id,
        title: titleById.get(t.id) || t.title,
        clicks: st.clicks,
        views: st.views,
      }
    })
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views)
    .slice(0, 5)

  const topLinks = ownLinks
    .filter((l) => l.type !== 'heading')
    .map((l) => ({
      link_id: l.id,
      title: l.title,
      type: l.type,
      clicks: linkStats.get(l.id) || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10)

  const topReferrers = Array.from(refMap.entries())
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  const peakHours = hourCounts
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    totalProfileViews,
    views7d,
    views30d,
    views90d,
    totalCapcutClicks,
    totalTiktokClicks,
    totalSocialClicks,
    totalLinkClicks,
    clicks7d,
    series7d,
    series30d,
    series90d,
    topTemplates,
    topLinks,
    topReferrers,
    deviceBreakdown,
    peakHours,
    referralCount,
  }
}

// ============================================================================
// PUBLIC ABUSE REPORT & CONTACT FORM
// ============================================================================

export async function submitAbuseReport(
  targetType: 'profile' | 'template',
  targetId: string,
  reason: string,
  details: string
): Promise<void> {
  const cleanReason = sanitizePlainText(reason, 120)
  const cleanDetails = sanitizePlainText(details, 500)
  if (cleanReason.length < 3) throw new Error('Pilih alasan laporan terlebih dahulu.')

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('submit_report', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: cleanReason,
      p_details: cleanDetails,
      p_client_bucket: getAnonymousRateBucket(),
    })
    if (error) throw new Error(error.message)
    return
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    db.reports.unshift({
      id: crypto.randomUUID(),
      reporter_id: db.currentUserId,
      target_type: targetType,
      target_id: targetId,
      reason: cleanReason,
      details: cleanDetails,
      status: 'open',
      admin_note: '',
      created_at: new Date().toISOString(),
    })
    writeSbx(db)
    return
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function submitContactForm(input: {
  name: string
  email: string
  subject: string
  body: string
  honeypot?: string
}): Promise<void> {
  if (input.honeypot) return
  const name = sanitizePlainText(input.name, 80)
  const email = input.email.trim().toLowerCase()
  const subject = sanitizePlainText(input.subject, 120)
  const body = sanitizePlainText(input.body, 1500)

  if (name.length < 2) throw new Error('Nama pengirim minimal 2 karakter.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Masukkan alamat email yang valid.')
  if (subject.length < 3) throw new Error('Subjek pesan minimal 3 karakter.')
  if (body.length < 10) throw new Error('Isi pesan minimal 10 karakter.')

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('submit_contact_message', {
      p_name: name,
      p_email: email,
      p_subject: subject,
      p_body: body,
      p_honeypot: input.honeypot || '',
      p_client_bucket: getAnonymousRateBucket(),
    })
    if (error) throw new Error(error.message)
    return
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    db.contacts.unshift({ name, email, subject, body, created_at: new Date().toISOString() })
    writeSbx(db)
  }
}

// ============================================================================
// ADMIN GATE & 9-SECTION ADMIN DASHBOARD RPC CLIENT
// ============================================================================

const NEUTRAL_ADMIN_GATE_ERROR =
  'Verifikasi admin tidak berhasil atau akses sedang dikunci sementara.'

export async function fetchAdminGateStatus(): Promise<AdminGateStatus> {
  const closed: AdminGateStatus = {
    is_admin: false,
    unlocked: false,
    session_open: false,
    must_change: false,
    unlocked_until: null,
    is_primary: false,
  }
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_gate_status')
    if (error || !data) return closed
    return data as AdminGateStatus
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const uid = db.currentUserId
    const adm = db.admins.find((a) => a.user_id === uid)
    if (!uid || !adm) return closed
    const sec = db.adminSecrets.find((s) => s.user_id === uid)
    const open = sbxIsAdminSessionOpen(db, uid)
    const mustChange = open && Boolean(sec?.must_change)
    return {
      is_admin: true,
      unlocked: open && !mustChange,
      session_open: open,
      must_change: mustChange,
      unlocked_until: open ? sec?.unlocked_until || null : null,
      is_primary: adm.is_primary,
    }
  }
  return closed
}

export async function unlockAdminGate(
  passphrase: string
): Promise<{ ok: boolean; must_change?: boolean; unlocked_until?: string; error?: string }> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_unlock', { p_passphrase: passphrase })
    if (error) {
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
    const res = data as { ok: boolean; must_change?: boolean; unlocked_until?: string; error?: string }
    if (!res?.ok) {
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
    return res
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const uid = db.currentUserId
    if (!uid || !sbxIsAdmin(db, uid)) {
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
    const sec = db.adminSecrets.find((s) => s.user_id === uid)
    if (!sec || !sec.passphraseHash) {
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
    const now = Date.now()
    if (sec.locked_until && Date.parse(sec.locked_until) > now) {
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
    if (verifySbxHash(passphrase, sec.passphraseHash)) {
      const until = new Date(now + 30 * 60 * 1000).toISOString()
      sec.failed_attempts = 0
      sec.locked_until = null
      sec.unlocked_until = until
      sec.updated_at = new Date(now).toISOString()
      sbxWriteAudit(db, 'admin_unlock', 'admin_gate', uid, { must_change: sec.must_change })
      writeSbx(db)
      return { ok: true, must_change: sec.must_change, unlocked_until: until }
    } else {
      sec.failed_attempts = (sec.failed_attempts || 0) + 1
      sec.unlocked_until = null
      sec.updated_at = new Date(now).toISOString()
      if (sec.failed_attempts >= 5) {
        sec.locked_until = new Date(now + 15 * 60 * 1000).toISOString()
        sbxWriteAudit(db, 'admin_lockout', 'admin_gate', uid, {
          failed_attempts: sec.failed_attempts,
          lock_minutes: 15,
        })
      } else {
        sbxWriteAudit(db, 'admin_unlock_failed', 'admin_gate', uid, {
          failed_attempts: sec.failed_attempts,
        })
      }
      writeSbx(db)
      return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
    }
  }

  return { ok: false, error: NEUTRAL_ADMIN_GATE_ERROR }
}

export async function lockAdminGate(): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    await supabase.rpc('admin_lock')
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const uid = db.currentUserId
    if (uid && sbxIsAdmin(db, uid)) {
      const sec = db.adminSecrets.find((s) => s.user_id === uid)
      if (sec) sec.unlocked_until = null
      sbxWriteAudit(db, 'admin_lock', 'admin_gate', uid)
      writeSbx(db)
    }
  }
}

export async function changeAdminPassphrase(newPassphrase: string): Promise<void> {
  if (!newPassphrase || newPassphrase.length < 12) {
    throw new Error('Password khusus admin minimal harus 12 karakter.')
  }
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_change_passphrase', { p_new: newPassphrase })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const uid = db.currentUserId
    if (!uid || !sbxIsAdminSessionOpen(db, uid)) {
      throw new Error('Sesi verifikasi admin belum dibuka atau sudah kedaluwarsa.')
    }
    const sec = db.adminSecrets.find((s) => s.user_id === uid)
    if (!sec) throw new Error('Rahasia admin tidak ditemukan.')
    if (verifySbxHash(newPassphrase, sec.passphraseHash)) {
      throw new Error('Password admin baru harus berbeda dari password sebelumnya.')
    }
    sec.passphraseHash = encodeSbxHash(newPassphrase)
    sec.must_change = false
    sec.failed_attempts = 0
    sec.locked_until = null
    sec.unlocked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    sec.updated_at = new Date().toISOString()
    sbxWriteAudit(db, 'admin_change_passphrase', 'admin_secrets', uid, { must_change_cleared: true })
    writeSbx(db)
  }
}

export async function adminGetOverview(): Promise<AdminOverviewData> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_get_overview')
    if (error) throw new Error(error.message)
    return data as AdminOverviewData
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const now = Date.now()
    const ms7 = 7 * 86400000
    const ms30 = 30 * 86400000
    const days30 = pastDaysIso(30)
    const totalViews = db.events
      .filter((e) => e.event_type === 'profile_view' || e.event_type === 'template_view')
      .reduce((s, e) => s + e.hit_count, 0)
    const totalClicks = db.events
      .filter((e) => ['capcut_click', 'tiktok_click', 'social_click', 'link_click'].includes(e.event_type))
      .reduce((s, e) => s + e.hit_count, 0)

    const growth = days30.map((date) => ({
      date,
      new_users: db.users.filter((u) => u.created_at.slice(0, 10) === date).length,
      views: db.events
        .filter((e) => e.event_day === date && ['profile_view', 'template_view'].includes(e.event_type))
        .reduce((s, e) => s + e.hit_count, 0),
      clicks: db.events
        .filter(
          (e) =>
            e.event_day === date &&
            ['capcut_click', 'tiktok_click', 'social_click', 'link_click'].includes(e.event_type)
        )
        .reduce((s, e) => s + e.hit_count, 0),
    }))

    return {
      metrics: {
        total_users: db.users.length,
        new_users_7d: db.users.filter((u) => now - Date.parse(u.created_at) <= ms7).length,
        new_users_30d: db.users.filter((u) => now - Date.parse(u.created_at) <= ms30).length,
        active_profiles: db.profiles.filter((p) => !p.is_banned && Boolean(p.username)).length,
        total_templates: db.templates.filter((t) => t.status !== 'removed').length,
        total_links: db.links.length,
        open_reports: db.reports.filter((r) => r.status === 'open' || r.status === 'reviewed').length,
        active_pro: db.profiles.filter((p) => getEffectivePlan(p.plan, p.plan_expires_at) === 'pro').length,
        total_views: totalViews,
        total_clicks: totalClicks,
      },
      growth_30d: growth,
      recent_logs: db.auditLogs.slice(0, 12),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export interface AdminUsersQuery {
  search?: string
  plan?: 'all' | 'free' | 'pro'
  status?: 'all' | 'active' | 'banned' | 'unclaimed'
  verified?: 'all' | 'verified' | 'unverified'
  dateFrom?: string
  dateTo?: string
  sort?: 'newest' | 'oldest' | 'username'
  page?: number
  pageSize?: number
}

export async function adminListUsers(query: AdminUsersQuery = {}): Promise<{
  total: number
  page: number
  page_size: number
  items: AdminUserListItem[]
}> {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.max(1, Math.min(50, query.pageSize || 15))
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_search: query.search || '',
      p_plan: query.plan || 'all',
      p_status: query.status || 'all',
      p_verified: query.verified || 'all',
      p_date_from: query.dateFrom || null,
      p_date_to: query.dateTo || null,
      p_sort: query.sort || 'newest',
      p_page: page,
      p_page_size: pageSize,
    })
    if (error) throw new Error(error.message)
    return data as { total: number; page: number; page_size: number; items: AdminUserListItem[] }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const q = (query.search || '').trim().toLowerCase()
    const profMap = new Map(db.profiles.map((p) => [p.id, normalizeProfile(p)]))
    let items: AdminUserListItem[] = db.users.map((u) => {
      const p = profMap.get(u.id) || null
      const eff = p ? getEffectivePlan(p.plan, p.plan_expires_at) : 'free'
      const adm = db.admins.find((a) => a.user_id === u.id)
      return {
        id: u.id,
        email: u.email,
        registered_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        providers: u.providers,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        category: p?.category ?? null,
        raw_plan: p?.plan ?? 'free',
        plan_expires_at: p?.plan_expires_at ?? null,
        effective_plan: eff,
        is_verified: Boolean(p?.is_verified),
        is_featured: Boolean(p?.is_featured),
        featured_order: p?.featured_order ?? 0,
        is_banned: Boolean(p?.is_banned),
        ban_reason: p?.ban_reason || '',
        has_username: Boolean(p?.username),
        is_admin: Boolean(adm),
        is_primary_admin: Boolean(adm?.is_primary),
        templates_count: db.templates.filter((t) => t.owner_id === u.id && t.status !== 'removed').length,
        links_count: db.links.filter((l) => l.owner_id === u.id).length,
      }
    })

    if (q) {
      items = items.filter(
        (i) =>
          i.email.toLowerCase().includes(q) ||
          (i.username || '').toLowerCase().includes(q) ||
          (i.display_name || '').toLowerCase().includes(q)
      )
    }
    if (query.plan && query.plan !== 'all') {
      items = items.filter((i) => i.effective_plan === query.plan)
    }
    if (query.status && query.status !== 'all') {
      items = items.filter((i) =>
        query.status === 'active'
          ? i.has_username && !i.is_banned
          : query.status === 'banned'
            ? i.is_banned
            : !i.has_username
      )
    }
    if (query.verified && query.verified !== 'all') {
      items = items.filter((i) => (query.verified === 'verified' ? i.is_verified : !i.is_verified))
    }
    if (query.dateFrom) {
      items = items.filter((i) => i.registered_at.slice(0, 10) >= query.dateFrom!)
    }
    if (query.dateTo) {
      items = items.filter((i) => i.registered_at.slice(0, 10) <= query.dateTo!)
    }

    if (query.sort === 'oldest') {
      items.sort((a, b) => a.registered_at.localeCompare(b.registered_at))
    } else if (query.sort === 'username') {
      items.sort((a, b) => (a.username || 'zzzzzz').localeCompare(b.username || 'zzzzzz'))
    } else {
      items.sort((a, b) => b.registered_at.localeCompare(a.registered_at))
    }

    const total = items.length
    const start = (page - 1) * pageSize
    return { total, page, page_size: pageSize, items: items.slice(start, start + pageSize) }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminGetUserDetail(userId: string): Promise<AdminUserDetail> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_get_user_detail', { p_user_id: userId })
    if (error) throw new Error(error.message)
    return data as AdminUserDetail
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const u = db.users.find((x) => x.id === userId)
    if (!u) throw new Error('Pengguna tidak ditemukan.')
    const p = db.profiles.find((x) => x.id === userId) || null
    const adm = db.admins.find((a) => a.user_id === userId)
    const ownTplIds = new Set(db.templates.filter((t) => t.owner_id === userId).map((t) => t.id))
    const evs = db.events.filter((e) => e.owner_id === userId)
    return {
      account: {
        id: u.id,
        email: u.email,
        email_confirmed_at: u.confirmed ? u.created_at : null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        has_password: Boolean(u.passwordHash),
        providers: u.providers,
        is_admin: Boolean(adm),
        is_primary_admin: Boolean(adm?.is_primary),
      },
      profile: p ? normalizeProfile(p) : null,
      subscriptions: db.subscriptions.filter((s) => s.user_id === userId),
      reports: db.reports.filter(
        (r) =>
          (r.target_type === 'profile' && r.target_id === userId) ||
          (r.target_type === 'template' && ownTplIds.has(r.target_id))
      ),
      stats: {
        templates_count: db.templates.filter((t) => t.owner_id === userId && t.status !== 'removed').length,
        links_count: db.links.filter((l) => l.owner_id === userId).length,
        total_views: evs
          .filter((e) => e.event_type === 'profile_view' || e.event_type === 'template_view')
          .reduce((s, e) => s + e.hit_count, 0),
        total_clicks: evs
          .filter((e) => ['capcut_click', 'tiktok_click', 'social_click', 'link_click'].includes(e.event_type))
          .reduce((s, e) => s + e.hit_count, 0),
      },
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminSetUserFlags(params: {
  userId: string
  is_verified?: boolean
  is_banned?: boolean
  ban_reason?: string
  is_featured?: boolean
  featured_order?: number
}): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_set_user_flags', {
      p_user_id: params.userId,
      p_is_verified: params.is_verified ?? null,
      p_is_banned: params.is_banned ?? null,
      p_ban_reason: params.ban_reason ?? null,
      p_is_featured: params.is_featured ?? null,
      p_featured_order: params.featured_order ?? null,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const p = db.profiles.find((x) => x.id === params.userId)
    if (!p) throw new Error('Profil kreator belum diklaim oleh akun ini.')
    if (params.is_banned && db.admins.some((a) => a.user_id === params.userId && a.is_primary)) {
      throw new Error('Admin utama tidak dapat ditangguhkan.')
    }
    if (params.is_verified !== undefined) p.is_verified = params.is_verified
    if (params.is_banned !== undefined) {
      p.is_banned = params.is_banned
      p.ban_reason = params.is_banned ? sanitizePlainText(params.ban_reason || '', 240) : ''
    }
    if (params.is_featured !== undefined) p.is_featured = params.is_featured
    if (params.featured_order !== undefined) p.featured_order = params.featured_order
    sbxWriteAudit(db, 'admin_set_user_flags', 'profile', params.userId, {
      username: p.username,
      is_verified: params.is_verified,
      is_banned: params.is_banned,
      ban_reason: params.ban_reason,
      is_featured: params.is_featured,
    })
    writeSbx(db)
  }
}

export async function adminSetUserPlan(
  profileId: string,
  plan: PlanId,
  expiresAt: string | null,
  amount = 0
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_set_user_plan', {
      p_user_id: profileId,
      p_plan: plan,
      p_expires_at: plan === 'pro' ? expiresAt : null,
      p_amount: amount,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const hit = db.profiles.find((p) => p.id === profileId)
    if (!hit) throw new Error('Pengguna belum memiliki profil kreator.')
    hit.plan = plan
    hit.plan_expires_at = plan === 'pro' ? expiresAt : null
    db.subscriptions.unshift({
      id: crypto.randomUUID(),
      user_id: profileId,
      plan,
      status: plan === 'pro' ? 'active' : 'revoked',
      amount,
      provider: 'manual_admin',
      provider_ref: null,
      started_at: new Date().toISOString(),
      expires_at: plan === 'pro' ? expiresAt : new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    sbxWriteAudit(
      db,
      plan === 'pro' ? 'admin_grant_pro' : 'admin_revoke_pro',
      'profile',
      profileId,
      { username: hit.username, plan, expires_at: expiresAt }
    )
    writeSbx(db)
  }
}

export async function adminBulkSetPlan(
  userIds: string[],
  plan: PlanId,
  expiresAt: string | null
): Promise<number> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_bulk_set_plan', {
      p_user_ids: userIds,
      p_plan: plan,
      p_expires_at: plan === 'pro' ? expiresAt : null,
    })
    if (error) throw new Error(error.message)
    return Number(data || 0)
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    let count = 0
    for (const id of userIds) {
      const hit = db.profiles.find((p) => p.id === id)
      if (hit) {
        hit.plan = plan
        hit.plan_expires_at = plan === 'pro' ? expiresAt : null
        db.subscriptions.unshift({
          id: crypto.randomUUID(),
          user_id: id,
          plan,
          status: plan === 'pro' ? 'active' : 'revoked',
          amount: 0,
          provider: 'manual_admin_bulk',
          provider_ref: null,
          started_at: new Date().toISOString(),
          expires_at: plan === 'pro' ? expiresAt : new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
        count++
      }
    }
    sbxWriteAudit(db, 'admin_bulk_set_plan', 'profiles', String(count), { plan, count })
    writeSbx(db)
    return count
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminChangeUsername(userId: string, newUsername: string): Promise<void> {
  const norm = normalizeUsername(newUsername)
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_change_username', {
      p_user_id: userId,
      p_new_username: norm,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    if (!/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(norm) || norm.length < 3 || norm.length > 24 || norm.includes('..')) {
      throw new Error('Format username baru tidak valid (3–24 karakter a–z, 0–9, titik, garis bawah).')
    }
    const p = db.profiles.find((x) => x.id === userId)
    if (!p) throw new Error('Pengguna ini belum memiliki klaim username.')
    if (db.profiles.some((x) => x.username.toLowerCase() === norm && x.id !== userId)) {
      throw new Error(`Username @${norm} sudah dipakai akun lain.`)
    }
    const oldUsername = p.username
    p.username = norm
    sbxWriteAudit(db, 'admin_change_username', 'profile', userId, {
      old_username: oldUsername,
      new_username: norm,
    })
    writeSbx(db)
  }
}

export async function adminReleaseUsername(userId: string): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_release_username', { p_user_id: userId })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const hit = db.profiles.find((p) => p.id === userId)
    if (!hit) throw new Error('Akun ini tidak memiliki klaim username.')
    const old = hit.username
    db.profiles = db.profiles.filter((p) => p.id !== userId)
    db.links = db.links.filter((l) => l.owner_id !== userId)
    db.templates = db.templates.filter((t) => t.owner_id !== userId)
    sbxWriteAudit(db, 'admin_release_username', 'profile', userId, { released_username: old })
    writeSbx(db)
  }
}

export async function adminListUsernames(
  search = '',
  page = 1
): Promise<{
  total_claims: number
  page: number
  page_size: number
  claims: {
    user_id: string
    username: string
    display_name: string
    email: string
    is_verified: boolean
    is_banned: boolean
    created_at: string
  }[]
  reserved: { word: string; reason: string; created_at: string }[]
}> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_usernames', {
      p_search: search,
      p_page: page,
      p_page_size: 30,
    })
    if (error) throw new Error(error.message)
    return data as Awaited<ReturnType<typeof adminListUsernames>>
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const q = search.trim().toLowerCase()
    const userMap = new Map(db.users.map((u) => [u.id, u.email]))
    const allClaims = db.profiles
      .map((p) => ({
        user_id: p.id,
        username: p.username,
        display_name: p.display_name,
        email: userMap.get(p.id) || '',
        is_verified: p.is_verified,
        is_banned: p.is_banned,
        created_at: p.created_at,
      }))
      .filter(
        (c) =>
          !q ||
          c.username.includes(q) ||
          c.display_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
      .sort((a, b) => a.username.localeCompare(b.username))

    const reserved = db.reservedWords
      .filter((r) => !q || r.word.includes(q))
      .sort((a, b) => a.word.localeCompare(b.word))

    return {
      total_claims: allClaims.length,
      page,
      page_size: 30,
      claims: allClaims.slice((page - 1) * 30, page * 30),
      reserved,
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminManageReservedUsername(
  word: string,
  action: 'add' | 'remove',
  reason = 'Ditambahkan admin'
): Promise<void> {
  const clean = normalizeUsername(word)
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_manage_reserved_username', {
      p_word: clean,
      p_action: action,
      p_reason: reason,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    if (!clean || !/^[a-z0-9._-]+$/.test(clean)) {
      throw new Error('Format kata cadangan tidak valid.')
    }
    if (action === 'add') {
      const idx = db.reservedWords.findIndex((r) => r.word === clean)
      const item = { word: clean, reason: sanitizePlainText(reason, 120), created_at: new Date().toISOString() }
      if (idx >= 0) db.reservedWords[idx] = item
      else db.reservedWords.push(item)
      sbxWriteAudit(db, 'admin_reserve_word', 'reserved_usernames', clean, { reason })
    } else {
      db.reservedWords = db.reservedWords.filter((r) => r.word !== clean)
      sbxWriteAudit(db, 'admin_unreserve_word', 'reserved_usernames', clean)
    }
    writeSbx(db)
  }
}

export async function adminDeleteUserAccount(userId: string, confirmText: string): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_delete_user_account', {
      p_user_id: userId,
      p_confirm_text: confirmText,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const caller = sbxRequireAdminUnlocked(db)
    if (userId === caller) {
      throw new Error('Anda tidak dapat menghapus akun admin yang sedang Anda gunakan.')
    }
    if (db.admins.some((a) => a.user_id === userId && a.is_primary)) {
      throw new Error('Akun admin utama tidak dapat dihapus.')
    }
    const u = db.users.find((x) => x.id === userId)
    if (!u) throw new Error('Akun pengguna tidak ditemukan.')
    const p = db.profiles.find((x) => x.id === userId)
    const expected = p?.username || u.email
    if (normalizeUsername(confirmText) !== expected.toLowerCase()) {
      throw new Error(`Konfirmasi tidak cocok. Ketik persis "${expected}" untuk menghapus akun ini.`)
    }
    db.users = db.users.filter((x) => x.id !== userId)
    db.profiles = db.profiles.filter((x) => x.id !== userId)
    db.links = db.links.filter((x) => x.owner_id !== userId)
    db.templates = db.templates.filter((x) => x.owner_id !== userId)
    db.subscriptions = db.subscriptions.filter((x) => x.user_id !== userId)
    db.admins = db.admins.filter((x) => x.user_id !== userId)
    db.adminSecrets = db.adminSecrets.filter((x) => x.user_id !== userId)
    sbxWriteAudit(db, 'admin_delete_user_account', 'user', userId, {
      email: u.email,
      username: p?.username || null,
    })
    writeSbx(db)
  }
}

export async function adminSendUserPasswordReset(email: string): Promise<void> {
  await requestPasswordReset(email)
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (sbxIsAdminSessionOpen(db, db.currentUserId)) {
      sbxWriteAudit(db, 'admin_send_password_reset', 'user', email)
      writeSbx(db)
    }
  }
}

export async function adminListContent(params: {
  kind: 'templates' | 'links'
  status?: string
  search?: string
  page?: number
}): Promise<{ total: number; page: number; page_size: number; items: AdminContentItem[] }> {
  const page = Math.max(1, params.page || 1)
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_content', {
      p_kind: params.kind,
      p_status: params.status || 'all',
      p_search: params.search || '',
      p_page: page,
      p_page_size: 25,
    })
    if (error) throw new Error(error.message)
    return data as { total: number; page: number; page_size: number; items: AdminContentItem[] }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const q = (params.search || '').trim().toLowerCase()
    const profMap = new Map(db.profiles.map((p) => [p.id, p]))
    let items: AdminContentItem[] =
      params.kind === 'links'
        ? db.links.map((l) => {
            const owner = profMap.get(l.owner_id)
            return {
              id: l.id,
              kind: 'link',
              link_type: l.type,
              title: l.title,
              url: l.url,
              thumbnail_url: l.thumbnail_url,
              status: l.is_active ? 'active' : 'hidden',
              owner_id: l.owner_id,
              owner_username: owner?.username || 'unknown',
              owner_display_name: owner?.display_name || 'Kreator',
              created_at: l.created_at,
            }
          })
        : db.templates.map((t) => {
            const owner = profMap.get(t.owner_id)
            return {
              id: t.id,
              kind: 'template',
              title: t.title,
              description: t.description,
              url: t.capcut_url,
              tiktok_url: t.tiktok_url,
              thumbnail_url: t.thumbnail_url,
              status: t.status,
              owner_id: t.owner_id,
              owner_username: owner?.username || 'unknown',
              owner_display_name: owner?.display_name || 'Kreator',
              created_at: t.created_at,
            }
          })

    if (params.status && params.status !== 'all') {
      items = items.filter((i) => i.status === params.status)
    }
    if (q) {
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.url || '').toLowerCase().includes(q) ||
          i.owner_username.toLowerCase().includes(q)
      )
    }
    items.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return {
      total: items.length,
      page,
      page_size: 25,
      items: items.slice((page - 1) * 25, page * 25),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminModerateContent(
  kind: 'template' | 'link',
  itemId: string,
  action: 'active' | 'hidden' | 'removed'
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_moderate_content', {
      p_kind: kind,
      p_item_id: itemId,
      p_action: action,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    if (kind === 'template') {
      const hit = db.templates.find((t) => t.id === itemId)
      if (hit) hit.status = action
    } else {
      if (action === 'removed') {
        db.links = db.links.filter((l) => l.id !== itemId)
      } else {
        const hit = db.links.find((l) => l.id === itemId)
        if (hit) hit.is_active = action === 'active'
      }
    }
    sbxWriteAudit(db, `admin_moderate_${kind}`, kind, itemId, { action })
    writeSbx(db)
  }
}

export async function adminListReports(
  status = 'all',
  page = 1
): Promise<{ total: number; page: number; page_size: number; items: AbuseReport[] }> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_reports', {
      p_status: status,
      p_page: page,
      p_page_size: 25,
    })
    if (error) throw new Error(error.message)
    return data as { total: number; page: number; page_size: number; items: AbuseReport[] }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const profMap = new Map(db.profiles.map((p) => [p.id, p]))
    const tplMap = new Map(db.templates.map((t) => [t.id, t]))
    let list = db.reports.map((r) => {
      if (r.target_type === 'profile') {
        const p = profMap.get(r.target_id)
        return {
          ...r,
          target_label: p ? `@${p.username}` : 'Profil tidak ditemukan',
          owner_username: p?.username || null,
          owner_id: p?.id || null,
        }
      }
      const t = tplMap.get(r.target_id)
      const op = t ? profMap.get(t.owner_id) : undefined
      return {
        ...r,
        target_label: t ? t.title : 'Template tidak ditemukan',
        owner_username: op?.username || null,
        owner_id: op?.id || null,
      }
    })
    if (status !== 'all') list = list.filter((r) => r.status === status)
    return {
      total: list.length,
      page,
      page_size: 25,
      items: list.slice((page - 1) * 25, page * 25),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminResolveReportV2(
  reportId: string,
  status: 'open' | 'reviewed' | 'resolved' | 'dismissed',
  note = '',
  quickAction: 'none' | 'hide_content' | 'remove_content' | 'ban_user' = 'none'
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_resolve_report_v2', {
      p_report_id: reportId,
      p_status: status,
      p_note: note,
      p_quick_action: quickAction,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const rep = db.reports.find((r) => r.id === reportId)
    if (!rep) throw new Error('Laporan tidak ditemukan.')
    if (quickAction === 'hide_content' && rep.target_type === 'template') {
      const t = db.templates.find((x) => x.id === rep.target_id)
      if (t) t.status = 'hidden'
    } else if (quickAction === 'remove_content' && rep.target_type === 'template') {
      const t = db.templates.find((x) => x.id === rep.target_id)
      if (t) t.status = 'removed'
    } else if (quickAction === 'ban_user') {
      const ownerId =
        rep.target_type === 'profile'
          ? rep.target_id
          : db.templates.find((x) => x.id === rep.target_id)?.owner_id
      const p = ownerId ? db.profiles.find((x) => x.id === ownerId) : undefined
      if (p && !db.admins.some((a) => a.user_id === p.id && a.is_primary)) {
        p.is_banned = true
        p.ban_reason = sanitizePlainText(note || rep.reason, 240)
      }
    }
    rep.status = status
    rep.admin_note = sanitizePlainText(note, 500)
    if (status === 'resolved' || status === 'dismissed') {
      rep.resolved_at = new Date().toISOString()
    }
    sbxWriteAudit(db, 'admin_resolve_report', 'report', reportId, { status, quickAction, note })
    writeSbx(db)
  }
}

export async function adminListSubscriptions(
  filter = 'all',
  page = 1
): Promise<{
  active_pro: { id: string; username: string; display_name: string; email: string; plan_expires_at: string | null }[]
  expiring_soon: { id: string; username: string; display_name: string; email: string; plan_expires_at: string | null }[]
  total_history: number
  page: number
  page_size: number
  history: SubscriptionRecord[]
}> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_subscriptions', {
      p_filter: filter,
      p_page: page,
      p_page_size: 25,
    })
    if (error) throw new Error(error.message)
    return data as Awaited<ReturnType<typeof adminListSubscriptions>>
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const userMap = new Map(db.users.map((u) => [u.id, u.email]))
    const profMap = new Map(db.profiles.map((p) => [p.id, p]))
    const now = Date.now()
    const activePro = db.profiles
      .filter((p) => getEffectivePlan(p.plan, p.plan_expires_at) === 'pro')
      .map((p) => ({
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        email: userMap.get(p.id) || '',
        plan_expires_at: p.plan_expires_at,
      }))
    const expiringSoon = activePro.filter(
      (p) => p.plan_expires_at && Date.parse(p.plan_expires_at) - now <= 7 * 86400000
    )
    const historyAll = db.subscriptions
      .filter((s) => filter === 'all' || s.status === filter)
      .map((s) => ({
        ...s,
        username: profMap.get(s.user_id)?.username || null,
        email: userMap.get(s.user_id) || '',
      }))
    return {
      active_pro: activePro,
      expiring_soon: expiringSoon,
      total_history: historyAll.length,
      page,
      page_size: 25,
      history: historyAll.slice((page - 1) * 25, page * 25),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminReorderFeatured(orderedIds: string[]): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_reorder_featured', { p_ordered_ids: orderedIds })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    orderedIds.forEach((id, idx) => {
      const p = db.profiles.find((x) => x.id === id)
      if (p) {
        p.is_featured = true
        p.featured_order = idx + 1
      }
    })
    sbxWriteAudit(db, 'admin_reorder_featured', 'profiles', String(orderedIds.length), {
      ordered_ids: orderedIds,
    })
    writeSbx(db)
  }
}

export async function adminListAuditLogs(
  action = 'all',
  search = '',
  page = 1
): Promise<{ total: number; page: number; page_size: number; items: AdminAuditLogEntry[] }> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_list_audit_logs', {
      p_action: action,
      p_search: search,
      p_page: page,
      p_page_size: 30,
    })
    if (error) throw new Error(error.message)
    return data as { total: number; page: number; page_size: number; items: AdminAuditLogEntry[] }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const q = search.trim().toLowerCase()
    const filtered = db.auditLogs.filter(
      (l) =>
        (action === 'all' || l.action === action) &&
        (!q ||
          l.actor_email.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.target_id.toLowerCase().includes(q))
    )
    return {
      total: filtered.length,
      page,
      page_size: 30,
      items: filtered.slice((page - 1) * 30, page * 30),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminGetSettingsAndTeam(): Promise<{
  settings: SiteSettings
  team: AdminTeamMember[]
}> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_get_settings_and_team')
    if (error) throw new Error(error.message)
    return data as { settings: SiteSettings; team: AdminTeamMember[] }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    const userMap = new Map(db.users.map((u) => [u.id, u.email]))
    const profMap = new Map(db.profiles.map((p) => [p.id, p.username]))
    const secSet = new Set(db.adminSecrets.map((s) => s.user_id))
    return {
      settings: db.siteSettings,
      team: db.admins.map((a) => ({
        user_id: a.user_id,
        email: userMap.get(a.user_id) || '',
        username: profMap.get(a.user_id) || null,
        note: a.note,
        is_primary: a.is_primary,
        has_passphrase: secSet.has(a.user_id),
        created_at: a.created_at,
      })),
    }
  }
  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminUpdateSiteSettings(input: {
  announcement_text: string
  announcement_active: boolean
  maintenance_mode: boolean
}): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_update_site_settings', {
      p_announcement_text: input.announcement_text,
      p_announcement_active: input.announcement_active,
      p_maintenance_mode: input.maintenance_mode,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    sbxRequireAdminUnlocked(db)
    db.siteSettings = {
      announcement_text: sanitizePlainText(input.announcement_text, 280),
      announcement_active: Boolean(input.announcement_active),
      maintenance_mode: Boolean(input.maintenance_mode),
      updated_at: new Date().toISOString(),
    }
    sbxWriteAudit(db, 'admin_update_site_settings', 'site_settings', '1', {
      announcement_active: input.announcement_active,
      maintenance_mode: input.maintenance_mode,
    })
    writeSbx(db)
  }
}

export async function adminManageTeam(
  email: string,
  action: 'add' | 'remove',
  note = 'Administrator'
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase()
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.rpc('admin_manage_team', {
      p_email: cleanEmail,
      p_action: action,
      p_note: note,
    })
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const caller = sbxRequireAdminUnlocked(db)
    const target = db.users.find((u) => u.email === cleanEmail)
    if (!target) throw new Error('Email tersebut belum terdaftar sebagai akun di Luven.')
    if (action === 'add') {
      const existing = db.admins.find((a) => a.user_id === target.id)
      if (existing) existing.note = sanitizePlainText(note, 80)
      else {
        db.admins.push({
          user_id: target.id,
          note: sanitizePlainText(note, 80),
          is_primary: false,
          created_at: new Date().toISOString(),
        })
      }
      sbxWriteAudit(db, 'admin_add_team_member', 'admins', target.id, { email: cleanEmail })
    } else {
      const adm = db.admins.find((a) => a.user_id === target.id)
      if (adm?.is_primary) throw new Error('Admin utama tidak dapat dicabut.')
      if (target.id === caller) throw new Error('Anda tidak dapat mencabut akses admin Anda sendiri.')
      db.admins = db.admins.filter((a) => a.user_id !== target.id)
      db.adminSecrets = db.adminSecrets.filter((s) => s.user_id !== target.id)
      sbxWriteAudit(db, 'admin_remove_team_member', 'admins', target.id, { email: cleanEmail })
    }
    writeSbx(db)
  }
}
