import { SynthParams } from '../types/audio'

export const SYNTH_BASE: SynthParams = {
  wave: 'sine', f0: 100, f1: 100, dur: 1, a: 0.01, d: 0.2, s: 0, r: 0.1, cutoff: 20000, cutoff1: 20000,
  drive: 0, noise: 0, partials: [1], crackle: 0, level: 0.9,
}
const osc = (w: string, p: number) => {
  const x = p % 1
  return w === 'sine' ? Math.sin(2 * Math.PI * p) : w === 'triangle' ? 4 * Math.abs(x - 0.5) - 1 : w === 'sawtooth' ? 2 * x - 1 : x < 0.5 ? 1 : -1
}

export function synthesize(p: SynthParams, sr: number): AudioBuffer {
  const n = Math.max(1, Math.floor(p.dur * sr)), o = new Float32Array(n)
  const f0 = Math.max(1, p.f0), f1 = Math.max(1, p.f1), c0 = Math.max(20, p.cutoff), c1 = Math.max(20, p.cutoff1)
  const isNoise = p.wave === 'white' || p.wave === 'pink'
  let ph = 0, lp = 0, b0 = 0, b1 = 0, b2 = 0, peak = 1e-9
  for (let i = 0; i < n; i++) {
    const t = i / sr, k = i / n
    ph += (f0 * Math.pow(f1 / f0, k)) / sr
    let s = 0
    if (isNoise) {
      let x = Math.random() * 2 - 1
      if (p.crackle > 0) x = Math.random() < p.crackle ? x : 0
      if (p.wave === 'pink') { b0 = 0.99765 * b0 + x * 0.099046; b1 = 0.963 * b1 + x * 0.2965164; b2 = 0.57 * b2 + x * 1.0526913; x = (b0 + b1 + b2 + x * 0.1848) * 0.3 }
      s = x
    } else {
      p.partials.forEach((r, j) => { s += osc(p.wave, ph * r) / (j + 1) })
      if (p.partials.length > 1) s /= 1.5
    }
    if (p.noise > 0) s = s * (1 - p.noise) + (Math.random() * 2 - 1) * p.noise
    const fc = c0 * Math.pow(c1 / c0, k)
    lp += (1 - Math.exp((-2 * Math.PI * fc) / sr)) * (s - lp); s = lp
    let e = t < p.a ? t / Math.max(p.a, 1e-4) : t < p.a + p.d ? 1 - (1 - p.s) * ((t - p.a) / Math.max(p.d, 1e-4)) : p.s
    const rel = Math.max(1e-3, Math.min(p.r, p.dur))
    if (t > p.dur - rel) e *= (p.dur - t) / rel
    s = Math.tanh(s * e * (1 + p.drive * 6)); o[i] = s; peak = Math.max(peak, Math.abs(s))
  }
  const g = p.level / peak, buf = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr })
  for (let i = 0; i < n; i++) o[i] *= g
  buf.copyToChannel(o, 0); buf.copyToChannel(o, 1)
  return buf
}

export const SOUND_CATS = ['Sub & Bass', 'Transitions', 'UI & Clicks', 'Foley', 'Stingers & Tones']
export interface LibItem { id: string; cat: string; name: string; p: SynthParams }
const L = (id: string, cat: string, name: string, p: Partial<SynthParams>): LibItem => ({ id, cat, name, p: { ...SYNTH_BASE, ...p } })
export const SOUNDS: LibItem[] = [
  L('sub-drop', SOUND_CATS[0], 'Deep Sub Drop', { f0: 90, f1: 30, dur: 2, a: 0.005, d: 1.5, s: 0, r: 0.3, drive: 0.3 }),
  L('thump', SOUND_CATS[0], 'Chest Thump', { f0: 120, f1: 45, dur: 0.5, d: 0.3, r: 0.1, drive: 0.5, noise: 0.05, cutoff: 600 }),
  L('boom', SOUND_CATS[0], 'Low Boom', { f0: 70, f1: 28, dur: 3, d: 2.5, r: 0.5, noise: 0.2, cutoff: 400, cutoff1: 120, drive: 0.6 }),
  L('sub-swell', SOUND_CATS[0], 'Sub Swell', { f0: 35, f1: 50, dur: 3, a: 1.5, d: 0.5, s: 0.8, r: 1 }),
  L('whoosh', SOUND_CATS[1], 'Clean Air Whoosh', { wave: 'white', dur: 1.6, a: 0.7, d: 0.6, s: 0.1, r: 0.3, cutoff: 400, cutoff1: 6000 }),
  L('whip', SOUND_CATS[1], 'Fast Whip', { wave: 'white', dur: 0.5, a: 0.08, d: 0.3, r: 0.1, cutoff: 8000, cutoff1: 500 }),
  L('riser', SOUND_CATS[1], 'Reverse Riser', { wave: 'white', dur: 3, a: 2.8, d: 0.01, s: 1, r: 0.05, cutoff: 300, cutoff1: 9000 }),
  L('sweep', SOUND_CATS[1], 'Soft Sweep', { wave: 'pink', dur: 2.2, a: 1, d: 0.8, r: 0.4, cutoff: 500, cutoff1: 3000 }),
  L('dark', SOUND_CATS[1], 'Dark Transition', { wave: 'sawtooth', f0: 70, f1: 40, noise: 0.3, dur: 2.5, a: 1.2, d: 0.8, r: 0.4, cutoff: 300, cutoff1: 200, drive: 0.3 }),
  L('switch', SOUND_CATS[2], 'Mechanical Switch', { wave: 'square', f0: 1800, f1: 400, dur: 0.08, d: 0.04, r: 0.02, noise: 0.3, cutoff: 5000 }),
  L('glass', SOUND_CATS[2], 'Glass Tap', { f0: 2400, f1: 2300, partials: [1, 2.76, 5.4], dur: 0.5, d: 0.4, r: 0.1 }),
  L('confirm', SOUND_CATS[2], 'Soft Confirm', { f0: 660, f1: 880, dur: 0.25, d: 0.15, r: 0.08 }),
  L('tick', SOUND_CATS[2], 'Subtle Tick', { wave: 'white', dur: 0.03, d: 0.02, r: 0.005, cutoff: 8000, cutoff1: 3000 }),
  L('blip', SOUND_CATS[2], 'Digital Blip', { wave: 'square', f0: 1200, f1: 1800, dur: 0.12, d: 0.08, r: 0.03, cutoff: 6000 }),
  L('paper', SOUND_CATS[3], 'Paper Rustle', { wave: 'white', dur: 1.2, a: 0.1, d: 0.9, s: 0.2, r: 0.1, cutoff: 7000, cutoff1: 3000, crackle: 0.3 }),
  L('vinyl', SOUND_CATS[3], 'Vinyl Crackle Loop', { wave: 'white', dur: 4, a: 0.01, d: 0.01, s: 1, r: 0.1, cutoff: 6000, crackle: 0.0012 }),
  L('room', SOUND_CATS[3], 'Warm Room Tone', { wave: 'pink', dur: 4, a: 1, d: 0.1, s: 0.5, r: 1, cutoff: 500, cutoff1: 400 }),
  L('rain', SOUND_CATS[3], 'Rain Ambience', { wave: 'white', dur: 5, a: 1, d: 0.1, s: 0.6, r: 1.2, cutoff: 7000, crackle: 0.1 }),
  L('wind', SOUND_CATS[3], 'Wind Bed', { wave: 'pink', dur: 5, a: 1.5, d: 0.1, s: 0.7, r: 1.5, cutoff: 300, cutoff1: 900 }),
  L('chime', SOUND_CATS[4], 'Broadcast Chime', { f0: 880, f1: 880, partials: [1, 2, 3.01], dur: 2, d: 1.8, r: 0.2 }),
  L('drone', SOUND_CATS[4], 'Low Tension Drone', { wave: 'sawtooth', f0: 55, f1: 55, partials: [1, 1.01, 1.5], dur: 4, a: 1.5, d: 0.5, s: 0.8, r: 1, cutoff: 400, cutoff1: 700, drive: 0.2 }),
  L('pulse', SOUND_CATS[4], 'Sub Pulse', { f0: 50, f1: 50, dur: 1, a: 0.02, d: 0.5, s: 0.3, r: 0.3 }),
  L('bell', SOUND_CATS[4], 'Studio Bell', { f0: 523, f1: 523, partials: [1, 2.4, 3.9, 5.9], dur: 3, d: 2.8, r: 0.2 }),
  L('chord', SOUND_CATS[4], 'Minimal Chord', { wave: 'triangle', f0: 220, f1: 220, partials: [1, 1.26, 1.5, 2], dur: 3, a: 0.1, d: 1, s: 0.5, r: 1 }),
]

// Formant-style synthetic speech-like sample (glottal saw through three resonators).
export function demoVoice(sr: number): AudioBuffer {
  const V = [[730, 1090], [270, 2290], [300, 870], [530, 1840], [660, 1720], [400, 1000]]
  const n = Math.floor(4.2 * sr), o = new Float32Array(n), y = [[0, 0], [0, 0], [0, 0]]
  let ph = 0, pk = 1e-9
  for (let i = 0; i < n; i++) {
    const t = i / sr, syl = Math.floor(t / 0.7), l = (t % 0.7) / 0.7
    const env = l < 0.08 ? l / 0.08 : l < 0.8 ? 1 : Math.max(0, 1 - (l - 0.8) / 0.1)
    ph += (112 + 14 * Math.sin(syl * 1.7) - 10 * l + 3 * Math.sin(2 * Math.PI * 5.5 * t)) / sr
    const x = 2 * (ph % 1) - 1 + (Math.random() * 2 - 1) * 0.05, vw = V[syl % V.length]
    let s = 0
    ;[vw[0], vw[1], 2800].forEach((f, j) => {
      const r = Math.exp((-Math.PI * (60 + j * 40)) / sr)
      const v = (1 - r) * x + 2 * r * Math.cos((2 * Math.PI * f) / sr) * y[j][0] - r * r * y[j][1]
      y[j][1] = y[j][0]; y[j][0] = v; s += v * (j === 2 ? 0.4 : 1)
    })
    o[i] = s * env; pk = Math.max(pk, Math.abs(o[i]))
  }
  for (let i = 0; i < n; i++) o[i] *= 0.8 / pk
  const b = new AudioBuffer({ numberOfChannels: 2, length: n, sampleRate: sr })
  b.copyToChannel(o, 0); b.copyToChannel(o, 1)
  return b
}
