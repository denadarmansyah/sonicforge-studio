import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, AtSign, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  checkUsernameAvailability,
  claimUsername,
  clearPendingReferral,
  getPendingReferral,
} from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { UsernameCheckStatus } from '../lib/types'
import { CREATOR_CATEGORIES, normalizeUsername, validateAllowedUrl } from '../lib/validators'
import { TikTokGlyph } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import { Badge, Button, Card, Input, Select, Skeleton, Textarea, useToast } from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

const STATUS_BADGE_LABELS: Record<UsernameCheckStatus, string> = {
  available: 'Tersedia',
  taken: 'Sudah dipakai',
  invalid: 'Format salah',
  reserved: 'Dicadangkan',
}

export function OnboardingPage() {
  const { loading, user, hasClaimedUsername, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [username, setUsername] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkState, setCheckState] = useState<UsernameCheckStatus | null>(null)
  const [uMessage, setUMessage] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<string>(CREATOR_CATEGORIES[0])
  const [bio, setBio] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')

  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  useDocumentMeta({
    title: 'Klaim Username — Luven',
    description: 'Klaim alamat permanen luven.my.id/@username untuk akun kreator kamu.',
    path: '/onboarding',
  })

  useEffect(() => {
    const trimmed = username.trim()
    if (!trimmed) {
      setChecking(false)
      setCheckState(null)
      setUMessage('')
      return
    }
    setChecking(true)
    const timer = window.setTimeout(async () => {
      const res = await checkUsernameAvailability(trimmed, user?.id)
      setChecking(false)
      setCheckState(res.status)
      setUMessage(res.message)
    }, 260)
    return () => window.clearTimeout(timer)
  }, [username, user?.id])

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }
  // Keputusan diambil murni dari database: jika sudah punya username, langsung ke /dashboard
  if (!loading && hasClaimedUsername) {
    return <Navigate to="/dashboard" replace />
  }

  const nextFromStep1 = () => {
    if (checking || checkState !== 'available') {
      setFormErr(uMessage || 'Pilih username yang tersedia terlebih dahulu.')
      return
    }
    setFormErr('')
    if (!displayName.trim()) {
      setDisplayName(normalizeUsername(username))
    }
    setStep(2)
  }

  const nextFromStep2 = () => {
    if (!displayName.trim()) {
      setFormErr('Nama tampilan wajib diisi.')
      return
    }
    setFormErr('')
    setStep(3)
  }

  const finishOnboarding = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const tt = validateAllowedUrl(tiktokUrl, 'tiktok', false)
    if (!tt.ok) {
      setFormErr(tt.error || 'Tautan TikTok tidak valid.')
      return
    }

    setSaving(true)
    setFormErr('')
    try {
      const refUsername = getPendingReferral()
      await claimUsername({
        username,
        display_name: displayName,
        bio,
        category,
        tiktok_url: tiktokUrl,
        referred_by: refUsername,
      })
      clearPendingReferral()
      await refreshAuth()
      pushToast('Username berhasil diklaim.')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengklaim username.'
      setFormErr(msg)
      if (/sudah dipakai|dicadangkan|format/i.test(msg)) {
        setStep(1)
      }
    } finally {
      setSaving(false)
    }
  }

  const showAuthIllus = hasIllustration('auth-main')

  return (
    <SiteLayout hideFooter>
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
            {loading ? (
              <Card className="space-y-4 p-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-12 w-full" />
              </Card>
            ) : (
              <>
                {/* Step Progress Indicator */}
                <div className="mb-6 grid grid-cols-3 gap-2">
                  {[
                    { n: 1, label: 'Username' },
                    { n: 2, label: 'Profil' },
                    { n: 3, label: 'TikTok' },
                  ].map((s) => (
                    <div key={s.n} className="flex flex-col gap-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          step >= s.n ? 'bg-accent' : 'bg-edge'
                        }`}
                      />
                      <span
                        className={`font-mono text-[11px] ${
                          step === s.n ? 'font-semibold text-fg' : 'text-fg-sec'
                        }`}
                      >
                        0{s.n}. {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                <Card className="p-6">
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                          Klaim username permanen
                        </h1>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-sec">
                          Satu akun hanya dapat mengklaim satu username untuk alamat publik{' '}
                          <span className="font-mono text-fg">luven.my.id/@username</span>.
                        </p>
                      </div>

                      <div>
                        <Input
                          label="Username Publik"
                          placeholder="namakreator"
                          value={username}
                          maxLength={24}
                          autoComplete="off"
                          onChange={(e) => {
                            setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))
                            setFormErr('')
                          }}
                          leftAddon={<AtSign size={16} />}
                          hint="3–24 karakter: huruf kecil a–z, angka 0–9, titik (.), atau garis bawah (_)."
                        />

                        {(checking || checkState) && (
                          <div
                            aria-live="polite"
                            className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-elevated px-3 py-2.5 text-[12.5px]"
                          >
                            {checking ? (
                              <>
                                <Loader2 size={14} className="shrink-0 animate-spin text-fg-sec" />
                                <span className="font-mono text-fg-sec">Memeriksa ketersediaan...</span>
                              </>
                            ) : checkState ? (
                              <>
                                {checkState === 'available' ? (
                                  <CheckCircle2 size={15} className="shrink-0 text-fg" />
                                ) : (
                                  <AlertCircle size={15} className="shrink-0 text-fg" />
                                )}
                                <Badge variant={checkState === 'available' ? 'ok' : 'warn'}>
                                  {STATUS_BADGE_LABELS[checkState]}
                                </Badge>
                                <span className="min-w-0 flex-1 font-mono text-[12px] text-fg">
                                  {uMessage}
                                </span>
                              </>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2.5 rounded-xl border border-edge bg-bg p-3 text-[12.5px] text-fg-sec">
                        <Lock size={14} className="mt-0.5 shrink-0 text-fg" />
                        <span>
                          Username diklaim satu kali dan tidak bisa diganti sendiri setelah disimpan.
                        </span>
                      </div>

                      {formErr && (
                        <p
                          role="alert"
                          className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                        >
                          {formErr}
                        </p>
                      )}

                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={checking || checkState !== 'available'}
                        onClick={nextFromStep1}
                      >
                        <span>Lanjut isi profil</span>
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                          Lengkapi identitas profil
                        </h1>
                        <p className="mt-1.5 text-[13.5px] text-fg-sec">
                          Ditampilkan pada header halaman{' '}
                          <span className="font-mono text-fg">luven.my.id/@{normalizeUsername(username)}</span>.
                        </p>
                      </div>

                      <Input
                        label="Nama Tampilan"
                        placeholder="Nama kreator atau studio"
                        value={displayName}
                        maxLength={50}
                        rightMeta={`${displayName.length}/50`}
                        onChange={(e) => {
                          setDisplayName(e.target.value)
                          setFormErr('')
                        }}
                      />

                      <Select
                        label="Kategori Utama"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CREATOR_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>

                      <Textarea
                        label="Bio Singkat (opsional)"
                        placeholder="Kreator template transisi beat-sync & preset warna harian."
                        value={bio}
                        maxLength={160}
                        rightMeta={`${bio.length}/160`}
                        onChange={(e) => setBio(e.target.value)}
                      />

                      {formErr && (
                        <p
                          role="alert"
                          className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                        >
                          {formErr}
                        </p>
                      )}

                      <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                          <ArrowLeft size={16} />
                          <span>Kembali</span>
                        </Button>
                        <Button variant="primary" size="lg" fullWidth onClick={nextFromStep2}>
                          <span>Lanjut</span>
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <form onSubmit={finishOnboarding} className="space-y-4">
                      <div>
                        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                          Hubungkan akun TikTok
                        </h1>
                        <p className="mt-1.5 text-[13.5px] text-fg-sec">
                          Opsional. Kamu dapat menambah tautan lain dan template CapCut di Dasbor kapan saja.
                        </p>
                      </div>

                      <Input
                        label="Tautan atau Username TikTok (opsional)"
                        placeholder="https://www.tiktok.com/@username atau @username"
                        value={tiktokUrl}
                        onChange={(e) => {
                          setTiktokUrl(e.target.value)
                          setFormErr('')
                        }}
                        leftAddon={<TikTokGlyph size={15} />}
                      />

                      {formErr && (
                        <p
                          role="alert"
                          className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                        >
                          {formErr}
                        </p>
                      )}

                      <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button variant="secondary" size="lg" onClick={() => setStep(2)}>
                          <ArrowLeft size={16} />
                          <span>Kembali</span>
                        </Button>
                        <Button type="submit" variant="primary" size="lg" fullWidth loading={saving}>
                          <span>Klaim username</span>
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              </>
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
    </SiteLayout>
  )
}
