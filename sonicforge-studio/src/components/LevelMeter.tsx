import { useEffect, useRef } from 'react'

export function LevelMeter({ get, w = 72, label }: { get: () => number; w?: number; label?: string }) {
  const bar = useRef<HTMLDivElement>(null), fn = useRef(get)
  fn.current = get
  useEffect(() => {
    let id = 0, v = 0
    const f = () => {
      v = Math.max(fn.current(), v * 0.92)
      if (bar.current) { bar.current.style.width = Math.min(1, v) * 100 + '%'; bar.current.style.background = v > 0.98 ? '#EF4444' : '#10B981' }
      id = requestAnimationFrame(f)
    }
    f(); return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="font-mono text-[10px] text-mute">{label}</span>}
      <div className="h-1.5 overflow-hidden rounded-[1px] bg-base border border-line" style={{ width: w }}><div ref={bar} className="h-full" style={{ width: 0 }} /></div>
    </div>
  )
}
