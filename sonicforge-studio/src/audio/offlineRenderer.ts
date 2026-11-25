import { duration, Track } from '../types/audio'
import { buildChain, isActive } from './audioEngine'

export async function renderMix(tracks: Track[], sr = 44100): Promise<AudioBuffer> {
  const any = tracks.some((t) => t.solo)
  const wet = tracks.some((t) => !t.fx.bypass && (t.fx.revMix > 0 || t.fx.dlyMix > 0))
  const end = Math.max(0.05, ...tracks.map((t) => t.offset + duration(t))) + (wet ? 3 : 0.05)
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(end * sr)), sr)
  tracks.forEach((t) => buildChain(ctx, t, ctx.destination, 0, isActive(t, any)))
  return ctx.startRendering()
}

export async function renderSingleTrack(track: Track, sr = 44100): Promise<AudioBuffer> {
  const normalized: Track = { ...track, offset: 0, mute: false, solo: false }
  const wet = !normalized.fx.bypass && (normalized.fx.revMix > 0 || normalized.fx.dlyMix > 0)
  const end = Math.max(0.05, duration(normalized)) + (wet ? 3 : 0.02)
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(end * sr)), sr)
  buildChain(ctx, normalized, ctx.destination, 0, true)
  return ctx.startRendering()
}
