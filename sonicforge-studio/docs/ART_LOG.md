# Log Kurasi & Pembuatan Gambar (`ART_LOG.md`)

Catatan pemeriksaan kualitas setiap percobaan generasi gambar AI terhadap daftar uji wajib:
1. Monokrom murni (hitam, putih, abu-abu; nol warna lain)
2. Nol teks, huruf, angka, logo, atau watermark
3. Proporsi tangan, wajah, dan objek wajar (tidak meleleh/terdistorsi)
4. Ketebalan garis seragam & tepi tajam
5. Komposisi sesuai brief dengan ruang kosong (*negative space*) tepat sasaran

---

## Catatan Percobaan

### 1. `hero-main` (2400×1500, Latar Hitam `#0A0A0A`)
- **Percobaan 1** (`hero_main_anchor_1795743285629.jpg`): **LULUS (Jangkar Gaya Utama)**. Monokrom murni hitam-putih-abu, nol teks/huruf/logo, proporsi wajah dan kedua tangan (5 jari menggenggam HP + telunjuk mengedit) wajar dan bersih, ketebalan garis konsisten, subjek kreator ber-headphone dengan gelombang suara berada tepat di sisi kanan dan sisi kiri 100% lapang hitam bersih untuk tipografi. Disimpan ke `raw-assets/images/hero-main.png` (2400×1500).

### 2. `hero-main-mobile` (1600×2000, Latar Hitam `#0A0A0A`)
- **Percobaan 1** (`hero_main_mobile_1795744793719.jpg`): **LULUS**. Karakter, ketebalan garis, headphone, dan gelombang suara seragam dengan `hero-main`; subjek di tengah-bawah dan bagian atas lapang hitam murni `#0A0A0A`, nol teks/logo, tangan dan wajah anatomis wajar. Disimpan ke `raw-assets/images/hero-main-mobile.png` (1600×2000).

### 3. `feature-templates` (1600×1200, Latar Putih `#FFFFFF`)
- **Percobaan 1** (`feature_templates_1795744808920.jpg`): **LULUS (Setelah Pemusatan Kanvas Putih)**. Tumpukan layar HP menampilkan bingkai video dengan ikon *play* dan *timeline* bersih tanpa huruf/angka di atas latar putih murni `#FFFFFF`; margin kiri berlebih dipangkas dan dipusatkan presisi ke `1600×1200` pada `raw-assets/images/feature-templates.png`.

### 6. `feature-profile` (1600×1200, Latar Hitam `#0A0A0A`)
- **Percobaan 1** (`pricing_hero_raw_1795684178670.jpg`): **LULUS**. Layar HP vertikal di tengah menampilkan siluet avatar bulat dan susunan tombol link horizontal rapi tanpa huruf/logo di atas latar hitam murni. Disimpan ke `raw-assets/images/feature-profile.png` (1600×1200).

### 13. `og-image` (1200×630, Latar Hitam `#0A0A0A`)
- **Percobaan 1** (`hero_main_raw_1795684020705.jpg`): **LULUS**. Meja kreatif (headphone, HP ber-timeline, mikrofon, gelombang suara) di sisi kanan dengan ruang kosong hitam luas di sisi kiri, nol teks/logo pada ilustrasi mentah; logo resmi vektor `luven-logo-horizontal.svg` ditempatkan oleh pipeline `build-images.mjs` di sisi kiri menghasilkan `public/og-image.png` (`1200×630`).

### 4, 5, 7, 8, 9, 10, 11, 12 (11 Gambar Sisanya)
- **Status**: Terhenti oleh batas kapasitas kuota model gambar bawaan lingkungan (`HTTP 429 ResourceExhausted: quota will reset after 4h34m19s`). Sesuai aturan keras, **tidak** diganti dengan gambar buatan kode SVG/CSS/canvas; prompt siap pakai ditulis di `docs/IMAGE_PROMPTS.md`, skrip `scripts/generate-images.mjs` (`IMAGE_API_KEY`) telah disiapkan, dan tata letak seluruh halaman disusun rapi tanpa kotak kosong atau teks placeholder.
