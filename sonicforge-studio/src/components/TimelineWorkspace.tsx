import { useEffect, useRef, useState } from 'react'
import { Copy, SlidersHorizontal, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { duration, Track } from '../types/audio'
import { STUDIO_THEME } from '../theme/studioTheme'
import { WaveformTrack } from './WaveformTrack'

const HEAD_DESKTOP = 216
const HEAD_COMPACT = 144
const ROW = 92

interface Props {
  tracks: Track[]; sel: string | null; pos: number; pps: number; endT: number
  onSel: (id: string) => void; onSeek: (s: number) => void; onZoom: (pps: number) => void
  onPatch: (id: string, p: Partial<Track>) => void; onDup: (id: string) => void; onDel: (id: string) => void; onDemo: () => void
  onEditEffects?: () => void
}

function Clip({ t, pps, selected, onPatch }: { t: Track; pps: number; selected: boolean; onPatch: Props['onPatch'] }) {
  const dragRef = useRef<null | { x: number; o: number }>(null)
  const w = Math.max(2, duration(t) * pps)
  return (
    <div
      className={`absolute bottom-2 top-2 cursor-grab touch-none overflow-hidden rounded-[3px] border bg-raised active:cursor-grabbing ${selected ? 'border-accent' : 'border-line'}`}
      style={{ left: t.offset * pps, width: w }}
      onPointerDown={(e) => {
        dragRef.current = { x: e.clientX, o: t.offset }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (dragRef.current) {
          onPatch(t.id, { offset: Math.max(0, dragRef.current.o + (e.clientX - dragRef.current.x) / pps) })
        }
      }}
      onPointerUp={() => { dragRef.current = null }}
      onPointerCancel={() => { dragRef.current = null }}
    >
      <WaveformTrack buffer={t.buffer} width={w} height={ROW - 20} color={t.mute ? STUDIO_THEME.waveformMuted : STUDIO_THEME.waveformActive} />
    </div>
  )
}

export function TimelineWorkspace({ tracks, sel, pos, pps, endT, onSel, onSeek, onZoom, onPatch, onDup, onDel, onDemo, onEditEffects }: Props) {
  const [compact, setCompact] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false))
  const pinchRef = useRef<null | { dist: number; pps: number }>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches)
    setCompact(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const HEAD = compact ? HEAD_COMPACT : HEAD_DESKTOP
  const W = Math.max(endT + 12, 30) * pps, step = pps >= 60 ? 1 : pps >= 25 ? 5 : 10
  const ticks = Array.from({ length: Math.floor(W / pps / step) + 1 }, (_, i) => i * step)
  const scrubbingRef = useRef(false)

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, (e.clientX - r.left) / pps))
  }

  // Two-finger pinch-to-zoom on touch screens
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { dist: Math.hypot(dx, dy) || 1, pps }
    }
  }
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const ratio = Math.hypot(dx, dy) / pinchRef.current.dist
      onZoom(Math.max(10, Math.min(400, pinchRef.current.pps * ratio)))
    }
  }
  const onTouchEnd = () => {
    pinchRef.current = null
  }

  return (
    <main className="relative flex h-full min-h-0 min-w-0 flex-col bg-base">
      <div className="studio-landscape-compact flex min-h-8 items-center justify-between gap-2 border-b border-line bg-panel px-3 py-1 lg:h-8 lg:py-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sub">Timeline</span>
          {compact && sel && onEditEffects && (
            <button
              type="button"
              onClick={onEditEffects}
              className="btn pri h-7 min-h-[30px] px-2.5 text-[11px]"
            >
              <SlidersHorizontal size={12} />
              <span>Edit effects</span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button className="btn sq" onClick={() => onZoom(Math.max(10, pps / 1.5))} aria-label="Zoom out"><ZoomOut size={13} /></button>
          <span className="w-14 text-center font-mono tabular-nums text-sub">{Math.round(pps)} px/s</span>
          <button className="btn sq" onClick={() => onZoom(Math.min(400, pps * 1.5))} aria-label="Zoom in"><ZoomIn size={13} /></button>
        </div>
      </div>

      {/* Horizontal scroll strictly isolated inside timeline viewport */}
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative" style={{ width: HEAD + W, minHeight: '100%' }}>
          {/* Sticky Ruler */}
          <div className="sticky top-0 z-30 flex h-7 border-b border-line bg-panel">
            <div className="sticky left-0 z-30 border-r border-line bg-panel" style={{ width: HEAD }} />
            <div
              className="relative cursor-text touch-none"
              style={{ width: W }}
              onPointerDown={(e) => {
                scrubbingRef.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                seek(e)
              }}
              onPointerMove={(e) => { if (scrubbingRef.current) seek(e) }}
              onPointerUp={() => { scrubbingRef.current = false }}
              onPointerCancel={() => { scrubbingRef.current = false }}
            >
              {ticks.map((s) => (
                <div key={s} className="absolute bottom-0 top-0 border-l border-line pl-1 font-mono text-[10px] tabular-nums leading-7 text-mute" style={{ left: s * pps }}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</div>
              ))}
              <div className="absolute bottom-0 top-0 w-px bg-accent" style={{ left: pos * pps }} />
            </div>
          </div>

          {/* Track Rows */}
          {tracks.map((t) => (
            <div key={t.id} className="flex border-b border-line" style={{ height: ROW }} onPointerDown={() => onSel(t.id)}>
              <div className={`sticky left-0 z-20 flex flex-col justify-between border-r border-line p-1.5 lg:p-2 ${sel === t.id ? 'bg-raised' : 'bg-panel'}`} style={{ width: HEAD }}>
                {compact ? (
                  <>
                    <input
                      className="inp h-6 min-h-[28px] w-full truncate px-1.5 text-[11px]"
                      value={t.name}
                      onChange={(e) => onPatch(t.id, { name: e.target.value })}
                      aria-label="Track name"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      <button className={`btn sq !h-9 !min-h-9 !w-full ${t.mute ? 'on' : ''}`} onClick={() => onPatch(t.id, { mute: !t.mute })} aria-label="Mute">M</button>
                      <button className={`btn sq !h-9 !min-h-9 !w-full ${t.solo ? 'on' : ''}`} onClick={() => onPatch(t.id, { solo: !t.solo })} aria-label="Solo">S</button>
                      <button className="btn sq !h-9 !min-h-9 !w-full" onClick={() => onDup(t.id)} aria-label="Duplicate track"><Copy size={12} /></button>
                      <button className="btn sq !h-9 !min-h-9 !w-full" onClick={() => onDel(t.id)} aria-label="Delete track"><Trash2 size={12} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <input className="inp h-6 min-w-0 flex-1 px-1.5" value={t.name} onChange={(e) => onPatch(t.id, { name: e.target.value })} aria-label="Track name" />
                      <button className="btn sq" onClick={() => onDup(t.id)} aria-label="Duplicate track"><Copy size={12} /></button>
                      <button className="btn sq" onClick={() => onDel(t.id)} aria-label="Delete track"><Trash2 size={12} /></button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className={`btn sq ${t.mute ? 'on' : ''}`} onClick={() => onPatch(t.id, { mute: !t.mute })} aria-label="Mute">M</button>
                      <button className={`btn sq ${t.solo ? 'on' : ''}`} onClick={() => onPatch(t.id, { solo: !t.solo })} aria-label="Solo">S</button>
                      {(['fadeIn', 'fadeOut'] as const).map((k) => (
                        <label key={k} className="flex items-center gap-1 text-mute">{k === 'fadeIn' ? 'In' : 'Out'}
                          <input type="number" min={0} step={0.1} className="inp h-6 w-[46px] px-1 font-mono tabular-nums" value={t[k]} onChange={(e) => onPatch(t.id, { [k]: Math.max(0, Number(e.target.value)) })} />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="relative" style={{ width: W }}><Clip t={t} pps={pps} selected={sel === t.id} onPatch={onPatch} /></div>
            </div>
          ))}

          {tracks.length === 0 && (
            <div className="sticky left-0 flex w-[min(460px,calc(100vw-24px))] flex-col items-start gap-3 p-4 sm:p-6">
              <p className="text-sub">No tracks yet. Import audio, record from the microphone, or start from the built-in demo voice.</p>
              <button className="btn pri" onClick={onDemo}>Load demo voice</button>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-0 top-7 z-10 w-px bg-accent" style={{ left: HEAD + pos * pps }} />
        </div>
      </div>
    </main>
  )
}
