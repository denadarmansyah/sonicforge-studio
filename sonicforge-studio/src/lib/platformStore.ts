import { processImageToWebp, ImageKind } from './imageProcessor'
import {
  getAnonymousRateBucket,
  getLiveSupabaseClient,
  isSandboxEnabled,
} from './supabaseClient'
import {
  AbuseReport,
  AnalyticsEventType,
  AuthSessionUser,
  CreatorAnalyticsSummary,
  CreatorTemplate,
  DailyMetricPoint,
  Profile,
} from './types'
import {
  normalizeUsername,
  sanitizePlainText,
  validateAllowedUrl,
  validateUsernameFormat,
} from './validators'

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
  events: {
    owner_id: string
    template_id: string | null
    event_type: AnalyticsEventType
    event_day: string
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
    return (data as Profile | null) ?? null
  }
  if (isSandboxEnabled()) {
    const db = readSbx()
    return db.profiles.find((p) => p.id === userId) ?? null
  }
  return null
}

export async function getPublicProfileByUsername(username: string): Promise<{
  profile: Profile | null
  templates: CreatorTemplate[]
}> {
  const clean = normalizeUsername(username)
  if (!clean) return { profile: null, templates: [] }

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', clean)
      .eq('is_banned', false)
      .maybeSingle()

    if (!prof) return { profile: null, templates: [] }

    const { data: tpls } = await supabase
      .from('templates')
      .select('*')
      .eq('owner_id', prof.id)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    return {
      profile: prof as Profile,
      templates: ((tpls as CreatorTemplate[]) || []),
    }
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const prof = db.profiles.find((p) => p.username === clean && !p.is_banned) ?? null
    if (!prof) return { profile: null, templates: [] }
    const tpls = db.templates
      .filter((t) => t.owner_id === prof.id && t.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at))
    return { profile: prof, templates: tpls }
  }

  return { profile: null, templates: [] }
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
    return data as Profile
  }

  if (isSandboxEnabled()) {
    const db = readSbx()
    const idx = db.profiles.findIndex((p) => p.id === userId)
    if (idx >= 0 && db.profiles[idx].is_banned) {
      throw new Error('Akun ini sedang ditangguhkan oleh moderator.')
    }
    const now = new Date().toISOString()
    const existing = idx >= 0 ? db.profiles[idx] : null
    const merged: Profile = {
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
      onboarding_completed: input.onboarding_completed ?? true,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    }
    if (idx >= 0) db.profiles[idx] = merged
    else db.profiles.push(merged)
    writeSbx(db)
    return merged
  }

  throw new Error('Supabase belum dikonfigurasi.')
}

export async function uploadCreatorImage(
  userId: string,
  file: File,
  kind: ImageKind
): Promise<string> {
  const webpFile = await processImageToWebp(file, kind)
  const bucket = kind === 'avatar' ? 'avatars' : kind === 'banner' ? 'banners' : 'thumbnails'
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
  templateId?: string | null
): Promise<void> {
  if (!ownerId) return
  const bucket = getAnonymousRateBucket()

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    await supabase.rpc('record_event', {
      p_owner_id: ownerId,
      p_event_type: eventType,
      p_template_id: templateId ?? null,
      p_client_bucket: bucket,
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
        e.event_type === eventType &&
        e.event_day === day
    )
    if (hit) hit.hit_count += 1
    else {
      db.events.push({
        owner_id: ownerId,
        template_id: templateId ?? null,
        event_type: eventType,
        event_day: day,
        hit_count: 1,
      })
    }
    writeSbx(db)
  }
}

export async function getCreatorAnalytics(
  ownerId: string,
  ownTemplates: CreatorTemplate[]
): Promise<CreatorAnalyticsSummary> {
  const days30 = pastDaysIso(30)
  const days7 = days30.slice(-7)
  const min30 = days30[0]
  const min7 = days7[0]

  type RawEvent = {
    template_id: string | null
    event_type: AnalyticsEventType
    event_day: string
    hit_count: number
  }
  let rows: RawEvent[] = []

  const supabase = getLiveSupabaseClient()
  if (supabase) {
    const { data } = await supabase
      .from('events')
      .select('template_id, event_type, event_day, hit_count')
      .eq('owner_id', ownerId)
    rows = (data as RawEvent[]) || []
  } else if (isSandboxEnabled()) {
    rows = readSbx().events.filter((e) => e.owner_id === ownerId)
  }

  let totalProfileViews = 0
  let views7d = 0
  let views30d = 0
  let totalCapcutClicks = 0
  let totalTiktokClicks = 0
  let totalSocialClicks = 0
  let clicks7d = 0

  const dailyMap = new Map<string, { views: number; clicks: number }>()
  for (const d of days30) dailyMap.set(d, { views: 0, clicks: 0 })

  const tplStats = new Map<string, { clicks: number; views: number }>()

  for (const r of rows) {
    const c = Number(r.hit_count) || 0
    const isView = r.event_type === 'profile_view' || r.event_type === 'template_view'
    const isClick =
      r.event_type === 'capcut_click' ||
      r.event_type === 'tiktok_click' ||
      r.event_type === 'social_click'

    if (r.event_type === 'profile_view') {
      totalProfileViews += c
      if (r.event_day >= min7) views7d += c
      if (r.event_day >= min30) views30d += c
    }
    if (r.event_type === 'capcut_click') totalCapcutClicks += c
    if (r.event_type === 'tiktok_click') totalTiktokClicks += c
    if (r.event_type === 'social_click') totalSocialClicks += c
    if (isClick && r.event_day >= min7) clicks7d += c

    if (r.event_day >= min30) {
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
  }

  const series30d: DailyMetricPoint[] = days30.map((date) => ({
    date,
    ...(dailyMap.get(date) || { views: 0, clicks: 0 }),
  }))
  const series7d = series30d.slice(-7)

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

  return {
    totalProfileViews,
    views7d,
    views30d,
    totalCapcutClicks,
    totalTiktokClicks,
    totalSocialClicks,
    clicks7d,
    series7d,
    series30d,
    topTemplates,
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
