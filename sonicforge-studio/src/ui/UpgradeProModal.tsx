import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Lock, Sparkles } from 'lucide-react'
import { BillingCycle, PLANS } from '../config/plans'
import { createMidtransCheckout } from '../lib/platformStore'
import { ADMIN_TIKTOK_HANDLE, ADMIN_TIKTOK_URL } from '../lib/supabaseClient'
import { TikTokGlyph } from './BrandIcons'
import { Badge, Button, Modal, useToast } from './primitives'

export function UpgradeProModal({
  open,
  onClose,
  featureName,
}: {
  open: boolean
  onClose: () => void
  featureName?: string
}) {
  const { pushToast } = useToast()
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [busy, setBusy] = useState(false)
  const [gatewayMsg, setGatewayMsg] = useState('')

  const handleCheckout = async () => {
    setBusy(true)
    setGatewayMsg('')
    try {
      const res = await createMidtransCheckout(billing)
      if (res.redirectUrl) {
        window.open(res.redirectUrl, '_blank', 'noopener,noreferrer')
        pushToast('Halaman pembayaran dibuka di tab baru.')
      }
    } catch (err) {
      setGatewayMsg(
        err instanceof Error
          ? err.message
          : 'Pembayaran otomatis belum aktif. Hubungi admin lewat TikTok @luvenindonesia.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade ke Luven Pro"
      description={
        featureName
          ? `Fitur “${featureName}” tersedia khusus pada paket Pro.`
          : 'Buka seluruh Studio Tampilan, link tanpa batas, penjadwalan, dan analitik 90 hari.'
      }
      maxWidth="max-w-[540px]"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-edge bg-elevated p-3">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-fg" />
            <span className="text-[13px] font-semibold text-fg">Pilih Siklus Paket Pro</span>
          </div>
          <div className="inline-flex rounded-lg border border-edge bg-bg p-0.5">
            {(['monthly', 'yearly'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`min-h-9 cursor-pointer rounded-md px-3 font-mono text-[11.5px] transition-colors ${
                  billing === b ? 'bg-fg text-bg font-semibold' : 'text-fg-sec'
                }`}
              >
                {b === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-fg/40 bg-bg p-5">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <Badge variant="accent">LUVEN PRO</Badge>
              <div className="mt-2 font-mono text-[28px] font-extrabold tabular-nums text-fg">
                {billing === 'monthly' ? PLANS.pro.monthlyPriceLabel : PLANS.pro.yearlyPriceLabel}
                <span className="ml-1 text-[13px] font-normal text-fg-sec">
                  /{billing === 'monthly' ? 'bulan' : 'tahun'}
                </span>
              </div>
            </div>
            <Sparkles size={20} className="text-fg" />
          </div>

          <ul className="mt-4 list-none space-y-2 p-0 text-[13px] text-fg-sec">
            {PLANS.pro.highlights.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-fg" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {gatewayMsg && (
          <div
            role="status"
            className="rounded-xl border border-edge border-l-4 border-l-fg bg-elevated p-3.5 text-[13px] leading-relaxed text-fg"
          >
            {gatewayMsg}
          </div>
        )}

        {/* Mode A: Manual Activation via TikTok (Always Available) */}
        <div className="rounded-xl border border-edge bg-surface p-4">
          <p className="m-0 text-[13px] font-semibold text-fg">
            Aktivasi Manual via Admin Luven
          </p>
          <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-fg-sec">
            Hubungi admin lewat TikTok{' '}
            <strong className="font-mono text-fg">{ADMIN_TIKTOK_HANDLE}</strong> dengan menyertakan username Luven Anda untuk aktivasi Pro secara langsung.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={ADMIN_TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hubungi admin lewat TikTok @luvenindonesia untuk upgrade Pro"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-fg px-4 text-[13.5px] font-semibold text-bg no-underline transition-colors [@media(hover:hover)]:hover:bg-accent-hover"
            >
              <TikTokGlyph size={15} />
              <span>Hubungi {ADMIN_TIKTOK_HANDLE}</span>
              <ArrowUpRight size={14} />
            </a>
            <Button variant="secondary" loading={busy} onClick={handleCheckout} className="flex-1">
              <span>Bayar Otomatis (Midtrans)</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[12.5px]">
          <Link to="/pricing" onClick={onClose} className="text-fg-sec underline [@media(hover:hover)]:hover:text-fg">
            Lihat tabel perbandingan lengkap
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  )
}
