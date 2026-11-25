import { useEffect, useRef, useState } from 'react'
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
    <div className="studio-shell grid h-screen grid-rows-[48px_1fr_24px]" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); Array.from(e.dataTransfer.files).forEach(importFile) }}>
      <TopBar name={name} setName={setName} playing={playing} loop={loop} pos={pos} busy={busy} bits={bits} setBits={setBits}
        onPlay={toggle} onStop={stop} onStart={() => seek(0)} onLoop={() => setLoop(!loop)} onBuilder={() => setBuilder(true)} onExport={doExport}
        onRecorded={(b) => addBuffer(b, 'Mic take ' + (tracks.length + 1), 0)} onError={setMsg} />
      <div className="grid min-h-0 grid-cols-[280px_1fr_320px]">
        <LibrarySidebar presets={presets} sounds={sounds} hasTrack={!!track} onAdd={(b, n) => addBuffer(b, n)}
          onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })} onDelSound={(id) => setSounds(sounds.filter((s) => s.id !== id))}
          onDelPreset={(id) => setCustom(custom.filter((p) => p.id !== id))} onImport={importFile} onDemo={() => addBuffer(demoVoice(engine.ctx.sampleRate), 'Demo voice', 0)} />
        <TimelineWorkspace tracks={tracks} sel={sel} pos={pos} pps={pps} endT={endT} onSel={setSel} onSeek={seek} onZoom={setPps}
          onPatch={patch} onDup={dup} onDel={del} onDemo={() => addBuffer(demoVoice(engine.ctx.sampleRate), 'Demo voice', 0)} />
        <InspectorPanel track={track} presets={presets} onFx={patchFx} onReset={() => patchFx({ ...DEFAULT_FX })} onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })} />
      </div>
      <footer className="flex items-center justify-between border-t border-line bg-panel px-3 font-mono text-[11px] tabular-nums text-sub">
        <span>{msg || 'Drop audio files anywhere to import.'}</span><span>{tracks.length} tracks</span>
      </footer>
      {builder && <CustomBuilderModal fx={track?.fx} onClose={() => setBuilder(false)} onSavePreset={(p) => setCustom([...custom, p])}
        onAddSound={(b, n) => addBuffer(b, n)} onSaveSound={(s) => { setSounds([...sounds, s]); setMsg(`Saved “${s.name}” to My Library.`) }} />}
    </div>
  )
}
