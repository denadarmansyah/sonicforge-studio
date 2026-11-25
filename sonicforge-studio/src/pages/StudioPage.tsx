import { useEffect, useRef, useState } from 'react'
import { AudioWaveform, FolderOpen, SlidersHorizontal } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { renderMix } from '../audio/offlineRenderer'
import { demoVoice } from '../audio/proceduralSounds'
import { BUILTIN_PRESETS } from '../audio/presets'
import { DEFAULT_FX, duration, FX, Preset, SavedSound, Track } from '../types/audio'
import { download, encodeWav } from '../utils/wavEncoder'
import { TopBar } from '../components/TopBar'
import { LibrarySidebar } from '../components/LibrarySidebar'
import { TimelineWorkspace } from '../components/TimelineWorkspace'
import { InspectorPanel } from '../components/InspectorPanel'
import { CustomBuilderModal } from '../components/CustomBuilderModal'

function useLocal<T>(k: string, init: T): [T, (v: T) => void] {
  const [v, s] = useState<T>(() => { try { const x = localStorage.getItem(k); return x ? (JSON.parse(x) as T) : init } catch { return init } })
  return [v, (n: T) => { s(n); try { localStorage.setItem(k, JSON.stringify(n)) } catch { /* storage full or blocked */ } }]
}

export function StudioPage() {
  const [tracks, setTracks] = useState<Track[]>([]), [sel, setSel] = useState<string | null>(null)
  const [pos, setPos] = useState(0), [playing, setPlaying] = useState(false), [loop, setLoop] = useState(false)
  const [pps, setPps] = useState(80), [name, setName] = useState('Untitled Session'), [builder, setBuilder] = useState(false)
  const [busy, setBusy] = useState(false), [bits, setBits] = useState<16 | 24>(16), [msg, setMsg] = useState('')
  const [mobileTab, setMobileTab] = useState<'library' | 'timeline' | 'inspector'>('timeline')
  const [custom, setCustom] = useLocal<Preset[]>('sf.presets', []), [sounds, setSounds] = useLocal<SavedSound[]>('sf.sounds', [])
  const tr = useRef(tracks), posRef = useRef(0)
  tr.current = tracks
  const presets = [...BUILTIN_PRESETS, ...custom]
  const endT = Math.max(0, ...tracks.map((t) => t.offset + duration(t)))
  const track = tracks.find((t) => t.id === sel)

  useEffect(() => () => { engine.stop() }, [])
  useEffect(() => { engine.sync(tracks) }, [tracks])
  useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      const p = engine.position(), end = Math.max(0, ...tr.current.map((t) => t.offset + duration(t)))
      if (p >= end) {
        if (loop && end > 0) engine.play(tr.current, 0)
        else { engine.stop(); setPlaying(false); posRef.current = end; setPos(end); return }
      }
      posRef.current = engine.position(); setPos(posRef.current); id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, loop])

  const seek = (p: number) => { posRef.current = p; setPos(p); if (playing) engine.play(tr.current, p) }
  const toggle = () => {
    if (playing) { const p = engine.position(); engine.stop(); setPlaying(false); posRef.current = p; setPos(p); return }
    if (!tracks.length) { setMsg('Add a track before pressing play.'); return }
    const from = posRef.current >= endT ? 0 : posRef.current
    posRef.current = from; engine.play(tracks, from); setPlaying(true)
  }
  const stop = () => { engine.stop(); setPlaying(false); posRef.current = 0; setPos(0) }

  const addBuffer = (buffer: AudioBuffer, nm: string, offset = posRef.current, fx: Partial<FX> = {}) => {
    const t: Track = { id: crypto.randomUUID(), name: nm, buffer, offset, fadeIn: 0, fadeOut: 0, mute: false, solo: false, fx: { ...DEFAULT_FX, ...fx } }
    setTracks((p) => [...p, t]); setSel(t.id); setMsg(`Added “${nm}”.`)
  }
  const patch = (id: string, p: Partial<Track>) => setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const patchFx = (p: Partial<FX>) => { if (sel) setTracks((ts) => ts.map((t) => (t.id === sel ? { ...t, fx: { ...t.fx, ...p } } : t))) }
  const dup = (id: string) => { const t = tracks.find((x) => x.id === id); if (t) { const n = { ...t, id: crypto.randomUUID(), name: t.name + ' copy', fx: { ...t.fx, eq: [...t.fx.eq] } }; setTracks([...tracks, n]); setSel(n.id) } }
  const del = (id: string) => { setTracks(tracks.filter((t) => t.id !== id)); if (sel === id) setSel(null) }
  const importFile = async (f: File) => {
    try { addBuffer(await engine.ctx.decodeAudioData(await f.arrayBuffer()), f.name.replace(/\.[^.]+$/, ''), 0) }
    catch { setMsg(`Couldn’t decode ${f.name}. Use WAV, MP3, OGG or M4A.`) }
  }
  const doExport = async () => {
    if (!tracks.length) { setMsg('Nothing to export yet. Add a track first.'); return }
    setBusy(true)
    try { download(encodeWav(await renderMix(tracks), bits), (name.replace(/[^\w-]+/g, '_') || 'mix') + '.wav'); setMsg(`Exported ${bits}-bit WAV.`) }
    catch { setMsg('Export failed. Try fewer or shorter tracks.') } finally { setBusy(false) }
  }

  return (
    <div
      className="studio-shell studio-grid-responsive grid h-dvh grid-rows-[48px_minmax(0,1fr)_22px_auto] lg:grid-rows-[48px_1fr_24px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(importFile) }}
    >
      <TopBar
        name={name} setName={setName} playing={playing} loop={loop} pos={pos} busy={busy} bits={bits} setBits={setBits}
        onPlay={toggle} onStop={stop} onStart={() => seek(0)} onLoop={() => setLoop(!loop)} onBuilder={() => setBuilder(true)} onExport={doExport}
        onRecorded={(b) => addBuffer(b, 'Mic take ' + (tracks.length + 1), 0)} onError={setMsg}
      />

      {/* >=1280px: exact 280px | 1fr | 320px | 1024-1279px: 240px | 1fr | 280px | <1024px: single full-screen active tab panel */}
      <div className="min-h-0 min-w-0 lg:grid lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[280px_1fr_320px]">
        <div className={`${mobileTab === 'library' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <LibrarySidebar
            presets={presets} sounds={sounds} hasTrack={!!track}
            onAdd={(b, n) => { addBuffer(b, n); setMobileTab('timeline') }}
            onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })}
            onDelSound={(id) => setSounds(sounds.filter((s) => s.id !== id))}
            onDelPreset={(id) => setCustom(custom.filter((p) => p.id !== id))}
            onImport={(f) => { void importFile(f); setMobileTab('timeline') }}
            onDemo={() => { addBuffer(demoVoice(engine.ctx.sampleRate), 'Demo voice', 0); setMobileTab('timeline') }}
          />
        </div>

        <div className={`${mobileTab === 'timeline' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <TimelineWorkspace
            tracks={tracks} sel={sel} pos={pos} pps={pps} endT={endT}
            onSel={setSel} onSeek={seek} onZoom={setPps}
            onPatch={patch} onDup={dup} onDel={del}
            onDemo={() => addBuffer(demoVoice(engine.ctx.sampleRate), 'Demo voice', 0)}
            onEditEffects={() => setMobileTab('inspector')}
          />
        </div>

        <div className={`${mobileTab === 'inspector' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <InspectorPanel
            track={track} tracks={tracks} presets={presets}
            onSel={setSel} onPatchTrack={patch}
            onFx={patchFx} onReset={() => patchFx({ ...DEFAULT_FX })}
            onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })}
          />
        </div>
      </div>

      {/* Status Footer (compact on HP, identical 24px on >=1024px) */}
      <footer className="flex min-w-0 items-center justify-between gap-2 border-t border-line bg-panel px-2.5 font-mono text-[10.5px] tabular-nums text-sub lg:px-3 lg:text-[11px]">
        <span className="truncate">{msg || 'Drop audio files anywhere to import.'}</span>
        <span className="shrink-0">{tracks.length} tracks</span>
      </footer>

      {/* Bottom Tab Bar (<1024px only) */}
      <nav
        aria-label="Studio workspace panels"
        className="grid grid-cols-3 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <button
          type="button"
          onClick={() => setMobileTab('library')}
          className={`studio-landscape-compact flex min-h-12 cursor-pointer items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'library' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <FolderOpen size={14} />
          <span>Library</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('timeline')}
          className={`studio-landscape-compact flex min-h-12 cursor-pointer items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'timeline' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <AudioWaveform size={14} />
          <span>Timeline</span>
          {tracks.length > 0 && (
            <span className="rounded-full border border-line bg-base px-1.5 text-[10px] font-mono tabular-nums text-ink">
              {tracks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('inspector')}
          className={`studio-landscape-compact flex min-h-12 cursor-pointer items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'inspector' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Inspector</span>
          {track && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </button>
      </nav>

      {builder && (
        <CustomBuilderModal
          fx={track?.fx}
          onClose={() => setBuilder(false)}
          onSavePreset={(p) => setCustom([...custom, p])}
          onAddSound={(b, n) => { addBuffer(b, n); setMobileTab('timeline') }}
          onSaveSound={(s) => { setSounds([...sounds, s]); setMsg(`Saved “${s.name}” to My Library.`) }}
        />
      )}
    </div>
  )
}
