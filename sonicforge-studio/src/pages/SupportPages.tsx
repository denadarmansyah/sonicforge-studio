import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, CheckCircle2, Mail, Send } from 'lucide-react'
import { submitContactForm } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { TikTokGlyph } from '../ui/BrandIcons'
import { Logo } from '../ui/Logo'
import { Button, Card, Input, LinkButton, Textarea, useToast } from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

export function PrivacyPage() {
  useDocumentMeta({
    title: 'Kebijakan Privasi — Luven',
    description: 'Kebijakan privasi, pengelolaan data akun, dan analitik tanpa data pribadi pengunjung di Luven.',
    path: '/privacy',
  })

  return (
    <SiteLayout>
      <article className="mx-auto max-w-[780px] px-4 py-12 sm:py-16 md:px-6">
        <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Dokumen Hukum · Diperbarui 2026
        </span>
        <h1 className="mt-2 text-[clamp(1.875rem,3.5vw,2.5rem)] font-extrabold tracking-[-0.03em] text-fg">
          Kebijakan Privasi Luven
        </h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-fg-sec">
          <section>
            <h2 className="text-[18px] font-bold text-fg">1. Informasi yang Kami Kumpulkan</h2>
            <p>
              Saat Anda mendaftar sebagai kreator di Luven (<span className="font-mono text-fg">luven.my.id</span>), kami menyimpan alamat email autentikasi melalui Supabase Auth serta data profil publik yang Anda isi secara sukarela: username, nama tampilan, bio singkat, foto profil, banner, tautan media sosial resmi, dan daftar tautan template CapCut.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-fg">2. Analitik Tanpa Data Pribadi Pengunjung</h2>
            <p>
              Untuk menampilkan jumlah kunjungan profil dan klik tautan di dasbor kreator, sistem kami hanya mencatat angka agregat harian (<code className="font-mono text-fg">hit_count</code> per tanggal). Kami tidak menyimpan alamat IP, sidik jari perangkat, maupun identitas pribadi pengunjung halaman profil publik.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-fg">3. Penggunaan Cookie & Penyimpanan Lokal (Local Storage)</h2>
            <p>
              Luven menggunakan penyimpanan lokal browser secara terbatas untuk fungsi teknis esensial, bukan untuk iklan pelacak pihak ketiga:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-fg">Sesi Autentikasi Supabase:</strong> Menyimpan token login kreator agar Anda tidak perlu masuk berulang kali.
              </li>
              <li>
                <strong className="text-fg">Token Pembatas Laju Sesi (<code className="font-mono">sessionStorage</code>):</strong> Kode acak sementara yang hilang saat tab ditutup untuk mencegah spam klik dan laporan.
              </li>
              <li>
                <strong className="text-fg">Alat Audio Studio (<code className="font-mono">localStorage</code>):</strong> Menyimpan preset suara dan pengaturan sintetis kustom yang Anda buat sendiri di halaman <code className="font-mono">/studio</code>. Seluruh pemrosesan berkas audio/video di Studio berlangsung lokal di perangkat Anda.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-fg">4. Penyimpanan Gambar & Penghapusan Data</h2>
            <p>
              Gambar avatar, banner, dan thumbnail dikompresi ke format WebP di browser Anda sebelum disimpan pada bucket publik Supabase Storage. Anda dapat mengubah atau menghapus template dan gambar kapan saja melalui Dasbor, atau meminta penghapusan akun penuh melalui TikTok{' '}
              <a
                href={ADMIN_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Hubungi admin Luven di TikTok @luvenindonesia"
                className="font-mono text-fg underline"
              >
                {ADMIN_TIKTOK_HANDLE}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </SiteLayout>
  )
}

export function TermsPage() {
  useDocumentMeta({
    title: 'Ketentuan Layanan & Kebijakan Konten — Luven',
    description: 'Aturan penggunaan platform Luven, daftar konten terlarang, serta prosedur pelaporan pelanggaran dan DMCA.',
    path: '/terms',
  })

  return (
    <SiteLayout>
      <article className="mx-auto max-w-[780px] px-4 py-12 sm:py-16 md:px-6">
        <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Dokumen Hukum · Diperbarui 2026
        </span>
        <h1 className="mt-2 text-[clamp(1.875rem,3.5vw,2.5rem)] font-extrabold tracking-[-0.03em] text-fg">
          Ketentuan Layanan & Kebijakan Konten
        </h1>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-fg-sec">
          <section>
            <h2 className="text-[18px] font-bold text-fg">1. Peran Platform</h2>
            <p>
              Luven menyediakan layanan halaman profil direktori bagi kreator untuk menampilkan tautan resmi ke profil TikTok dan template CapCut mereka. Luven tidak terafiliasi dengan ByteDance Ltd., TikTok, maupun CapCut. Hak kekayaan intelektual atas masing-masing template dan gambar tetap dimiliki oleh kreator yang bersangkutan.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-fg">2. Konten & Aktivitas yang Dilarang Keras</h2>
            <p>Pengguna dilarang mengunggah gambar, teks, username, atau tautan yang memuat:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-fg">Spam & Manipulasi:</strong> Pembuatan akun massal otomatis, pengalihan tautan menyesatkan, atau spam kata kunci.
              </li>
              <li>
                <strong className="text-fg">Penipuan & Phishing:</strong> Undian palsu, situs tiruan pencuri data, skema investasi ilegal, atau perjudian daring.
              </li>
              <li>
                <strong className="text-fg">Konten Dewasa & Kekerasan:</strong> Pornografi, eksploitasi seksual, ujaran kebencian, maupun konten kekerasan ekstrem.
              </li>
              <li>
                <strong className="text-fg">Pelanggaran Hak Cipta:</strong> Mengklaim template, karya visual, atau materi berhak cipta milik kreator lain tanpa izin sah.
              </li>
              <li>
                <strong className="text-fg">Impersonasi (Peniruan Identitas):</strong> Berpura-pura menjadi kreator lain, tokoh publik, instansi resmi, atau merek perusahaan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold text-fg">3. Proses Pelaporan Pelanggaran & Penghapusan (DMCA)</h2>
            <p>
              Setiap halaman profil dan kartu template memiliki tombol <strong className="text-fg">Laporkan</strong>. Jika Anda menemukan pelanggaran ketentuan atau pelanggaran hak cipta (DMCA), kirimkan laporan melalui tombol tersebut atau hubungi admin melalui TikTok{' '}
              <a
                href={ADMIN_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Hubungi admin Luven di TikTok @luvenindonesia"
                className="font-mono text-fg underline"
              >
                {ADMIN_TIKTOK_HANDLE}
              </a>{' '}
              dengan menyertakan:
            </p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>URL halaman profil atau template Luven yang dilaporkan.</li>
              <li>Bukti kepemilikan karya asli atau identitas sah yang ditiru.</li>
              <li>Kontak email aktif Anda untuk konfirmasi tindak lanjut.</li>
            </ol>
            <p className="mt-2">
              Tim moderator Luven berhak menyembunyikan/menghapus template dan menangguhkan akun pelanggar tanpa pemberitahuan sebelumnya demi menjaga keamanan komunitas.
            </p>
          </section>
        </div>
      </article>
    </SiteLayout>
  )
}

export function ContactPage() {
  const { pushToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [hp, setHp] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useDocumentMeta({
    title: 'Hubungi Tim Luven — Bantuan & Laporan DMCA',
    description: 'Kirim pertanyaan kerja sama, bantuan akun kreator, atau laporan hak cipta ke tim Luven.',
    path: '/contact',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await submitContactForm({ name, email, subject, body, honeypot: hp })
      setSent(true)
      pushToast('Pesan Anda telah diterima.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan.')
    } finally {
      setSending(false)
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[620px] px-4 py-12 sm:py-16 md:px-6">
        <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Pusat Bantuan
        </span>
        <h1 className="mt-2 text-[clamp(1.875rem,3.5vw,2.375rem)] font-extrabold tracking-[-0.03em] text-fg">
          Hubungi Admin Luven
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-fg-sec">
          Untuk kendala akun kreator, permohonan verifikasi, atau laporan hak cipta (DMCA), hubungi admin resmi Luven di TikTok atau kirim pesan lewat formulir di bawah.
        </p>

        {/* Primary Admin Contact Card (TikTok Only) */}
        <Card className="mt-6 flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
              <TikTokGlyph size={22} />
            </div>
            <div>
              <p className="m-0 text-[15px] font-bold text-fg">Hubungi admin Luven di TikTok</p>
              <p className="mt-0.5 mb-0 font-mono text-[13px] text-fg-sec">{ADMIN_TIKTOK_HANDLE}</p>
            </div>
          </div>
          <a
            href={ADMIN_TIKTOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buka profil TikTok resmi Luven @luvenindonesia"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-fg px-5 text-[14px] font-semibold text-bg no-underline transition-colors [@media(hover:hover)]:hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          >
            <TikTokGlyph size={16} />
            <span>Buka TikTok</span>
            <ArrowUpRight size={15} />
          </a>
        </Card>

        <Card className="mt-6 p-6 sm:p-8">
          {sent ? (
            <div className="py-4 text-center">
              <CheckCircle2 size={32} className="mx-auto text-fg" />
              <h2 className="mt-3 text-[18px] font-bold text-fg">Pesan Terkirim</h2>
              <p className="mt-1.5 text-[14px] text-fg-sec">
                Terima kasih telah menghubungi Luven. Kami akan membalas ke alamat email Anda secepatnya.
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSent(false)
                    setSubject('')
                    setBody('')
                  }}
                >
                  Kirim Pesan Lain
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <input
                type="text"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nama Anda"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  label="Email Balasan"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftAddon={<Mail size={15} />}
                  required
                />
              </div>

              <Input
                label="Subjek"
                placeholder="Bantuan akun / Permohonan Verifikasi / Laporan DMCA"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />

              <Textarea
                label="Pesan Lengkap"
                rows={4}
                placeholder="Tuliskan detail pertanyaan atau tautan profil terkait..."
                value={body}
                maxLength={1500}
                rightMeta={`${body.length}/1500`}
                onChange={(e) => setBody(e.target.value)}
                required
              />

              {error && <p role="alert" className="rounded-lg border-2 border-fg px-3 py-2 text-[13px] font-medium text-fg">{error}</p>}

              <Button type="submit" variant="primary" loading={sending}>
                <Send size={15} />
                <span>Kirim Pesan</span>
              </Button>
            </form>
          )}
        </Card>
      </div>
    </SiteLayout>
  )
}

export function NotFoundPage() {
  useDocumentMeta({
    title: '404 Halaman Tidak Ditemukan — Luven',
    description: 'Halaman yang Anda tuju tidak ditemukan di Luven.',
    path: '/404',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[480px] px-4 py-20 text-center">
        <div className="mb-5 flex justify-center text-fg">
          <Logo variant="symbol" size={44} />
        </div>
        <span className="rounded-full border border-edge bg-surface px-3 py-1 font-mono text-[12px] text-fg-sec">
          ERROR 404
        </span>
        <h1 className="mt-4 text-[28px] font-extrabold tracking-[-0.03em] text-fg">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-fg-sec">
          Tautan yang Anda buka mungkin salah ketik atau halamannya telah dipindahkan.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton to="/" variant="primary">
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </LinkButton>
          <LinkButton to="/explore" variant="secondary">
            Jelajahi Kreator
          </LinkButton>
        </div>
      </div>
    </SiteLayout>
  )
}
