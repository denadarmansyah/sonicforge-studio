# SONICFORGE STUDIO
Browser voice and sound design studio on the Web Audio API. React 18, TypeScript, Vite, Tailwind 4.

    npm install && npm run dev

- Import audio (drag and drop or button), record from the mic, or load the built-in demo voice.
- 24 procedural library sounds; Custom Builder for voice presets and a synth designer (saved to localStorage).
- Per-track FX chain: sub boost, sub-harmonic, saturation, 5-band EQ, pitch, formant, HPF, compressor, reverb, delay, pan, gain.
- Export mix as WAV 16-bit or 24-bit via OfflineAudioContext.
Notes: pitch is playback-rate based (changes duration). Formant is a shelf-pair tilt, not true formant shifting.
