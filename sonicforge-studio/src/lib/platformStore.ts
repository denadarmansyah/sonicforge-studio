import { BillingCycle, PlanId } from '../config/plans'
import { processImageToWebp, ImageKind } from './imageProcessor'
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
  AnalyticsEventType,
  AuthSessionUser,
  CreatorAnalyticsSummary,
  CreatorTemplate,
  DailyMetricPoint,
  LinkItem,
  LinkItemType,
  Profile,
  SubscriptionRecord,
} from './types'
import {
  normalizeUsername,
  sanitizePlainText,
  validateAllowedUrl,
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

export function normalizeProfile(raw: Partial<Profile> & { id: string; username: string; display_name: string }): Profile {
  const effPlan = getEffectivePlan(raw.plan, raw.plan_expires_at)
  return {
    id: raw.id,
    username: raw.username,
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
    is_banned: Boolean(raw.is_banned),
    onboarding_completed: Boolean(raw.onboarding_completed),
    plan: raw.plan === 'pro' ? 'pro' : 'free',
    plan_expires_at: raw.plan_expires_at ?? null,
    theme: sanitizeProfileTheme(raw.theme, effPlan),
    settings: sanitizeProfileSettings(raw.settings, effPlan),
    referred_by: raw.referred_by ?? null,
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at,
  }
}

// ============================================================================
// LOCAL SANDBOX STORE (Used ONLY when developer explicitly enables Sandbox
// mode in unconfigured local environment or Playwright E2E tests; starts 100% EMPTY)
// ============================================================================
interface SandboxState {
  users: { id: string; email: string; passwordHash: string; confirmed: boolean }[]
  currentUserId: string | null
  admins: string[]
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

function emptySandbox(): SandboxState {
  return {
    users: [],
    currentUserId: null,
    admins: [],
    profiles: [],
    templates: [],
    links: [],
    subscriptions: [],
    events: [],
    reports: [],
    contacts: [],
  }
}

function readSbx(): SandboxState {
  try {
    const raw = localStorage.getItem(SBX_STORAGE_KEY)
    return raw ? { ...emptySandbox(), ...(JSON.parse(raw) as Partial<SandboxState>) } : emptySandbox()
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
// UNIFIED PLATFORM API (Real Supabase first; Sandbox when explicitly enabled)
// ============================================================================

export async function getCurrentSessionUser(): Promise<AuthSessionUser | null> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return {
      id: data.user.id,
      email: data.user.email || '',
      email_confirmed: Boolean(data.user.email_confirmed_at || data.user.confirmed_at),
    }
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    const u = db.users.find((x) => x.id === db.currentUserId)
    return u ? { id: u.id, email: u.email, email_confirmed: u.confirmed } : null
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
    throw new Error('Kata sandi minimal terdiri dari 8 karakter.')
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })
    if (error) {
      if (/already registered/i.test(error.message)) {
        throw new Error('Email ini sudah terdaftar. Silakan masuk ke akun Anda.')
      }
      throw new Error(error.message)
    }
    if (!data.user) throw new Error('Pendaftaran gagal diproses. Coba lagi.')
    const confirmed = Boolean(data.session)
    return {
      user: { id: data.user.id, email: data.user.email || cleanEmail, email_confirmed: confirmed },
      needsEmailVerification: !confirmed,
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    if (db.users.some((u) => u.email === cleanEmail)) {
      throw new Error('Email ini sudah terdaftar. Silakan masuk ke akun Anda.')
    }
    const newUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      passwordHash: btoa(encodeURIComponent(password)),
      confirmed: true,
    }
    db.users.push(newUser)
    // First account in local sandbox can toggle admin in dev panel; keep standard user by default
    db.currentUserId = newUser.id
    writeSbx(db)
    return {
      user: { id: newUser.id, email: newUser.email, email_confirmed: true },
      needsEmailVerification: false,
    }
  }

  throw new Error('Supabase belum dikonfigurasi. Buka halaman Pengaturan untuk menghubungkan proyek.')
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSessionUser> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !password) {
    throw new Error('Masukkan email dan kata sandi Anda.')
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error || !data.user) {
      if (/Email not confirmed/i.test(error?.message || '')) {
        throw new Error('Email Anda belum diverifikasi. Periksa kotak masuk atau folder spam Anda.')
      }
      throw new Error('Email atau kata sandi tidak sesuai.')
    }
    return {
      id: data.user.id,
      email: data.user.email || cleanEmail,
      email_confirmed: true,
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const u = db.users.find(
      (x) => x.email === cleanEmail && x.passwordHash === btoa(encodeURIComponent(password))
    )
    if (!u) throw new Error('Email atau kata sandi tidak sesuai.')
    db.currentUserId = u.id
    writeSbx(db)
    return { id: u.id, email: u.email, email_confirmed: u.confirmed }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function signInWithGoogleOAuth(): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    })
    if (error) {
      throw new Error('Login Google belum diaktifkan pada proyek Supabase ini.')
    }
    return
  }
  throw new Error('Login Google memerlukan koneksi proyek Supabase aktif.')
}

export async function requestPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Masukkan alamat email akun Anda yang valid.')
  }
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/login?mode=update-password`,
    })
    if (error) throw new Error(error.message)
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
    await supabase.auth.signOut()
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    db.currentUserId = null
    writeSbx(db)
  }
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
    return Boolean(data?.user_id)
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    return db.admins.includes(userId)
  }
  return false
}

export function grantSandboxAdmin(userId: string): void {
  if (!isSandboxEnabled()) return
  const db = readSbx()
  if (!db.admins.includes(userId)) {
    db.admins.push(userId)
    writeSbx(db)
  }
}

export async function checkUsernameAvailability(
  rawUsername: string,
  currentUserId?: string
): Promise<{ available: boolean; normalized: string; message?: string }> {
  const fmt = validateUsernameFormat(rawUsername)
  if (!fmt.ok) {
    return { available: false, normalized: fmt.normalized, message: fmt.error }
  }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.rpc('check_username_available', {
      p_username: fmt.normalized,
    })
    if (error) {
      return { available: false, normalized: fmt.normalized, message: 'Gagal memeriksa ketersediaan username.' }
    }
    const res = data as { available: boolean; reason: string | null }
    if (!res.available) {
      return {
        available: false,
        normalized: fmt.normalized,
        message:
          res.reason === 'taken'
            ? `Username @${fmt.normalized} sudah digunakan kreator lain.`
            : `Username @${fmt.normalized} tidak tersedia.`,
      }
    }
    return { available: true, normalized: fmt.normalized }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const taken = db.profiles.some(
      (p) => p.username === fmt.normalized && p.id !== currentUserId
    )
    if (taken) {
      return {
        available: false,
        normalized: fmt.normalized,
        message: `Username @${fmt.normalized} sudah digunakan kreator lain.`,
      }
    }
    return { available: true, normalized: fmt.normalized }
  }

  return { available: true, normalized: fmt.normalized }
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  if (!userId) return null
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
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
      .eq('username', clean)
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
    const profRaw = db.profiles.find((p) => p.username === clean && !p.is_banned) ?? null
    if (!profRaw) return { profile: null, templates: [], links: [] }
    const prof = normalizeProfile(profRaw)
    const effPlan = getEffectivePlan(prof.plan, prof.plan_expires_at)
    const tpls = db.templates
      .filter((t) => t.owner_id === prof.id && t.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at))

    const nowMs = Date.now()
    const links = db.links
      .filter((l) => l.owner_id === prof.id && l.is_active)
      .filter((l) => (!l.schedule_start || Date.parse(l.schedule_start) <= nowMs) && (!l.schedule_end || Date.parse(l.schedule_end) >= nowMs))
      .filter((l) => effPlan === 'pro' || !['embed_tiktok', 'embed_youtube', 'announcement'].includes(l.type))
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      .map((l) =>
        effPlan === 'free'
          ? { ...l, is_featured: false, group_id: null, thumbnail_url: l.type === 'capcut' ? l.thumbnail_url : null }
          : l
      )
    return { profile: prof, templates: tpls, links }
  }

  return { profile: null, templates: [], links: [] }
}

export interface UpsertProfileInput {
  username: string
  display_name: string
  bio?: string
  category?: string
  tiktok_url?: string
  instagram_url?: string
  youtube_url?: string
  website_url?: string
  avatar_url?: string | null
  banner_url?: string | null
  referred_by?: string | null
  onboarding_completed?: boolean
}

export async function saveOwnProfile(userId: string, input: UpsertProfileInput): Promise<Profile> {
  const uCheck = await checkUsernameAvailability(input.username, userId)
  if (!uCheck.available) {
    throw new Error(uCheck.message || 'Username tidak tersedia.')
  }

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

  const cleanRef = input.referred_by ? normalizeUsername(input.referred_by) : null
  const validRef = cleanRef && cleanRef !== uCheck.normalized ? cleanRef : null

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const payload = {
      id: userId,
      username: uCheck.normalized,
      display_name: displayName,
      bio,
      category,
      tiktok_url: tt.clean,
      instagram_url: ig.clean,
      youtube_url: yt.clean,
      website_url: web.clean,
      ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
      ...(input.banner_url !== undefined ? { banner_url: input.banner_url } : {}),
      ...(validRef ? { referred_by: validRef } : {}),
      onboarding_completed: input.onboarding_completed ?? true,
    }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      if (/duplicate key|unique/i.test(error.message)) {
        throw new Error(`Username @${uCheck.normalized} baru saja diambil pengguna lain.`)
      }
      throw new Error(error.message)
    }
    return normalizeProfile(data as Profile)
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const idx = db.profiles.findIndex((p) => p.id === userId)
    if (idx >= 0 && db.profiles[idx].is_banned) {
      throw new Error('Akun ini sedang ditangguhkan oleh moderator.')
    }
    const now = new Date().toISOString()
    const existing = idx >= 0 ? normalizeProfile(db.profiles[idx]) : null
    const merged: Profile = normalizeProfile({
      id: userId,
      username: uCheck.normalized,
      display_name: displayName,
      bio,
      category,
      tiktok_url: tt.clean,
      instagram_url: ig.clean,
      youtube_url: yt.clean,
      website_url: web.clean,
      avatar_url: input.avatar_url !== undefined ? input.avatar_url : existing?.avatar_url ?? null,
      banner_url: input.banner_url !== undefined ? input.banner_url : existing?.banner_url ?? null,
      is_verified: existing?.is_verified ?? false,
      is_featured: existing?.is_featured ?? false,
      is_banned: existing?.is_banned ?? false,
      plan: existing?.plan ?? 'free',
      plan_expires_at: existing?.plan_expires_at ?? null,
      theme: existing?.theme ?? DEFAULT_FREE_THEME,
      settings: existing?.settings ?? DEFAULT_PROFILE_SETTINGS,
      referred_by: existing?.referred_by ?? validRef,
      onboarding_completed: input.onboarding_completed ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    })
    if (idx >= 0) db.profiles[idx] = merged
    else db.profiles.push(merged)
    writeSbx(db)
    return merged
  }

  throw new Error('Supabase belum dikonfigurasi.')
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
    if (!ownerProf) throw new Error('Lengkapi profil kreator Anda terlebih dahulu.')
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
// SUBSCRIPTIONS, ADMIN PLAN CONTROL & MIDTRANS CHECKOUT
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
    throw new Error('Pembayaran otomatis memerlukan koneksi Supabase aktif. Hubungi admin via TikTok @luvenindonesia untuk aktivasi manual.')
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
    throw new Error(data.error || 'Gateway pembayaran belum aktif. Hubungi admin lewat TikTok @luvenindonesia.')
  }
  return data as { token: string; redirectUrl: string | null; orderId: string }
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
    if (!db.currentUserId || !db.admins.includes(db.currentUserId)) {
      throw new Error('Akses ditolak.')
    }
    const hit = db.profiles.find((p) => p.id === profileId)
    if (hit) {
      hit.plan = plan
      hit.plan_expires_at = plan === 'pro' ? expiresAt : null
    }
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
    writeSbx(db)
  }
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
          .order('created_at', { ascending: false })
          .limit(6),
        profQuery
          .order('is_featured', { ascending: false })
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
        featuredCreators: (feat as Profile[]) || [],
        creators: (profs as Profile[]) || [],
        templates: list,
        hasMore: (tpls || []).length > pageSize,
      }
    } catch {
      return { featuredCreators: [], creators: [], templates: [], hasMore: false }
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const activeProfiles = db.profiles.filter((p) => !p.is_banned && p.onboarding_completed)
    const profileMap = new Map(activeProfiles.map((p) => [p.id, p]))

    const featuredCreators = activeProfiles.filter((p) => p.is_featured).slice(0, 6)

    const filteredCreators = activeProfiles
      .filter((p) => (!category || p.category === category))
      .filter((p) => !q || p.username.includes(q) || p.display_name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.created_at.localeCompare(a.created_at))

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

  const peakHours = hourCounts.filter((h) => h.count > 0).sort((a, b) => b.count - a.count).slice(0, 6)

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
// REPORTS, CONTACT & ADMIN MODERATION
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

export async function adminFetchModerationData(searchQuery = ''): Promise<{
  reports: AbuseReport[]
  profiles: Profile[]
  templates: CreatorTemplate[]
}> {
  const q = searchQuery.trim().toLowerCase()

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data: reps, error: repErr } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (repErr) throw new Error('Akses ditolak. Halaman ini khusus untuk administrator.')

    let pQuery = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(80)
    if (q) pQuery = pQuery.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    const { data: profs } = await pQuery

    const { data: tpls } = await supabase
      .from('templates')
      .select('*, owner:profiles(id, username, display_name, avatar_url, is_verified, category)')
      .order('created_at', { ascending: false })
      .limit(80)

    return {
      reports: (reps as AbuseReport[]) || [],
      profiles: (profs as Profile[]) || [],
      templates: (tpls as CreatorTemplate[]) || [],
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    if (!db.currentUserId || !db.admins.includes(db.currentUserId)) {
      throw new Error('Akses ditolak oleh kebijakan keamanan: hanya admin yang diizinkan.')
    }
    const profMap = new Map(db.profiles.map((p) => [p.id, p]))
    const profs = db.profiles.filter(
      (p) => !q || p.username.includes(q) || p.display_name.toLowerCase().includes(q)
    )
    const tpls = db.templates.map((t) => {
      const o = profMap.get(t.owner_id)
      return {
        ...t,
        owner: o
          ? {
              id: o.id,
              username: o.username,
              display_name: o.display_name,
              avatar_url: o.avatar_url,
              is_verified: o.is_verified,
              category: o.category,
            }
          : undefined,
      }
    })
    return { reports: db.reports, profiles: profs, templates: tpls }
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function adminUpdateProfileFlags(
  profileId: string,
  flags: Partial<Pick<Profile, 'is_banned' | 'is_verified' | 'is_featured'>>
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.from('profiles').update(flags).eq('id', profileId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (!db.currentUserId || !db.admins.includes(db.currentUserId)) {
      throw new Error('Akses ditolak.')
    }
    const hit = db.profiles.find((p) => p.id === profileId)
    if (hit) Object.assign(hit, flags)
    writeSbx(db)
  }
}

export async function adminUpdateTemplateStatus(
  templateId: string,
  status: 'active' | 'hidden' | 'removed'
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.from('templates').update({ status }).eq('id', templateId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (!db.currentUserId || !db.admins.includes(db.currentUserId)) {
      throw new Error('Akses ditolak.')
    }
    const hit = db.templates.find((t) => t.id === templateId)
    if (hit) hit.status = status
    writeSbx(db)
  }
}

export async function adminResolveReport(
  reportId: string,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { error } = await supabase.from('reports').update({ status }).eq('id', reportId)
    if (error) throw new Error(error.message)
    return
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    if (!db.currentUserId || !db.admins.includes(db.currentUserId)) {
      throw new Error('Akses ditolak.')
    }
    const hit = db.reports.find((r) => r.id === reportId)
    if (hit) hit.status = status
    writeSbx(db)
  }
}
