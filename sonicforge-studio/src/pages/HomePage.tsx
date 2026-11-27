import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  BarChart3,
  ChevronDown,
  Compass,
  Link2,
  SlidersHorizontal,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchPublicFeed, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { CreatorTemplate, Profile } from '../lib/types'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import { Logo } from '../ui/Logo'
import { Avatar, Badge, Card, EASE_SMOOTH, LinkButton, UnstyledButton } from '../ui/primitives'
import { TemplateCard } from '../ui/ProfileViewCard'
import { SiteLayout } from '../ui/SiteLayout'

const FAQS = [
  {
    q: 'Apakah membuat halaman profil di Luven berbayar?',
    a: 'Tidak. Pendaftaran akun, klaim alamat luven.my.id/@username, penempatan hingga 8 link aktif, galeri template CapCut, kode QR, dan Alat Audio Studio dapat digunakan gratis tanpa batas waktu.',
  },
  {
    q: 'Apa tambahan yang saya dapat pada paket Pro?',
    a: 'Paket Pro membuka jumlah link tanpa batas, Studio Tampilan penuh (24+ tema, warna kustom, gradasi, foto latar, 12 pasangan font), penjadwalan link, grup lipat, sembunyikan CTA Luven, serta analitik 90 hari.',
  },
  {
    q: 'Apakah Luven mengambil video dari akun TikTok atau CapCut secara otomatis?',
    a: 'Tidak. Luven tidak melakukan scraping. Kamu memegang kendali penuh atas judul, poster pratinjau, dan tautan resmi CapCut atau TikTok yang ingin ditampilkan.',
  },
  {
    q: 'Apakah data pribadi pengunjung halaman saya direkam di analitik?',
    a: 'Tidak. Analitik Luven hanya menghitung angka agregat harian kunjungan halaman dan jumlah klik tombol tanpa menyimpan alamat IP atau identitas pengunjung.',
  },
  {
    q: 'Apa fungsi menu Alat Studio di bagian atas situs?',
    a: 'Alat Studio (/studio) memungkinkan kamu mengekstrak suara dari berkas video, mengatur EQ, pitch, dan reverb, lalu mengunduhnya sebagai MP3 atau WAV untuk bahan konten.',
  },
]

export function HomePage() {
  const { user, profile } = useAuth()
  const [recentCreators, setRecentCreators] = useState<Profile[]>([])
  const [recentTemplates, setRecentTemplates] = useState<CreatorTemplate[]>([])
  const [feedLoaded, setFeedLoaded] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useDocumentMeta({
    title: 'Luven — Halaman Link-in-Bio Kreator TikTok & Template CapCut',
    description:
      'Buat halaman luven.my.id/@username dalam hitungan menit untuk mempromosikan akun TikTok, daftar tautan resmi, dan katalog template CapCut kamu.',
    path: '/',
  })

  useEffect(() => {
    let mounted = true
    fetchPublicFeed({ sort: 'newest', page: 0, pageSize: 4 })
      .then((res) => {
        if (!mounted) return
        setRecentCreators(res.creators.slice(0, 4))
        setRecentTemplates(res.templates.slice(0, 4))
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setFeedLoaded(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  const primaryHref = user
    ? profile?.onboarding_completed
      ? '/dashboard'
      : '/onboarding'
    : '/register'

  return (
    <SiteLayout>
      {/* 1. HERO (6/6 Desktop Split, Single Column <1024px: Text First, Image Second) */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="grid grid-cols-4 items-center gap-8 md:grid-cols-8 lg:grid-cols-12 lg:gap-6">
            <div className="col-span-4 max-w-[560px] md:col-span-8 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-edge bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-sec">
                <Logo variant="symbol" size={18} className="text-fg" />
                <span>Platform Kreator TikTok & CapCut</span>
              </div>

              <h1 className="mt-6 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg sm:text-[44px] lg:text-[52px]">
                Satu halaman link-in-bio rapi untuk akun TikTok dan template CapCut.
              </h1>

              <p className="mt-4 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
                Klaim <span className="font-mono text-fg">luven.my.id/@username</span> dalam dua menit. Susun daftar tautan penting, pamerkan katalog template CapCut, dan pantau klik audiens dari satu dasbor.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton to={primaryHref} variant="primary" size="lg">
                  <UserPlus size={18} />
                  <span>{user ? 'Buka Dasbor' : 'Buat halaman kamu'}</span>
                  <ArrowRight size={16} />
                </LinkButton>
                <LinkButton to="/explore" variant="secondary" size="lg">
                  <Compass size={18} />
                  <span>Jelajahi kreator</span>
                </LinkButton>
              </div>
            </div>

            <div className="col-span-4 md:col-span-8 lg:col-span-6">
              <Illustration
                name="hero-main"
                alt="Ilustrasi kreator video pendek memakai headphone sedang mengedit video pada layar ponsel"
                sizes="(max-width: 1023px) 100vw, 560px"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. EMPAT FITUR UTAMA (12-Col Grid, Equal-Height Cards, Padding 24px: Image/Icon -> Title -> Desc -> Action) */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="max-w-[560px]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
              Ekosistem Kreator
            </span>
            <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
              Semua alat promosi dan audio dalam satu tempat.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
              Dirancang khusus untuk kebutuhan kreator video pendek tanpa tampilan berantakan.
            </p>
          </div>

          {/* Row 1: Illustrated Core Product Cards (feature-profile & feature-templates) */}
          <div className="mt-10 grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
            <Card className="col-span-4 flex h-full flex-col justify-between p-6 md:col-span-4 lg:col-span-6">
              <div>
                <Illustration
                  name="feature-profile"
                  alt="Ilustrasi layar ponsel menampilkan halaman profil link-in-bio dengan daftar tautan rapi"
                  sizes="(max-width: 767px) 100vw, 540px"
                  className="mb-6"
                />
                <h3 className="m-0 text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[20px]">
                  Halaman Link-in-Bio Fokus Kreator
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  Tampil bersih tanpa gangguan navigasi luar saat dibuka dari bio TikTok maupun Instagram. Kustomisasi penuh lewat Studio Tampilan Pro.
                </p>
              </div>
              <div className="mt-6">
                <LinkButton to={primaryHref} variant="secondary" size="md">
                  <span>Siapkan Halaman Bio</span>
                  <ArrowRight size={16} />
                </LinkButton>
              </div>
            </Card>

            <Card className="col-span-4 flex h-full flex-col justify-between p-6 md:col-span-4 lg:col-span-6">
              <div>
                <Illustration
                  name="feature-templates"
                  alt="Ilustrasi tumpukan layar ponsel yang menampilkan bingkai pratinjau video vertikal"
                  sizes="(max-width: 767px) 100vw, 540px"
                  className="mb-6"
                />
                <h3 className="m-0 text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[20px]">
                  Katalog Template CapCut Terkurasi
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  Tempel tautan resmi CapCut, unggah poster vertikal yang otomatis dioptimasi ke WebP, dan biarkan penonton langsung memakai templatemu.
                </p>
              </div>
              <div className="mt-6">
                <LinkButton to="/explore" variant="secondary" size="md">
                  <span>Lihat Direktori Template</span>
                  <ArrowRight size={16} />
                </LinkButton>
              </div>
            </Card>
          </div>

          {/* Row 2: Sound Lab & Multitrack Studio Cards */}
          <div className="mt-6 grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
            <Card className="col-span-4 flex h-full flex-col justify-between p-6 md:col-span-4 lg:col-span-6">
              <div>
                {hasIllustration('feature-soundlab') ? (
                  <Illustration
                    name="feature-soundlab"
                    alt="Ilustrasi panel mixer dengan knob, fader, dan gelombang suara"
                    sizes="(max-width: 767px) 100vw, 540px"
                    className="mb-6"
                  />
                ) : (
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                    <SlidersHorizontal size={20} />
                  </div>
                )}
                <h3 className="m-0 text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[20px]">
                  Perpustakaan Efek & Sound Designer
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  Racik sub-bass drop, whoosh transisi, dan preset karakter suara langsung di browser untuk memperkuat ritme potongan video pendek.
                </p>
              </div>
              <div className="mt-6">
                <LinkButton to="/studio" variant="secondary" size="md">
                  <span>Coba Sound Designer</span>
                  <ArrowRight size={16} />
                </LinkButton>
              </div>
            </Card>

            <Card className="col-span-4 flex h-full flex-col justify-between p-6 md:col-span-4 lg:col-span-6">
              <div>
                {hasIllustration('feature-studio') ? (
                  <Illustration
                    name="feature-studio"
                    alt="Ilustrasi laptop dengan timeline audio multitrack"
                    sizes="(max-width: 767px) 100vw, 540px"
                    className="mb-6"
                  />
                ) : (
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                    <AudioWaveform size={20} />
                  </div>
                )}
                <h3 className="m-0 text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-fg sm:text-[20px]">
                  Editor Audio Multitrack di Browser
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  Ekstrak audio dari berkas video mentah, sesuaikan equalizer 5-band, kompresor, serta reverb, lalu ekspor ke WAV atau MP3 jernih.
                </p>
              </div>
              <div className="mt-6">
                <LinkButton to="/studio" variant="secondary" size="md">
                  <span>Buka Alat Studio</span>
                  <ArrowRight size={16} />
                </LinkButton>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. ALUR KERJA 3 LANGKAH (Light Contrast Section, Equal-Height Cards) */}
      <section className="border-b border-edge bg-light-bg text-light-fg">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="max-w-[560px]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-light-sec">
              Cara Kerja
            </span>
            <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-light-fg sm:text-[32px]">
              Tiga langkah hingga siap dipasang di bio TikTok.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
            {[
              {
                icon: Link2,
                step: 'LANGKAH 01',
                title: 'Klaim alamat @username',
                desc: 'Pilih nama pendek yang sama dengan akun TikTok kamu agar pengikut langsung mengenali tautan resmimu.',
              },
              {
                icon: Smartphone,
                step: 'LANGKAH 02',
                title: 'Susun tautan & template',
                desc: 'Tambahkan link toko, kontak kerja sama, sosial media, serta kartu template CapCut sesuai urutan prioritas.',
              },
              {
                icon: BarChart3,
                step: 'LANGKAH 03',
                title: 'Bagikan & pantau klik',
                desc: 'Tempel tautan di bio atau bagikan kode QR, lalu lihat link dan template mana yang paling diminati audiens.',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.step}
                  className="col-span-4 flex h-full flex-col justify-between rounded-2xl border border-light-edge bg-light-surface p-6 md:col-span-8 lg:col-span-4"
                >
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-light-edge bg-light-bg text-light-fg">
                        <Icon size={18} />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-light-sec">
                        {item.step}
                      </span>
                    </div>
                    <h3 className="m-0 text-[18px] font-bold leading-[1.2] tracking-[-0.02em] text-light-fg sm:text-[20px]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-light-sec">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 4. KIRIMAN KOMUNITAS TERBARU */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-[560px]">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
                Komunitas Luven
              </span>
              <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
                Kreator & template terbaru
              </h2>
            </div>
            <LinkButton to="/explore" variant="outline" size="md">
              <span>Buka Halaman Jelajah</span>
              <ArrowUpRight size={16} />
            </LinkButton>
          </div>

          {!feedLoaded ? (
            <div className="mt-8 grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="col-span-2 aspect-[4/5] animate-pulse rounded-2xl bg-surface md:col-span-4 lg:col-span-3"
                />
              ))}
            </div>
          ) : recentTemplates.length === 0 && recentCreators.length === 0 ? (
            <Card className="mt-8 flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center">
              <div className="max-w-[560px]">
                <Badge variant="neutral">Direktori Langsung</Badge>
                <h3 className="mt-3 text-[18px] font-bold tracking-[-0.02em] text-fg sm:text-[20px]">
                  Siap menampilkan karya kreator pertama
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
                  Luven hanya menampilkan halaman dan template asli yang didaftarkan pengguna. Klaim username kamu untuk tampil di direktori ini.
                </p>
              </div>
              <LinkButton to={primaryHref} variant="primary" size="md">
                <UserPlus size={16} />
                <span>Klaim Username</span>
              </LinkButton>
            </Card>
          ) : (
            <div className="mt-8 space-y-8">
              {recentCreators.length > 0 && (
                <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
                  {recentCreators.map((c) => (
                    <Link
                      key={c.id}
                      to={`/@${c.username}`}
                      className="col-span-4 no-underline md:col-span-4 lg:col-span-3"
                    >
                      <Card hoverLift className="flex h-full items-center gap-3 p-6">
                        <Avatar src={c.avatar_url} name={c.display_name} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[15px] font-bold text-fg">
                              {c.display_name}
                            </span>
                            {c.is_verified && <VerifiedBadgeIcon size={14} />}
                          </div>
                          <span className="block truncate font-mono text-[12px] text-fg-sec">
                            @{c.username}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {recentTemplates.length > 0 && (
                <div className="grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
                  {recentTemplates.map((tpl) => (
                    <div key={tpl.id} className="col-span-2 md:col-span-4 lg:col-span-3">
                      <TemplateCard
                        template={tpl}
                        showCreator
                        onCapcutClick={(t) =>
                          void recordAnalyticsEvent(t.owner_id, 'capcut_click', t.id)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 5. FAQ & BANNER CTA PENUTUP */}
      <section>
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[760px]">
            <div className="text-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
                Tanya Jawab
              </span>
              <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
                Pertanyaan yang sering diajukan
              </h2>
            </div>

            <div className="mt-8 space-y-3">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx
                return (
                  <Card key={item.q} className="overflow-hidden">
                    <UnstyledButton
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-4 text-left text-[15px] font-semibold text-fg"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-fg-sec transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-fg' : ''
                        }`}
                      />
                    </UnstyledButton>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                        >
                          <p className="m-0 border-t border-edge px-6 py-4 text-[15px] leading-relaxed text-fg-sec">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                )
              })}
            </div>
          </div>

          <Card className="mt-16 overflow-hidden p-6 sm:p-8 lg:mt-24">
            {hasIllustration('cta-banner') && (
              <Illustration
                name="cta-banner"
                alt="Ilustrasi panorama headphone studio dan gelombang suara di ruang kerja kreatif"
                sizes="(max-width: 1200px) 100vw, 1136px"
                className="mb-8"
              />
            )}
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-[560px]">
                <h2 className="m-0 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
                  Siap merapikan halaman bio dan katalog templatemu?
                </h2>
                <p className="mt-2 mb-0 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
                  Mulai gratis selamanya di luven.my.id atau beralih ke Pro kapan pun dibutuhkan.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <LinkButton to={primaryHref} variant="primary" size="lg">
                  <span>Buat halaman kamu</span>
                  <ArrowRight size={16} />
                </LinkButton>
                <LinkButton to="/pricing" variant="secondary" size="lg">
                  <span>Lihat Paket Harga</span>
                </LinkButton>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </SiteLayout>
  )
}
