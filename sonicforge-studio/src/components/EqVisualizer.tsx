import { useEffect, useRef } from 'react'
import { EQ_FREQS } from '../types/audio'

export function EqVisualizer({ gains }: { gains: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!, g = cv.getContext('2d')!, W = cv.width, H = cv.height, N = 160
    const oc = new OfflineAudioContext(1, 1, 44100)
    const fs = new Float32Array(N).map((_, i) => 20 * Math.pow(1000, i / (N - 1))), total = new Float32Array(N)
    EQ_FREQS.forEach((f, i) => {
      const b = oc.createBiquadFilter(); b.type = i === 0 ? 'lowshelf' : i === 4 ? 'highshelf' : 'peaking'; b.frequency.value = f; b.gain.value = gains[i]
      const m = new Float32Array(N), p = new Float32Array(N); b.getFrequencyResponse(fs, m, p)
      m.forEach((x, k) => { total[k] += 20 * Math.log10(x) })
    })
    const X = (f: number) => (Math.log(f / 20) / Math.log(1000)) * W, Y = (db: number) => H / 2 - (db / 15) * (H / 2 - 4)
    g.clearRect(0, 0, W, H); g.strokeStyle = '#27272A'; g.lineWidth = 1
    ;[100, 1000, 10000].forEach((f) => { g.beginPath(); g.moveTo(X(f), 0); g.lineTo(X(f), H); g.stroke() })
    ;[-10, 0, 10].forEach((d) => { g.beginPath(); g.moveTo(0, Y(d)); g.lineTo(W, Y(d)); g.stroke() })
    g.strokeStyle = '#F97316'; g.lineWidth = 1.5; g.beginPath()
    total.forEach((db, k) => { const x = (k / (N - 1)) * W; k ? g.lineTo(x, Y(db)) : g.moveTo(x, Y(db)) }); g.stroke()
    g.fillStyle = '#FAFAFA'; EQ_FREQS.forEach((f, i) => { g.beginPath(); g.arc(X(f), Y(gains[i]), 2.5, 0, 7); g.fill() })
  }, [gains])
  return <canvas ref={ref} width={296} height={96} className="block w-full rounded-[3px] border border-line bg-base" />
}
