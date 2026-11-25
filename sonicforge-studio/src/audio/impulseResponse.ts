export function makeIR(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const sr = ctx.sampleRate, n = Math.floor(sr * Math.max(0.2, decay)), b = ctx.createBuffer(2, n, sr)
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0
    for (let i = 0; i < n; i++) {
      const k = i / n; lp += (0.55 - 0.45 * k) * ((Math.random() * 2 - 1) - lp)
      d[i] = lp * Math.pow(1 - k, 3) * 2
    }
  }
  return b
}
