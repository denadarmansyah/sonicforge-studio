# Luven (`luven.my.id`)

Platform promosi profil resmi dan direktori template untuk kreator **TikTok** & **CapCut**, dilengkapi **Alat Audio Studio** berbasis Web Audio API (`/studio`). Dibangun dengan **Vite + React 18 + TypeScript + Tailwind CSS 4 + Supabase**.

---

## Struktur Utama

- `/` — Beranda platform kreator
- `/explore` — Pencarian & direktori publik kreator serta template CapCut
- `/@username` — Halaman profil publik kreator (dilengkapi fungsi serverless Open Graph di `api/profile-og.js`)
- `/login`, `/register`, `/forgot-password`, `/onboarding` — Autentikasi & wizard onboarding 3 langkah
- `/dashboard` — Dasbor kreator (edit profil + pratinjau langsung, kelola/urutkan template, analitik 7/30 hari, kode QR)
- `/admin` — Panel moderasi laporan, verifikasi, ban/unban, dan kurasi kreator pilihan (khusus admin)
- `/studio` — Editor multitrack Web Audio API (impor audio & video via `decodeAudioData` / fallback `ffmpeg.wasm`, ekspor WAV 16/24-bit & MP3 192/320 kbps)
- `/privacy`, `/terms`, `/contact` — Dokumen kebijakan privasi, ketentuan konten/DMCA, dan formulir kontak
- `supabase/schema.sql` — Skema lengkap database Postgres, RLS di semua tabel, fungsi validasi domain/username, RPC analitik & laporan ber-rate-limit, serta Storage buckets

---

## Langkah Setup Lengkap

### 1. Membuat Proyek Supabase & Menjalankan `schema.sql`

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan klik **New Project**.
2. Setelah proyek aktif, buka menu **SQL Editor** -> **New query**.
3. Salin seluruh isi berkas [`supabase/schema.sql`](./supabase/schema.sql), tempel ke editor, lalu klik **Run**.
4. Kemudian buka **New query** lagi dan jalankan berkas migrasi [`supabase/migrations/002_plans_links.sql`](./supabase/migrations/002_plans_links.sql) untuk mengaktifkan sistem link-in-bio, paket `free`/`pro`, batas link sisi server, analitik PRO, dan tabel `subscriptions`.
   - Skrip ini bersifat *idempotent* dan langsung menyiapkan:
     - Tabel `profiles`, `templates`, `events`, `reports`, `admins`, dan `contact_messages`.
     - Kebijakan **Row Level Security (RLS)** ketat untuk seluruh tabel.
     - Bucket Storage `avatars`, `banners`, dan `thumbnails` (batas 2 MB, khusus JPG/PNG/WebP).

### 2. Mengisi Variabel Lingkungan (Lokal & Vercel)

1. Masuk ke folder proyek Vite (`sonicforge-studio`) dan salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Ambil kredensial dari **Supabase Dashboard -> Project Settings -> API**, lalu isi di `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://PROJECT_REF_ANDA.supabase.co
   VITE_SUPABASE_ANON_KEY=PUBLISHABLE_ATAU_ANON_KEY_ANDA
   VITE_SITE_URL=https://luven.my.id
   VITE_CONTACT_EMAIL=email_resmi_anda@luven.my.id
   ```
   > **Penting:** Jangan pernah menaruh `service_role` secret key ke variabel `VITE_` atau meng-commit berkas `.env.local` ke Git.
3. Jalankan secara lokal:
   ```bash
   npm install
   npm run dev
   ```

### 3. Mengonfigurasi URL Redirect Auth & Google Login (Opsional)

1. Di **Supabase Dashboard -> Authentication -> URL Configuration**:
   - **Site URL**: `https://luven.my.id`
   - **Redirect URLs**: tambahkan `https://luven.my.id/**` dan `http://localhost:5173/**`.
2. *(Opsional)* Untuk mengaktifkan tombol **"Masuk dengan Google"**:
   - Buka [Google Cloud Console](https://console.cloud.google.com/apis/credentials), buat **OAuth 2.0 Client ID** (Web application).
   - Tambahkan *Authorized redirect URI* yang ditampilkan di **Supabase Dashboard -> Authentication -> Providers -> Google** (`https://<PROJECT_REF>.supabase.co/auth/v1/callback`).
   - Masukkan *Client ID* dan *Client Secret* ke halaman provider Google di Supabase lalu simpan.

### 4. Menjadikan Akun Anda sebagai Admin (`/admin`)

1. Daftar akun terlebih dahulu melalui halaman `/register` di situs Anda dan selesaikan onboarding.
2. Buka **Supabase Dashboard -> SQL Editor**, lalu jalankan perintah berikut (ganti dengan alamat email akun Anda):
   ```sql
   insert into public.admins (user_id, note)
   select id, 'Owner utama Luven'
   from auth.users
   where email = 'email_akun_anda@domain.com'
   on conflict (user_id) do nothing;
   ```
3. Muat ulang halaman situs — tombol **Moderasi** (`/admin`) akan muncul otomatis di bilah navigasi Anda.

### 5. Deploy ke Vercel (`luven.my.id`)

1. Hubungkan repositori GitHub Anda ke [Vercel](https://vercel.com/new).
2. Pada **Project Settings -> General**:
   - **Root Directory**: `sonicforge-studio` *(jika repo memiliki subfolder `sonicforge-studio`)*
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Pada **Project Settings -> Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` (`https://luven.my.id`)
   - `VITE_CONTACT_EMAIL`
4. Pada **Project Settings -> Domains**, tambahkan domain `luven.my.id` dan arahkan DNS sesuai instruksi Vercel.
   - Berkas [`vercel.json`](./vercel.json) sudah mengatur header keamanan (`HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`), header `application/wasm` untuk `/ffmpeg/*.wasm`, rute `/sitemap.xml`, serta fungsi serverless `/api/profile-og` agar pratinjau Open Graph `/@username` di WhatsApp/TikTok/Instagram dan *direct refresh* berjalan mulus tanpa 404.
