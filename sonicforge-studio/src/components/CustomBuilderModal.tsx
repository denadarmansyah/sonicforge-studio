import { useEffect, useState } from 'react'
import { Play, Plus, Save, X } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { SOUNDS, SYNTH_BASE, synthesize } from '../audio/proceduralSounds'
import { PRESET_CATS } from '../audio/presets'
import { FX, Preset, SavedSound, SynthParams, Wave } from '../types/audio'
import { Param } from './InspectorPanel'

const TYPES: Record<string, string> = { 'Sub Bass Drop': 'sub-drop', 'Cinematic Riser': 'riser', 'UI Click / Pop': 'switch', 'Whoosh Transition': 'whoosh', 'Ambient Pad': 'chord', 'Custom Tone': '' }
const WAVES: Wave[] = ['sine', 'triangle', 'sawtooth', 'square', 'white', 'pink']
interface Props { fx?: FX; onClose: () => void; onSavePreset: (p: Preset) => void; onAddSound: (b: AudioBuffer, name: string) => void; onSaveSound: (s: SavedSound) => void }

export function CustomBuilderModal({ fx, onClose, onSavePreset, onAddSound, onSaveSound }: Props) {
  const [tab, setTab] = useState<'voice' | 'synth'>('voice')
  const [pn, setPn] = useState(''), [pc, setPc] = useState('Custom'), [pnote, setPnote] = useState('')
  const [sn, setSn] = useState('My Sound'), [p, setP] = useState<SynthParams>(SOUNDS.find((s) => s.id === 'sub-drop')!.p)
  const set = (x: Partial<SynthParams>) => setP({ ...p, ...x })
  const build = () => synthesize(p, engine.ctx.sampleRate)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 md:items-center md:p-4" onPointerDown={onClose}>
      {/* Near-full-screen bottom sheet on HP (<768px), centered 520px dialog on desktop, sticky action footer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom Sound and Voice Builder"
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-panel md:max-h-[86dvh] md:w-[520px] md:rounded-[6px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5 md:py-3">
          <h2 className="text-[13px] font-semibold">Custom Sound and Voice Builder</h2>
          <button className="btn sq" onClick={onClose} aria-label="Close"><X size={13} /></button>
        </div>

        <div className="grid shrink-0 grid-cols-2 border-b border-line">
          {([['voice', 'Voice preset'], ['synth', 'Sound designer']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`h-9 cursor-pointer border-b-2 text-[11px] md:h-8 ${tab === k ? 'border-accent text-ink' : 'border-transparent text-sub hover:text-ink'}`}>{l}</button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {tab === 'voice' ? (
            <>
              <p className="text-sub">Saves the full effects chain of the selected track: sub-bass, EQ, saturation, pitch, compressor and reverb.</p>
              <input className="inp w-full" placeholder="Preset name" value={pn} onChange={(e) => setPn(e.target.value)} />
              <select className="inp w-full" value={pc} onChange={(e) => setPc(e.target.value)}>{PRESET_CATS.map((c) => <option key={c}>{c}</option>)}</select>
              <textarea className="inp h-20 w-full resize-none py-1.5" placeholder="Voice character notes" value={pnote} onChange={(e) => setPnote(e.target.value)} />
              {!fx && <p className="text-clip">Select a track first so there are settings to save.</p>}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select className="inp" onChange={(e) => { const id = TYPES[e.target.value]; setP(id ? SOUNDS.find((s) => s.id === id)!.p : { ...SYNTH_BASE, f0: 440, f1: 440, dur: 1.5, d: 1 }) }}>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}</select>
                <select className="inp" value={p.wave} onChange={(e) => set({ wave: e.target.value as Wave })}>{WAVES.map((w) => <option key={w} value={w}>{w}</option>)}</select>
              </div>
              <Param label="Start freq" v={p.f0} min={20} max={8000} unit=" Hz" on={(n) => set({ f0: n })} />
              <Param label="End freq" v={p.f1} min={20} max={8000} unit=" Hz" on={(n) => set({ f1: n })} />
              <Param label="Duration" v={p.dur} min={0.05} max={8} step={0.05} unit=" s" dp={2} on={(n) => set({ dur: n })} />
              <Param label="Attack" v={p.a} min={0.001} max={4} step={0.005} unit=" s" dp={3} on={(n) => set({ a: n })} />
              <Param label="Decay" v={p.d} min={0.01} max={4} step={0.01} unit=" s" dp={2} on={(n) => set({ d: n })} />
              <Param label="Sustain" v={p.s} min={0} max={1} step={0.01} dp={2} on={(n) => set({ s: n })} />
              <Param label="Release" v={p.r} min={0.01} max={4} step={0.01} unit=" s" dp={2} on={(n) => set({ r: n })} />
              <Param label="LP cutoff" v={p.cutoff} min={100} max={20000} step={50} unit=" Hz" on={(n) => set({ cutoff: n, cutoff1: n })} />
              <Param label="Sub drive" v={p.drive * 100} min={0} max={100} unit="%" on={(n) => set({ drive: n / 100 })} />
              <input className="inp w-full" value={sn} onChange={(e) => setSn(e.target.value)} aria-label="Sound name" />
            </>
          )}
        </div>

        {/* Sticky Action Footer (always visible on short screens) */}
        <div className="shrink-0 border-t border-line bg-panel px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tab === 'voice' ? (
            <button
              className="btn pri w-full justify-center sm:w-auto"
              disabled={!fx || !pn.trim()}
              onClick={() => { if (fx) { onSavePreset({ id: crypto.randomUUID(), name: pn.trim(), cat: pc, note: pnote.trim(), fx: { ...fx, bypass: false } }); onClose() } }}
            >
              <Save size={13} />Save preset
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className="btn flex-1 justify-center sm:flex-none" onClick={() => engine.preview(build())}><Play size={13} />Preview Sound</button>
              <button className="btn flex-1 justify-center sm:flex-none" onClick={() => onAddSound(build(), sn)}><Plus size={13} />Add to Timeline</button>
              <button className="btn pri w-full justify-center sm:w-auto" disabled={!sn.trim()} onClick={() => onSaveSound({ id: crypto.randomUUID(), name: sn.trim(), p })}><Save size={13} />Save to My Library</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
