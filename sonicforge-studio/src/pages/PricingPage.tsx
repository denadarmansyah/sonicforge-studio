import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Layers, Minus, Sparkles } from 'lucide-react'
import { BillingCycle, PLAN_COMPARISON_ROWS, PLANS } from '../config/plans'
import { useAuth } from '../context/AuthContext'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { getEffectivePlan } from '../lib/themeConfig'
import { TikTokGlyph } from '../ui/BrandIcons'
import { hasIllustration, Illustration } from '../ui/Illustration'
import {
  Badge,
  Button,
  Card,
  EASE_SMOOTH,
  ExternalLinkButton,
  LinkButton,
  Tabs,
  UnstyledButton,
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
    billing === 'monthly' ? PLANS.pro.monthlyPriceLabel : PLANS.pro.yearlyPriceLabel
  const showHeroIllus = hasIllustration('pricing-main')

  return (
    <SiteLayout>
      {/* 1. HERO & PLAN CARDS */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div
            className={
              showHeroIllus
                ? 'grid grid-cols-4 items-center gap-8 md:grid-cols-8 lg:grid-cols-12 lg:gap-6'
                : 'mx-auto max-w-[640px] text-center'
            }
          >
            <div className={showHeroIllus ? 'col-span-4 max-w-[560px] md:col-span-8 lg:col-span-6' : ''}>
              <Badge variant="neutral">PAKET & HARGA</Badge>
              <h1 className="mt-4 text-[32px] font-extrabold leading-[1.06] tracking-[-0.03em] text-fg sm:text-[44px] lg:text-[52px]">
                Satu halaman link-in-bio, dua pilihan paket yang jujur.
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
                Klaim <span className="font-mono text-fg">luven.my.id/@username</span> gratis tanpa batas waktu. Beralih ke Pro saat kamu membutuhkan warna kustom, link tak terbatas, dan analitik 90 hari.
              </p>

              <div className={`mt-8 ${showHeroIllus ? '' : 'flex justify-center'}`}>
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

            {showHeroIllus && (
              <div className="col-span-4 md:col-span-8 lg:col-span-6">
                <Illustration
                  name="pricing-main"
                  alt="Ilustrasi dua kartu halaman profil berdampingan untuk perbandingan paket Free dan Pro"
                  sizes="(max-width: 1023px) 100vw, 560px"
                  priority
                />
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-6 lg:grid-cols-12">
            {/* FREE CARD */}
            <Card className="col-span-4 flex h-full flex-col justify-between p-6 md:col-span-4 lg:col-span-6">
              <div>
                {hasIllustration('plan-free') ? (
                  <Illustration
                    name="plan-free"
                    alt="Ilustrasi kartu halaman profil sederhana untuk paket Free"
                    sizes="(max-width: 767px) 100vw, 480px"
                    className="mb-6"
                  />
                ) : (
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-elevated text-fg">
                      <Layers size={20} />
                    </div>
                    {user && currentPlan === 'free' && <Badge variant="ok">Paket Aktif</Badge>}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.03em] text-fg">
                    {PLANS.free.name}
                  </h2>
                  {hasIllustration('plan-free') && user && currentPlan === 'free' && (
                    <Badge variant="ok">Paket Aktif</Badge>
                  )}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">{PLANS.free.tagline}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-mono text-[36px] font-extrabold tracking-[-0.03em] text-fg">
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

            {/* PRO CARD */}
            <Card className="col-span-4 flex h-full flex-col justify-between border-fg bg-surface p-6 md:col-span-4 lg:col-span-6">
              <div>
                {hasIllustration('plan-pro') ? (
                  <Illustration
                    name="plan-pro"
                    alt="Ilustrasi kartu halaman profil dengan lapisan dekorasi dan bintang untuk paket Pro"
                    sizes="(max-width: 767px) 100vw, 480px"
                    className="mb-6"
                  />
                ) : (
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fg bg-fg text-bg">
                      <Sparkles size={20} />
                    </div>
                    {user && currentPlan === 'pro' ? (
                      <Badge variant="accent">Pro Aktif</Badge>
                    ) : (
                      <Badge variant="accent">Direkomendasikan</Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.03em] text-fg">
                    {PLANS.pro.name}
                  </h2>
                  {hasIllustration('plan-pro') &&
                    (user && currentPlan === 'pro' ? (
                      <Badge variant="accent">Pro Aktif</Badge>
                    ) : (
                      <Badge variant="accent">Direkomendasikan</Badge>
                    ))}
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">{PLANS.pro.tagline}</p>

                <div className="mt-6 flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[36px] font-extrabold tracking-[-0.03em] text-fg">
                    {proPrice}
                  </span>
                  <span className="text-[13px] text-fg-sec">
                    / {billing === 'monthly' ? 'bulan' : 'tahun'}
                  </span>
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

              <div className="mt-8 space-y-2">
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
        </div>
      </section>

      {/* 2. TABEL PERBANDINGAN */}
      <section className="border-b border-edge">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="max-w-[560px]">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
              Perbandingan Fitur
            </span>
            <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
              Rincian lengkap Free vs Pro
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-sec">
              Seluruh kuota dan fitur ditegakkan langsung di server agar akun dan tampilan kreator selalu aman.
            </p>
          </div>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-edge bg-surface">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-edge bg-elevated/60">
                  <th className="px-6 py-4 font-semibold text-fg">Fitur</th>
                  <th className="px-6 py-4 font-semibold text-fg">Free</th>
                  <th className="px-6 py-4 font-semibold text-fg">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {PLAN_COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="transition-colors [@media(hover:hover)]:hover:bg-elevated/40">
                    <td className="px-6 py-4 font-medium text-fg">{row.feature}</td>
                    <td className="px-6 py-4 text-fg-sec">
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
                    <td className="px-6 py-4 font-medium text-fg">
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
        </div>
      </section>

      {/* 3. FAQ */}
      <section>
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-[760px]">
            <div className="text-center">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-fg-sec">
                Tanya Jawab
              </span>
              <h2 className="mt-2 text-[24px] font-extrabold leading-[1.08] tracking-[-0.03em] text-fg sm:text-[32px]">
                Pertanyaan seputar langganan
              </h2>
            </div>

            <div className="mt-8 space-y-3">
              {PRICING_FAQS.map((item, idx) => {
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
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </UnstyledButton>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                          transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                          className="border-t border-edge px-6 py-4 text-[15px] leading-relaxed text-fg-sec"
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
          </div>
        </div>
      </section>

      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </SiteLayout>
  )
}
