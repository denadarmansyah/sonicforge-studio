# Luven (`luven.my.id`)

Platform halaman profil **Link-in-Bio** (`/@username`) dan direktori template untuk kreator **TikTok** & **CapCut**, dilengkapi sistem **Satu Akun = Satu Klaim Username**, **Pengaturan Akun & Password**, **Gerbang Verifikasi & Panel Admin 9 Bagian**, paket **Free & Pro**, **Studio Tampilan**, serta **Alat Audio Studio** berbasis Web Audio API (`/studio`). Dibangun dengan **Vite + React 18 + TypeScript + Tailwind CSS 4 + Supabase**.

---

## Rute Utama Aplikasi

- `/` — Beranda platform kreator
- `/explore` — Pencarian & direktori publik kreator serta template CapCut
- `/pricing` — Perbandingan paket Free vs Pro, siklus bulanan/tahunan, dan FAQ
- `/@username` — Halaman publik Link-in-Bio murni fokus ke kreator (tanpa navbar/footer situs Luven, dilengkapi Open Graph dinamis di `api/profile-og.js`)
- `/login`, `/register`, `/forgot-password` — Autentikasi satu kolom (Google OAuth + Email & Password, mendukung `?ref=username` referral & `?mode=update-password` reset password)
- `/onboarding` — Klaim username atomik 3 langkah (hanya tampil bagi akun yang belum memiliki `username` di database)
- `/dashboard` — Dasbor kreator (Sidebar desktop & bottom bar mobile: Link Bio, Studio Tampilan, Template CapCut, Profil & Sosial, Analitik 7/30/90 hari, Paket & Tagihan)
- `/dashboard/settings` — Pengaturan Akun (Profil, Username & Email terkunci, Cara Masuk Terhubung Google/Email, serta Buat/Ubah Password tanpa password lama dengan ikon mata)
- `/admin` — Gerbang verifikasi passphrase admin (kunci otomatis 30 menit, penguncian 15 menit setelah 5x salah, paksa ganti password sementara) + Panel Admin 9 Bagian (Ringkasan, Pengguna, Username, Template & Link, Laporan, Paket & Langganan, Kreator Pilihan, Log Aktivitas Audit, Pengaturan & Tim Admin). Non-admin melihat halaman 404 standar.
- `/studio` — Editor multitrack Web Audio API (impor audio & video via `decodeAudioData` / fallback `ffmpeg.wasm`, ekspor WAV 16/24-bit & MP3 192/320 kbps)
- `/privacy`, `/terms`, `/contact` — Kebijakan privasi, ketentuan layanan/DMCA, dan kontak bantuan resmi (TikTok `@luvenindonesia`)

---

## Urutan Setup & Migrasi Database di Supabase SQL Editor

Seluruh berkas SQL bersifat **idempoten** (aman dijalankan ulang pada proyek yang sudah memiliki data dan akun Google tanpa menghapus data). Buka [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor** -> **New query**, lalu jalankan sesuai urutan berikut:

### Langkah 1 — Skema Dasar (lewati jika sudah pernah dijalankan, atau jalankan ulang dengan aman)
Salin isi [`supabase/schema.sql`](./supabase/schema.sql) lalu klik **Run**.

### Langkah 2 — Migrasi 002: Link-in-Bio & Paket Free/Pro
Salin isi [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql) lalu klik **Run**.

### Langkah 3 — Migrasi 003: Satu Akun Satu Username, Gerbang Admin & Panel Admin 9 Bagian
Salin isi [`supabase/migrations/003_accounts_and_admin.sql`](./supabase/migrations/003_accounts_and_admin.sql) lalu klik **Run**.

> **Catatan Keamanan Data Lama (Deteksi Duplikat Case-Insensitive):**  
> Sebelum memasang `unique index` pada `lower(username)`, Migrasi `003` memeriksa apakah ada dua baris lama dengan huruf besar/kecil sama. Jika ditemukan, migrasi berhenti otomatis tanpa menyentuh data dan menampilkan daftar ID duplikat. Selesaikan dengan mengubah salah satu username di SQL Editor:
> ```sql
> select set_config('luven.admin_override', 'on', true);
> update public.profiles set username = 'username_baru_unik' where id = '<uuid_akun_kedua>';
> ```
> Lalu jalankan ulang Migrasi `003`.

### Langkah 4 — Pasang Password Sementara Admin Utama (Sekali Jalan)
1. Pastikan akun email admin utama sudah pernah login minimal satu kali di aplikasi (lewat Google atau Email) agar tercatat di `auth.users`.
2. Di **SQL Editor**, jalankan perintah berikut memakai password sementara yang diberikan pada laporan serah terima (ganti `<PASSWORD_ADMIN_SEMENTARA>`):
   ```sql
   select public.admin_set_passphrase('denadarmansyahgm@gmail.com', '<PASSWORD_ADMIN_SEMENTARA>');
   ```
3. **PENTING:** Segera hapus query tersebut dari tab/riwayat **Supabase SQL Editor** setelah selesai dijalankan.
4. Buka `/admin` saat login sebagai admin utama, masukkan password sementara tersebut, lalu sistem akan memaksa penggantian ke password admin permanen baru (minimal 12 karakter, disimpan sebagai hash bcrypt).

### Langkah 5 — Query Pemeriksaan Hasil Migrasi (Siap Salin)
Jalankan query ini di **SQL Editor** untuk memastikan seluruh tabel, index, kata cadangan, dan admin utama telah aktif:

```sql
select
  (select count(*) from public.reserved_usernames) as jumlah_kata_cadangan,
  (select count(*) from public.admins where is_primary = true) as jumlah_admin_utama,
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'profiles_username_lower_uidx'
  ) as unique_lower_username_aktif,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_username'
  ) as rpc_claim_username_aktif,
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_get_overview'
  ) as rpc_admin_dashboard_aktif;
```

---

## Pengaturan Supabase Dashboard yang Perlu Diperiksa

1. **Authentication -> Providers -> Email**:
   - Pastikan **Enable Email provider** aktif.
   - Biarkan **Confirm email** aktif (*ON*). Dengan email terverifikasi, Supabase menjalankan **Automatic Identity Linking**: pengguna yang login dengan Google dan Email pada alamat email yang sama otomatis ditautkan ke satu `auth.users.id` tunggal (satu profil & satu username).
   - Periksa **Secure password change**: jika *OFF* (bawaan), pengguna yang sedang login dapat langsung membuat/mengubah password kapan saja tanpa password lama; jika *ON*, sesi yang sudah berumur lebih dari 24 jam akan menampilkan pesan ramah *"Demi keamanan, silakan masuk ulang lalu coba lagi"*.
2. **Authentication -> Providers -> Google**:
   - Pastikan **Enable Sign in with Google** aktif dengan Client ID & Secret Google OAuth Anda.
3. **Authentication -> URL Configuration**:
   - **Site URL**: `https://luven.my.id` (atau `https://www.luven.my.id` sesuai domain utama Vercel).
   - **Redirect URLs**: tambahkan:
     - `https://luven.my.id/**`
     - `https://www.luven.my.id/**`
     - `http://localhost:5173/**`
   - Ini memastikan redirect login Google ke `/dashboard` dan link reset password ke `/login?mode=update-password` diizinkan penuh.

---

## Variabel Lingkungan (Lokal & Vercel)

Salin `.env.example` menjadi `.env.local` di dalam folder `sonicforge-studio/` (jangan pernah meng-commit `.env.local` atau menaruh secret key dengan awalan `VITE_`):

### Wajib (Frontend & Serverless Open Graph / Sitemap)
- `VITE_SUPABASE_URL` — URL proyek Supabase (`https://<PROJECT_REF>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — Publishable / Anon Key Supabase
- `VITE_SITE_URL` — Origin kanonik situs produksi (`https://luven.my.id`)
- `VITE_CONTACT_EMAIL` — Email kontak resmi di dokumen kebijakan

### Opsional — Pembayaran Paket Pro
- **Mode A (Aktivasi Manual Admin — Aktif Secara Bawaan)**: Tidak memerlukan kunci tambahan. Pengguna menekan **Upgrade ke Pro** -> menghubungi admin lewat TikTok `@luvenindonesia` -> admin mengaktifkan Pro dari `/admin`.
- **Mode B (Checkout Otomatis Midtrans Snap di Vercel Serverless)**: Isi di **Vercel Environment Variables** (tanpa awalan `VITE_` untuk rahasia server):
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MIDTRANS_SERVER_KEY`
  - `MIDTRANS_IS_PRODUCTION` (`false` atau `true`)
  - `VITE_MIDTRANS_CLIENT_KEY` *(opsional)*

---

## Menjalankan & Menguji Lokal

```bash
cd sonicforge-studio
npm install
npm run dev
npm run typecheck
npm run build
```

### Pipeline Gambar Ilustrasi 2D (`scripts/generate-images.mjs` & `scripts/build-images.mjs`)
- Buku arah seni dan seluruh prompt siap pakai berada di [`docs/ART_DIRECTION.md`](./docs/ART_DIRECTION.md) serta [`docs/IMAGE_PROMPTS.md`](./docs/IMAGE_PROMPTS.md).
- Untuk menghasilkan sisa master gambar via API gambar ke `raw-assets/images/` (tidak di-commit) lalu mengoptimasinya ke `public/images/`: tambahkan `IMAGE_API_KEY=...` di `.env.local` lalu jalankan `node scripts/generate-images.mjs`, atau jalankan `npm run build:images` setelah menaruh berkas master manual.
