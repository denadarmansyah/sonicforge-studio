import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Minus, Sparkles } from 'lucide-react'
import { BillingCycle, PLAN_COMPARISON_ROWS, PLANS } from '../config/plans'
import { useAuth } from '../lib/authContext'
import { useDocumentMeta } from '../lib/seo'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { getEffectivePlan } from '../lib/themeConfig'
import { TikTokGlyph } from '../ui/BrandIcons'
import { Badge, Button, Card, LinkButton, SectionHeading } from '../ui/primitives'
import { SiteLayout } from '../ui/SiteLayout'
import { UpgradeProModal } from '../ui/UpgradeProModal'

const PRICING_FAQS = [
  {
    q: 'Bagaimana cara mengaktifkan paket Pro saat ini?',
    a: 'Kamu bisa memilih siklus bulanan atau tahunan lewat tombol Upgrade ke Pro. Jika checkout otomatis belum aktif di server, kamu bisa langsung menghubungi admin via TikTok @luvenindonesia untuk aktivasi manual yang diproses cepat.',
  },
  {
    q: 'Apa yang terjadi jika masa aktif Pro berakhir?',
    a: 'Semua link dan template kamu tetap aman tersimpan. Halaman publik /@username otomatis kembali memakai tampilan monokrom Free, tombol brand Luven muncul lagi, dan blok khusus Pro disembunyikan sementara hingga kamu memperpanjang.',
  },
  {
    q: 'Apakah pengguna Free tetap bisa membuat halaman link-in-bio?',
    a: 'Ya. Paket Free sudah mencakup halaman /@username, hingga 8 link aktif, galeri template CapCut, QR Code, 3 tema dasar monokrom, dan statistik 7 hari terakhir tanpa batas waktu.',
  },
  {
    q: 'Bisakah saya mengganti tema dan warna halaman publik dengan bebas di Pro?',
    a: 'Bisa. Pro membuka 24+ preset tema, warna kustom & gradasi, 12 pasangan font Google Fonts, foto latar + efek blur, tombol spotlight, jadwal link, dan pratinjau langsung di Studio Tampilan.',
  },
]

export function PricingPage() {
  useDocumentMeta({
    title: 'Harga & Paket Free vs Pro — Luven',
    description:
      'Bandingkan paket Free dan Pro di Luven. Mulai gratis selamanya dengan halaman link-in-bio /@username atau upgrade ke Pro untuk kustomisasi penuh.',
    path: '/pricing',
  })

  const { user, profile } = useAuth()
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const currentPlan = profile ? getEffectivePlan(profile.plan, profile.plan_expires_at) : 'free'
  const proPrice =
    billing === 'monthly'
      ? `Rp ${PLANS.pro.monthlyPriceIdr.toLocaleString('id-ID')}`
      : `Rp ${PLANS.pro.yearlyPriceIdr.toLocaleString('id-ID')}`

  return (
    <SiteLayout>
      <div className="mx-auto max-w-[1120px] px-4 py-12 sm:py-16 md:px-6">
        <div className="mx-auto max-w-[680px] text-center">
          <Badge variant="outline">PAKET & HARGA</Badge>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-fg sm:text-[44px]">
            Mulai gratis, upgrade saat kreasi kamu makin besar.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-fg-sec sm:text-[16px]">
            Halaman link-in-bio <span className="font-mono text-fg">luven.my.id/@username</span> gratis selamanya. Paket Pro membuka Studio Tampilan penuh, analitik 90 hari, dan link tanpa batas.
          </p>

          <div className="mt-7 inline-flex items-center rounded-xl border border-edge bg-surface p-1">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                billing === 'monthly' ? 'bg-accent text-accent-fg' : 'text-fg-sec hover:text-fg'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setBilling('yearly')}
              className={`cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                billing === 'yearly' ? 'bg-accent text-accent-fg' : 'text-fg-sec hover:text-fg'
              }`}
            >
              Tahunan · Hemat 17%
            </button>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  {PLANS.free.name}
                </h2>
                {user && currentPlan === 'free' && <Badge variant="outline">Paket Aktif</Badge>}
              </div>
              <p className="mt-1.5 text-[14px] text-fg-sec">{PLANS.free.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-mono text-[36px] font-extrabold tracking-[-0.04em] text-fg">
                  Rp 0
                </span>
                <span className="text-[13px] text-fg-muted">/ selamanya</span>
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-edge pt-6 text-[13px] text-fg-sec">
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
                <LinkButton to="/dashboard" variant="secondary" fullWidth>
                  <span>Buka Dasbor</span>
                  <ArrowRight size={15} />
                </LinkButton>
              ) : (
                <LinkButton to="/register" variant="secondary" fullWidth>
                  <span>Mulai Gratis</span>
                  <ArrowRight size={15} />
                </LinkButton>
              )}
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-fg bg-surface p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.03em] text-fg">
                  <Sparkles size={18} />
                  <span>{PLANS.pro.name}</span>
                </h2>
                {user && currentPlan === 'pro' ? (
                  <Badge variant="solid">Pro Aktif</Badge>
                ) : (
                  <Badge variant="solid">Paling Lengkap</Badge>
                )}
              </div>
              <p className="mt-1.5 text-[14px] text-fg-sec">{PLANS.pro.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-mono text-[36px] font-extrabold tracking-[-0.04em] text-fg">
                  {proPrice}
                </span>
                <span className="text-[13px] text-fg-muted">
                  / {billing === 'monthly' ? 'bulan' : 'tahun'}
                </span>
              </div>

              <ul className="mt-6 space-y-2.5 border-t border-edge pt-6 text-[13px] text-fg-sec">
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
                <Button variant="primary" fullWidth onClick={() => setUpgradeOpen(true)}>
                  <Sparkles size={15} />
                  <span>{currentPlan === 'pro' ? 'Perpanjang Paket Pro' : 'Upgrade ke Pro'}</span>
                </Button>
              ) : (
                <LinkButton to="/register" variant="primary" fullWidth>
                  <span>Daftar & Upgrade Pro</span>
                  <ArrowRight size={15} />
                </LinkButton>
              )}
              <a
                href={ADMIN_TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 text-[12px] font-medium text-fg-sec transition-colors hover:text-fg"
              >
                <TikTokGlyph size={13} />
                <span>Tanya admin via TikTok {ADMIN_TIKTOK_HANDLE}</span>
              </a>
            </div>
          </Card>
        </div>

        <section className="mt-16">
          <SectionHeading
            eyebrow="PERBANDINGAN DETAIL"
            title="Semua fitur Free vs Pro"
            description="Transparan sejak awal. Tidak ada biaya tersembunyi."
          />

          <div className="mt-6 overflow-x-auto rounded-2xl border border-edge bg-surface">
            <table className="w-full min-w-[540px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-edge bg-elevated/60">
                  <th className="px-5 py-3.5 font-semibold text-fg">Fitur</th>
                  <th className="px-5 py-3.5 font-semibold text-fg">Free</th>
                  <th className="px-5 py-3.5 font-semibold text-fg">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {PLAN_COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-elevated/40">
                    <td className="px-5 py-3.5 font-medium text-fg">{row.label}</td>
                    <td className="px-5 py-3.5 text-fg-sec">
                      {row.free === 'Tidak' ? (
                        <span className="inline-flex items-center gap-1 text-fg-muted">
                          <Minus size={14} />
                          <span>Tidak</span>
                        </span>
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-fg">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[780px]">
          <SectionHeading
            eyebrow="FAQ"
            title="Pertanyaan umum soal paket"
            align="center"
          />
          <div className="mt-6 space-y-2.5">
            {PRICING_FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <Card key={item.q} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left text-[14px] font-semibold text-fg"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-fg-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-edge px-5 py-4 text-[13px] leading-relaxed text-fg-sec">
                      {item.a}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          <div className="mt-8 text-center text-[13px] text-fg-muted">
            Butuh bantuan memilih?{' '}
            <Link to="/contact" className="font-medium text-fg underline underline-offset-4">
              Hubungi kami
            </Link>
            .
          </div>
        </section>
      </div>

      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </SiteLayout>
  )
}
