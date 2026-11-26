# HANDOFF — Luven (`luven.my.id`)

Dokumen serah terima (*handoff*) terbaru pada cabang kerja **`wip-linkinbio-pro`** (belum di-*merge* atau di-*push* ke `main`).

> **Struktur Direktori:**  
> Repositori Git berada di folder induk ini, sedangkan aplikasi utama Vite + React + Vercel (`package.json`, `vercel.json`, `src/`, `api/`, `public/`, `supabase/`) berada di subfolder [`sonicforge-studio/`](./sonicforge-studio/). Dokumen handoff lengkap yang identik juga tersedia di [`sonicforge-studio/HANDOFF.md`](./sonicforge-studio/HANDOFF.md).

---

## Ringkasan Cepat Status

- **Cabang Aktif**: `wip-linkinbio-pro` (`main` tidak di-*push* dan logo/favicon asli tidak disentuh).
- **Build & Typecheck**: `npm run typecheck` dan `npm run build` lulus bersih (`3.19s`, `0` error).
- **Fitur Selesai**:
  - Halaman publik `/@username` murni **Link-in-Bio** tanpa navbar/footer Luven + Open Graph dinamis Pro (`api/profile-og.js`) + referral `?ref=username`.
  - Dasbor kreator (`/dashboard`): tab **Link Bio** (CRUD, reorder, batas 8 link Free, jadwal, grup lipat, link sorotan, embed Pro), **Studio Tampilan** (`AppearanceStudio` 24+ tema, warna/gradasi/pola/foto latar, kontras WCAG AA, 12 font, pratinjau HP langsung), **Template CapCut**, **Profil**, **Analitik** (7/30/90 hari, sumber referrer, perangkat, jam puncak, referral), dan **Paket & Tagihan**.
  - Halaman `/pricing`, modal `UpgradeProModal`, aktivasi manual **Mode A** (`Pro 30h`, `Pro 1th`, `Cabut Pro`) di `/admin`, endpoint **Mode B** Midtrans (`api/midtrans-create.js`, `api/midtrans-webhook.js`), serta form reset sandi `/login?mode=update-password`.
  - Penyatuan penuh komponen tombol di `sonicforge-studio/src/ui/primitives.tsx` (`0` `<button>` liar di luar `primitives.tsx`, `0` emoji, `0` ilustrasi SVG/CSS kode).
- **Skor Lighthouse Mobile**:
  - `/`: **97 / 100 / 100 / 100** (`CLS 0.0001`)
  - `/pricing`: **93 / 100 / 100 / 100** (`CLS 0`)
  - `/explore`: **96 / 100 / 100 / 100** (`CLS 0.030`)
  - `/@username`: **97 / 100 / 100 / 100** (`CLS 0.027`)
- **Langkah Database Berikutnya**: Jalankan [`sonicforge-studio/supabase/migrations/002_plans_links.sql`](./sonicforge-studio/supabase/migrations/002_plans_links.sql) di **Supabase Dashboard -> SQL Editor** (100% idempoten & aman tanpa menghapus data). Detail lengkap termasuk daftar 11 prompt gambar lanjutan ada di [`sonicforge-studio/HANDOFF.md`](./sonicforge-studio/HANDOFF.md).
