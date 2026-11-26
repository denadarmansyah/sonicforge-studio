# HANDOFF — Luven (`luven.my.id`)

Dokumen serah terima (*handoff*) untuk melanjutkan pengembangan, konfigurasi backend, pengujian akhir, dan *deployment* proyek **Luven**.

> **Struktur Direktori Penting:**  
> Repositori Git berada di folder induk, sedangkan root aplikasi Vite + React + Vercel (`package.json`, `vercel.json`, `src/`, `api/`) berada di subfolder `sonicforge-studio/`. Salinan berkas `HANDOFF.md`, `README.md`, dan `supabase/schema.sql` juga ditempatkan di folder induk agar mudah ditemukan dari mana saja.

---

## 1. Ringkasan Arsitektur & Stack

| Lapisan | Teknologi & Implementasi |
| :--- | :--- |
| **Framework & Build** | Vite 5 + React 18 + TypeScript (`~5.5.4`) |
| **Styling & Design System** | Tailwind CSS 4 (`@tailwindcss/vite`) dengan *single source of truth* CSS tokens di `sonicforge-studio/src/index.css` (`@theme`) dan pembaca token dinamis untuk `<canvas>` Studio di `sonicforge-studio/src/theme/studioTheme.ts`. |
| **Routing & Animasi** | `react-router-dom` v7 (rute *lazy-loaded* di `src/App.tsx`), `framer-motion` (reordering kartu & transisi), serta `lenis` (*lazy-loaded* khusus pointer desktop `>=1024px` di `src/ui/SiteLayout.tsx`). |
| **Ikon & Utilitas UI** | `lucide-react`, ikon SVG kustom merek di `src/ui/BrandIcons.tsx`, serta `qrcode` (*lazy-loaded* saat modal QR dibuka di `src/ui/ShareAndReportModals.tsx`). |
| **Backend & Database** | `@supabase/supabase-js` v2 untuk Auth, Postgres, RPC, dan Storage. Didukung *dual data adapter* di `src/lib/platformStore.ts`: mode **Supabase Live** (utama) dan mode **Sandbox Lokal** (`localStorage`) khusus `localhost`/`127.0.0.1` atau saat env belum diset untuk pengujian UI tanpa data palsu bawaan. |
| **Hosting & Serverless (Vercel)** | Konfigurasi `sonicforge-studio/vercel.json` + Vercel Serverless Functions: `api/profile-og.js` (injeksi *Open Graph* dinamis untuk `/@:username`) dan `api/sitemap.js` (generator `/sitemap.xml` dinamis). |
| **Alat Audio Studio (`/studio`)** | Web Audio API multitrack editor + ekstraksi audio dari video (`.mp4`, `.mov`, `.webm`, `.mkv`, `.avi`, `.m4v`) via `decodeAudioData` dengan fallback `@ffmpeg/ffmpeg` (`public/ffmpeg/`), serta ekspor WAV 16/24-bit dan MP3 192/320 kbps lewat Web Worker (`src/workers/mp3Encoder.worker.ts`, `@breezystack/lamejs`). |

---

## 2. Daftar Halaman & Fitur yang Sudah Selesai

### Rute & Halaman (`sonicforge-studio/src/pages/`)
- **Beranda (`/`, `HomePage.tsx`)**: Hero berdesain perangkat audio/DJ, pratinjau profil yang ditandai jelas `Contoh Tampilan`, seksi direktori komunitas langsung dari DB (dengan *empty state* jujur saat DB kosong), seksi alur kerja 3 langkah kontras terang, bento fitur, dan FAQ akordeon.
- **Jelajah (`/explore`, `ExplorePage.tsx`)**: Pencarian teks (`q`), filter kategori & tag, pengurutan (`Terbaru` / `Populer Minggu Ini`), strip *Kreator Pilihan* (berdasarkan kolom `is_featured`), paginasi, modal detail template, dan modal pelaporan.
- **Profil Publik (`/@username`, `PublicProfilePage.tsx` + `api/profile-og.js`)**: Tampilan *link-in-bio* responsif yang tetap seimbang meskipun tanpa banner atau dengan 0–1 template, badge terverifikasi, tautan keluar aman (`rel="noopener noreferrer nofollow ugc"`), pelacakan klik anonim, tombol Bagikan/QR, dan modal Laporkan.
- **Autentikasi (`/login`, `/register`, `/forgot-password`, `AuthPage.tsx`)**: Login email+sandi, pendaftaran kreator dengan notifikasi verifikasi email, permintaan reset sandi, tombol Google OAuth (tampil saat Supabase terkonfigurasi), dan `SupabaseSetupPanel` bila environment belum siap.
- **Onboarding 3 Langkah (`/onboarding`, `OnboardingPage.tsx`)**:
  1. Klaim username dengan pengecekan real-time ke RPC/store serta pemblokiran *reserved* & pola impersonasi (`validators.ts`).
  2. Pengisian nama tampilan, kategori utama, dan bio (maks 160 karakter).
  3. Penautan akun TikTok (mendukung input `@handle` maupun URL HTTPS resmi).
- **Dasbor Kreator (`/dashboard`, `DashboardPage.tsx`)**: Tab Kelola Template (CRUD, validasi domain CapCut/TikTok, *drag-and-drop reorder* via `Reorder.Group` + tombol naik/turun aksesibel, sembunyikan/tampilkan), Edit Profil dengan pratinjau langsung (*side-by-side* di desktop, tab *Pratinjau* di mobile), kompresi gambar klien otomatis ke WebP (`imageProcessor.ts`: avatar 512×512, banner 1600×534, thumbnail 800×1000, maks 2 MB), analitik 7/30 hari & template terpopuler, serta unduh QR PNG (`QrShareModal`).
- **Panel Moderasi (`/admin`, `AdminPage.tsx`)**: Khusus user yang terdaftar di `public.admins`; menampilkan antrean laporan masuk (selesaikan/abaikan/hapus template/ban akun), manajemen kreator (verifikasi, jadikan pilihan, ban/pulihkan), dan kurasi status template.
- **Alat Audio Studio (`/studio`, `StudioPage.tsx`)**: Editor audio multitrack + impor video-ke-audio + rekaman mikrofon + ekspor WAV/MP3 yang telah disatukan dengan token tema utama.
- **Halaman Legal, Kontak, 404 & SEO (`SupportPages.tsx`, `public/robots.txt`, `api/sitemap.js`)**: `/privacy`, `/terms` (termasuk daftar konten terlarang & alur DMCA), `/contact` (formulir ber-honeypot + rate-limit ke RPC `submit_contact_message`), halaman 404, `robots.txt`, dan dynamic `sitemap.xml`.

### Keamanan, Database & Build
- **Skema Postgres Lengkap (`supabase/schema.sql`)**: Tabel `admins`, `profiles`, `templates`, `events` (agregat harian tanpa IP/data pribadi pengunjung), `reports`, `contact_messages`, `private.rate_buckets`; fungsi validator `is_valid_username`, domain URL whitelist; trigger `guard_profile_privileged_columns` & `guard_template_write`; kebijakan **RLS aktif di semua tabel** menggunakan `private.is_admin()` dan `(select auth.uid())`; RPC `check_username_available`, `record_event`, `submit_report`, `submit_contact_message`; serta bucket Storage `avatars`, `banners`, `thumbnails`.
- **Header & Routing Produksi (`vercel.json`)**: HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, CSP yang mengizinkan Supabase & WASM, MIME `application/wasm` untuk FFmpeg, serta *rewrite* `/@:username` dan `/sitemap.xml`.
- **Optimasi Bundle & Aksesibilitas**: Pemisahan chunk (`react-vendor`, `motion`, `supabase`, *lazy* `lenis` & `qrcode`), penghapusan nesting interaktif `<Link><Button>` menjadi `LinkButton` ber-target sentuh `>=44px`, dan penyesuaian kontras teks kecil ke `text-fg-sec`.

---

## 3. Fitur yang Setengah Jadi (Parsial)

1. **Alur Lanjutan Reset Kata Sandi (`?mode=update-password`)**  
   - Fungsi `requestPasswordReset` di `src/lib/platformStore.ts` mengarahkan tautan pemulihan email ke `/login?mode=update-password`.  
   - Namun `src/pages/AuthPage.tsx` saat ini baru memiliki UI untuk `login`, `register`, dan `forgot`, sehingga form untuk memasukkan kata sandi baru (`supabase.auth.updateUser({ password })`) setelah pengguna mengklik tautan dari email belum diimplementasikan.
2. **Pengujian Backend Terhadap Supabase Produksi vs Sandbox**  
   - Seluruh query, RPC, dan kebijakan RLS di `src/lib/platformStore.ts` dan `supabase/schema.sql` sudah ditulis, tetapi alur pengguna yang sudah diuji sejauh ini berjalan menggunakan **Mode Sandbox Lokal** di browser (`?sandbox=1`), belum diuji *end-to-end* langsung ke proyek Supabase live.
3. **Audit Multi-Breakpoint & Lighthouse Mobile**  
   - Skrip Playwright untuk 108 kombinasi viewport (`360px`–`1920px`, *landscape*, dan `200%` zoom) dan skrip audit Lighthouse mobile sudah disiapkan di direktori *scratch* sesi sebelumnya, namun proses audit terhenti di bagian akhir E2E sebelum tahap pengecekan viewport & Lighthouse sempat diselesaikan.

---

## 4. Yang Belum Dikerjakan

1. Menjalankan serta memverifikasi `supabase/schema.sql` langsung di proyek Supabase target, menambahkan minimal satu akun ke tabel `public.admins`, lalu melakukan uji E2E penuh pada environment **Supabase Live** (auth, verifikasi email, unggah gambar Storage ke bucket, RLS, dan fungsi serverless Vercel).
2. Menambahkan mode form **`update-password`** pada `/login?mode=update-password` di `AuthPage.tsx` agar alur "Lupa kata sandi?" tuntas sampai pengguna bisa menyimpan password baru.
3. Menuntaskan eksekusi audit **Playwright 108 kombinasi viewport** (memeriksa screenshot & memastikan nol *horizontal overflow*) serta menjalankan **Lighthouse Mobile** pada rute `/`, `/explore`, dan `/@username` (target Performance >=90, Accessibility >=95, Best Practices >=95, SEO >=95).
4. Menyediakan gambar raster `og:image` statis (PNG/WebP `1200×630`) untuk pratinjau beranda apabila diperlukan — saat ini fallback `og:image` di `index.html` dan `api/profile-og.js` masih memakai `/favicon.svg` (sebagian platform chat lebih memprioritaskan PNG/JPG dibanding SVG untuk kartu tautan utama).
5. Menetapkan email dukungan produksi yang aktif pada `VITE_CONTACT_EMAIL` (default saat ini adalah `halo@luven.my.id`) dan meng-*commit* perubahan kerja yang masih berada di *working tree* Git.

---

## 5. Cara Menjalankan & Menguji

Masuk ke folder aplikasi Vite (`sonicforge-studio/sonicforge-studio/`):

> **Catatan Windows PowerShell:** Apabila eksekusi `npm` diblokir kebijakan skrip (`npm.ps1`), jalankan `npm.cmd` atau lewat `cmd /c`.

### Pengembangan Lokal
1. Pasang dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env.local` dan isi variabel yang dibutuhkan (atau tambahkan `?sandbox=1` di URL `http://localhost:5173/?sandbox=1` untuk mencoba alur di browser lokal tanpa menyentuh database live).
   - *Catatan:* di `localhost` / `127.0.0.1`, jika `?sandbox=1` pernah diaktifkan (`localStorage['luven.dev_sandbox_enabled'] = '1'`), data akan memakai Sandbox lokal; gunakan `?sandbox=0` atau tombol **Matikan & Reset Sandbox** untuk kembali ke Supabase live.
3. Jalankan server dev:
   ```bash
   npm run dev
   ```

### Pemeriksaan Tipe & Build Produksi
```bash
npm run typecheck
npm run build
npm run preview
```
*Status terakhir yang terverifikasi sebelum handoff:* `tsc --noEmit` dan `vite build` lulus bersih tanpa error (`dist/` terbangun dalam 3.44s).

### Pengujian End-to-End yang Disarankan
- Uji daftar -> onboarding 3 langkah -> unggah avatar/banner/thumbnail (pastikan konversi WebP) -> tambah/urutkan/sembunyikan template CapCut -> unduh QR PNG.
- Uji kunjungan `/@username` (termasuk *hard refresh* di Vercel untuk memverifikasi `api/profile-og.js` dan rewrite `/@:username`), kirim laporan `"Laporkan"`, cek angka di tab Analitik Dasbor.
- Uji `/admin` (dengan akun yang sudah masuk ke `public.admins`): selesaikan laporan, beri lencana verifikasi, jadikan pilihan, ban akun (pastikan `/@username` langsung menampilkan tidak ditemukan), lalu pulihkan akun.
- Uji `/studio`: impor berkas audio/video (`.mp4`/`.wav`/`.mp3`) dan ekspor WAV/MP3.

---

## 6. Variabel Lingkungan yang Dibutuhkan (Nama Saja)

Daftar nama variabel yang perlu dikonfigurasi pada `.env.local` (lokal) serta **Vercel Project Settings -> Environment Variables**:

- `VITE_SUPABASE_URL` — URL proyek Supabase.
- `VITE_SUPABASE_ANON_KEY` — Publishable / Anon Key Supabase untuk akses klien.
- `VITE_SITE_URL` — URL kanonik domain produksi (contoh penggunaan: pembentukan tautan `/@username`, QR code, canonical SEO, sitemap).
- `VITE_CONTACT_EMAIL` — Alamat email kontak resmi yang ditampilkan pada halaman `/contact`, `/privacy`, `/terms`, dan footer.

*(Opsional untuk serverless function non-Vite bila dipisahkan di Vercel: `api/profile-og.js` dan `api/sitemap.js` juga mendukung fallback pembacaan nama `SUPABASE_URL` dan `SUPABASE_ANON_KEY`. Jangan pernah menggunakan `service_role` key pada variabel berawalan `VITE_`.)*

---

## 7. Status Setup Supabase & Google Login

### Yang Sudah Ada di Kode & Lingkungan Lokal
- Berkas skema [`supabase/schema.sql`](./supabase/schema.sql) sudah ditulis lengkap dan *idempotent* (tabel, index, trigger proteksi kolom admin, RLS di seluruh tabel, RPC ber-rate-limit, serta Storage buckets & policies).
- Berkas `.env.example` sudah tersedia dan `.gitignore` sudah mengecualikan `.env`, `.env.local`, `node_modules`, `dist`, serta `.vercel`.
- Berkas `.env.local` di mesin pengembangan lokal sudah ada dan memuat `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY` (tidak pernah di-commit).
- Klien `src/lib/supabaseClient.ts` serta fungsi login Google (`signInWithGoogleOAuth()`) dan tombol **"Masuk dengan Google"** pada `src/pages/AuthPage.tsx` sudah terpasang dengan redirect ke `${window.location.origin}/onboarding`.

### Yang Masih Perlu Dikonfirmasi / Dilakukan di Dashboard Eksternal
Selama sesi ini, koneksi MCP Supabase gagal karena token OAuth tidak tersedia (`No such refresh token found`), sehingga **langkah-langkah di Dashboard eksternal berikut belum terkonfirmasi dan wajib dicek langsung**:
1. **Jalankan SQL Schema**: Buka Supabase Dashboard -> SQL Editor -> tempel dan jalankan seluruh isi `supabase/schema.sql`.
2. **Konfigurasi Auth Redirect URLs**: Di Supabase -> Authentication -> URL Configuration, set Site URL ke `https://luven.my.id` dan tambahkan Redirect URL `https://luven.my.id/**` serta `http://localhost:5173/**`.
3. **Google OAuth Provider**: Di Google Cloud Console buat OAuth 2.0 Client ID (Web application) dengan *Authorized redirect URI* `https://<PROJECT_REF>.supabase.co/auth/v1/callback`, lalu masukkan *Client ID* & *Client Secret* ke Supabase -> Authentication -> Providers -> Google dan aktifkan provider.
4. **Daftarkan Admin Pertama**: Setelah akun pemilik mendaftar via `/register` dan menyelesaikan onboarding, jalankan SQL `insert into public.admins (user_id, note) ...` sesuai panduan di `README.md`.

---

## 8. Masalah yang Belum Beres & Hal yang Perlu Diperhatikan

1. **Form Update Password Belum Tersedia**: Tautan email reset sandi mengarah ke `/login?mode=update-password`, namun `AuthPage.tsx` belum merender form ubah kata sandi.
2. **Skrip Audit E2E Terhenti pada Selector Tab Admin**: Pada uji Playwright di sandbox lokal (`full_audit.mjs`), langkah A sampai F serta sebagian langkah G (memuat `/admin` dan mengabaikan laporan) berjalan dengan nol error konsol maupun HTTP. Pengujian berhenti karena skrip mencari tab berlabel `/Pengguna/i`, padahal teks tab di `AdminPage.tsx` adalah `Kreator`. Akibatnya, uji Ban/Unban, uji regresi `/studio`, audit responsive 108 kombinasi viewport, dan audit Lighthouse belum tuntas dijalankan ulang pasca-refactor `LinkButton`.
3. **Akses MCP Supabase Terputus**: Pemanggilan tool Supabase MCP gagal dengan galat autentikasi `404 Not Found: No such refresh token found`, sehingga status tabel/RLS/provider di instance Supabase remote belum terinspeksi otomatis.
4. **Perubahan Git Belum Di-commit**: Seluruh penambahan/modifikasi platform baru serta penghapusan aset landing page lama masih berada pada *working tree* Git (belum di-commit ke branch `main`). Saat deploy ke Vercel nanti, pastikan pengaturan **Root Directory** mengarah ke `sonicforge-studio`, **Framework Preset = Vite**, **Build Command = `npm run build`**, dan **Output Directory = `dist`**.
