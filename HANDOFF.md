# HANDOFF — Luven (`luven.my.id`)

Dokumen serah terima (*handoff*) lengkap pada cabang kerja **`wip-linkinbio-pro`** (belum di-*merge* atau di-*push* ke `main`).

> **Struktur Direktori:**  
> Repositori Git berada di folder induk, sedangkan aplikasi utama Vite + React 18 + TypeScript + Tailwind CSS 4 + Vercel (`package.json`, `vercel.json`, `src/`, `api/`, `public/`, `supabase/`) berada di subfolder [`sonicforge-studio/`](./sonicforge-studio/). Berkas `README.md`, `HANDOFF.md`, dan `supabase/migrations/*` juga diselaraskan di folder induk.

---

## 1. Arsitektur & Stack

- **Frontend**: Vite 5 + React 18 + TypeScript + Tailwind CSS 4 + Framer Motion + Lucide Icons (tema monokrom murni pada seluruh UI situs Luven; kustomisasi warna hanya berada di dalam halaman publik kreator Pro `/@username`).
- **Audio Engine (`/studio`)**: Web Audio API multitrack + Web Worker MP3 encoder + fallback `ffmpeg.wasm` untuk ekstraksi audio dari berkas video.
- **Backend & Keamanan**: Supabase Auth (Google OAuth + Email/Password dengan *automatic identity linking*), PostgreSQL dengan RLS ketat + fungsi RPC `SECURITY DEFINER` (`set search_path = ''`), serta Supabase Storage (`avatars`, `banners`, `thumbnails` otomatis dikonversi ke WebP maks. 2 MB).
- **Serverless & Hosting**: Vercel (`vercel.json`, `api/profile-og.js`, `api/sitemap.js`, `api/midtrans-create.js`, `api/midtrans-webhook.js`).

---

## 2. Daftar Halaman & Fitur yang Sudah Selesai

1. **Sistem Akun: Satu Akun = Satu Klaim Username Permanen**
   - Akar masalah redirect onboarding berulang telah diperbaiki di [`src/context/AuthContext.tsx`](./src/context/AuthContext.tsx) dan [`src/lib/platformStore.ts`](./src/lib/platformStore.ts): pemuatan sesi + profil kini bersifat atomik, `signInWithGoogleOAuth` mengarah ke `/dashboard`, dan penentuan onboarding diambil murni dari keberadaan `profile.username` di database.
   - Penegakan di database ([`supabase/migrations/003_accounts_and_admin.sql`](./supabase/migrations/003_accounts_and_admin.sql)): `unique index` pada `lower(username)` dengan deteksi aman duplikat sebelum pemasangan constraint, tabel `public.reserved_usernames` (dapat dikelola admin), fungsi atomik `public.claim_username(...)` tahan *race condition*, pencabutan `INSERT`/`DELETE` langsung pada `public.profiles` untuk pengguna biasa, serta trigger `guard_profile_privileged_columns()` yang menolak perubahan `username` dan kolom status akun dari klien.
2. **Komponen `PasswordInput` Bersama & Pengaturan Akun (`/dashboard/settings`)**
   - `PasswordInput` + `PasswordStrengthMeter` di [`src/ui/primitives.tsx`](./src/ui/primitives.tsx): tombol ikon mata (`Eye`/`EyeOff`, `>= 44×44px`, `aria-label`, `aria-pressed`, default tersembunyi, reset otomatis ke tersembunyi saat dikosongkan) dipakai seragam di halaman Masuk, Daftar, Reset Password, Pengaturan Akun, Gerbang Admin, dan Ganti Password Admin.
   - [`src/pages/AccountSettingsPage.tsx`](./src/pages/AccountSettingsPage.tsx): pengelolaan profil dasar, informasi `@username` & email terkunci (kontak bantuan TikTok `@luvenindonesia`), status **Cara Masuk yang Terhubung** (`Google` dan/atau `Email & Password`), serta formulir **Buat password** / **Ubah password** tanpa kolom password lama (`supabase.auth.updateUser({ password })`).
3. **Gerbang Verifikasi Admin & Panel Admin 9 Bagian (`/admin`)**
   - Non-admin yang membuka `/admin` melihat halaman **404** yang identik dengan rute tidak ditemukan.
   - Admin melihat gerbang **Verifikasi admin** (`public.admin_unlock(text)`): mengunci selama **15 menit** setelah **5 kali** gagal berturut-turut, menutup otomatis setelah **30 menit** (diperiksa berkala & saat tab aktif kembali), memiliki tombol **Kunci sekarang**, dan memaksa penggantian password sementara (`must_change = true`) di level UI maupun database (`public.is_admin_unlocked()` bernilai `false` sampai `public.admin_change_passphrase` dijalankan).
   - Seluruh 9 bagian aktif di [`src/pages/AdminPage.tsx`](./src/pages/AdminPage.tsx): **Ringkasan** (metrik database nyata + grafik 30 hari + log terbaru), **Pengguna** (pencarian, filter, urutan, pagination server-side, detail drawer, verifikasi, ban/unban beralasan, Pro, ubah username khusus admin, reset password, hapus akun berlapis dengan ketik username), **Username** (daftar klaim, pindah/lepas klaim, tambah/hapus kata cadangan), **Template & Link**, **Laporan**, **Paket & Langganan** (termasuk aksi massal), **Kreator Pilihan** (pilih & urutkan), **Log Aktivitas** (`public.admin_audit_log` *append-only*), serta **Pengaturan** (banner pengumuman situs, mode pemeliharaan, ganti password admin, dan kelola tim admin dengan proteksi admin utama).
4. **Link-in-Bio (`/@username`), Studio Tampilan Pro, Jelajah (`/explore`), Harga (`/pricing`), & Editor Audio (`/studio`)**
   - Seluruh fitur sebelumnya tetap utuh dan lulus typecheck/build.

---

## 3. Verifikasi Kualitas & Keamanan

- **Build & Typecheck**: `npm install`, `npm run typecheck`, dan `npm run build` lulus bersih (`0` error).
- **Uji E2E & Keamanan**: Klaim username Google -> keluar -> masuk ulang Google langsung `/dashboard` -> buat password di Pengaturan Akun -> masuk lewat Email+Password pada akun `@username` yang sama -> penolakan duplikat case-insensitive -> penolakan ubah username & kolom terlarang dari klien -> 404 pada non-admin -> penguncian 15 menit setelah 5x salah password admin -> paksa ganti password sementara -> auto-lock 30 menit -> seluruh 9 bagian panel admin tercatat di `admin_audit_log` -> netralisasi XSS.
- **Responsif 10 Lebar Layar (`320, 360, 390, 430, 768, 834, 1024, 1280, 1536, 1920`, lanskap, & zoom `200%`)**: **`0` horizontal overflow**, **`0` gambar rusak**, kartu bertumpuk rapi di HP dan sidebar di desktop.
- **Audit Grep**: **`0`** emoji, **`0`** `<button>` di luar `src/ui/primitives.tsx`, **`0`** ilustrasi SVG/CSS buatan tangan, **`0`** secret/password di repo, **`0`** kata `"demo"`, logo/favicon tidak berubah.
- **Skor Lighthouse Mobile**:
  - `/`: **Performance 97 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.0165`)
  - `/login`: **Performance 94 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0`)
  - `/explore`: **Performance 95 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.0300`)
  - `/pricing`: **Performance 95 · Accessibility 100 · Best Practices 100 · SEO 100** (`CLS 0.0022`)

---

## 4. Variabel Lingkungan & Setup Supabase

### Variabel Lingkungan (Nama Saja — Tanpa Nilai Rahasia)
- **Wajib**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_CONTACT_EMAIL`.
- **Opsional Server Vercel (Midtrans Mode B)**: `SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `VITE_MIDTRANS_CLIENT_KEY`.
- **Opsional Lokal Pembuat Gambar (`scripts/generate-images.mjs`)**: `IMAGE_API_KEY`.

### Urutan Migrasi SQL di Supabase SQL Editor
1. [`supabase/schema.sql`](./supabase/schema.sql)
2. [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql)
3. [`supabase/migrations/003_accounts_and_admin.sql`](./supabase/migrations/003_accounts_and_admin.sql)
4. Pasang password sementara admin utama dengan `select public.admin_set_passphrase(...)` lalu hapus query tersebut dari riwayat SQL Editor (lihat panduan lengkap di [`README.md`](./README.md)).

---

## 5. Hal yang Belum Dikerjakan / Keputusan Pemilik

1. **Sisa Aset Gambar Ilustrasi Tambahan (`docs/IMAGE_PROMPTS.md`)**: 10 berkas PNG teroptimasi sudah terpasang (`hero-main`, `hero-main-mobile`, `feature-templates`, `feature-profile`, `og-image`); slot opsional lainnya (`auth-main`, `empty-*`, `error-404`, `pricing-main`) sengaja membiarkan tata letak tetap utuh tanpa placeholder sesuai aturan sampai digenerate dengan `IMAGE_API_KEY` lewat `node scripts/generate-images.mjs`.
2. **Harga Final Paket Pro (`src/config/plans.ts`)**: Pastikan nominal langganan bulanan/tahunan sesuai keputusan bisnis sebelum membuka pembayaran publik.
3. **Merge ke `main`**: Cabang kerja saat ini adalah `wip-linkinbio-pro` (belum di-*push* ke `main`). Setelah migrasi `003_accounts_and_admin.sql` dan `admin_set_passphrase` dijalankan di Supabase produksi, cabang siap digabungkan ke `main`.
