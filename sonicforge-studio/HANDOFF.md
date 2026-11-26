# HANDOFF — Luven (`luven.my.id`)

Dokumen serah terima (*handoff*) terbaru pada cabang kerja **`wip-linkinbio-pro`** (belum di-*merge* atau di-*push* ke `main`).

> **Struktur Direktori:**  
> Repositori Git berada di folder induk, sedangkan aplikasi utama Vite + React + Vercel (`package.json`, `vercel.json`, `src/`, `api/`, `public/`, `supabase/`) berada di subfolder `sonicforge-studio/`. Salinan `HANDOFF.md`, `README.md`, dan `supabase/migrations/002_plans_links.sql` juga diselaraskan di folder induk.

---

## 1. Status Setiap Bagian Tugas

### A. Sudah Selesai & Terverifikasi
1. **Halaman Profil Publik Link-in-Bio (`/@username`)**
   - Dirender oleh `src/pages/PublicProfilePage.tsx` dan `src/ui/ProfileViewCard.tsx` (`PublicProfileRenderer` dalam mode `fullPage`) **tanpa** navbar maupun footer situs Luven (fokus penuh ke kreator).
   - Mendukung avatar, nama, lencana terverifikasi, bio, baris ikon sosial, daftar blok link (`link`, `capcut`, `tiktok`, `youtube`, `instagram`, `whatsapp`, `website`, `heading`, serta khusus Pro: `announcement`, `embed_tiktok`, `embed_youtube`), grup lipat (*collapsible*), link sorotan, gerbang konten sensitif opsional, galeri template CapCut 4:5, tombol **Bagikan & QR**, tautan kecil **Laporkan halaman ini**, serta blok referral bawah **Buat halaman kamu di Luven** (`/register?ref=username`).
   - Pada paket **Free**, blok referral Luven selalu tampil; pada paket **Pro**, kreator dapat menyembunyikannya. Jika masa aktif Pro habis atau dicabut admin, halaman otomatis kembali ke tema monokrom Free tanpa menghapus data link atau pengaturan Pro yang tersimpan.
2. **Manajemen Link, Studio Tampilan Pro, Analitik 90 Hari, & Tagihan (`/dashboard`)**
   - `src/pages/DashboardPage.tsx` memiliki tab **Link Bio** (CRUD, *drag-and-drop* `Reorder.Group` + tombol urut atas/bawah, penghitung kuota `8 link aktif` Free, penjadwalan tayang, grup lipat, link sorotan), **Tampilan** (`src/ui/AppearanceStudio.tsx`: 24+ preset tema, warna HEX, gradasi 2–3 titik, pola latar, unggah foto latar + *overlay/blur*, pemeriksa kontras WCAG AA + tombol perbaiki kontras 1 klik, 12 pasangan font Google Fonts, gaya tombol/avatar, SEO/OG kustom, warna QR kustom, preset pribadi, + pratinjau HP *real-time*), **Template CapCut**, **Profil**, **Analitik** (7/30/90 hari, klik per link, sumber *referrer*, perangkat Mobile vs Desktop, jam puncak, dan penghitung referral `?ref=`), serta **Paket & Tagihan** (pengingat kedaluwarsa `<= 7` hari & riwayat `subscriptions`).
3. **Sistem Paket, Penegakan Server, Pembayaran, & Halaman `/pricing`**
   - Sumber konfigurasi tunggal di `src/config/plans.ts` (`PLANS.free` vs `PLANS.pro`, harga awal *placeholder* `Rp 39.000/bulan` & `Rp 390.000/tahun`).
   - Halaman `src/pages/PricingPage.tsx` (`/pricing`), modal `src/ui/UpgradeProModal.tsx`, kontrol aktivasi manual **Mode A** (`Pro 30h`, `Pro 1th`, `Cabut Pro`) di `src/pages/AdminPage.tsx` + kontak admin resmi TikTok `@luvenindonesia`, serta endpoint **Mode B** Vercel Serverless Midtrans Snap di `api/midtrans-create.js` dan `api/midtrans-webhook.js`.
   - Injeksi Open Graph dinamis di `api/profile-og.js` menghormati `seoTitle`, `seoDescription`, dan `customOgImageUrl` khusus kreator Pro aktif.
   - Pemulihan kata sandi lanjutan `/login?mode=update-password` pada `src/pages/AuthPage.tsx` sudah aktif.
4. **Standarisasi Komponen Tombol, Token Warna, & Ilustrasi PNG 2D (Aturan A–E)**
   - Seluruh tombol di aplikasi (termasuk `/studio`) memakai komponen terpusat di `src/ui/primitives.tsx` (`Button`, `LinkButton`, `ExternalLinkButton`, `IconButton`, `UnstyledButton`) dengan ukuran `sm=32px`, `md=40px`, `lg=48px`, radius seragam `10px`, area sentuh `>= 44×44px`, dan *loading spinner* tanpa perubahan lebar tombol (`0` tag `<button>` mentah di luar `primitives.tsx`).
   - Logo dan favicon Luven (`Logo.tsx`, `src/assets/brand/*`, `public/brand/*`, `public/favicon.*`, `public/og-image.png`, `public/icon-*.png`) **tidak disentuh sama sekali** (`git diff` bersih).
   - 3 set ilustrasi 2D editorial monokrom berhasil digenerate AI dan dioptimasi ke PNG `@1x` (`800w`) & `@2x` (`1600w`) di bawah `150 KB` di `public/illustrations/` (`hero-main`, `pricing-hero`, `feature-template`). 11 slot ilustrasi lainnya telah dipasangi komponen `EditorialIllustration` berasio tetap tanpa *layout shift* (daftar prompt siap pakai tercantum di Bagian 4).

---

## 2. Verifikasi & Skor Lighthouse Mobile

Seluruh pemeriksaan otomatis telah dijalankan dan lulus bersih:
- **Typecheck & Build**: `npm run typecheck` (`0` error) dan `npm run build` selesai bersih dalam `3.19s`.
- **Audit Statis Kode**: `0` emoji, `0` `<button>` di luar `src/ui/primitives.tsx`, `0` ilustrasi SVG/CSS buatan tangan, `0` warna hex liar di luar token `src/index.css` & konfigurasi tema Pro `src/lib/themeConfig.ts`.
- **Uji E2E & Keamanan (Playwright Chromium)**: Penolakan URL `javascript:`, batas 8 link aktif Free (judul bagian dikecualikan), isolasi `/@username` tanpa navbar/footer Luven, pelacakan referral `?ref=username`, netralisasi payload XSS `<img onerror=...>` & `<script>`, aktivasi Pro 30 hari dari `/admin`, penambahan link ke-9 + sembunyikan CTA Luven saat Pro, serta pencabutan Pro kembali ke tampilan Free tanpa kehilangan data (`0` error konsol).
- **Uji Responsif 7 Breakpoint (`360, 390, 430, 768, 1024, 1280, 1536`)**: Diuji pada 8 rute utama (`56` kombinasi viewport) dengan **`0` horizontal overflow**.
- **Lighthouse Mobile (Produksi Lokal Terkompresi)**:
  - `/` (Beranda): **Performance 97 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.0001`)
  - `/pricing` (Harga): **Performance 93 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0`)
  - `/explore` (Jelajah): **Performance 96 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.030`)
  - `/@kreatoruji` (Link-in-Bio): **Performance 97 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.027`)

---

## 3. Langkah Wajib di Supabase & Variabel Lingkungan

### A. Migrasi SQL di Supabase SQL Editor
Berkas [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql) telah diperiksa penuh: **100% idempoten dan aman** (`add column if not exists`, `create table if not exists`, `create or replace function`, tanpa `drop table` atau penghapusan baris data; bahkan ketika paket Pro kedaluwarsa/dicabut, JSON `theme` Pro milik kreator tetap dipertahankan di kolom `profiles.theme`).

1. Buka **Supabase Dashboard -> SQL Editor -> New query**.
2. Jika proyek baru dan belum pernah menjalankan skema awal, jalankan [`supabase/schema.sql`](./supabase/schema.sql) terlebih dahulu.
3. Tempel seluruh isi [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql) lalu klik **Run**.

### B. Variabel Lingkungan (Nama Saja — Tanpa Nilai Rahasia)
- **Wajib**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_CONTACT_EMAIL`.
- **Opsional (Mode B — Pembayaran Otomatis Midtrans di Vercel Serverless, JANGAN beri awalan `VITE_` pada secret)**:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MIDTRANS_SERVER_KEY`
  - `MIDTRANS_IS_PRODUCTION`
  - `VITE_MIDTRANS_CLIENT_KEY` *(opsional bila memuat skrip Snap di klien; jika mengaktifkan popup Snap langsung di halaman, tambahkan domain Snap Midtrans ke header `Content-Security-Policy` di `vercel.json`, atau gunakan `redirect_url` halaman pembayaran Midtrans yang sudah didukung langsung tanpa ubah CSP).*

---

## 4. Hal yang Belum Selesai / Membutuhkan Keputusan Pemilik

1. **Keputusan Harga Final & Kuota Paket (`src/config/plans.ts`)**
   - Saat ini harga Pro diset sebagai angka *placeholder* (`Rp 39.000/bulan` dan `Rp 390.000/tahun`, `isPlaceholderPrice: true`) dan batas Free adalah `8` link aktif. Ubah langsung di `src/config/plans.ts` (dan sesuaikan angka `8` pada `guard_link_write()` di SQL bila batas Free diubah).
2. **Sisa 11 Slot Ilustrasi PNG 2D AI (Terbatas Kuota Model Gambar `HTTP 429 RESOURCE_EXHAUSTED`)**
   - Enam berkas PNG sudah tersedia di `public/illustrations/`: `hero-main-800.png` (`37.4 KB`), `hero-main-1600.png` (`128.7 KB`), `pricing-hero-800.png` (`38.4 KB`), `pricing-hero-1600.png` (`121.5 KB`), `feature-template-800.png` (`39.8 KB`), dan `feature-template-1600.png` (`144.2 KB`).
   - Untuk melengkapi 11 slot sisanya, simpan berkas PNG `@1x` (`-800.png`) dan `@2x` (`-1600.png`) ke `sonicforge-studio/public/illustrations/` lalu tambahkan slug-nya ke `AVAILABLE_EDITORIAL_SLUGS` di `src/ui/primitives.tsx`:
     - `feature-profile` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, crisp uniform black-white-grayscale linework, minimalist mobile link-in-bio profile screen surrounded by clean link blocks, a QR code square, and a star emblem, generous negative space, flat 2D, no text, no hands, no brand logos."*
     - `feature-soundlab` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, studio headphones resting beside clean concentric sound waves and an equalizer fader module, flat 2D linework, generous negative space, no text, no hands, no logos."*
     - `feature-studio` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, minimalist multitrack audio timeline interface on a sleek monitor with studio speaker monitors and waveform blocks, flat 2D linework, no text, no hands, no logos."*
     - `plan-free` (`20:9`, `800×360` & `1600×720`): *"Clean modern 2D monochrome editorial illustration on solid #0A0A0A dark background, single minimalist smartphone displaying a clean monochrome profile card and compact stacked link bars, generous negative space, flat 2D, no text, no logos."*
     - `plan-pro` (`20:9`, `800×360` & `1600×720`): *"Clean modern 2D monochrome editorial illustration on solid #0A0A0A dark background, customized smartphone profile with layered swatch cards, fountain pen nib, and rising analytics bar chart in crisp grayscale linework, flat 2D, no text, no logos."*
     - `empty-explore` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #0A0A0A dark background, minimalist compass resting on a clean open grid horizon, generous negative space, flat 2D, no text, no logos."*
     - `empty-template` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, open minimalist folder beside an empty vertical video frame with dotted trim guides, flat 2D, no text, no logos."*
     - `empty-dashboard` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, clean studio desk notebook and unlinked chain clasp ready to connect, flat 2D, no text, no logos."*
     - `cta-banner` (`20:9`, `800×360` & `1600×720`): *"Clean modern 2D monochrome editorial illustration on solid #0A0A0A dark background, wide minimalist creator desk with ring light, smartphone on tripod, microphone boom arm, and subtle waveform line, flat 2D, no text, no logos."*
     - `auth-main` (`4:3`, `800×600` & `1600×1200`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, minimalist creator pass card next to a smartphone silhouette and studio headphones, flat 2D, no text, no logos."*
     - `error-404` (`16:9`, `800×450` & `1600×900`): *"Clean modern 2D monochrome editorial illustration on solid #111111 dark background, unplugged quarter-inch audio jack cable resting beside a broken audio waveform line, flat 2D, no text, no logos."*
3. **Uji End-to-End pada Supabase Live & Midtrans Produksi**
   - Setelah menjalankan `002_plans_links.sql` di Supabase Dashboard, uji pembuatan link, unggah gambar latar Pro, aktivasi admin di `/admin`, serta webhook Midtrans (bila Mode B diaktifkan).

---

## 5. Cara Menjalankan

```bash
cd sonicforge-studio
npm install
npm run dev        # Server pengembangan lokal (tambahkan ?sandbox=1 untuk uji lokal tanpa DB live)
npm run typecheck  # Pemeriksaan tipe TypeScript
npm run build      # Build produksi ke dist/
```
