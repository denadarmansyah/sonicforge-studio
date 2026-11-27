# Buku Arah Seni (Art Direction) — Luven

Dokumen ini menjadi acuan tunggal untuk seluruh pembuatan dan kurasi ilustrasi 2D editorial pada situs **Luven** (`luven.my.id`).

---

## 1. Karakter Visual & Gaya
- **Gaya Utama**: Ilustrasi 2D *flat* bergaya editorial modern dengan ketebalan garis (*line weight*) tegas dan konsisten, bentuk geometris sederhana, proporsi anatomi serta objek yang wajar, banyak ruang kosong (*negative space*), dan nuansa studio kreatif profesional.
- **Hal yang Dilarang**: Bukan 3D, bukan *render* mengkilap, bukan foto realistis, bukan kartun anak-anak, tanpa gradien warna atau efek *glow*, dan **dilarang keras** menggambar ilustrasi lewat kode (SVG manual, CSS shapes, `<canvas>`).

## 2. Palet Warna
- **Monokrom Murni**: Hitam (`#0A0A0A`), Putih (`#FFFFFF`), dan 3–4 tingkatan abu-abu netral (`#262626`, `#525252`, `#A3A3A3`, `#E5E5E5`).
- Tidak boleh ada aksen warna selain hitam, putih, dan abu-abu.

## 3. Tema, Subjek, & Aturan Teks/Karakter
- **Dunia Subjek**: Kreator video pendek, ponsel vertikal yang sedang mengedit timeline video, headphone studio, mikrofon kondensor, laptop multitrack, panel mixer (knob & fader), serta gelombang suara (*waveform*).
- **Representasi Orang**: Sosok generik bergaya editorial yang proporsional (wajah dan jari tangan anatomis wajar), tanpa kemiripan dengan individu nyata siapa pun.
- **Bebas Teks & Merek**: Nol huruf, nol angka, nol teks acak, nol logo merek nyata, nol karakter berhak cipta, dan nol *watermark* di dalam gambar.

## 4. Pencahayaan, Latar, & Komposisi
- **Satu Titik Fokus**: Setiap kanvas hanya memiliki satu gagasan visual utama; subjek tidak menabrak tepi kanvas.
- **Ruang Kosong Terarah**: Sisakan bidang lapang pada sisi kanvas yang berdekatan dengan teks (misalnya sisi kiri pada `hero-main` desktop dan `og-image`, atau sisi atas pada `hero-main-mobile`).
- **Pembingkaian Kartu**: Seluruh ilustrasi ditempatkan di dalam kartu berradius seragam dengan `border: 1px` dan warna latar miliknya sendiri (`#0A0A0A` hitam atau `#FFFFFF` putih sesuai spesifikasi bagian), sehingga transisi tepi selalu rapi dan tajam.

---

## 5. Awalan Prompt Wajib (Master Prefix)

Gunakan awalan berikut secara persis untuk **semua** gambar sebelum menambahkan *brief* spesifik masing-masing aset:

> `"Flat 2D editorial illustration, monochrome only (black, white and grays), consistent clean line weight, simple geometric shapes, generous negative space, modern professional design-studio quality, subject: short-video creators, audio and editing tools. No text, no letters, no numbers, no logos, no watermark, no 3D rendering, no photo, no color, no glow, no gradients of color, people are generic with no resemblance to real individuals, anatomically correct hands and faces, clean edges, high resolution."`

---

## 6. Daftar Spesifikasi Master (`raw-assets/images/`)

| No | Nama Aset | Resolusi Master | Rasio | Latar | Ringkasan Brief |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `hero-main` | `2400×1500` | `16:10` | Hitam (`#0A0A0A`) | Kreator memakai headphone memegang HP sambil mengedit video, gelombang suara melengkung di sekitarnya; subjek di kanan, sisi kiri lapang. |
| 2 | `hero-main-mobile` | `1600×2000` | `4:5` | Hitam (`#0A0A0A`) | Subjek yang seragam dengan `hero-main` di tengah-bawah, ruang kosong luas di bagian atas. |
| 3 | `feature-templates` | `1600×1200` | `4:3` | Putih (`#FFFFFF`) | Beberapa layar HP bertumpuk rapi menampilkan bingkai video vertikal sederhana tanpa tulisan. |
| 4 | `feature-soundlab` | `1600×1200` | `4:3` | Hitam (`#0A0A0A`) | Panel mixer audio bersih dengan deretan knob, fader, dan garis waveform. |
| 5 | `feature-studio` | `1600×1200` | `4:3` | Putih (`#FFFFFF`) | Laptop terbuka menampilkan timeline audio multitrack berupa blok waveform abstrak. |
| 6 | `feature-profile` | `1600×1200` | `4:3` | Hitam (`#0A0A0A`) | Satu layar HP vertikal menampilkan lingkaran avatar dan susunan tombol link rapi tanpa huruf. |
| 7 | `pricing-main` | `1600×1200` | `4:3` | Putih (`#FFFFFF`) | Dua kartu sederhana berdampingan: satu kartu polos dan satu kartu dengan simbol bintang. |
| 8a | `plan-free` | `1000×1000` | `1:1` | Putih (`#FFFFFF`) | Satu kartu halaman profil minimalis yang bersih dan sederhana. |
| 8b | `plan-pro` | `1000×1000` | `1:1` | Putih (`#FFFFFF`) | Kartu halaman serupa dengan lapisan aksen geometris dan simbol bintang monokrom. |
| 9 | `auth-main` | `1600×1200` | `4:3` | Hitam (`#0A0A0A`) | Pintu studio sedikit terbuka dengan alur gelombang suara mengalir keluar, kesan masuk ke ruang kreatif. |
| 10a | `empty-explore` | `1000×1000` | `1:1` | Hitam (`#0A0A0A`) | Kaca pembesar bersih melayang di atas kotak kosong geometris. |
| 10b | `empty-templates` | `1000×1000` | `1:1` | Putih (`#FFFFFF`) | Map/folder terbuka kosong dengan satu bingkai klip video kecil. |
| 10c | `empty-dashboard` | `1000×1000` | `1:1` | Hitam (`#0A0A0A`) | Papan kanvas kosong rapi dengan simbol tanda tambah (`+`) geometris di tengah. |
| 11 | `cta-banner` | `2400×1029` | `21:9` | Hitam (`#0A0A0A`) | Komposisi panorama lebar, headphone studio di tengah dengan pita gelombang suara halus dan ruang kosong lega di kiri-kanan. |
| 12 | `error-404` | `1000×1000` | `1:1` | Putih (`#FFFFFF`) | Dua ujung kabel jack headphone yang terlepas berhadapan di tengah bidang putih bersih. |
| 13 | `og-image` | `1200×630` | `1.91:1` | Hitam (`#0A0A0A`) | Komposisi perangkat audio & gelombang suara di sisi kanan dengan ruang kosong luas di sisi kiri (tanpa teks dan tanpa logo). |
