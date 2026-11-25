import { useEffect, useRef } from 'react'

export function WaveformTrack({ buffer, width, height, color }: { buffer: AudioBuffer; width: number; height: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const w = Math.max(2, Math.min(16000, Math.floor(width)))
  useEffect(() => {
    const cv = ref.current!, g = cv.getContext('2d')!, d = buffer.getChannelData(0), spp = d.length / w, step = Math.max(1, Math.floor(spp / 40))
    g.clearRect(0, 0, w, height); g.fillStyle = color; const mid = height / 2
    for (let x = 0; x < w; x++) {
      let mn = 1, mx = -1; const a = Math.floor(x * spp), b = Math.min(d.length, Math.floor((x + 1) * spp))
      for (let i = a; i < b; i += step) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v }
      if (mx < mn) continue
      g.fillRect(x, mid - mx * mid * 0.95, 1, Math.max(1, (mx - mn) * mid * 0.95))
    }
  }, [buffer, w, height, color])
  return <canvas ref={ref} width={w} height={height} className="block h-full w-full" />
}
