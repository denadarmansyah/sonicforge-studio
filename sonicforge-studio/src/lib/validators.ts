// Mirrors server-side Postgres validation & content safety rules in supabase/schema.sql

export const CREATOR_CATEGORIES = [
  'Transisi',
  'Jedag-Jedug',
  'Lirik & Tipografi',
  'Sinematik',
  'Vlog & Estetik',
  'Gaming',
  'Edukasi',
  'Lainnya',
] as const

export const POPULAR_TEMPLATE_TAGS = [
  'transisi',
  'jj',
  'lirik',
  'slowmo',
  'sinematik',
  'beat-sync',
  '3d-zoom',
  'foto-dump',
  'pasangan',
  'gaming',
] as const

export const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'moderator', 'mod', 'support', 'help',
  'studio', 'template', 'templates', 'explore', 'discover', 'search', 'pricing',
  'login', 'signin', 'signup', 'register', 'logout', 'auth', 'onboarding',
  'dashboard', 'settings', 'account', 'profile', 'profiles', 'user', 'users',
  'privacy', 'terms', 'tos', 'dmca', 'contact', 'about', 'faq', 'legal',
  'api', 'assets', 'ffmpeg', 'public', 'static', 'sitemap', 'sitemap.xml',
  'robots', 'robots.txt', 'favicon', 'favicon.svg', 'luven', 'luventemplate',
  'official', 'verified', 'tiktok', 'capcut', 'instagram', 'youtube', 'google',
  'null', 'undefined', 'system', 'me', 'new', 'edit',
])

const IMPERSONATION_PATTERNS = [
  /^tiktok(?:official|id|shop)?$/,
  /^capcut(?:official|id|creator)?$/,
  /^luven(?:official|admin|staff|team)$/,
  /^instagram(?:official)?$/,
  /^youtube(?:official)?$/,
  /^bank(?:bca|bri|mandiri|bni)$/,
]

export function sanitizePlainText(input: string, maxLen: number): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen)
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '')
}

export function validateUsernameFormat(raw: string): { ok: boolean; normalized: string; error?: string } {
  const u = normalizeUsername(raw)
  if (!u) {
    return { ok: false, normalized: u, error: 'Username wajib diisi.' }
  }
  if (u.length < 3 || u.length > 24) {
    return { ok: false, normalized: u, error: 'Username harus terdiri dari 3 hingga 24 karakter.' }
  }
  if (!/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(u)) {
    return {
      ok: false,
      normalized: u,
      error: 'Gunakan huruf kecil a–z, angka 0–9, titik (.), atau garis bawah (_), tanpa simbol di awal/akhir.',
    }
  }
  if (u.includes('..')) {
    return { ok: false, normalized: u, error: 'Username tidak boleh memuat dua titik berurutan.' }
  }
  if (RESERVED_USERNAMES.has(u)) {
    return { ok: false, normalized: u, error: `Username “@${u}” dicadangkan oleh sistem.` }
  }
  if (IMPERSONATION_PATTERNS.some((re) => re.test(u))) {
    return {
      ok: false,
      normalized: u,
      error: 'Username ini menyerupai akun resmi merek terproteksi dan tidak diizinkan.',
    }
  }
  return { ok: true, normalized: u }
}

export type SocialPlatform = 'tiktok' | 'capcut' | 'instagram' | 'youtube' | 'whatsapp' | 'website' | 'link'

const PLATFORM_HOSTS: Record<Exclude<SocialPlatform, 'website' | 'link'>, RegExp> = {
  tiktok: /^(?:(?:www|m|vm|vt)\.)?tiktok\.com$/i,
  capcut: /^(?:[a-z0-9-]+\.)?(?:capcut\.com|capcutshare\.com)$/i,
  instagram: /^(?:www\.)?instagram\.com$/i,
  youtube: /^(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)$/i,
  whatsapp: /^(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)$/i,
}

const BLOCKED_LINK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'bit.ly', 'tinyurl.com'])

export function validateAllowedUrl(
  raw: string,
  platform: SocialPlatform,
  required = false
): { ok: boolean; clean: string | null; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    if (required) {
      return { ok: false, clean: null, error: 'Tautan wajib diisi.' }
    }
    return { ok: true, clean: null }
  }

  let candidate = trimmed
  if (platform === 'tiktok' && /^@[a-zA-Z0-9._]{2,32}$/.test(candidate)) {
    candidate = `https://www.tiktok.com/${candidate}`
  } else if (platform === 'instagram' && /^@[a-zA-Z0-9._]{2,32}$/.test(candidate)) {
    candidate = `https://www.instagram.com/${candidate.slice(1)}`
  } else if (platform === 'whatsapp' && /^\+?[0-9]{8,15}$/.test(candidate.replace(/[\s-]/g, ''))) {
    const digits = candidate.replace(/[^\d]/g, '')
    candidate = `https://wa.me/${digits}`
  } else if (!/^https?:\/\//i.test(candidate) && /^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(candidate)) {
    candidate = `https://${candidate}`
  }

  if (candidate.length > 500) {
    return { ok: false, clean: null, error: 'Tautan terlalu panjang (maksimal 500 karakter).' }
  }

  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, clean: null, error: 'Format tautan tidak valid. Gunakan alamat https:// yang lengkap.' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, clean: null, error: 'Hanya tautan aman dengan awalan https:// yang diizinkan.' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, clean: null, error: 'Tautan tidak boleh mengandung kredensial.' }
  }

  const host = parsed.hostname.toLowerCase()
  if (BLOCKED_LINK_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, clean: null, error: 'Domain tautan ini tidak diizinkan.' }
  }

  if (platform !== 'website' && platform !== 'link') {
    if (!PLATFORM_HOSTS[platform].test(host)) {
      const names: Record<Exclude<SocialPlatform, 'website' | 'link'>, string> = {
        tiktok: 'tiktok.com, vm.tiktok.com, atau vt.tiktok.com',
        capcut: 'capcut.com (tautan resmi template CapCut)',
        instagram: 'instagram.com',
        youtube: 'youtube.com atau youtu.be',
        whatsapp: 'wa.me atau whatsapp.com',
      }
      return {
        ok: false,
        clean: null,
        error: `Tautan harus berasal dari domain resmi ${names[platform]}.`,
      }
    }
    if (!parsed.pathname || parsed.pathname === '/') {
      return {
        ok: false,
        clean: null,
        error: 'Sertakan jalur profil atau tautan spesifik setelah nama domain.',
      }
    }
  } else {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
      return { ok: false, clean: null, error: 'Masukkan domain situs publik yang valid.' }
    }
  }

  return { ok: true, clean: parsed.toString() }
}

export function extractYouTubeEmbedUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null
  try {
    const u = new URL(rawUrl)
    const h = u.hostname.toLowerCase()
    let id = ''
    if (h === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || ''
    } else if (h.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || ''
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || ''
      else id = u.searchParams.get('v') || ''
    }
    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null
    return `https://www.youtube-nocookie.com/embed/${id}`
  } catch {
    return null
  }
}

export function extractTikTokEmbedUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null
  try {
    const u = new URL(rawUrl)
    if (!u.hostname.toLowerCase().includes('tiktok.com')) return null
    const m = u.pathname.match(/\/video\/(\d{6,25})/)
    if (!m) return null
    return `https://www.tiktok.com/embed/v2/${m[1]}`
  } catch {
    return null
  }
}

export const REPORT_REASONS = [
  'Spam atau tautan menyesatkan',
  'Penipuan atau phishing',
  'Impersonasi kreator atau merek lain',
  'Pelanggaran hak cipta / DMCA',
  'Konten dewasa atau melanggar ketentuan',
] as const
