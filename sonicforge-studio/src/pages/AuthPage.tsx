import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  captureReferralCode,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogleOAuth,
  signUpWithEmail,
  updateOwnPassword,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { isSandboxEnabled, isSupabaseConfigured } from '../lib/supabaseClient'
import { GoogleGlyph } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import { Logo } from '../ui/Logo'
import {
  Button,
  Card,
  Input,
  LinkButton,
  PasswordInput,
  PasswordStrengthMeter,
  Skeleton,
  useToast,
} from '../ui/primitives'
import { SupabaseSetupPanel } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const { loading: authLoading, user, hasClaimedUsername, backendReady, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { pushToast } = useToast()

  const params = new URLSearchParams(location.search)
  const isUpdatePassword = params.get('mode') === 'update-password'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState('')
  const [verifyNotice, setVerifyNotice] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(location.search)
    const ref = p.get('ref')
    if (ref) captureReferralCode(ref)
  }, [location.search])

  useDocumentMeta({
    title: isUpdatePassword
      ? 'Simpan Password Baru — Luven'
      : mode === 'register'
        ? 'Daftar Akun — Luven'
        : mode === 'forgot'
          ? 'Atur Ulang Password — Luven'
          : 'Masuk Akun — Luven',
    description:
      'Masuk dengan Google atau email untuk mengelola halaman profil dan template CapCut di Luven (luven.my.id).',
    path: location.pathname,
  })

  if (!authLoading && user && !verifyNotice && !isUpdatePassword) {
    return <Navigate to={hasClaimedUsername ? '/dashboard' : '/onboarding'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isUpdatePassword) {
        await updateOwnPassword(password)
        setPassword('')
        await refreshAuth()
        pushToast('Password baru berhasil disimpan.')
        navigate(hasClaimedUsername ? '/dashboard' : '/onboarding', { replace: true })
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        setResetSent(true)
        pushToast('Tautan pemulihan password telah dikirim.')
      } else if (mode === 'register') {
        const res = await signUpWithEmail(email, password)
        setPassword('')
        await refreshAuth()
        if (res.needsEmailVerification) {
          setVerifyNotice(true)
        } else {
          pushToast('Akun berhasil dibuat. Pilih username kamu.')
          navigate('/onboarding', { replace: true })
        }
      } else {
        await signInWithEmail(email, password)
        setPassword('')
        await refreshAuth()
        pushToast('Berhasil masuk.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kendala autentikasi.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleBusy(true)
    try {
      if (isSandboxEnabled()) {
        const targetEmail = email.trim() || 'kreator.google@luven.my.id'
        await signInWithGoogleOAuth(targetEmail)
        await refreshAuth()
        pushToast('Masuk dengan Google berhasil.')
        return
      }
      await signInWithGoogleOAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai login Google.')
    } finally {
      setGoogleBusy(false)
    }
  }

  const showAuthIllus = hasIllustration('auth-main')
  const showGoogleBtn = mode !== 'forgot' && !isUpdatePassword && (isSupabaseConfigured || isSandboxEnabled())

  return (
    <SiteLayout>
      <SupabaseSetupPanel compact />
      {!backendReady ? (
        <SupabaseSetupPanel />
      ) : (
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 lg:px-8 lg:py-20">
          <div
            className={
              showAuthIllus
                ? 'grid grid-cols-4 items-center gap-8 md:grid-cols-8 lg:grid-cols-12 lg:gap-6'
                : 'mx-auto max-w-[420px]'
            }
          >
            <div
              className={
                showAuthIllus
                  ? 'col-span-4 mx-auto w-full max-w-[420px] md:col-span-8 lg:col-span-6'
                  : 'w-full'
              }
            >
              {authLoading && !isUpdatePassword ? (
                <Card className="space-y-4 p-6">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-12 w-full" />
                </Card>
              ) : (
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <Logo variant="horizontal" size={104} className="text-fg" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                      {isUpdatePassword
                        ? 'Password Baru'
                        : mode === 'register'
                          ? 'Daftar Akun'
                          : mode === 'forgot'
                            ? 'Pemulihan'
                            : 'Masuk Akun'}
                    </span>
                  </div>

                  <h1 className="m-0 text-[clamp(1.375rem,2.4vw,1.625rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-fg">
                    {isUpdatePassword
                      ? 'Simpan password baru'
                      : mode === 'register'
                        ? 'Buat akun kreator Luven'
                        : mode === 'forgot'
                          ? 'Atur ulang password'
                          : 'Masuk ke akun Luven'}
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                    {isUpdatePassword
                      ? 'Masukkan password baru minimal 8 karakter untuk mengamankan akun kamu.'
                      : mode === 'register'
                        ? 'Daftar sekali untuk mengklaim alamat luven.my.id/@username kamu.'
                        : mode === 'forgot'
                          ? 'Masukkan email terdaftar untuk menerima tautan pengaturan ulang password.'
                          : 'Masuk untuk membuka dasbor link bio, template CapCut, dan analitik.'}
                  </p>

                  {verifyNotice ? (
                    <div className="mt-6 rounded-xl border border-edge bg-elevated p-4">
                      <h2 className="m-0 text-[16px] font-bold text-fg">Periksa kotak masuk email</h2>
                      <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                        Tautan aktivasi telah dikirim ke <strong className="text-fg">{email}</strong>.
                        Buka tautan tersebut untuk melanjutkan klaim username.
                      </p>
                      <div className="mt-4">
                        <LinkButton to="/login" variant="secondary" fullWidth>
                          Kembali ke halaman Masuk
                        </LinkButton>
                      </div>
                    </div>
                  ) : resetSent ? (
                    <div className="mt-6 rounded-xl border border-edge bg-elevated p-4">
                      <p className="m-0 text-[14px] leading-relaxed text-fg">
                        Jika alamat <strong className="font-mono">{email}</strong> terdaftar, tautan pemulihan password telah dikirimkan.
                      </p>
                      <div className="mt-4">
                        <LinkButton to="/login" variant="secondary" fullWidth>
                          Kembali ke halaman Masuk
                        </LinkButton>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {showGoogleBtn && (
                        <>
                          <Button
                            variant="secondary"
                            size="lg"
                            fullWidth
                            loading={googleBusy}
                            onClick={handleGoogle}
                          >
                            <GoogleGlyph size={16} />
                            <span>Masuk dengan Google</span>
                          </Button>
                          <div className="relative flex items-center py-1">
                            <div className="flex-1 border-t border-edge" />
                            <span className="px-3 font-mono text-[11px] uppercase text-fg-sec">
                              atau dengan email
                            </span>
                            <div className="flex-1 border-t border-edge" />
                          </div>
                        </>
                      )}

                      <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <input
                          type="text"
                          name="company_website_hp"
                          tabIndex={-1}
                          autoComplete="off"
                          className="hidden"
                          aria-hidden="true"
                        />

                        {!isUpdatePassword && (
                          <Input
                            type="email"
                            name="email"
                            label="Alamat Email"
                            placeholder="nama@email.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              setError('')
                            }}
                            leftAddon={<Mail size={16} />}
                            required
                          />
                        )}

                        {(mode !== 'forgot' || isUpdatePassword) && (
                          <div>
                            <PasswordInput
                              name="password"
                              label={isUpdatePassword ? 'Password Baru' : 'Password'}
                              placeholder={
                                mode === 'register' || isUpdatePassword
                                  ? 'Minimal 8 karakter'
                                  : 'Masukkan password'
                              }
                              autoComplete={
                                mode === 'register' || isUpdatePassword
                                  ? 'new-password'
                                  : 'current-password'
                              }
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value)
                                setError('')
                              }}
                              leftAddon={<Lock size={16} />}
                              required
                            />

                            {(mode === 'register' || isUpdatePassword) && (
                              <PasswordStrengthMeter password={password} minLength={8} />
                            )}

                            {mode === 'login' && !isUpdatePassword && (
                              <div className="mt-1 flex justify-end">
                                <Link
                                  to="/forgot-password"
                                  className="inline-flex min-h-11 items-center px-1 text-[13px] text-fg-sec underline underline-offset-4 [@media(hover:hover)]:hover:text-fg"
                                >
                                  Lupa password?
                                </Link>
                              </div>
                            )}
                          </div>
                        )}

                        {error && (
                          <p
                            role="alert"
                            className="rounded-xl border border-fg border-l-4 border-l-fg bg-bg px-4 py-2.5 text-[13px] font-medium leading-relaxed text-fg"
                          >
                            {error}
                          </p>
                        )}

                        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
                          {isUpdatePassword ? (
                            <>
                              <KeyRound size={16} />
                              <span>Simpan password</span>
                            </>
                          ) : mode === 'register' ? (
                            <>
                              <UserPlus size={16} />
                              <span>Daftar dengan email</span>
                            </>
                          ) : mode === 'forgot' ? (
                            <>
                              <KeyRound size={16} />
                              <span>Kirim link reset password</span>
                            </>
                          ) : (
                            <span>Masuk ke dasbor</span>
                          )}
                        </Button>
                      </form>
                    </div>
                  )}

                  {!isUpdatePassword && (
                    <div className="mt-6 border-t border-edge pt-4 text-center text-[13px] text-fg-sec">
                      {mode === 'register' ? (
                        <>
                          Sudah punya akun?{' '}
                          <Link
                            to="/login"
                            className="inline-flex min-h-11 items-center px-1 font-semibold text-fg underline underline-offset-4"
                          >
                            Masuk di sini
                          </Link>
                        </>
                      ) : (
                        <>
                          Belum punya akun?{' '}
                          <Link
                            to="/register"
                            className="inline-flex min-h-11 items-center px-1 font-semibold text-fg underline underline-offset-4"
                          >
                            Daftar gratis
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </div>

            {showAuthIllus && (
              <div className="hidden lg:col-span-6 lg:block">
                <Illustration
                  name="auth-main"
                  alt="Ilustrasi pintu studio terbuka dengan gelombang suara mengalir keluar"
                  sizes="540px"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </SiteLayout>
  )
}
