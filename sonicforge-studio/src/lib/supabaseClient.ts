import { createClient, SupabaseClient } from '@supabase/supabase-js'

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

export const SITE_ORIGIN =
  ((import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || '').replace(/\/+$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://luven.my.id')

export const ADMIN_TIKTOK_HANDLE = '@luvenindonesia'
export const ADMIN_TIKTOK_URL = 'https://www.tiktok.com/@luvenindonesia'

export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    rawUrl.startsWith('https://') &&
    !rawUrl.includes('YOUR_PROJECT_REF') &&
    !rawKey.includes('YOUR_SUPABASE_')
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

const SANDBOX_KEY = 'luven.dev_sandbox_enabled'

function isLocalLoopback(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

export function isSandboxEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (isSupabaseConfigured && !isLocalLoopback()) return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sandbox') === '1') {
      localStorage.setItem(SANDBOX_KEY, '1')
      return true
    }
    if (params.get('sandbox') === '0') {
      localStorage.removeItem(SANDBOX_KEY)
      return false
    }
    return localStorage.getItem(SANDBOX_KEY) === '1'
  } catch {
    return false
  }
}

export function getLiveSupabaseClient(): SupabaseClient | null {
  if (isSandboxEnabled()) return null
  return isSupabaseConfigured ? supabase : null
}

export function setSandboxEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(SANDBOX_KEY, '1')
    else localStorage.removeItem(SANDBOX_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function isBackendReady(): boolean {
  return isSupabaseConfigured || isSandboxEnabled()
}

/**
 * Generates or retrieves a random ephemeral session token in sessionStorage
 * used strictly for server-side rate-limit bucketing (never stores IP or personal info).
 */
export function getAnonymousRateBucket(): string {
  try {
    const k = 'luven.rate_bucket'
    let v = sessionStorage.getItem(k)
    if (!v) {
      v = crypto.randomUUID().slice(0, 18)
      sessionStorage.setItem(k, v)
    }
    return v
  } catch {
    return 'anon'
  }
}
