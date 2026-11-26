import { useEffect, useRef, useState } from 'react'
import { Copy, Mic, SlidersHorizontal, Square, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { duration, Track } from '../types/audio'
import { STUDIO_THEME } from '../theme/studioTheme'
import { Button, IconButton } from '../ui/primitives'
import { WaveformTrack } from './WaveformTrack'

const HEAD_DESKTOP = 216
const HEAD_COMPACT = 144
const ROW = 92

interface Props {
  tracks: Track[]; sel: string | null; pos: number; pps: number; endT: number
  rec: boolean; busy: boolean
  onSel: (id: string) => void; onSeek: (s: number) => void; onZoom: (pps: number) => void
  onPatch: (id: string, p: Partial<Track>) => void; onDup: (id: string) => void; onDel: (id: string) => void
  onOpenImport: () => void; onToggleRec: () => void
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

export function TimelineWorkspace({
  tracks, sel, pos, pps, endT, rec, busy,
  onSel, onSeek, onZoom, onPatch, onDup, onDel, onOpenImport, onToggleRec, onEditEffects,
}: Props) {
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
            <Button variant="primary" size="sm" onClick={onEditEffects}>
              <SlidersHorizontal size={13} />
              <span>Efek</span>
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton size="sm" label="Perkecil tampilan" onClick={() => onZoom(Math.max(10, pps / 1.5))}><ZoomOut size={14} /></IconButton>
          <span className="w-14 text-center font-mono tabular-nums text-sub">{Math.round(pps)} px/s</span>
          <IconButton size="sm" label="Perbesar tampilan" onClick={() => onZoom(Math.min(400, pps * 1.5))}><ZoomIn size={14} /></IconButton>
        </div>
      </div>

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
                      aria-label="Nama track"
                    />
                    <div className="grid grid-cols-4 gap-1">
                      <IconButton size="sm" active={t.mute} label="Mute" onClick={() => onPatch(t.id, { mute: !t.mute })} className="w-full! font-mono text-[11px]">M</IconButton>
                      <IconButton size="sm" active={t.solo} label="Solo" onClick={() => onPatch(t.id, { solo: !t.solo })} className="w-full! font-mono text-[11px]">S</IconButton>
                      <IconButton size="sm" label="Duplikat track" onClick={() => onDup(t.id)} className="w-full!"><Copy size={13} /></IconButton>
                      <IconButton size="sm" variant="destructive" label="Hapus track" onClick={() => onDel(t.id)} className="w-full!"><Trash2 size={13} /></IconButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <input className="inp h-7 min-w-0 flex-1 px-1.5" value={t.name} onChange={(e) => onPatch(t.id, { name: e.target.value })} aria-label="Nama track" />
                      <IconButton size="sm" label="Duplikat track" onClick={() => onDup(t.id)}><Copy size={13} /></IconButton>
                      <IconButton size="sm" variant="destructive" label="Hapus track" onClick={() => onDel(t.id)}><Trash2 size={13} /></IconButton>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IconButton size="sm" active={t.mute} label="Mute" onClick={() => onPatch(t.id, { mute: !t.mute })} className="font-mono text-[11px]">M</IconButton>
                      <IconButton size="sm" active={t.solo} label="Solo" onClick={() => onPatch(t.id, { solo: !t.solo })} className="font-mono text-[11px]">S</IconButton>
                      {(['fadeIn', 'fadeOut'] as const).map((k) => (
                        <label key={k} className="flex items-center gap-1 text-mute">{k === 'fadeIn' ? 'In' : 'Out'}
                          <input type="number" min={0} step={0.1} className="inp h-7 w-[46px] px-1 font-mono tabular-nums" value={t[k]} onChange={(e) => onPatch(t.id, { [k]: Math.max(0, Number(e.target.value)) })} />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="relative" style={{ width: W }}><Clip t={t} pps={pps} selected={sel === t.id} onPatch={onPatch} /></div>
            </div>
          ))}

          {/* Neutral Real-Action Empty State */}
          {tracks.length === 0 && (
            <div className="sticky left-0 flex w-[min(460px,calc(100vw-24px))] flex-col items-start gap-3 p-4 sm:p-6">
              <p className="m-0 leading-relaxed text-sub">
                Belum ada track. Impor audio atau video, atau rekam dari mikrofon.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" disabled={busy} onClick={onOpenImport}>
                  <Upload size={14} />
                  <span>Impor file</span>
                </Button>
                <Button variant={rec ? 'primary' : 'secondary'} size="sm" onClick={onToggleRec}>
                  {rec ? <Square size={13} /> : <Mic size={14} />}
                  <span>{rec ? 'Berhenti rekam' : 'Rekam'}</span>
                </Button>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-0 top-7 z-10 w-px bg-accent" style={{ left: HEAD + pos * pps }} />
        </div>
      </div>
    </main>
  )
}
