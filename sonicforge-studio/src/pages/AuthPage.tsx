import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogleOAuth,
  signUpWithEmail,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { Logo } from '../ui/Logo'
import { Button, Card, Input, LinkButton, useToast } from '../ui/primitives'
import { SupabaseSetupPanel } from '../ui/ShareAndReportModals'
import { SiteLayout } from '../ui/SiteLayout'

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const { user, profile, backendReady, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { pushToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verifyNotice, setVerifyNotice] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useDocumentMeta({
    title:
      mode === 'register'
        ? 'Daftar Kreator — Luven'
        : mode === 'forgot'
        ? 'Atur Ulang Kata Sandi — Luven'
        : 'Masuk Akun — Luven',
    description:
      'Masuk atau buat halaman profil kreator TikTok & template CapCut Anda di Luven (luven.my.id).',
    path: location.pathname,
  })

  if (user && !verifyNotice) {
    return <Navigate to={profile?.onboarding_completed ? '/dashboard' : '/onboarding'} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email)
        setResetSent(true)
        pushToast('Instruksi pengaturan ulang kata sandi telah dikirim.')
      } else if (mode === 'register') {
        const res = await signUpWithEmail(email, password)
        await refreshAuth()
        if (res.needsEmailVerification) {
          setVerifyNotice(true)
        } else {
          pushToast('Akun berhasil dibuat. Mari lengkapi profil Anda.')
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

  return (
    <SiteLayout>
      <SupabaseSetupPanel compact />
      {!backendReady ? (
        <SupabaseSetupPanel />
      ) : (
        <div className="mx-auto flex max-w-[440px] flex-col justify-center px-4 py-12 sm:py-16">
          <Card className="p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <Logo variant="horizontal" size={104} className="text-fg" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                {mode === 'register'
                  ? 'Pendaftaran Kreator'
                  : mode === 'forgot'
                  ? 'Pemulihan Akses'
                  : 'Akses Kreator'}
              </span>
            </div>
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.03em] text-fg">
              {mode === 'register'
                ? 'Buat halaman Luven kamu'
                : mode === 'forgot'
                ? 'Lupa kata sandi?'
                : 'Masuk ke dasbor Luven'}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-fg-sec">
              {mode === 'register'
                ? 'Siapkan link-in-bio khusus untuk mempromosikan akun TikTok dan template CapCut Anda.'
                : mode === 'forgot'
                ? 'Masukkan email terdaftar Anda untuk menerima tautan pemulihan kata sandi.'
                : 'Kelola profil publik, urutan template CapCut, dan analitik klik Anda.'}
            </p>

            {verifyNotice ? (
              <div className="mt-6 rounded-xl border border-accent/40 bg-elevated p-4">
                <h2 className="m-0 text-[15px] font-bold text-fg">Periksa kotak masuk email Anda</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-sec">
                  Kami telah mengirimkan tautan verifikasi ke <strong className="text-fg">{email}</strong>.
                  Klik tautan tersebut untuk mengaktifkan akun dan melanjutkan pemilihan username.
                </p>
                <div className="mt-4">
                  <LinkButton to="/login" variant="secondary" fullWidth>
                    Kembali ke halaman Masuk
                  </LinkButton>
                </div>
              </div>
            ) : resetSent ? (
              <div className="mt-6 rounded-xl border border-fg/40 bg-elevated p-4">
                <p className="m-0 text-[13.5px] leading-relaxed text-fg">
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
                {/* Honeypot anti-bot field */}
                <input
                  type="text"
                  name="company_website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

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

                {mode !== 'forgot' && (
                  <div>
                    <Input
                      type="password"
                      label="Kata Sandi"
                      placeholder={mode === 'register' ? 'Minimal 8 karakter' : 'Kata sandi Anda'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftAddon={<Lock size={16} />}
                      required
                    />
                    {mode === 'login' && (
                      <div className="mt-1 text-right">
                        <Link
                          to="/forgot-password"
                          className="inline-flex min-h-11 items-center px-1 text-[12.5px] text-fg-sec underline underline-offset-2 [@media(hover:hover)]:hover:text-fg"
                        >
                          Lupa kata sandi?
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-xl border-2 border-fg bg-bg px-3.5 py-2.5 text-[13px] font-medium text-fg">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" fullWidth loading={busy}>
                  {mode === 'register' ? (
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

                {mode !== 'forgot' && isSupabaseConfigured && (
                  <>
                    <div className="relative flex items-center py-1">
                      <div className="flex-1 border-t border-edge" />
                      <span className="px-3 font-mono text-[11px] uppercase text-fg-sec">atau</span>
                      <div className="flex-1 border-t border-edge" />
                    </div>
                    <Button variant="secondary" fullWidth onClick={handleGoogle}>
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M21.35 11.1H12v2.92h5.35c-.24 1.38-1.02 2.55-2.18 3.33v2.77h3.52c2.06-1.9 3.25-4.7 3.25-8.02 0-.67-.06-1.33-.19-2Z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 22c2.97 0 5.46-.98 7.28-2.66l-3.52-2.77c-.98.66-2.24 1.06-3.76 1.06-2.89 0-5.34-1.95-6.21-4.57H2.15v2.87A9.99 9.99 0 0 0 12 22Z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.79 13.06a6.03 6.03 0 0 1 0-3.84V6.35H2.15a10 10 0 0 0 0 9.58l3.64-2.87Z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.65c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.39 14.97 1.28 12 1.28A9.99 9.99 0 0 0 2.15 6.35l3.64 2.87c.87-2.62 3.32-3.57 6.21-3.57Z"
                        />
                      </svg>
                      <span>Masuk dengan Google</span>
                    </Button>
                  </>
                )}
              </form>
            )}

            <div className="mt-6 border-t border-edge pt-4 text-center text-[13.5px] text-fg-sec">
              {mode === 'register' ? (
                <>
                  Sudah punya akun?{' '}
                  <Link to="/login" className="font-semibold text-accent no-underline [@media(hover:hover)]:hover:underline">
                    Masuk di sini
                  </Link>
                </>
              ) : (
                <>
                  Belum punya halaman kreator?{' '}
                  <Link to="/register" className="font-semibold text-accent no-underline [@media(hover:hover)]:hover:underline">
                    Daftar gratis
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </SiteLayout>
  )
}
