import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  checkIsAdmin,
  fetchSiteSettings,
  getCurrentSessionUser,
  getProfileByUserId,
  signOutSession,
} from '../lib/platformStore'
import { getLiveSupabaseClient, isBackendReady } from '../lib/supabaseClient'
import { AuthSessionUser, Profile, SiteSettings } from '../lib/types'

interface AuthContextValue {
  loading: boolean
  backendReady: boolean
  user: AuthSessionUser | null
  profile: Profile | null
  hasClaimedUsername: boolean
  isAdmin: boolean
  siteSettings: SiteSettings
  refreshAuth: () => Promise<void>
  signOut: () => Promise<void>
}

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  announcement_text: '',
  announcement_active: false,
  maintenance_mode: false,
}

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  backendReady: false,
  user: null,
  profile: null,
  hasClaimedUsername: false,
  isAdmin: false,
  siteSettings: DEFAULT_SITE_SETTINGS,
  refreshAuth: async () => {},
  signOut: async () => {},
})

function hasPendingOAuthCallbackInUrl(): boolean {
  if (typeof window === 'undefined') return false
  const search = window.location.search
  const hash = window.location.hash
  return /[?&](?:code|token_hash)=/.test(search) || /access_token=|type=recovery/.test(hash)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthSessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const reqCounter = useRef(0)
  const profileRef = useRef<Profile | null>(null)

  const refreshAuth = useCallback(async () => {
    const reqId = ++reqCounter.current
    setLoading(true)
    try {
      const [sessionUser, settings] = await Promise.all([
        getCurrentSessionUser(),
        fetchSiteSettings().catch(() => DEFAULT_SITE_SETTINGS),
      ])

      if (reqId !== reqCounter.current) return
      setSiteSettings(settings)

      if (sessionUser) {
        let prof: Profile | null = profileRef.current?.id === sessionUser.id ? profileRef.current : null
        let adm = false
        try {
          const [loadedProf, loadedAdm] = await Promise.all([
            getProfileByUserId(sessionUser.id),
            checkIsAdmin(sessionUser.id),
          ])
          prof = loadedProf
          adm = loadedAdm
        } catch {
          // Jangan menimpa profil yang sudah dimuat bila terjadi gangguan jaringan sesaat
          adm = await checkIsAdmin(sessionUser.id).catch(() => false)
        }

        if (reqId !== reqCounter.current) return
        profileRef.current = prof
        // Set user, profile, dan isAdmin secara atomik agar halaman tidak pernah melihat
        // user !== null dengan profile === null sebelum pembacaan database selesai.
        setUser(sessionUser)
        setProfile(prof)
        setIsAdmin(adm)
        setLoading(false)
      } else {
        // Jika URL sedang membawa callback OAuth (?code= / #access_token=) yang masih ditukar
        // oleh Supabase, tahan loading sesaat sampai onAuthStateChange memicu SIGNED_IN.
        if (hasPendingOAuthCallbackInUrl() && getLiveSupabaseClient()) {
          window.setTimeout(() => {
            if (reqId === reqCounter.current) {
              setLoading(false)
            }
          }, 1200)
          return
        }
        profileRef.current = null
        setUser(null)
        setProfile(null)
        setIsAdmin(false)
        setLoading(false)
      }
    } catch {
      if (reqId !== reqCounter.current) return
      profileRef.current = null
      setUser(null)
      setProfile(null)
      setIsAdmin(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
    const sb = getLiveSupabaseClient()
    if (sb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          profileRef.current = null
          setUser(null)
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
          return
        }
        void refreshAuth()
      })
      return () => data.subscription.unsubscribe()
    }
  }, [refreshAuth])

  const signOut = useCallback(async () => {
    await signOutSession()
    profileRef.current = null
    setUser(null)
    setProfile(null)
    setIsAdmin(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        loading,
        backendReady: isBackendReady(),
        user,
        profile,
        hasClaimedUsername: Boolean(profile?.username),
        isAdmin,
        siteSettings,
        refreshAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
