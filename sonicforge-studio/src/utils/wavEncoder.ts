export function encodeWav(buf: AudioBuffer, bits: 16 | 24 = 16): Blob {
  const ch = buf.numberOfChannels, len = buf.length, bps = bits / 8, data = len * ch * bps
  const v = new DataView(new ArrayBuffer(44 + data))
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + data, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, buf.sampleRate, true)
  v.setUint32(28, buf.sampleRate * ch * bps, true); v.setUint16(32, ch * bps, true); v.setUint16(34, bits, true)
  w(36, 'data'); v.setUint32(40, data, true)
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i))
  let o = 44
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i]))
    if (bits === 16) v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true)
    else { const x = Math.round(s < 0 ? s * 8388608 : s * 8388607); v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255) }
    o += bps
  }
  return new Blob([v.buffer], { type: 'audio/wav' })
}
export function download(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
