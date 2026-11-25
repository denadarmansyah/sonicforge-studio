# LUVEN STUDIO

Platform kreator sound dan editor audio berbasis Web Audio API. Dibangun dengan React 18, TypeScript, Vite, dan Tailwind CSS 4.

    npm install && npm run dev

- Impor berkas audio (`.mp3`, `.wav`, `.ogg`, `.m4a`) maupun video (`.mp4`, `.mov`, `.webm`, `.mkv`, `.avi`, `.m4v` — jalur suara diekstrak otomatis menjadi track audio), atau rekam langsung dari mikrofon.
- 24 suara sintetis bawaan di Sound Library; Custom Builder untuk menyimpan preset vokal dan desain suara ke `localStorage`.
- Rantai efek per track: sub boost, sub-harmonic, saturasi, 5-band EQ, pitch, formant, high-pass filter, kompresor, reverb, delay, pan, dan gain.
- Ekspor mix proyek atau track tunggal ke WAV (16-bit / 24-bit) maupun MP3 (192 kbps / 320 kbps).
