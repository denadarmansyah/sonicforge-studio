export type PlanId = 'free' | 'pro'
export type BillingCycle = 'monthly' | 'yearly'

export interface PlanDefinition {
  id: PlanId
  name: string
  tagline: string
  monthlyPriceIdr: number
  yearlyPriceIdr: number
  monthlyPriceLabel: string
  yearlyPriceLabel: string
  isPlaceholderPrice: boolean
  maxActiveLinks: number | null // null = unlimited (excludes section headings)
  analyticsWindowDays: number
  themePresetCount: number
  canHideLuvenBranding: boolean
  canCustomAppearance: boolean
  canThumbnailsOnAllLinks: boolean
  canScheduleLinks: boolean
  canCollapsibleGroups: boolean
  canFeaturedSpotlight: boolean
  canEmbedVideos: boolean
  canCustomSeoAndOg: boolean
  canCustomQr: boolean
  canSensitiveGate: boolean
  highlights: string[]
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Mulai halaman link-in-bio dasar untuk profil TikTok & CapCut.',
    monthlyPriceIdr: 0,
    yearlyPriceIdr: 0,
    monthlyPriceLabel: 'Rp 0',
    yearlyPriceLabel: 'Rp 0',
    isPlaceholderPrice: false,
    maxActiveLinks: 8,
    analyticsWindowDays: 7,
    themePresetCount: 3,
    canHideLuvenBranding: false,
    canCustomAppearance: false,
    canThumbnailsOnAllLinks: false,
    canScheduleLinks: false,
    canCollapsibleGroups: false,
    canFeaturedSpotlight: false,
    canEmbedVideos: false,
    canCustomSeoAndOg: false,
    canCustomQr: false,
    canSensitiveGate: false,
    highlights: [
      '1 halaman profil publik luven.my.id/@username',
      'Maksimal 8 link aktif (tidak termasuk judul bagian)',
      '3 tema bawaan hitam putih',
      'Atur urutan link dengan drag-and-drop',
      'Analitik dasar kunjungan & klik (7 hari terakhir)',
      'Kode QR standar + blok ajakan Luven di bagian bawah',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Kendali penuh Studio Tampilan, analitik 90 hari, penjadwalan, dan tanpa watermark Luven.',
    // Harga placeholder — dapat disesuaikan langsung di file ini sebelum live gateway aktif
    monthlyPriceIdr: 39000,
    yearlyPriceIdr: 390000,
    monthlyPriceLabel: 'Rp 39.000',
    yearlyPriceLabel: 'Rp 390.000',
    isPlaceholderPrice: true,
    maxActiveLinks: null,
    analyticsWindowDays: 90,
    themePresetCount: 24,
    canHideLuvenBranding: true,
    canCustomAppearance: true,
    canThumbnailsOnAllLinks: true,
    canScheduleLinks: true,
    canCollapsibleGroups: true,
    canFeaturedSpotlight: true,
    canEmbedVideos: true,
    canCustomSeoAndOg: true,
    canCustomQr: true,
    canSensitiveGate: true,
    highlights: [
      'Link tidak terbatas + thumbnail di setiap link',
      'Studio Tampilan penuh: 24+ tema, warna kustom, gradasi, pola, & gambar latar',
      'Bentuk avatar, gaya border neo-brutal/3D/glass, 12 pasangan font & tata letak',
      'Penjadwalan tanggal tayang, grup lipat, link sorotan beranimasi, & embed TikTok/YouTube',
      'Analitik lengkap 7/30/90 hari (per link, sumber referrer, perangkat, jam puncak)',
      'Sembunyikan blok ajakan Luven, SEO & OG kustom, QR berwarna, serta bantuan prioritas',
    ],
  },
}

export interface PlanComparisonRow {
  feature: string
  free: string | boolean
  pro: string | boolean
}

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  { feature: 'Halaman profil publik (/@username)', free: '1 halaman', pro: '1 halaman' },
  { feature: 'Jumlah link aktif (di luar judul bagian)', free: 'Maks. 8 link', pro: 'Tidak terbatas' },
  { feature: 'Koleksi tema bawaan', free: '3 tema monokrom', pro: '24+ tema beragam' },
  { feature: 'Warna kustom, gradasi, pola, & gambar latar', free: false, pro: true },
  { feature: 'Bentuk avatar, gaya border, & 12 pasangan font', free: false, pro: true },
  { feature: 'Tata letak grid 2 kolom & kartu besar', free: false, pro: true },
  { feature: 'Thumbnail di semua jenis link', free: 'Khusus CapCut', pro: true },
  { feature: 'Penjadwalan link & grup bisa dilipat', free: false, pro: true },
  { feature: 'Link sorotan (animasi) & embed TikTok/YouTube', free: false, pro: true },
  { feature: 'Peringatan konten sensitif opsional', free: false, pro: true },
  { feature: 'Analitik kunjungan, perangkat, sumber & jam puncak', free: 'Dasar (7 hari)', pro: 'Lengkap (90 hari)' },
  { feature: 'Sembunyikan blok ajakan Luven di bawah profil', free: false, pro: true },
  { feature: 'Judul, deskripsi SEO & gambar Open Graph kustom', free: false, pro: true },
  { feature: 'Kode QR kustom warna & logo', free: 'QR standar', pro: true },
  { feature: 'Bantuan prioritas via TikTok @luvenindonesia', free: false, pro: true },
]
