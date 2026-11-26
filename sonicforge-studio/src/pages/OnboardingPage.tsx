import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AtSign, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { checkUsernameAvailability, saveOwnProfile } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { CREATOR_CATEGORIES, normalizeUsername, validateAllowedUrl } from '../lib/validators'
import { TikTokGlyph } from '../ui/BrandIcons'
import { Button, Card, Input, Select, Textarea, useToast } from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

export function OnboardingPage() {
  const { loading, user, profile, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [username, setUsername] = useState(profile?.username || '')
  const [uStatus, setUStatus] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle')
  const [uMessage, setUMessage] = useState('')

  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [category, setCategory] = useState<string>(profile?.category || CREATOR_CATEGORIES[0])
  const [bio, setBio] = useState(profile?.bio || '')
  const [tiktokUrl, setTiktokUrl] = useState(profile?.tiktok_url || '')

  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')

  useDocumentMeta({
    title: 'Siapkan Profil Kreator — Luven',
    description: 'Pilih username unik luven.my.id/@username dan hubungkan profil TikTok Anda.',
    path: '/onboarding',
  })

  useEffect(() => {
    if (!username.trim()) {
      setUStatus('idle')
      setUMessage('')
      return
    }
    setUStatus('checking')
    const timer = window.setTimeout(async () => {
      const res = await checkUsernameAvailability(username, user?.id)
      if (res.available) {
        setUStatus('ok')
        setUMessage(`luven.my.id/@${res.normalized} tersedia!`)
      } else {
        setUStatus('err')
        setUMessage(res.message || 'Username tidak tersedia.')
      }
    }, 260)
    return () => clearTimeout(timer)
  }, [username, user?.id])

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }
  if (!loading && profile?.onboarding_completed) {
    return <Navigate to="/dashboard" replace />
  }

  const nextFromStep1 = () => {
    if (uStatus !== 'ok') {
      setFormErr(uMessage || 'Pilih username yang valid dan tersedia terlebih dahulu.')
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

  const finishOnboarding = async (e: React.FormEvent) => {
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
      await saveOwnProfile(user.id, {
        username,
        display_name: displayName,
        bio,
        category,
        tiktok_url: tiktokUrl,
        onboarding_completed: true,
      })
      await refreshAuth()
      pushToast('Profil kreator siap digunakan!')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SiteLayout hideFooter>
      <div className="mx-auto max-w-[540px] px-4 py-10 sm:py-14">
        {/* Step Progress Indicator */}
        <div className="mb-6 flex items-center justify-between gap-2">
          {[
            { n: 1, label: 'Username' },
            { n: 2, label: 'Identitas' },
            { n: 3, label: 'Akun TikTok' },
          ].map((s) => (
            <div key={s.n} className="flex flex-1 flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  step >= s.n ? 'bg-accent' : 'bg-edge'
                }`}
              />
              <span
                className={`font-mono text-[11px] ${
                  step === s.n ? 'font-semibold text-accent' : 'text-fg-sec'
                }`}
              >
                0{s.n}. {s.label}
              </span>
            </div>
          ))}
        </div>

        <Card className="p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  Klaim tautan profil kamu
                </h1>
                <p className="mt-1.5 text-[13.5px] text-fg-sec">
                  Pilih alamat singkat yang mudah diketik pengikut TikTok Anda di bio.
                </p>
              </div>

              <div>
                <Input
                  label="Username Publik"
                  placeholder="namakreator"
                  value={username}
                  maxLength={24}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))
                    setFormErr('')
                  }}
                  leftAddon={<AtSign size={16} />}
                  hint="3–24 karakter: huruf kecil a–z, angka, titik (.), atau garis bawah (_)."
                />

                {uStatus !== 'idle' && (
                  <div className="mt-2.5 flex items-center gap-2 font-mono text-[12.5px]">
                    {uStatus === 'checking' && (
                      <>
                        <Loader2 size={14} className="animate-spin text-fg-sec" />
                        <span className="text-fg-sec">Memeriksa ketersediaan…</span>
                      </>
                    )}
                    {uStatus === 'ok' && (
                      <>
                        <CheckCircle2 size={14} className="text-ok" />
                        <span className="text-ok">{uMessage}</span>
                      </>
                    )}
                    {uStatus === 'err' && <span className="text-err">{uMessage}</span>}
                  </div>
                )}
              </div>

              {formErr && <p className="text-[13px] text-err">{formErr}</p>}

              <Button
                variant="primary"
                fullWidth
                disabled={uStatus !== 'ok'}
                onClick={nextFromStep1}
              >
                <span>Lanjut ke Identitas Profil</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  Perkenalkan diri Anda
                </h1>
                <p className="mt-1.5 text-[13.5px] text-fg-sec">
                  Informasi ini tampil di bagian atas halaman <span className="font-mono text-fg">luven.my.id/@{normalizeUsername(username)}</span>.
                </p>
              </div>

              <Input
                label="Nama Tampilan"
                placeholder="Nama panggung atau nama studio"
                value={displayName}
                maxLength={50}
                rightMeta={`${displayName.length}/50`}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  setFormErr('')
                }}
              />

              <Select
                label="Kategori Utama Template"
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

              {formErr && <p className="text-[13px] text-err">{formErr}</p>}

              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={16} />
                  <span>Kembali</span>
                </Button>
                <Button variant="primary" fullWidth onClick={nextFromStep2}>
                  <span>Lanjut</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={finishOnboarding} className="space-y-5">
              <div>
                <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  Tempel akun TikTok Anda
                </h1>
                <p className="mt-1.5 text-[13.5px] text-fg-sec">
                  Pengunjung dapat langsung membuka profil TikTok Anda lewat tombol utama di halaman publik.
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
                hint="Anda juga bisa menambahkan Instagram, YouTube, dan template CapCut di Dasbor setelah ini."
              />

              {formErr && <p className="text-[13px] text-err">{formErr}</p>}

              <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  <ArrowLeft size={16} />
                  <span>Kembali</span>
                </Button>
                <Button type="submit" variant="primary" fullWidth loading={saving}>
                  <span>Buka Dasbor Kreator</span>
                  <ArrowRight size={16} />
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </SiteLayout>
  )
}
