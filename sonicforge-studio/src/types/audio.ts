export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'white' | 'pink'
export interface FX {
  bypass: boolean; subGain: number; subQ: number; subHarm: number; sat: number
  eq: number[]; pitch: number; formant: number; hpf: number
  compThr: number; compRatio: number; compAtk: number; compRel: number
  revMix: number; revDecay: number; dlyTime: number; dlyFb: number; dlyMix: number
  pan: number; gain: number
}
export const DEFAULT_FX: FX = {
  bypass: false, subGain: 0, subQ: 0.8, subHarm: 0, sat: 0, eq: [0, 0, 0, 0, 0], pitch: 0, formant: 0, hpf: 20,
  compThr: 0, compRatio: 1, compAtk: 0.01, compRel: 0.2, revMix: 0, revDecay: 1.8, dlyTime: 250, dlyFb: 0.3, dlyMix: 0, pan: 0, gain: 0,
}
export const EQ_FREQS = [60, 180, 500, 3200, 10000]
export interface Track {
  id: string; name: string; buffer: AudioBuffer; offset: number; fadeIn: number; fadeOut: number
  mute: boolean; solo: boolean; fx: FX
}
export const duration = (t: Track) => t.buffer.duration / Math.pow(2, t.fx.pitch / 12)
export interface SynthParams {
  wave: Wave; f0: number; f1: number; dur: number; a: number; d: number; s: number; r: number
  cutoff: number; cutoff1: number; drive: number; noise: number; partials: number[]; crackle: number; level: number
}
export interface SavedSound { id: string; name: string; p: SynthParams }
export interface Preset { id: string; name: string; cat: string; note: string; fx: Partial<FX>; builtin?: boolean }
