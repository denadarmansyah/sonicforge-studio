import { DEFAULT_FX, EQ_FREQS, FX, Track } from '../types/audio'
import { makeIR } from './impulseResponse'

const pb = new Float32Array(1024)
export function peak(a: AnalyserNode) {
  a.getFloatTimeDomainData(pb); let m = 0
  for (let i = 0; i < pb.length; i++) m = Math.max(m, Math.abs(pb[i]))
  return m
}
export const isActive = (t: Track, anySolo: boolean) => !t.mute && (!anySolo || t.solo)

function satCurve(amt: number) {
  const n = 1024, c = new Float32Array(n), k = 1 + amt * 9
  for (let i = 0; i < n; i++) c[i] = Math.tanh(k * ((i / (n - 1)) * 2 - 1)) / Math.tanh(k)
  return c
}

// Octave-down generator: flip-flop divider on the low band, shaped by its envelope.
const subCache = new WeakMap<AudioBuffer, AudioBuffer>()
function subBuffer(b: AudioBuffer): AudioBuffer {
  const hit = subCache.get(b); if (hit) return hit
  const sr = b.sampleRate, n = b.length, src = b.getChannelData(0), out = new Float32Array(n)
  const a = 1 - Math.exp((-2 * Math.PI * 120) / sr), a2 = 1 - Math.exp((-2 * Math.PI * 70) / sr)
  let lp = 0, env = 0, sign = 1, prev = 0, o = 0
  for (let i = 0; i < n; i++) {
    lp += a * (src[i] - lp)
    const sg = lp > 0 ? 1 : -1
    if (prev !== 0 && sg !== prev && sg > 0) sign = -sign
    prev = sg; env += 0.001 * (Math.abs(lp) - env); o += a2 * (sign * env * 2 - o); out[i] = o
  }
  const s = new AudioBuffer({ length: n, sampleRate: sr }); s.copyToChannel(out, 0)
  subCache.set(b, s); return s
}

export interface Chain { update(fx: FX, active: boolean): void; stop(): void }

export function buildChain(ctx: BaseAudioContext, t: Track, dest: AudioNode, from: number, active: boolean): Chain | null {
  const buf = t.buffer, rate0 = Math.pow(2, t.fx.pitch / 12)
  const bo = Math.max(0, (from - t.offset) * rate0)
  if (bo >= buf.duration) return null
  const bq = (type: BiquadFilterType, f: number) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; return n }
  const g = () => ctx.createGain()
  const src = ctx.createBufferSource(); src.buffer = buf
  const sub = ctx.createBufferSource(); sub.buffer = subBuffer(buf)
  const hpf = bq('highpass', 20), boost = bq('peaking', 80)
  const eq = EQ_FREQS.map((f, i) => bq(i === 0 ? 'lowshelf' : i === 4 ? 'highshelf' : 'peaking', f))
  const fl = bq('lowshelf', 700), fh = bq('highshelf', 2000)
  const sat = ctx.createWaveShaper(); sat.oversample = '2x'
  const bus = g(), subG = g(), comp = ctx.createDynamicsCompressor(), mix = g()
  const conv = ctx.createConvolver(), revG = g(), dly = ctx.createDelay(2), fb = g(), dlyG = g()
  const pan = ctx.createStereoPanner(), out = g(), fade = g()
  const link = (nodes: AudioNode[]) => nodes.reduce((a, b) => { a.connect(b); return b })
  link([src, hpf, boost, ...eq, fl, fh, sat, bus, comp, mix, pan, out, fade, dest])
  link([sub, subG, bus]); link([comp, conv, revG, mix]); link([comp, dly, dlyG, mix]); link([dly, fb, dly])

  let lastSat = -1, lastDecay = -1
  const update = (fx: FX, act: boolean) => {
    const e = fx.bypass ? { ...DEFAULT_FX, pan: fx.pan, gain: fx.gain } : fx
    hpf.frequency.value = e.hpf; boost.gain.value = e.subGain; boost.Q.value = e.subQ
    eq.forEach((n, i) => { n.gain.value = e.eq[i] })
    fl.gain.value = -e.formant * 0.75; fh.gain.value = e.formant * 0.75
    if (e.sat !== lastSat) { sat.curve = e.sat > 0 ? satCurve(e.sat) : null; lastSat = e.sat }
    subG.gain.value = e.subHarm * 1.5
    comp.threshold.value = e.compThr; comp.ratio.value = e.compRatio; comp.attack.value = e.compAtk; comp.release.value = e.compRel; comp.knee.value = 12
    if (e.revMix > 0 && e.revDecay !== lastDecay) { conv.buffer = makeIR(ctx, e.revDecay); lastDecay = e.revDecay }
    revG.gain.value = e.revMix; dly.delayTime.value = e.dlyTime / 1000; fb.gain.value = e.dlyFb; dlyG.gain.value = e.dlyMix
    pan.pan.value = e.pan / 100; out.gain.value = act ? Math.pow(10, e.gain / 20) : 0
    const r = Math.pow(2, e.pitch / 12); src.playbackRate.value = r; sub.playbackRate.value = r
  }
  update(t.fx, active)

  const base = ctx.currentTime + (t.offset - from), at = Math.max(ctx.currentTime, base), dur = buf.duration / rate0
  const fg = fade.gain
  fg.setValueAtTime(t.fadeIn > 0 ? 0 : 1, base)
  if (t.fadeIn > 0) fg.linearRampToValueAtTime(1, base + t.fadeIn)
  if (t.fadeOut > 0) { fg.setValueAtTime(1, Math.max(base + t.fadeIn, base + dur - t.fadeOut)); fg.linearRampToValueAtTime(0, base + dur) }
  src.start(at, bo); sub.start(at, bo)
  return { update, stop: () => { try { src.stop(); sub.stop() } catch { /* already stopped */ } } }
}

export class Engine {
  private c?: AudioContext
  private master?: GainNode
  private an: AnalyserNode[] = []
  private live = new Map<string, Chain>()
  private pv?: AudioBufferSourceNode
  private t0 = 0
  private p0 = 0
  on = false

  get ctx(): AudioContext {
    if (!this.c) {
      const c = new AudioContext(), m = c.createGain(), sp = c.createChannelSplitter(2)
      m.connect(c.destination); m.connect(sp)
      this.an = [0, 1].map((i) => { const a = c.createAnalyser(); a.fftSize = 1024; sp.connect(a, i); return a })
      this.c = c; this.master = m
    }
    return this.c
  }
  private get out() { void this.ctx; return this.master! }

  play(tracks: Track[], from: number) {
    this.stop()
    const c = this.ctx; void c.resume()
    const any = tracks.some((t) => t.solo)
    tracks.forEach((t) => { const ch = buildChain(c, t, this.out, from, isActive(t, any)); if (ch) this.live.set(t.id, ch) })
    this.t0 = c.currentTime; this.p0 = from; this.on = true
  }
  stop() { this.live.forEach((c) => c.stop()); this.live.clear(); this.on = false }
  position() { return this.on ? this.p0 + this.ctx.currentTime - this.t0 : this.p0 }
  sync(tracks: Track[]) {
    if (!this.on) return
    const any = tracks.some((t) => t.solo)
    tracks.forEach((t) => this.live.get(t.id)?.update(t.fx, isActive(t, any)))
  }
  level(ch: number) { const a = this.an[ch]; return a ? peak(a) : 0 }
  preview(buf: AudioBuffer) {
    try { this.pv?.stop() } catch { /* ignore */ }
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.connect(this.out); void this.ctx.resume(); s.start(); this.pv = s
  }
}
export const engine = new Engine()
