import { FormEvent, useState } from 'react'
import { ArrowLeft, ArrowUpRight, CheckCircle2, Mail, Send } from 'lucide-react'
import { submitContactForm } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { TikTokGlyph } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import { Logo } from '../ui/Logo'
import {
  Button,
  Card,
  ExternalLinkButton,
  Input,
  LinkButton,
  Textarea,
  useToast,
} from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'

export function PrivacyPage() {
  useDocumentMeta({
    title: 'Kebijakan Privasi — Luven',
    description:
      'Kebijakan privasi, pengelolaan data akun, dan analitik tanpa data pribadi pengunjung di Luven.',
    path: '/privacy',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-24">
        <article className="mx-auto max-w-[720px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
            Dokumen Hukum · Diperbarui 2026
          </span>
          <h1 className="mt-2 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg sm:text-[44px]">
            Kebijakan Privasi Luven
          </h1>

          <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
            <section>
              <h2 className="text-[20px] font-bold text-fg">1. Informasi yang Kami Kumpulkan</h2>
              <p>
                Saat kamu mendaftar sebagai kreator di Luven (<span className="font-mono text-fg">luven.my.id</span>), kami menyimpan alamat email autentikasi melalui Supabase Auth serta data profil publik yang kamu isi secara sukarela: username, nama tampilan, bio singkat, foto profil, banner, tautan media sosial resmi, dan daftar tautan halaman bio serta template CapCut.
              </p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold text-fg">2. Analitik Tanpa Data Pribadi Pengunjung</h2>
              <p>
                Untuk menampilkan jumlah kunjungan profil dan klik tautan di dasbor kreator, sistem kami hanya mencatat angka agregat harian (<code className="font-mono text-fg">hit_count</code> per tanggal). Kami tidak menyimpan alamat IP, sidik jari perangkat, maupun identitas pribadi pengunjung halaman profil publik.
              </p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold text-fg">3. Penyimpanan Lokal (Local Storage)</h2>
              <p>
                Luven menggunakan penyimpanan lokal browser secara terbatas untuk fungsi teknis esensial, bukan untuk iklan pelacak pihak ketiga:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-fg">Sesi Autentikasi Supabase:</strong> Menyimpan token login kreator agar kamu tidak perlu masuk berulang kali.
                </li>
                <li>
                  <strong className="text-fg">Token Pembatas Laju Sesi:</strong> Kode acak sementara yang hilang saat tab ditutup untuk mencegah spam klik dan laporan.
                </li>
                <li>
                  <strong className="text-fg">Alat Audio Studio:</strong> Menyimpan preset suara dan pengaturan sintetis kustom yang dibuat di halaman <code className="font-mono">/studio</code>.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-[20px] font-bold text-fg">4. Penyimpanan Gambar & Penghapusan Data</h2>
              <p>
                Gambar profil, banner, dan poster dioptimasi ke format WebP di browser sebelum disimpan pada bucket publik Supabase Storage. Kamu dapat mengubah atau menghapus tautan serta gambar kapan saja melalui Dasbor, atau meminta penghapusan akun penuh melalui TikTok{' '}
                <a
                  href={ADMIN_TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-fg underline"
                >
                  {ADMIN_TIKTOK_HANDLE}
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </div>
    </SiteLayout>
  )
}

export function TermsPage() {
  useDocumentMeta({
    title: 'Ketentuan Layanan & Kebijakan Konten — Luven',
    description:
      'Aturan penggunaan platform Luven, daftar konten terlarang, serta prosedur pelaporan pelanggaran dan DMCA.',
    path: '/terms',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-24">
        <article className="mx-auto max-w-[720px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
            Dokumen Hukum · Diperbarui 2026
          </span>
          <h1 className="mt-2 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg sm:text-[44px]">
            Ketentuan Layanan & Kebijakan Konten
          </h1>

          <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
            <section>
              <h2 className="text-[20px] font-bold text-fg">1. Peran Platform</h2>
              <p>
                Luven menyediakan layanan halaman profil link-in-bio dan direktori bagi kreator untuk menampilkan tautan resmi serta koleksi template CapCut mereka. Luven tidak terafiliasi dengan ByteDance Ltd., TikTok, maupun CapCut.
              </p>
            </section>

            <section>
              <h2 className="text-[20px] font-bold text-fg">2. Konten & Aktivitas Terlarang</h2>
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
                  <strong className="text-fg">Pelanggaran Hak Cipta & Impersonasi:</strong> Mengklaim karya milik kreator lain atau meniru identitas pihak resmi tanpa izin.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-[20px] font-bold text-fg">3. Pelaporan Pelanggaran & DMCA</h2>
              <p>
                Setiap halaman profil dan kartu template memiliki tombol <strong className="text-fg">Laporkan</strong>. Jika kamu menemukan pelanggaran ketentuan atau hak cipta, kirimkan laporan melalui tombol tersebut atau hubungi admin melalui TikTok{' '}
                <a
                  href={ADMIN_TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-fg underline"
                >
                  {ADMIN_TIKTOK_HANDLE}
                </a>
                .
              </p>
            </section>
          </div>
        </article>
      </div>
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
    description:
      'Kirim pertanyaan kerja sama, bantuan akun kreator, atau laporan hak cipta ke tim Luven.',
    path: '/contact',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await submitContactForm({ name, email, subject, body, honeypot: hp })
      setSent(true)
      pushToast('Pesan kamu telah diterima.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan.')
    } finally {
      setSending(false)
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[420px]">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
            Pusat Bantuan
          </span>
          <h1 className="mt-2 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg">
            Hubungi Admin Luven
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-fg-sec">
            Hubungi admin resmi lewat TikTok untuk aktivasi Pro dan verifikasi cepat, atau kirim pesan melalui formulir di bawah.
          </p>

          <Card className="mt-6 flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-edge bg-elevated text-fg">
                <TikTokGlyph size={18} />
              </div>
              <div>
                <p className="m-0 text-[14px] font-bold text-fg">TikTok Resmi Admin</p>
                <p className="m-0 font-mono text-[12px] text-fg-sec">{ADMIN_TIKTOK_HANDLE}</p>
              </div>
            </div>
            <ExternalLinkButton href={ADMIN_TIKTOK_URL} variant="secondary" size="sm">
              <span>Buka</span>
              <ArrowUpRight size={14} />
            </ExternalLinkButton>
          </Card>

          <Card className="mt-6 p-6">
            {sent ? (
              <div className="py-4 text-center">
                <CheckCircle2 size={32} className="mx-auto text-fg" />
                <h2 className="mt-3 text-[18px] font-bold text-fg">Pesan Terkirim</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                  Terima kasih telah menghubungi Luven. Kami akan membalas ke email kamu secepatnya.
                </p>
                <div className="mt-6">
                  <Button
                    variant="secondary"
                    fullWidth
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
                <Input
                  label="Nama Lengkap"
                  placeholder="Nama kamu"
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

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg border-2 border-fg px-3.5 py-2 text-[13px] font-medium text-fg"
                  >
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={sending}>
                  <Send size={15} />
                  <span>Kirim Pesan</span>
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </SiteLayout>
  )
}

export function NotFoundPage() {
  useDocumentMeta({
    title: '404 Halaman Tidak Ditemukan — Luven',
    description: 'Halaman yang kamu tuju tidak ditemukan di Luven.',
    path: '/404',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
        <Card className="mx-auto max-w-[480px] p-6 text-center sm:p-8">
          {hasIllustration('error-404') ? (
            <div className="mx-auto mb-6 max-w-[240px]">
              <Illustration
                name="error-404"
                alt="Ilustrasi kabel headphone terputus"
                sizes="240px"
              />
            </div>
          ) : (
            <div className="mb-4 flex justify-center text-fg">
              <Logo variant="symbol" size={40} />
            </div>
          )}
          <span className="rounded-full border border-edge bg-elevated px-3 py-1 font-mono text-[11px] text-fg-sec">
            HALAMAN 404
          </span>
          <h1 className="mt-4 text-[24px] font-extrabold tracking-[-0.03em] text-fg sm:text-[32px]">
            Halaman tidak ditemukan
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
            Tautan yang kamu buka mungkin salah ketik atau halamannya telah dipindahkan.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton to="/" variant="primary" size="lg">
              <ArrowLeft size={16} />
              <span>Kembali ke Beranda</span>
            </LinkButton>
            <LinkButton to="/explore" variant="secondary" size="lg">
              <span>Jelajahi Kreator</span>
            </LinkButton>
          </div>
        </Card>
      </div>
    </SiteLayout>
  )
}
