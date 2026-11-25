import { duration, Track } from '../types/audio'
import { buildChain, isActive } from './audioEngine'

export async function renderMix(tracks: Track[], sr = 44100): Promise<AudioBuffer> {
  const any = tracks.some((t) => t.solo)
  const wet = tracks.some((t) => !t.fx.bypass && (t.fx.revMix > 0 || t.fx.dlyMix > 0))
  const end = Math.max(1, ...tracks.map((t) => t.offset + duration(t))) + (wet ? 3 : 0.2)
  const ctx = new OfflineAudioContext(2, Math.ceil(end * sr), sr)
  tracks.forEach((t) => buildChain(ctx, t, ctx.destination, 0, isActive(t, any)))
  return ctx.startRendering()
}
