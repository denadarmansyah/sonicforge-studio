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
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { getLiveSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient'
import { GoogleGlyph } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import { Logo } from '../ui/Logo'
import { Button, Card, Input, LinkButton, useToast } from '../ui/primitives'
import { SupabaseSetupPanel } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const { user, profile, backendReady, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { pushToast } = useToast()

  const params = new URLSearchParams(location.search)
  const isUpdatePassword = params.get('mode') === 'update-password'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
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
      ? 'Simpan Kata Sandi Baru — Luven'
      : mode === 'register'
        ? 'Daftar Kreator — Luven'
        : mode === 'forgot'
          ? 'Atur Ulang Kata Sandi — Luven'
          : 'Masuk Akun — Luven',
    description:
      'Masuk atau buat halaman link-in-bio kreator TikTok & template CapCut kamu di Luven (luven.my.id).',
    path: location.pathname,
  })

  if (user && !verifyNotice && !isUpdatePassword) {
    return <Navigate to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isUpdatePassword) {
        if (password.length < 8) {
          throw new Error('Kata sandi baru minimal 8 karakter.')
        }
        const sb = getLiveSupabaseClient()
        if (!sb) throw new Error('Koneksi Supabase belum aktif.')
        const { error: upErr } = await sb.auth.updateUser({ password })
        if (upErr) throw new Error(upErr.message)
        pushToast('Kata sandi berhasil diperbarui.')
        navigate('/dashboard', { replace: true })
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        setResetSent(true)
        pushToast('Instruksi pengaturan ulang kata sandi telah dikirim.')
      } else if (mode === 'register') {
        const res = await signUpWithEmail(email, password)
        await refreshAuth()
        if (res.needsEmailVerification) {
          setVerifyNotice(true)
        } else {
          pushToast('Akun berhasil dibuat. Mari lengkapi profil kamu.')
          navigate('/onboarding', { replace: true })
        }
      } else {
        await signInWithEmail(email, password)
        await refreshAuth()
        pushToast('Berhasil masuk.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.')
    } finally {
      setBusy(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogleOAuth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai login Google.')
    }
  }

  const showAuthIllus = hasIllustration('auth-main')

  return (
    <SiteLayout>
      <SupabaseSetupPanel compact />
      {!backendReady ? (
        <SupabaseSetupPanel />
      ) : (
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-24">
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
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Logo variant="horizontal" size={104} className="text-fg" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                    {isUpdatePassword
                      ? 'Sandi Baru'
                      : mode === 'register'
                        ? 'Pendaftaran'
                        : mode === 'forgot'
                          ? 'Pemulihan'
                          : 'Akses Kreator'}
                  </span>
                </div>
                <h1 className="m-0 text-[24px] font-extrabold leading-[1.1] tracking-[-0.03em] text-fg">
                  {isUpdatePassword
                    ? 'Buat kata sandi baru'
                    : mode === 'register'
                      ? 'Buat halaman Luven kamu'
                      : mode === 'forgot'
                        ? 'Lupa kata sandi?'
                        : 'Masuk ke dasbor Luven'}
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                  {isUpdatePassword
                    ? 'Masukkan kata sandi baru minimal 8 karakter untuk akun kamu.'
                    : mode === 'register'
                      ? 'Siapkan halaman link-in-bio untuk akun TikTok dan template CapCut kamu.'
                      : mode === 'forgot'
                        ? 'Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi.'
                        : 'Kelola link bio, Studio Tampilan, template CapCut, dan analitik klik.'}
                </p>

                {verifyNotice ? (
                  <div className="mt-6 rounded-xl border border-edge bg-elevated p-4">
                    <h2 className="m-0 text-[16px] font-bold text-fg">Periksa kotak masuk email kamu</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                      Kami telah mengirimkan tautan verifikasi ke <strong className="text-fg">{email}</strong>.
                      Klik tautan tersebut untuk mengaktifkan akun dan memilih username.
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
                      Jika alamat <strong className="font-mono">{email}</strong> terdaftar, tautan atur ulang kata sandi telah dikirimkan.
                    </p>
                    <div className="mt-4">
                      <LinkButton to="/login" variant="secondary" fullWidth>
                        Kembali ke Masuk
                      </LinkButton>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
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
                        label="Alamat Email"
                        placeholder="nama@email.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftAddon={<Mail size={16} />}
                        required
                      />
                    )}

                    {(mode !== 'forgot' || isUpdatePassword) && (
                      <div>
                        <Input
                          type="password"
                          label={isUpdatePassword ? 'Kata Sandi Baru' : 'Kata Sandi'}
                          placeholder={
                            mode === 'register' || isUpdatePassword
                              ? 'Minimal 8 karakter'
                              : 'Kata sandi kamu'
                          }
                          autoComplete={
                            mode === 'register' || isUpdatePassword
                              ? 'new-password'
                              : 'current-password'
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          leftAddon={<Lock size={16} />}
                          required
                        />
                        {mode === 'login' && !isUpdatePassword && (
                          <div className="mt-1 text-right">
                            <Link
                              to="/forgot-password"
                              className="inline-flex min-h-11 items-center px-1 text-[13px] text-fg-sec underline underline-offset-2 [@media(hover:hover)]:hover:text-fg"
                            >
                              Lupa kata sandi?
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {error && (
                      <p
                        role="alert"
                        className="rounded-xl border border-fg border-l-4 border-l-fg bg-bg px-4 py-2.5 text-[13px] font-medium text-fg"
                      >
                        {error}
                      </p>
                    )}

                    <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
                      {isUpdatePassword ? (
                        <>
                          <KeyRound size={16} />
                          <span>Simpan Kata Sandi Baru</span>
                        </>
                      ) : mode === 'register' ? (
                        <>
                          <UserPlus size={16} />
                          <span>Daftar & Pilih Username</span>
                        </>
                      ) : mode === 'forgot' ? (
                        <>
                          <KeyRound size={16} />
                          <span>Kirim Tautan Pemulihan</span>
                        </>
                      ) : (
                        <span>Masuk</span>
                      )}
                    </Button>

                    {mode !== 'forgot' && !isUpdatePassword && isSupabaseConfigured && (
                      <>
                        <div className="relative flex items-center py-1">
                          <div className="flex-1 border-t border-edge" />
                          <span className="px-3 font-mono text-[11px] uppercase text-fg-sec">atau</span>
                          <div className="flex-1 border-t border-edge" />
                        </div>
                        <Button variant="secondary" size="lg" fullWidth onClick={handleGoogle}>
                          <GoogleGlyph size={16} />
                          <span>Masuk dengan Google</span>
                        </Button>
                      </>
                    )}
                  </form>
                )}

                <div className="mt-6 border-t border-edge pt-4 text-center text-[13px] text-fg-sec">
                  {mode === 'register' ? (
                    <>
                      Sudah punya akun?{' '}
                      <Link
                        to="/login"
                        className="font-semibold text-fg underline underline-offset-4"
                      >
                        Masuk di sini
                      </Link>
                    </>
                  ) : (
                    <>
                      Belum punya halaman kreator?{' '}
                      <Link
                        to="/register"
                        className="font-semibold text-fg underline underline-offset-4"
                      >
                        Daftar gratis
                      </Link>
                    </>
                  )}
                </div>
              </Card>
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
