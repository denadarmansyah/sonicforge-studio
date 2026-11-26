import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import {
  checkIsAdmin,
  getCurrentSessionUser,
  getProfileByUserId,
  signOutSession,
} from '../lib/platformStore'
import { getLiveSupabaseClient, isBackendReady } from '../lib/supabaseClient'
import { AuthSessionUser, Profile } from '../lib/types'

interface AuthContextValue {
  loading: boolean
  backendReady: boolean
  user: AuthSessionUser | null
  profile: Profile | null
  isAdmin: boolean
  refreshAuth: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  backendReady: false,
  user: null,
  profile: null,
  isAdmin: false,
  refreshAuth: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthSessionUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const refreshAuth = useCallback(async () => {
    try {
      const sessionUser = await getCurrentSessionUser()
      setUser(sessionUser)
      if (sessionUser) {
        const [prof, adm] = await Promise.all([
          getProfileByUserId(sessionUser.id),
          checkIsAdmin(sessionUser.id),
        ])
        setProfile(prof)
        setIsAdmin(adm)
      } else {
        setProfile(null)
        setIsAdmin(false)
      }
    } catch {
      setUser(null)
      setProfile(null)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
    const sb = getLiveSupabaseClient()
    if (sb) {
      const { data } = sb.auth.onAuthStateChange(() => {
        void refreshAuth()
      })
      return () => data.subscription.unsubscribe()
    }
  }, [refreshAuth])

  const signOut = useCallback(async () => {
    await signOutSession()
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
        isAdmin,
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
