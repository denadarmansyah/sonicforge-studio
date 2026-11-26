import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  BarChart3,
  ChevronDown,
  Compass,
  Link2,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchPublicFeed, recordAnalyticsEvent } from '../lib/platformStore'
import { useDocumentMeta } from '../lib/seo'
import { DEFAULT_FREE_THEME, DEFAULT_PROFILE_SETTINGS } from '../lib/themeConfig'
import { CreatorTemplate, Profile } from '../lib/types'
import { VerifiedBadgeIcon } from '../ui/BrandIcons'
import { Logo } from '../ui/Logo'
import {
  Avatar,
  Badge,
  Card,
  EASE_SMOOTH,
  EditorialIllustration,
  LinkButton,
  UnstyledButton,
} from '../ui/primitives'
import { PublicProfileRenderer, TemplateCard } from '../ui/ProfileViewCard'
import { SiteLayout } from '../ui/SiteLayout'

const HERO_WORDS = ['Satu', 'Halaman', 'Resmi', 'untuk', 'TikTok', '&', 'Template', 'CapCut']

const EXAMPLE_PLACEHOLDER_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000000',
  username: 'namakamu',
  display_name: 'Nama Kreator Kamu',
  bio: 'Tempat menaruh deskripsi singkat gaya edit kamu dan jadwal rilis template baru.',
  avatar_url: null,
  banner_url: null,
  tiktok_url: 'https://www.tiktok.com/@namakamu',
  instagram_url: null,
  youtube_url: null,
  website_url: null,
  category: 'Transisi',
  is_verified: true,
  is_featured: false,
  is_banned: false,
  onboarding_completed: true,
  plan: 'free',
  plan_expires_at: null,
  theme: DEFAULT_FREE_THEME,
  settings: DEFAULT_PROFILE_SETTINGS,
  referred_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const EXAMPLE_PLACEHOLDER_TEMPLATES: CreatorTemplate[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000000',
    title: '[Contoh Tampilan] Judul Template CapCut Kamu',
    description: 'Kartu otomatis mengarahkan penonton ke tautan resmi CapCut.',
    capcut_url: 'https://www.capcut.com/templates',
    tiktok_url: null,
    thumbnail_url: null,
    tags: ['transisi', 'beat-sync'],
    song_title: 'Potongan Sound Original',
    sort_order: 0,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    owner_id: '00000000-0000-0000-0000-000000000000',
    title: '[Contoh Tampilan] Template Kedua di Galeri',
    description: '',
    capcut_url: 'https://www.capcut.com/templates',
    tiktok_url: null,
    thumbnail_url: null,
    tags: ['lirik', 'sinematik'],
    song_title: 'Audio Studio 44.1 kHz',
    sort_order: 1,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
]

const FAQS = [
  {
    q: 'Apakah membuat halaman profil di Luven berbayar?',
    a: 'Tidak. Pendaftaran akun, klaim alamat luven.my.id/@username, penempatan tautan template CapCut, kode QR, hingga pemakaian Alat Audio Studio dapat digunakan gratis.',
  },
  {
    q: 'Apakah Luven mengambil video dari akun TikTok atau CapCut saya secara otomatis?',
    a: 'Tidak. Luven tidak melakukan scraping. Anda memegang kendali penuh atas judul, gambar thumbnail 4:5, dan tautan resmi CapCut/TikTok yang ingin ditampilkan.',
  },
  {
    q: 'Bagaimana tampilan tautan saya saat dibagikan ke bio TikTok?',
    a: 'Setiap halaman /@username memiliki metadata Open Graph khusus (nama kreator, bio, dan foto profil) sehingga tampil rapi saat dibagikan.',
  },
  {
    q: 'Apakah data pribadi pengunjung halaman saya direkam di analitik?',
    a: 'Tidak. Analitik Luven hanya menghitung agregat harian kunjungan halaman dan jumlah klik tombol tanpa menyimpan alamat IP atau identitas pengunjung.',
  },
  {
    q: 'Apa fungsi menu Alat Studio di bagian atas situs?',
    a: 'Alat Studio (/studio) memungkinkan Anda mengekstrak suara dari berkas video (.mp4, .mov, .webm), mengatur EQ/pitch/reverb, lalu mengunduhnya sebagai MP3 atau WAV untuk bahan template Anda.',
  },
]

export function HomePage() {
  const { user, profile } = useAuth()
  const reduce = useReducedMotion()
  const [recentCreators, setRecentCreators] = useState<Profile[]>([])
  const [recentTemplates, setRecentTemplates] = useState<CreatorTemplate[]>([])
  const [feedLoaded, setFeedLoaded] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useDocumentMeta({
    title: 'Luven — Halaman Promosi Kreator TikTok & Template CapCut (luven.my.id)',
    description:
      'Buat halaman profil luven.my.id/@username dalam hitungan menit untuk mempromosikan akun TikTok dan katalog template CapCut Anda.',
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
      {/* =====================================================================
          1. HARDWARE-INSPIRED HERO SECTION
          ===================================================================== */}
      <section className="hw-grid-bg relative overflow-hidden border-b border-edge">
        <div className="mx-auto max-w-[1280px] px-4 py-[clamp(3rem,6vw,5.5rem)] md:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* Left Copy & Hardware Deck Strip */}
            <div>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_SMOOTH }}
                className="inline-flex items-center gap-2.5 rounded-full border border-edge bg-surface px-3.5 py-1.5 font-mono text-[11.5px] text-fg-sec"
              >
                <Logo variant="symbol" size={20} animate className="text-fg" />
                <span>DIREKTORI KREATOR TIKTOK & CAPCUT</span>
              </motion.div>

              <h1 className="mt-5 text-[clamp(2.25rem,4.6vw+0.75rem,4.15rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-fg">
                {HERO_WORDS.map((word, idx) => {
                  const isHighlight = word === 'TikTok' || word === 'CapCut'
                  return (
                    <span
                      key={word + idx}
                      className="mr-[0.24em] inline-block overflow-hidden pb-1 align-bottom last:mr-0"
                    >
                      <motion.span
                        className={`inline-block ${isHighlight ? 'text-accent' : ''}`}
                        initial={reduce ? false : { y: '24%' }}
                        animate={{ y: '0%' }}
                        transition={{
                          duration: 0.38,
                          delay: idx * 0.025,
                          ease: EASE_SMOOTH,
                        }}
                      >
                        {word}
                      </motion.span>
                    </span>
                  )
                })}
              </h1>

              <p className="mt-5 max-w-[54ch] text-[clamp(1rem,0.9vw+0.8rem,1.1875rem)] leading-relaxed text-balance text-fg-sec">
                Buat halaman <span className="font-mono text-fg">luven.my.id/@username</span> dalam hitungan menit. Tempel akun TikTok, susun katalog template CapCut Anda, dan bagikan satu tautan bersih di bio.
              </p>

              <div className="mt-7 flex flex-col items-stretch gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center">
                <LinkButton to={primaryHref} variant="primary" size="lg" className="w-full min-[480px]:w-auto">
                  <UserPlus size={17} />
                  <span>{user ? 'Buka Dasbor Kamu' : 'Buat halaman kamu'}</span>
                  <ArrowRight size={16} />
                </LinkButton>

                <LinkButton to="/explore" variant="secondary" size="lg" className="w-full min-[480px]:w-auto">
                  <Compass size={17} />
                  <span>Jelajahi kreator</span>
                </LinkButton>
              </div>

              {/* Clean Typographic Spec Strip (Zero CSS-shape illustrations) */}
              <div className="mt-9 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { icon: Smartphone, label: 'SETUP PROFIL', value: '< 2 MENIT' },
                  { icon: Compass, label: 'RASIO KARTU', value: '4:5 VERTIKAL' },
                  { icon: AudioWaveform, label: 'KOMPRESI', value: 'WEBP OTOMATIS' },
                ].map((spec) => {
                  const Icon = spec.icon
                  return (
                    <div
                      key={spec.label}
                      className="flex items-center gap-3 rounded-xl border border-edge bg-surface px-3.5 py-2.5"
                    >
                      <Icon size={18} className="shrink-0 text-fg-sec" />
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-sec">
                          {spec.label}
                        </div>
                        <div className="font-mono text-[12px] font-medium tabular-nums text-fg">
                          {spec.value}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Hero 2D Editorial Illustration + Authentic Live Profile Mockup */}
            <div className="relative space-y-4">
              <EditorialIllustration
                slug="hero-main"
                alt="Ilustrasi meja kreator video pendek dengan ponsel ber-timeline vertikal, headphone studio, dan mikrofon"
                ratio="16:9"
                sizes="(max-width: 1024px) 100vw, 560px"
                priority
              />
              <div className="rounded-[28px] border border-edge bg-elevated p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                    <span className="h-2.5 w-2.5 rounded-full bg-edge" />
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  </div>
                  <div className="rounded-md border border-edge bg-bg px-3 py-1 font-mono text-[11px] text-fg-sec">
                    luven.my.id/@namakamu
                  </div>
                  <Badge variant="accent">Contoh Tampilan</Badge>
                </div>

                <div className="rounded-2xl bg-bg p-3 sm:p-4">
                  <PublicProfileRenderer
                    profile={EXAMPLE_PLACEHOLDER_PROFILE}
                    templates={EXAMPLE_PLACEHOLDER_TEMPLATES}
                    previewBadge="CONTOH TATA LETAK PROFIL"
                    compactPreview
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. LIVE COMMUNITY DIRECTORY SECTION (Real DB Data or Honest Empty State)
          ===================================================================== */}
      <section className="mx-auto max-w-[1280px] px-4 py-[clamp(3.5rem,6vw,6rem)] md:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
              Kiriman Komunitas
            </span>
            <h2 className="mt-1.5 text-[clamp(1.625rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-fg">
              Kreator & Template Terbaru
            </h2>
          </div>
          <LinkButton to="/explore" variant="outline" size="sm">
            <span>Buka Halaman Jelajah</span>
            <ArrowUpRight size={15} />
          </LinkButton>
        </div>

        {!feedLoaded ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : recentTemplates.length === 0 && recentCreators.length === 0 ? (
          <Card className="mt-8 flex flex-col items-start justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="max-w-[58ch]">
              <Badge variant="accent">Siap Menerima Kreator Pertama</Badge>
              <h3 className="mt-3 text-[20px] font-bold tracking-[-0.02em] text-fg">
                Belum ada kiriman publik di database saat ini
              </h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-fg-sec">
                Luven tidak menampilkan profil atau statistik rekayasa. Begitu kreator mendaftar dan menempelkan template CapCut, karya mereka otomatis muncul di bagian ini.
              </p>
            </div>
            <LinkButton to={primaryHref} variant="primary" className="shrink-0">
              <UserPlus size={16} />
              <span>Klaim Username Sekarang</span>
            </LinkButton>
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            {recentCreators.length > 0 && (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {recentCreators.map((c) => (
                  <Link key={c.id} to={`/@${c.username}`} className="no-underline">
                    <Card hoverLift className="flex items-center gap-3 p-4">
                      <Avatar src={c.avatar_url} name={c.display_name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[14.5px] font-bold text-fg">
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
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {recentTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    showCreator
                    onCapcutClick={(t) => void recordAnalyticsEvent(t.owner_id, 'capcut_click', t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================================
          3. HIGH-CONTRAST LIGHT RHYTHM SECTION: CARA KERJA 3 LANGKAH
             (Asymmetric Bento Layout — Not 3 Identical Cards)
          ===================================================================== */}
      <section className="border-y border-edge bg-light-bg text-light-fg">
        <div className="mx-auto max-w-[1280px] px-4 py-[clamp(3.5rem,6vw,6rem)] md:px-6 lg:px-8">
          <div className="max-w-[58ch]">
            <span className="font-mono text-[11.5px] font-semibold uppercase tracking-widest text-light-sec">
              Alur Kerja Kreator
            </span>
            <h2 className="mt-2 text-[clamp(1.75rem,3.2vw,2.625rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-light-fg">
              Tiga langkah dari pendaftaran hingga siap dipasang di bio TikTok
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Step 01 — Wide Left */}
            <div className="rounded-3xl border border-light-edge bg-light-surface p-6 sm:p-8 lg:col-span-7">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-bg px-3 py-1 font-mono text-[12px] font-bold text-accent">
                  LANGKAH 01
                </span>
                <Link2 size={20} className="text-light-sec" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-light-fg">
                Klaim alamat luven.my.id/@username kamu
              </h3>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-light-sec">
                Pilih username pendek yang sama dengan handle TikTok Anda. Sistem memeriksa ketersediaan secara langsung dan melindungi nama dari duplikasi.
              </p>
            </div>

            {/* Step 02 — Tall Right Spanning 2 Rows */}
            <div className="flex flex-col justify-between rounded-3xl border border-edge bg-bg p-6 text-fg sm:p-8 lg:col-span-5 lg:row-span-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1 font-mono text-[12px] font-bold text-accent">
                    LANGKAH 02
                  </span>
                  <Smartphone size={20} className="text-accent" />
                </div>
                <h3 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Tempel link template CapCut & urutkan sesuka hati
                </h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-fg-sec">
                  Salin tautan bagikan dari CapCut, unggah poster 4:5 (otomatis dioptimasi menjadi WebP tajam), tambahkan tag serta nama sound, lalu urutkan posisi kartu dengan geser langsung.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-edge bg-surface p-4 font-mono text-[12px]">
                <div className="flex items-center justify-between text-fg-sec">
                  <span>VALIDASI DOMAIN</span>
                  <span className="font-semibold text-fg">AKTIF</span>
                </div>
                <div className="mt-2 truncate rounded-lg border border-edge bg-bg px-3 py-2 text-fg">
                  https://www.capcut.com/t/...
                </div>
              </div>
            </div>

            {/* Step 03 — Bottom Left Wide */}
            <div className="rounded-3xl border border-light-edge bg-light-surface p-6 sm:p-8 lg:col-span-7">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-bg px-3 py-1 font-mono text-[12px] font-bold text-accent">
                  LANGKAH 03
                </span>
                <BarChart3 size={20} className="text-light-sec" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-light-fg">
                Bagikan link atau QR, lalu ukur template mana yang paling diminati
              </h3>
              <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-light-sec">
                Setiap kunjungan profil dan klik tombol &ldquo;Pakai di CapCut&rdquo; tercatat rapi dalam grafik 7 dan 30 hari di dasbor Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. FEATURE SYSTEM BENTO (Profile, Analytics, QR, Audio Studio)
          ===================================================================== */}
      <section className="mx-auto max-w-[1280px] px-4 py-[clamp(3.5rem,6vw,6rem)] md:px-6 lg:px-8">
        <div className="max-w-[56ch]">
          <span className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Dirancang Khusus Kreator
          </span>
          <h2 className="mt-2 text-[clamp(1.625rem,3vw,2.375rem)] font-extrabold tracking-[-0.03em] text-fg">
            Peralatan lengkap dalam satu ekosistem
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-12">
          <Card className="p-6 sm:p-7 md:col-span-7">
            <EditorialIllustration
              slug="feature-profile"
              alt="Ilustrasi halaman profil link-in-bio kreator pada layar ponsel beserta kode QR"
              ratio="16:9"
              sizes="(max-width: 768px) 100vw, 620px"
              className="mb-5 rounded-xl bg-bg"
            />
            <Smartphone size={20} className="text-accent" />
            <h3 className="mt-3 text-[19px] font-bold text-fg">
              Halaman Profil Cepat di Browser Dalam Aplikasi TikTok
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
              Mayoritas audiens membuka link bio dari ponsel. Halaman profil Luven dimuat ringan, fokus penuh ke daftar tautan kreator, dan mendukung kustomisasi Studio Tampilan Pro.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 md:col-span-5">
            <EditorialIllustration
              slug="feature-template"
              alt="Ilustrasi kartu template video vertikal beserta penanda pemotongan timeline"
              ratio="16:9"
              sizes="(max-width: 768px) 100vw, 440px"
              className="mb-5 rounded-xl bg-bg"
            />
            <QrCode size={20} className="text-accent" />
            <h3 className="mt-3 text-[19px] font-bold text-fg">Katalog Template & Kode QR</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
              Susun koleksi template CapCut vertikal 4:5 dan unduh kode QR PNG tajam untuk dibagikan ke pengikutmu.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 md:col-span-5">
            <EditorialIllustration
              slug="feature-soundlab"
              alt="Ilustrasi headphone studio dengan gelombang suara konsentris dan modul equalizer"
              ratio="16:9"
              sizes="(max-width: 768px) 100vw, 440px"
              className="mb-5 rounded-xl bg-bg"
            />
            <ShieldCheck size={20} className="text-accent" />
            <h3 className="mt-3 text-[19px] font-bold text-fg">
              Tautan Terverifikasi & Bebas Spam
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
              Setiap tautan keluar diperiksa di sisi klien dan database agar hanya mengarah ke domain resmi melalui HTTPS.
            </p>
          </Card>

          <Card className="flex flex-col justify-between p-6 sm:p-7 md:col-span-7">
            <div>
              <EditorialIllustration
                slug="feature-studio"
                alt="Ilustrasi editor audio multitrack dengan monitor studio dan blok gelombang suara"
                ratio="16:9"
                sizes="(max-width: 768px) 100vw, 620px"
                className="mb-5 rounded-xl bg-bg"
              />
              <AudioWaveform size={20} className="text-accent" />
              <h3 className="mt-3 text-[19px] font-bold text-fg">
                Dilengkapi Alat Audio Studio di Browser
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
                Butuh mengekstrak suara dari video mentah atau menyesuaikan sub-bass, pitch, dan reverb sebelum meracik template di CapCut? Gunakan editor multitrack bawaan dan ekspor ke MP3 320 kbps atau WAV.
              </p>
            </div>
            <div className="mt-5">
              <LinkButton to="/studio" variant="secondary" size="sm">
                <span>Buka Alat Audio Studio</span>
                <ArrowRight size={15} />
              </LinkButton>
            </div>
          </Card>
        </div>
      </section>

      {/* =====================================================================
          5. FAQ ACCORDION (Light Rhythm Section) & CLOSING CTA
          ===================================================================== */}
      <section className="border-t border-light-edge bg-light-bg text-light-fg">
        <div className="mx-auto max-w-[840px] px-4 py-[clamp(3.5rem,6vw,6rem)] md:px-6">
          <h2 className="text-center text-[clamp(1.625rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-light-fg">
            Pertanyaan Umum
          </h2>

          <div className="mt-8 space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-light-edge bg-light-surface"
                >
                  <UnstyledButton
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-light-fg"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-light-sec transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-light-fg' : ''
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
                        <p className="m-0 border-t border-light-edge px-5 py-4 text-[14px] leading-relaxed text-light-sec">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-edge bg-bg text-fg">
            <EditorialIllustration
              slug="cta-banner"
              alt="Ilustrasi meja siaran kreator dengan lampu cincin, ponsel di tripod, dan lengan mikrofon"
              ratio="20:9"
              sizes="(max-width: 840px) 100vw, 800px"
              className="rounded-none border-0 border-b border-edge"
            />
            <div className="flex flex-col items-center justify-between gap-5 p-7 text-center sm:flex-row sm:text-left">
              <div>
                <h3 className="m-0 text-[20px] font-extrabold tracking-[-0.02em] text-fg">
                  Siap merapikan tautan bio & template kamu?
                </h3>
                <p className="mt-1 mb-0 text-[14px] text-fg-sec">
                  Amankan username pilihanmu di luven.my.id hari ini.
                </p>
              </div>
              <LinkButton to={primaryHref} variant="primary" size="lg" className="shrink-0">
                <span>Buat halaman kamu</span>
                <ArrowRight size={16} />
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
