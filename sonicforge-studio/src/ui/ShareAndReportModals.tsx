import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Database, Download, Flag, Share2, Terminal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { resetSandboxDatabase, submitAbuseReport } from '../lib/platformStore'
import { isSandboxEnabled, isSupabaseConfigured, setSandboxEnabled, SITE_ORIGIN } from '../lib/supabaseClient'
import { REPORT_REASONS } from '../lib/validators'
import { STUDIO_THEME } from '../theme/studioTheme'
import { Button, Modal, Select, Textarea, useToast } from './primitives'

export function QrShareModal({
  open,
  onClose,
  username,
  displayName,
  fgColor,
  bgColor,
}: {
  open: boolean
  onClose: () => void
  username: string
  displayName: string
  fgColor?: string
  bgColor?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pushToast } = useToast()
  const [copied, setCopied] = useState(false)
  const profileUrl = `${SITE_ORIGIN}/@${username}`

  useEffect(() => {
    if (!open || !canvasRef.current) return
    let cancelled = false
    void import('qrcode').then((mod) => {
      if (cancelled || !canvasRef.current) return
      const QRCode = mod.default ?? mod
      void QRCode.toCanvas(canvasRef.current, profileUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: fgColor || STUDIO_THEME.base,
          light: bgColor || STUDIO_THEME.ink,
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [open, profileUrl, fgColor, bgColor])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      pushToast('Tautan profil disalin ke papan klip.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      pushToast('Gagal menyalin tautan secara otomatis.', 'err')
    }
  }

  const downloadQr = () => {
    const cv = canvasRef.current
    if (!cv) return
    const a = document.createElement('a')
    a.href = cv.toDataURL('image/png')
    a.download = `luven-${username}-qr.png`
    a.click()
    pushToast('Kode QR berhasil diunduh.')
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} (@${username}) — Luven`,
          text: `Lihat koleksi template CapCut & TikTok dari ${displayName} di Luven.`,
          url: profileUrl,
        })
        return
      } catch {
        /* cancelled */
      }
    }
    await copyLink()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bagikan Halaman Profil"
      description="Tempel tautan ini di bio TikTok atau bagikan kode QR ke audiens Anda."
      maxWidth="max-w-[440px]"
    >
      <div className="flex flex-col items-center">
        <div className="rounded-2xl border border-edge bg-fg p-3">
          <canvas ref={canvasRef} width={240} height={240} className="block rounded-lg" />
        </div>
        <p className="mt-3 font-mono text-[13px] text-accent">{profileUrl.replace(/^https?:\/\//, '')}</p>

        <div className="mt-5 flex w-full items-center gap-2 rounded-xl border border-edge bg-bg p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg">{profileUrl}</span>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? <Check size={15} className="text-fg" /> : <Copy size={15} />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </Button>
        </div>

        <div className="mt-4 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Button variant="outline" fullWidth onClick={downloadQr}>
            <Download size={16} />
            <span>Unduh QR (PNG)</span>
          </Button>
          <Button variant="primary" fullWidth onClick={nativeShare}>
            <Share2 size={16} />
            <span>Bagikan sekarang</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: {
  open: boolean
  onClose: () => void
  targetType: 'profile' | 'template'
  targetId: string
  targetLabel: string
}) {
  const { pushToast } = useToast()
  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await submitAbuseReport(targetType, targetId, reason, details)
      pushToast('Laporan terkirim. Tim moderasi Luven akan meninjaunya.')
      setDetails('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim laporan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Laporkan Konten"
      description={`Laporkan ${targetType === 'profile' ? 'profil' : 'template'} “${targetLabel}” jika melanggar ketentuan Luven.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Alasan pelaporan"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {REPORT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>

        <Textarea
          label="Keterangan tambahan (opsional)"
          placeholder="Jelaskan bukti pelanggaran atau tautan karya asli bila terkait hak cipta..."
          value={details}
          maxLength={500}
          rightMeta={`${details.length}/500`}
          onChange={(e) => setDetails(e.target.value)}
        />

        {error && <p role="alert" className="rounded-lg border-2 border-fg px-3 py-2 text-[13px] font-medium text-fg">{error}</p>}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            <Flag size={15} />
            <span>Kirim Laporan</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Displayed cleanly when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not yet configured,
 * avoiding any blank crash screen and giving clear setup steps + local dev sandbox toggle.
 */
export function SupabaseSetupPanel({ compact = false }: { compact?: boolean }) {
  const { refreshAuth } = useAuth()
  const sandboxOn = isSandboxEnabled()

  if (isSupabaseConfigured) return null

  const toggleSandbox = async (enable: boolean) => {
    setSandboxEnabled(enable)
    if (!enable) resetSandboxDatabase()
    await refreshAuth()
    window.location.reload()
  }

  if (compact && sandboxOn) {
    return (
      <div className="border-b border-edge bg-elevated px-4 py-2 text-[12px] text-fg-sec">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full border border-dashed border-fg bg-fg/70" />
            Mode Sandbox Lokal Aktif (penyimpanan browser untuk pengujian sebelum variabel Supabase diisi)
          </span>
          <Button variant="link" size="sm" onClick={() => toggleSandbox(false)}>
            <span>Matikan & Reset Sandbox</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto my-8 max-w-[680px] px-4">
      <div className="rounded-2xl border border-edge bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-edge bg-elevated text-accent">
            <Database size={20} />
          </div>
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
              Konfigurasi Lingkungan
            </span>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-fg">
              Hubungkan Proyek Supabase Anda
            </h2>
          </div>
        </div>

        <p className="mt-4 text-[14px] leading-relaxed text-fg-sec">
          Variabel lingkungan <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">VITE_SUPABASE_URL</code> dan{' '}
          <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">VITE_SUPABASE_ANON_KEY</code> belum diisi.
          Ikuti 3 langkah singkat berikut untuk mengaktifkan database produksi:
        </p>

        <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-[13.5px] leading-relaxed text-fg-sec">
          <li>
            Buat proyek baru di Supabase Dashboard, buka menu <strong className="text-fg">SQL Editor</strong>, lalu tempel dan jalankan seluruh isi berkas{' '}
            <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">supabase/schema.sql</code>.
          </li>
          <li>
            Salin berkas <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">.env.example</code> menjadi{' '}
            <code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">.env.local</code>, lalu isi URL proyek dan Publishable/Anon Key Anda.
          </li>
          <li>
            Muat ulang server pengembangan (<code className="rounded bg-elevated px-1.5 py-0.5 font-mono text-fg">npm run dev</code>).
          </li>
        </ol>

        <div className="mt-6 rounded-xl border border-edge bg-elevated p-4">
          <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
                <Terminal size={15} className="text-accent" />
                <span>Uji Alur di Mode Sandbox Lokal</span>
              </div>
              <p className="mt-1 text-[12.5px] text-fg-sec">
                Menguji pendaftaran, onboarding, unggah gambar WebP, analitik, dan moderasi secara lokal di browser tanpa data palsu bawaan.
              </p>
            </div>
            <Button
              variant={sandboxOn ? 'outline' : 'primary'}
              size="sm"
              onClick={() => toggleSandbox(!sandboxOn)}
            >
              {sandboxOn ? 'Matikan Sandbox' : 'Aktifkan Sandbox Lokal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
