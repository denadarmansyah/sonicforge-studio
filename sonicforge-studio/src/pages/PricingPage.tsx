import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Minus, Sparkles } from 'lucide-react'
import { BillingCycle, PLAN_COMPARISON_ROWS, PLANS } from '../config/plans'
import { useAuth } from '../context/AuthContext'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { getEffectivePlan } from '../lib/themeConfig'
import { TikTokGlyph } from '../ui/BrandIcons'
import {
  Badge,
  Button,
  Card,
  EASE_SMOOTH,
  EditorialIllustration,
  ExternalLinkButton,
  LinkButton,
  Tabs,
} from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'
import { UpgradeProModal } from '../ui/UpgradeProModal'

const PRICING_FAQS = [
  {
    q: 'Bagaimana cara mengaktifkan paket Pro saat ini?',
    a: 'Pilih siklus bulanan atau tahunan lewat tombol Upgrade ke Pro. Bila pembayaran otomatis sedang dinonaktifkan di lingkungan produksi, kamu dapat langsung menghubungi admin melalui TikTok @luvenindonesia untuk aktivasi manual.',
  },
  {
    q: 'Apa yang terjadi jika masa aktif Pro berakhir?',
    a: 'Seluruh link, pengaturan, dan template tetap tersimpan aman di akunmu. Halaman publik /@username otomatis kembali memakai tampilan monokrom Free dan menyembunyikan blok khusus Pro sementara hingga kamu memperpanjang.',
  },
  {
    q: 'Apakah paket Free memiliki batas waktu?',
    a: 'Tidak ada batas waktu. Paket Free mencakup halaman luven.my.id/@username, maksimal 8 link aktif di luar judul bagian, galeri template CapCut, QR standar, 3 tema monokrom, dan statistik 7 hari terakhir.',
  },
  {
    q: 'Apa bedanya kustomisasi Free dan Studio Tampilan Pro?',
    a: 'Paket Free menyediakan 3 tema monokrom bersih. Paket Pro membuka 24+ preset kurasi, pemilih warna HEX & gradasi, 12 pasangan font Google Fonts, foto latar dengan kontrol overlay & blur, jadwal link, grup lipat, serta pemeriksa kontras otomatis.',
  },
]

export function PricingPage() {
  useDocumentMeta({
    title: 'Harga & Paket Free vs Pro — Luven',
    description:
      'Bandingkan paket Free dan Pro di Luven. Buat halaman link-in-bio /@username gratis atau upgrade ke Pro untuk Studio Tampilan penuh dan analitik 90 hari.',
    path: '/pricing',
  })

  const { user, profile } = useAuth()
  const reduce = useReducedMotion()
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const currentPlan = profile ? getEffectivePlan(profile.plan, profile.plan_expires_at) : 'free'
  const proPrice =
    billing === 'monthly'
      ? PLANS.pro.monthlyPriceLabel
      : PLANS.pro.yearlyPriceLabel

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1120px] px-4 py-14 sm:py-20 md:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Badge variant="neutral">PAKET & HARGA</Badge>
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.06] tracking-[-0.035em] text-fg sm:text-[48px]">
              Satu halaman link-in-bio, dua pilihan paket yang jujur.
            </h1>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
              Klaim <span className="font-mono text-fg">luven.my.id/@username</span> gratis tanpa batas waktu. Beralih ke Pro saat kamu membutuhkan warna kustom, link tak terbatas, dan analitik 90 hari.
            </p>

            <div className="mt-7">
              <Tabs<BillingCycle>
                layoutGroupId="pricing-billing-cycle"
                active={billing}
                onChange={setBilling}
                tabs={[
                  { id: 'monthly', label: 'Tagihan Bulanan' },
                  { id: 'yearly', label: 'Tahunan · Hemat 2 Bulan' },
                ]}
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <EditorialIllustration
              slug="pricing-hero"
              alt="Ilustrasi meja kreatif kreator video pendek dengan halaman profil ponsel dan perangkat audio"
              ratio="16:10"
              sizes="(max-width: 1024px) 100vw, 440px"
              priority
            />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <EditorialIllustration
                slug="plan-free"
                alt="Ilustrasi paket Free dengan kartu profil ringkas dan tautan utama"
                ratio="20:9"
                sizes="(max-width: 768px) 100vw, 500px"
                className="mb-5 rounded-xl bg-bg"
              />

              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[24px] font-extrabold tracking-[-0.03em] text-fg">
                  {PLANS.free.name}
                </h2>
                {user && currentPlan === 'free' && <Badge variant="ok">Paket Aktif</Badge>}
              </div>
              <p className="mt-1.5 max-w-[52ch] text-[14px] text-fg-sec">{PLANS.free.tagline}</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-mono text-[38px] font-extrabold tracking-[-0.04em] text-fg">
                  Rp 0
                </span>
                <span className="text-[13px] text-fg-sec">/ selamanya</span>
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-edge pt-6 text-[14px] text-fg-sec">
                {PLANS.free.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-fg" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              {user ? (
                <LinkButton to="/dashboard" variant="secondary" size="lg" fullWidth>
                  <span>Buka Dasbor</span>
                  <ArrowRight size={16} />
                </LinkButton>
              ) : (
                <LinkButton to="/register" variant="secondary" size="lg" fullWidth>
                  <span>Buat Halaman Gratis</span>
                  <ArrowRight size={16} />
                </LinkButton>
              )}
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-fg bg-surface p-6 sm:p-8">
            <div>
              <EditorialIllustration
                slug="plan-pro"
                alt="Ilustrasi paket Pro dengan palet tema kustom, analitik lengkap, dan kontrol tipografi"
                ratio="20:9"
                sizes="(max-width: 768px) 100vw, 500px"
                className="mb-5 rounded-xl bg-bg"
              />

              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.03em] text-fg">
                  <Sparkles size={18} />
                  <span>{PLANS.pro.name}</span>
                </h2>
                {user && currentPlan === 'pro' ? (
                  <Badge variant="accent">Pro Aktif</Badge>
                ) : (
                  <Badge variant="accent">Direkomendasikan</Badge>
                )}
              </div>
              <p className="mt-1.5 max-w-[52ch] text-[14px] text-fg-sec">{PLANS.pro.tagline}</p>
              <div className="mt-6 flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[38px] font-extrabold tracking-[-0.04em] text-fg">
                  {proPrice}
                </span>
                <span className="text-[13px] text-fg-sec">
                  / {billing === 'monthly' ? 'bulan' : 'tahun'}
                </span>
                {PLANS.pro.isPlaceholderPrice && (
                  <span className="font-mono text-[11px] text-fg-muted">
                    (estimasi paket awal)
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-edge pt-6 text-[14px] text-fg-sec">
                {PLANS.pro.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check size={16} className="mt-0.5 shrink-0 text-fg" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-col gap-2">
              {user ? (
                <Button variant="primary" size="lg" fullWidth onClick={() => setUpgradeOpen(true)}>
                  <Sparkles size={16} />
                  <span>{currentPlan === 'pro' ? 'Perpanjang Paket Pro' : 'Upgrade ke Pro'}</span>
                </Button>
              ) : (
                <LinkButton to="/register" variant="primary" size="lg" fullWidth>
                  <span>Daftar & Upgrade Pro</span>
                  <ArrowRight size={16} />
                </LinkButton>
              )}
              <ExternalLinkButton href={ADMIN_TIKTOK_URL} variant="ghost" size="md" fullWidth>
                <TikTokGlyph size={15} />
                <span>Hubungi admin TikTok {ADMIN_TIKTOK_HANDLE}</span>
              </ExternalLinkButton>
            </div>
          </Card>
        </div>

        <section className="mt-20 sm:mt-24">
          <div className="max-w-[58ch]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-sec">
              PERBANDINGAN FITUR
            </span>
            <h2 className="mt-2 text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[34px]">
              Rincian lengkap Free vs Pro
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-sec">
              Semua batasan ditegakkan langsung di server agar akun dan tampilan kreator tetap konsisten.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-edge bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-edge bg-elevated/60">
                  <th className="px-5 py-4 font-semibold text-fg">Fitur</th>
                  <th className="px-5 py-4 font-semibold text-fg">Free</th>
                  <th className="px-5 py-4 font-semibold text-fg">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {PLAN_COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="transition-colors [@media(hover:hover)]:hover:bg-elevated/40">
                    <td className="px-5 py-3.5 font-medium text-fg">{row.feature}</td>
                    <td className="px-5 py-3.5 text-fg-sec">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <span className="inline-flex items-center gap-1.5 text-fg">
                            <Check size={15} />
                            <span>Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-fg-muted">
                            <Minus size={15} />
                            <span>Tidak</span>
                          </span>
                        )
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-fg">
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? (
                          <span className="inline-flex items-center gap-1.5 text-fg">
                            <Check size={15} />
                            <span>Tersedia</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-fg-muted">
                            <Minus size={15} />
                            <span>Tidak</span>
                          </span>
                        )
                      ) : (
                        row.pro
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-[780px] sm:mt-24">
          <div className="text-center">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-sec">
              TANYA JAWAB
            </span>
            <h2 className="mt-2 text-[28px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[34px]">
              Pertanyaan seputar langganan
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {PRICING_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <Card key={item.q} className="overflow-hidden">
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="justify-between! rounded-none! px-5!"
                  >
                    <span className="text-left font-semibold whitespace-normal text-fg">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-fg-sec transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </Button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                        className="border-t border-edge px-5 py-4 text-[14px] leading-relaxed text-fg-sec"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>

          <p className="mt-8 text-center text-[14px] text-fg-sec">
            Punya pertanyaan khusus untuk tim atau agensi kreator?{' '}
            <Link to="/contact" className="font-medium text-fg underline underline-offset-4">
              Kirim pesan lewat halaman kontak
            </Link>
            .
          </p>
        </section>
      </div>

      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </SiteLayout>
  )
}
