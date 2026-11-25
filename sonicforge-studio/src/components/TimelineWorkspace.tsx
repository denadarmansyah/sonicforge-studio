import { Copy, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { duration, Track } from '../types/audio'
import { STUDIO_THEME } from '../theme/studioTheme'
import { WaveformTrack } from './WaveformTrack'

const HEAD = 216, ROW = 92
interface Props {
  tracks: Track[]; sel: string | null; pos: number; pps: number; endT: number
  onSel: (id: string) => void; onSeek: (s: number) => void; onZoom: (pps: number) => void
  onPatch: (id: string, p: Partial<Track>) => void; onDup: (id: string) => void; onDel: (id: string) => void; onDemo: () => void
}

function Clip({ t, pps, selected, onPatch }: { t: Track; pps: number; selected: boolean; onPatch: Props['onPatch'] }) {
  const d = { current: null as null | { x: number; o: number } }
  const w = Math.max(2, duration(t) * pps)
  return (
    <div className={`absolute bottom-2 top-2 cursor-grab overflow-hidden rounded-[3px] border bg-raised ${selected ? 'border-accent' : 'border-line'}`} style={{ left: t.offset * pps, width: w }}
      onPointerDown={(e) => { d.current = { x: e.clientX, o: t.offset }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (e.buttons === 1 && d.current) onPatch(t.id, { offset: Math.max(0, d.current.o + (e.clientX - d.current.x) / pps) }) }}
      onPointerUp={() => { d.current = null }}>
      <WaveformTrack buffer={t.buffer} width={w} height={ROW - 20} color={t.mute ? STUDIO_THEME.waveformMuted : STUDIO_THEME.waveformActive} />
    </div>
  )
}

export function TimelineWorkspace({ tracks, sel, pos, pps, endT, onSel, onSeek, onZoom, onPatch, onDup, onDel, onDemo }: Props) {
  const W = Math.max(endT + 12, 30) * pps, step = pps >= 60 ? 1 : pps >= 25 ? 5 : 10
  const ticks = Array.from({ length: Math.floor(W / pps / step) + 1 }, (_, i) => i * step)
  const seek = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, (e.clientX - r.left) / pps)) }
  return (
    <main className="flex min-h-0 min-w-0 flex-col bg-base">
      <div className="flex h-8 items-center justify-between border-b border-line bg-panel px-3">
        <span className="text-sub">Timeline</span>
        <div className="flex items-center gap-1.5">
          <button className="btn sq" onClick={() => onZoom(Math.max(10, pps / 1.5))} aria-label="Zoom out"><ZoomOut size={13} /></button>
          <span className="w-14 text-center font-mono tabular-nums text-sub">{Math.round(pps)} px/s</span>
          <button className="btn sq" onClick={() => onZoom(Math.min(400, pps * 1.5))} aria-label="Zoom in"><ZoomIn size={13} /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: HEAD + W, minHeight: '100%' }}>
          <div className="sticky top-0 z-30 flex h-7 border-b border-line bg-panel">
            <div className="sticky left-0 z-30 border-r border-line bg-panel" style={{ width: HEAD }} />
            <div className="relative cursor-text" style={{ width: W }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seek(e) }} onPointerMove={(e) => { if (e.buttons === 1) seek(e) }}>
              {ticks.map((s) => (
                <div key={s} className="absolute bottom-0 top-0 border-l border-line pl-1 font-mono text-[10px] tabular-nums leading-7 text-mute" style={{ left: s * pps }}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</div>
              ))}
              <div className="absolute bottom-0 top-0 w-px bg-accent" style={{ left: pos * pps }} />
            </div>
          </div>
          {tracks.map((t) => (
            <div key={t.id} className="flex border-b border-line" style={{ height: ROW }} onPointerDown={() => onSel(t.id)}>
              <div className={`sticky left-0 z-20 flex flex-col justify-between border-r border-line p-2 ${sel === t.id ? 'bg-raised' : 'bg-panel'}`} style={{ width: HEAD }}>
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
              </div>
              <div className="relative" style={{ width: W }}><Clip t={t} pps={pps} selected={sel === t.id} onPatch={onPatch} /></div>
            </div>
          ))}
          {tracks.length === 0 && (
            <div className="sticky left-0 flex max-w-[460px] flex-col items-start gap-3 p-6">
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
