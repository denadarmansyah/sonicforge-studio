# Luven (`luven.my.id`)

Platform halaman profil **Link-in-Bio** (`/@username`) dan direktori template untuk kreator **TikTok** & **CapCut**, dilengkapi sistem paket **Free & Pro**, **Studio Tampilan**, serta **Alat Audio Studio** berbasis Web Audio API (`/studio`). Dibangun dengan **Vite + React 18 + TypeScript + Tailwind CSS 4 + Supabase**.

---

## Struktur Utama

- `/` — Beranda platform kreator
- `/explore` — Pencarian & direktori publik kreator serta template CapCut
- `/pricing` — Perbandingan paket Free vs Pro, simulasi siklus bulanan/tahunan, dan FAQ
- `/@username` — Halaman publik Link-in-Bio murni fokus ke kreator (tanpa navbar/footer situs Luven, dilengkapi Open Graph dinamis di `api/profile-og.js`)
- `/login`, `/register`, `/forgot-password`, `/onboarding` — Autentikasi (mendukung `?ref=username` referral & `?mode=update-password`) + onboarding 3 langkah
- `/dashboard` — Dasbor kreator (Kelola Link Bio, Studio Tampilan + pratinjau HP langsung, Template CapCut, Profil, Analitik 7/30/90 hari + Referral, Paket & Tagihan)
- `/admin` — Panel moderasi laporan, verifikasi, ban/unban, kurasi kreator pilihan, dan aktivasi/pencabutan manual paket Pro
- `/studio` — Editor multitrack Web Audio API (impor audio & video via `decodeAudioData` / fallback `ffmpeg.wasm`, ekspor WAV 16/24-bit & MP3 192/320 kbps)
- `/privacy`, `/terms`, `/contact` — Dokumen kebijakan privasi, ketentuan konten/DMCA, dan halaman bantuan resmi (TikTok `@luvenindonesia`)

---

## Langkah Setup Database Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor** -> **New query**.
2. Jalankan berkas skema dasar [`supabase/schema.sql`](./supabase/schema.sql) (idempoten).
3. Buka **New query** lagi, lalu salin dan jalankan berkas migrasi [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql) (idempoten & aman tanpa menghapus data lama) untuk mengaktifkan:
   - Kolom `plan`, `plan_expires_at`, `theme`, `settings`, dan `referred_by` pada `public.profiles`.
   - Tabel `public.links` + trigger `guard_link_write()` (menegakkan batas maksimal 8 link aktif pada paket Free, blok khusus Pro, dan pembatas 60 link/jam) + kebijakan RLS.
   - Tabel `public.subscriptions` + RLS + fungsi RPC `public.admin_set_user_plan(...)`.
   - Perluasan agregat analitik anonim pada `public.events` dan RPC `public.record_event(...)`.

---

## Variabel Lingkungan (Lokal & Vercel)

Salin `.env.example` menjadi `.env.local` di dalam folder `sonicforge-studio/` (jangan pernah meng-commit `.env.local` atau menaruh secret key dengan awalan `VITE_`):

### Wajib (Frontend & Serverless Open Graph / Sitemap)
- `VITE_SUPABASE_URL` — URL proyek Supabase (`https://<PROJECT_REF>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — Publishable / Anon Key Supabase
- `VITE_SITE_URL` — Origin kanonik situs produksi (`https://luven.my.id`)
- `VITE_CONTACT_EMAIL` — Email kontak resmi di dokumen kebijakan

### Opsional — Pembayaran Paket Pro
- **Mode A (Aktivasi Manual Admin — Aktif Secara Bawaan)**: Tidak memerlukan kunci tambahan. Pengguna menekan **Upgrade ke Pro** -> menghubungi admin lewat TikTok `@luvenindonesia` -> admin mengaktifkan Pro (30 hari / 1 tahun) dari halaman `/admin` tab **Kreator**.
- **Mode B (Checkout Otomatis Midtrans Snap di Vercel Serverless)**: Isi variabel berikut di **Vercel Project Settings -> Environment Variables** (tanpa awalan `VITE_` untuk rahasia server):
  - `SUPABASE_SERVICE_ROLE_KEY` *(khusus server Vercel untuk `api/midtrans-create.js` & `api/midtrans-webhook.js`)*
  - `MIDTRANS_SERVER_KEY` *(khusus server Vercel)*
  - `MIDTRANS_IS_PRODUCTION` (`false` untuk Sandbox, `true` untuk Produksi)
  - `VITE_MIDTRANS_CLIENT_KEY` *(opsional jika memakai Snap popup di klien)*

---

## Menjalankan & Membangun Gambar Ilustrasi

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

### Pipeline Gambar Ilustrasi 2D (`scripts/generate-images.mjs` & `scripts/build-images.mjs`)
- Buku arah seni dan seluruh prompt siap pakai berada di [`docs/ART_DIRECTION.md`](./docs/ART_DIRECTION.md) serta [`docs/IMAGE_PROMPTS.md`](./docs/IMAGE_PROMPTS.md).
- Untuk membuat sisa aset gambar master secara otomatis via API gambar ke `raw-assets/images/` (tidak di-commit) lalu mengoptimasinya ke `public/images/<nama>-800.png` & `-1600.png`:
  1. Tambahkan baris `IMAGE_API_KEY=...` ke berkas `.env.local` (jangan di-commit).
  2. Jalankan `node scripts/generate-images.mjs`.
- Jika Anda membuat berkas master secara manual dari `docs/IMAGE_PROMPTS.md` dan menyimpannya ke `raw-assets/images/<nama>.png`, jalankan `npm run build:images` (`node scripts/build-images.mjs`) lalu daftarkan namanya ke `AVAILABLE_ILLUSTRATIONS` di `src/ui/Illustration.tsx`.

