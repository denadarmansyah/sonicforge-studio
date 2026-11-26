import { useRef, useState } from 'react'
import { Play, Plus, Search, Trash2, Upload } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { SOUNDS, SOUND_CATS, synthesize } from '../audio/proceduralSounds'
import { Preset, SavedSound, SynthParams } from '../types/audio'
import { Button, IconButton, UnstyledButton } from '../ui/primitives'

interface Props {
  presets: Preset[]; sounds: SavedSound[]; hasTrack: boolean; busy?: boolean
  onAdd: (b: AudioBuffer, name: string) => void; onApply: (p: Preset) => void
  onDelSound: (id: string) => void; onDelPreset: (id: string) => void
  onOpenImport: () => void
}

function Row({ title, meta, onPrev, onAdd, onDel }: { title: string; meta: string; onPrev?: () => void; onAdd?: () => void; onDel?: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 transition-colors duration-150 hover:bg-raised">
      <div className="min-w-0 flex-1">
        <div className="truncate">{title}</div>
        <div className="truncate font-mono text-[10px] tabular-nums text-mute">{meta}</div>
      </div>
      {onPrev && <IconButton size="sm" label={`Pratinjau ${title}`} onClick={onPrev}><Play size={13} /></IconButton>}
      {onAdd && <IconButton size="sm" label={`Tambahkan ${title}`} onClick={onAdd}><Plus size={13} /></IconButton>}
      {onDel && <IconButton size="sm" variant="destructive" label={`Hapus ${title}`} onClick={onDel}><Trash2 size={13} /></IconButton>}
    </div>
  )
}

export function LibrarySidebar({ presets, sounds, hasTrack, busy = false, onAdd, onApply, onDelSound, onDelPreset, onOpenImport }: Props) {
  const [tab, setTab] = useState<'lib' | 'mine'>('lib'), [q, setQ] = useState(''), [cat, setCat] = useState('All')
  const cache = useRef(new Map<string, AudioBuffer>())
  const get = (id: string, p: SynthParams) => {
    let b = cache.current.get(id)
    if (!b) { b = synthesize(p, engine.ctx.sampleRate); cache.current.set(id, b) }
    return b
  }
  const list = SOUNDS.filter((s) => (cat === 'All' || s.cat === cat) && s.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col bg-panel lg:border-r lg:border-line">
      <div className="flex gap-1.5 border-b border-line p-2">
        <Button variant="secondary" size="sm" fullWidth disabled={busy} onClick={onOpenImport}>
          <Upload size={14} />
          <span>Impor file</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 border-b border-line">
        {([['lib', 'Sound Library'], ['mine', 'Presets & Sounds']] as const).map(([k, l]) => (
          <UnstyledButton
            key={k}
            onClick={() => setTab(k)}
            className={`h-9 border-b-2 text-[11.5px] transition-colors duration-150 lg:h-8 ${tab === k ? 'border-accent text-ink font-semibold' : 'border-transparent text-sub hover:text-ink'}`}
          >
            {l}
          </UnstyledButton>
        ))}
      </div>
      {tab === 'lib' ? (
        <>
          <div className="space-y-2 border-b border-line p-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-mute" />
              <input className="inp w-full pl-7" placeholder="Cari sound" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...SOUND_CATS].map((c) => (
                <Button key={c} variant={cat === c ? 'primary' : 'secondary'} size="sm" onClick={() => setCat(c)} className="px-2.5! text-[12px]!">
                  <span>{c}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.map((s) => <Row key={s.id} title={s.name} meta={`${s.cat}  ${s.p.dur.toFixed(2)} s`} onPrev={() => engine.preview(get(s.id, s.p))} onAdd={() => onAdd(get(s.id, s.p), s.name)} />)}
            {list.length === 0 && <p className="p-3 text-sub">Tidak ada sound yang cocok dengan “{q}”. Coba kata kunci lain atau pilih All.</p>}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <h4 className="px-3 pb-1 pt-3 text-[11px] font-semibold text-sub">Voice presets {hasTrack ? '' : '(pilih track untuk menerapkan)'}</h4>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 hover:bg-raised">
              <div className="min-w-0 flex-1">
                <div className="truncate">{p.name}</div>
                <div className="truncate text-[10px] text-mute">{p.cat}. {p.note}</div>
              </div>
              <Button variant="secondary" size="sm" disabled={!hasTrack} onClick={() => onApply(p)}>
                <span>Terapkan</span>
              </Button>
              {!p.builtin && <IconButton size="sm" variant="destructive" label={`Hapus ${p.name}`} onClick={() => onDelPreset(p.id)}><Trash2 size={13} /></IconButton>}
            </div>
          ))}
          <h4 className="px-3 pb-1 pt-4 text-[11px] font-semibold text-sub">My sounds</h4>
          {sounds.map((s) => <Row key={s.id} title={s.name} meta={`${s.p.wave}  ${s.p.dur.toFixed(2)} s`} onPrev={() => engine.preview(get(s.id, s.p))} onAdd={() => onAdd(get(s.id, s.p), s.name)} onDel={() => onDelSound(s.id)} />)}
          {sounds.length === 0 && <p className="p-3 text-sub">Belum ada suara tersimpan. Buat suara baru lewat Custom Builder lalu simpan ke My Library.</p>}
        </div>
      )}
    </aside>
  )
}
