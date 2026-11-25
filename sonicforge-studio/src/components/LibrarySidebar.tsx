import { useRef, useState } from 'react'
import { Play, Plus, Search, Trash2, Upload } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { SOUNDS, SOUND_CATS, synthesize } from '../audio/proceduralSounds'
import { Preset, SavedSound, SynthParams } from '../types/audio'

interface Props {
  presets: Preset[]; sounds: SavedSound[]; hasTrack: boolean
  onAdd: (b: AudioBuffer, name: string) => void; onApply: (p: Preset) => void
  onDelSound: (id: string) => void; onDelPreset: (id: string) => void
  onImport: (f: File) => void; onDemo: () => void
}

function Row({ title, meta, onPrev, onAdd, onDel }: { title: string; meta: string; onPrev?: () => void; onAdd?: () => void; onDel?: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 transition-colors duration-150 hover:bg-raised">
      <div className="min-w-0 flex-1"><div className="truncate">{title}</div><div className="truncate font-mono text-[10px] tabular-nums text-mute">{meta}</div></div>
      {onPrev && <button className="btn sq" onClick={onPrev} aria-label={`Preview ${title}`}><Play size={12} /></button>}
      {onAdd && <button className="btn sq" onClick={onAdd} aria-label={`Add ${title}`}><Plus size={12} /></button>}
      {onDel && <button className="btn sq" onClick={onDel} aria-label={`Delete ${title}`}><Trash2 size={12} /></button>}
    </div>
  )
}

export function LibrarySidebar({ presets, sounds, hasTrack, onAdd, onApply, onDelSound, onDelPreset, onImport, onDemo }: Props) {
  const [tab, setTab] = useState<'lib' | 'mine'>('lib'), [q, setQ] = useState(''), [cat, setCat] = useState('All')
  const cache = useRef(new Map<string, AudioBuffer>()), file = useRef<HTMLInputElement>(null)
  const get = (id: string, p: SynthParams) => {
    let b = cache.current.get(id)
    if (!b) { b = synthesize(p, engine.ctx.sampleRate); cache.current.set(id, b) }
    return b
  }
  const list = SOUNDS.filter((s) => (cat === 'All' || s.cat === cat) && s.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-panel">
      <div className="flex gap-1.5 border-b border-line p-2">
        <input ref={file} type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
        <button className="btn flex-1 justify-center" onClick={() => file.current?.click()}><Upload size={13} />Import audio</button>
        <button className="btn" onClick={onDemo}>Demo voice</button>
      </div>
      <div className="grid grid-cols-2 border-b border-line">
        {([['lib', 'Sound Library'], ['mine', 'Presets and My Sounds']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`h-8 border-b-2 text-[11px] transition-colors duration-150 ${tab === k ? 'border-accent text-ink' : 'border-transparent text-sub hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      {tab === 'lib' ? (
        <>
          <div className="space-y-2 border-b border-line p-2">
            <div className="relative"><Search size={13} className="absolute left-2 top-[8px] text-mute" /><input className="inp w-full pl-7" placeholder="Search sounds" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="flex flex-wrap gap-1">
              {['All', ...SOUND_CATS].map((c) => <button key={c} className={`btn h-6 px-2 text-[11px] ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.map((s) => <Row key={s.id} title={s.name} meta={`${s.cat}  ${s.p.dur.toFixed(2)} s`} onPrev={() => engine.preview(get(s.id, s.p))} onAdd={() => onAdd(get(s.id, s.p), s.name)} />)}
            {list.length === 0 && <p className="p-3 text-sub">No sound matches “{q}”. Try a shorter word or pick All.</p>}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <h4 className="px-3 pb-1 pt-3 text-[11px] font-semibold text-sub">Voice presets {hasTrack ? '' : '(select a track to apply)'}</h4>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 hover:bg-raised">
              <div className="min-w-0 flex-1"><div className="truncate">{p.name}</div><div className="truncate text-[10px] text-mute">{p.cat}. {p.note}</div></div>
              <button className="btn h-6 px-2" disabled={!hasTrack} onClick={() => onApply(p)}>Apply</button>
              {!p.builtin && <button className="btn sq" onClick={() => onDelPreset(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={12} /></button>}
            </div>
          ))}
          <h4 className="px-3 pb-1 pt-4 text-[11px] font-semibold text-sub">My sounds</h4>
          {sounds.map((s) => <Row key={s.id} title={s.name} meta={`${s.p.wave}  ${s.p.dur.toFixed(2)} s`} onPrev={() => engine.preview(get(s.id, s.p))} onAdd={() => onAdd(get(s.id, s.p), s.name)} onDel={() => onDelSound(s.id)} />)}
          {sounds.length === 0 && <p className="p-3 text-sub">Nothing saved yet. Design a sound in Custom Builder and choose Save to My Library.</p>}
        </div>
      )}
    </aside>
  )
}
