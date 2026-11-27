import { FormEvent, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { saveOwnProfile, updateOwnPassword, uploadCreatorImage } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { CREATOR_CATEGORIES } from '../lib/validators'
import { GoogleGlyph, TikTokGlyph } from '../ui/BrandIcons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  LinkButton,
  PasswordInput,
  PasswordStrengthMeter,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

export function AccountSettingsPage() {
  const { loading, user, profile, hasClaimedUsername, refreshAuth } = useAuth()
  const { pushToast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<string>(CREATOR_CATEGORIES[0])
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErr, setProfileErr] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErr, setPasswordErr] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const avatarInputRef = useRef<HTMLInputElement>(null)

  useDocumentMeta({
    title: 'Pengaturan Akun — Luven',
    description: 'Kelola profil, identitas login, dan keamanan password akun Luven kamu.',
    path: '/dashboard/settings',
  })

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name)
    setCategory(profile.category)
    setBio(profile.bio)
    setAvatarUrl(profile.avatar_url)
  }, [profile])

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }
  if (!loading && user && !hasClaimedUsername) {
    return <Navigate to="/onboarding" replace />
  }

  const handleAvatarUpload = async (file: File) => {
    if (!user) return
    setUploadingAvatar(true)
    setProfileErr('')
    try {
      const url = await uploadCreatorImage(user.id, file, 'avatar')
      setAvatarUrl(url)
      pushToast('Foto profil berhasil diunggah.')
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setProfileErr('')
    if (!displayName.trim()) {
      setProfileErr('Nama tampilan wajib diisi.')
      return
    }
    setSavingProfile(true)
    try {
      await saveOwnProfile(user.id, {
        display_name: displayName,
        bio,
        category,
        tiktok_url: profile.tiktok_url || '',
        instagram_url: profile.instagram_url || '',
        youtube_url: profile.youtube_url || '',
        website_url: profile.website_url || '',
        avatar_url: avatarUrl,
      })
      await refreshAuth()
      pushToast('Profil berhasil disimpan.')
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordErr('')
    setPasswordSuccess('')
    if (newPassword.length < 8) {
      setPasswordErr('Password baru minimal harus 8 karakter.')
      return
    }
    setSavingPassword(true)
    try {
      const wasCreating = !user?.has_password
      await updateOwnPassword(newPassword)
      // Kosongkan kolom -> PasswordInput otomatis kembali ke mode tersembunyi
      setNewPassword('')
      await refreshAuth()
      const msg = wasCreating
        ? 'Password berhasil dibuat. Kini kamu dapat masuk lewat Google atau email dan password.'
        : 'Password berhasil diperbarui.'
      setPasswordSuccess(msg)
      pushToast(msg)
    } catch (err) {
      setPasswordErr(err instanceof Error ? err.message : 'Gagal menyimpan password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const googleConnected = Boolean(user?.providers.includes('google'))
  const emailConnected = Boolean(user?.has_password)

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[640px] px-4 py-10 md:px-6 lg:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-sec">
              Akun & Keamanan
            </span>
            <h1 className="mt-1 text-[clamp(1.5rem,2.8vw,1.875rem)] font-extrabold tracking-[-0.03em] text-fg">
              Pengaturan Akun
            </h1>
          </div>
          <LinkButton to="/dashboard" variant="secondary" size="sm">
            <ArrowLeft size={15} />
            <span>Kembali ke Dasbor</span>
          </LinkButton>
        </div>

        {loading || !user || !profile ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. PROFIL DASAR */}
            <Card className="p-5 sm:p-6">
              <h2 className="m-0 text-[17px] font-bold text-fg">Profil Kreator</h2>
              <p className="mt-1 text-[13.5px] text-fg-sec">
                Perbarui foto profil, nama tampilan, dan bio singkat yang tampil di halaman publik.
              </p>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleAvatarUpload(f)
                  e.target.value = ''
                }}
              />

              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-edge bg-bg p-4">
                  <Avatar src={avatarUrl} name={displayName || profile.username} size="lg" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-fg">Foto Profil</span>
                    <span className="block text-[12px] text-fg-sec">
                      JPG, PNG, atau WebP (dioptimasi otomatis maks. 2 MB)
                    </span>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <ImagePlus size={14} />
                        <span>{avatarUrl ? 'Ganti foto' : 'Unggah foto'}</span>
                      </Button>
                      {avatarUrl && (
                        <Button variant="ghost" size="sm" onClick={() => setAvatarUrl(null)}>
                          Hapus foto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Input
                  label="Nama Tampilan"
                  value={displayName}
                  maxLength={50}
                  rightMeta={`${displayName.length}/50`}
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    setProfileErr('')
                  }}
                  required
                />

                <Select
                  label="Kategori Kreator"
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
                  label="Bio Singkat"
                  rows={3}
                  value={bio}
                  maxLength={160}
                  rightMeta={`${bio.length}/160`}
                  onChange={(e) => setBio(e.target.value)}
                />

                {profileErr && (
                  <p
                    role="alert"
                    className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                  >
                    {profileErr}
                  </p>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={savingProfile}
                    className="w-full sm:w-auto"
                  >
                    Simpan profil
                  </Button>
                </div>
              </form>
            </Card>

            {/* 2. USERNAME & EMAIL (TERKUNCI) */}
            <Card className="space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="m-0 text-[17px] font-bold text-fg">Username & Email</h2>
                <p className="mt-1 text-[13.5px] text-fg-sec">
                  Identitas unik akun yang terikat permanen pada halaman publik kamu.
                </p>
              </div>

              <div>
                <Input
                  label="Username Publik"
                  value={`luven.my.id/@${profile.username}`}
                  leftAddon={<AtSign size={16} />}
                  disabled
                  readOnly
                />
                <div className="mt-2 flex flex-col justify-between gap-2 rounded-xl border border-edge bg-elevated p-3.5 text-[12.5px] text-fg-sec sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2">
                    <Lock size={14} className="mt-0.5 shrink-0 text-fg" />
                    <span>
                      Username sudah diklaim dan tidak bisa diganti. Hubungi admin lewat TikTok{' '}
                      <strong className="font-mono text-fg">{ADMIN_TIKTOK_HANDLE}</strong> bila perlu bantuan.
                    </span>
                  </div>
                  <a
                    href={ADMIN_TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-semibold text-fg underline underline-offset-4"
                  >
                    <TikTokGlyph size={13} />
                    <span>Hubungi admin</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              <Input
                label="Alamat Email Akun"
                value={user.email}
                leftAddon={<Mail size={16} />}
                hint="Alamat email digunakan sebagai pengenal akun tunggal dan tidak dapat diubah."
                disabled
                readOnly
              />
            </Card>

            {/* 3. CARA MASUK YANG TERHUBUNG */}
            <Card className="space-y-4 p-5 sm:p-6">
              <div>
                <h2 className="m-0 text-[17px] font-bold text-fg">Cara Masuk yang Terhubung</h2>
                <p className="mt-1 text-[13.5px] text-fg-sec">
                  Metode autentikasi yang tertaut ke alamat email <span className="font-mono text-fg">{user.email}</span>.
                </p>
              </div>

              <div className="divide-y divide-edge rounded-xl border border-edge bg-bg">
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface">
                      <GoogleGlyph size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[14px] font-semibold text-fg">Akun Google</span>
                      <span className="block truncate text-[12px] text-fg-sec">
                        Masuk satu klik dengan email Google yang sama
                      </span>
                    </div>
                  </div>
                  <Badge variant={googleConnected ? 'ok' : 'neutral'}>
                    {googleConnected ? 'Terhubung' : 'Otomatis saat login'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface">
                      <ShieldCheck size={17} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[14px] font-semibold text-fg">Email & Password</span>
                      <span className="block truncate text-[12px] text-fg-sec">
                        {emailConnected
                          ? 'Dapat masuk langsung memakai email dan password'
                          : 'Belum memiliki password — buat di bagian Keamanan di bawah'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={emailConnected ? 'ok' : 'warn'}>
                    {emailConnected ? 'Aktif' : 'Belum diatur'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 4. KEAMANAN: UBAH PASSWORD / BUAT PASSWORD TANPA PASSWORD LAMA */}
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-fg" />
                <h2 className="m-0 text-[17px] font-bold text-fg">
                  {emailConnected ? 'Ubah password' : 'Buat password'}
                </h2>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-sec">
                {emailConnected
                  ? 'Masukkan password baru minimal 8 karakter untuk langsung memperbarui password akun kamu.'
                  : 'Akun kamu didaftarkan lewat Google dan belum punya password. Setelah menyimpan password di sini, kamu bisa masuk lewat Google ATAU lewat email dan password pada akun yang sama.'}
              </p>

              <form onSubmit={handleSavePassword} noValidate className="mt-5 space-y-4">
                <div>
                  <PasswordInput
                    name="new-password"
                    label="Password baru"
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordErr('')
                      setPasswordSuccess('')
                    }}
                    leftAddon={<Lock size={16} />}
                    required
                  />
                  <PasswordStrengthMeter password={newPassword} minLength={8} />
                </div>

                {passwordErr && (
                  <p
                    role="alert"
                    className="rounded-xl border-2 border-fg px-3.5 py-2.5 text-[13px] font-medium text-fg"
                  >
                    {passwordErr}
                  </p>
                )}

                {passwordSuccess && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl border border-edge bg-elevated px-3.5 py-3 text-[13px] text-fg"
                  >
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-fg" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={savingPassword}
                    className="w-full sm:w-auto"
                  >
                    Simpan password
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  )
}
