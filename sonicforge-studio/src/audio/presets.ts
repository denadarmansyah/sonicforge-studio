import { Preset } from '../types/audio'
export const PRESET_CATS = ['Cinematic', 'Podcast', 'Voiceover', 'Broadcast', 'Effect', 'Custom']
export const BUILTIN_PRESETS: Preset[] = [
  { id: 'p-cinema', name: 'Deep Cinema Trailer', cat: 'Cinematic', note: 'Heavy low end, lowered pitch, long dark tail.', builtin: true,
    fx: { subGain: 7, subQ: 1, subHarm: 0.35, sat: 0.25, eq: [3, 4, -2, 1, 2], pitch: -3, formant: -4, hpf: 40, compThr: -22, compRatio: 4, compAtk: 0.01, compRel: 0.25, revMix: 0.28, revDecay: 2.8 } },
  { id: 'p-podcast', name: 'Warm Podcast Bass', cat: 'Podcast', note: 'Round proximity warmth, gentle leveling.', builtin: true,
    fx: { subGain: 3, subHarm: 0.1, sat: 0.2, eq: [1, 3, -1, 1.5, 1], hpf: 70, compThr: -20, compRatio: 3, compAtk: 0.015, compRel: 0.2, formant: -1 } },
  { id: 'p-vo', name: 'Crisp Studio Voiceover', cat: 'Voiceover', note: 'Clean body, forward presence, light air.', builtin: true,
    fx: { eq: [-3, 0, -2, 3, 3], hpf: 90, compThr: -18, compRatio: 3, compAtk: 0.008, compRel: 0.15, revMix: 0.06, revDecay: 0.8 } },
  { id: 'p-radio', name: 'Dark Radio Host', cat: 'Broadcast', note: 'Dense mids, rolled-off top, tight dynamics.', builtin: true,
    fx: { subGain: 4, sat: 0.35, eq: [2, 4, 1, -1, -6], pitch: -1, formant: -3, hpf: 60, compThr: -24, compRatio: 5, compAtk: 0.005, compRel: 0.18 } },
  { id: 'p-cyber', name: 'Cyber Comms', cat: 'Effect', note: 'Band-limited, driven, short slap delay.', builtin: true,
    fx: { eq: [-12, -8, 3, 5, -4], hpf: 280, sat: 0.6, formant: 5, dlyTime: 90, dlyFb: 0.35, dlyMix: 0.18, compThr: -26, compRatio: 6 } },
]
