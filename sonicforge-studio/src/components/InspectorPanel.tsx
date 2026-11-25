import { ReactNode, useMemo } from 'react'
import { EqVisualizer } from './EqVisualizer'
import { FX, Preset, Track } from '../types/audio'

export function Param({ label, v, min, max, step = 1, unit = '', dp = 0, on }: { label: string; v: number; min: number; max: number; step?: number; unit?: string; dp?: number; on: (n: number) => void }) {
  return (
    <label className="grid h-6 grid-cols-[92px_1fr_62px] items-center gap-2">
      <span className="truncate text-sub">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} />
      <span className="text-right font-mono tabular-nums">{v.toFixed(dp)}{unit}</span>
    </label>
  )
}
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border-b border-line px-3 py-3"><h3 className="mb-2 text-[11px] font-semibold text-sub">{title}</h3>{children}</section>
)

interface Props { track?: Track; presets: Preset[]; onFx: (p: Partial<FX>) => void; onReset: () => void; onApply: (p: Preset) => void }
const EQ_LABELS = ['Sub 60 Hz', 'Body 180 Hz', 'Low-Mid 500 Hz', 'Presence 3.2 kHz', 'Air 10 kHz']

export function InspectorPanel({ track, presets, onFx, onReset, onApply }: Props) {
  const fx = track?.fx
  const eqKey = useMemo(() => (fx ? fx.eq.join(',') : ''), [fx])
  if (!track || !fx) return <aside className="border-l border-line bg-panel p-4 text-sub">Select a track to edit its effects chain.</aside>
  const eq = (i: number, n: number) => onFx({ eq: fx.eq.map((x, k) => (k === i ? n : x)) })
  return (
    <aside className="flex min-h-0 flex-col border-l border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-semibold">{track.name}</span>
        <button className={`btn ${fx.bypass ? 'on' : ''}`} onClick={() => onFx({ bypass: !fx.bypass })}>Bypass FX</button>
        <button className="btn" onClick={onReset}>Reset</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Preset">
          <select className="inp w-full" value="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p) onApply(p) }}>
            <option value="">Apply a voice preset…</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Section>
        <Section title="Sub-bass and warmth">
          <Param label="Sub boost 80 Hz" v={fx.subGain} min={0} max={18} step={0.5} unit=" dB" dp={1} on={(n) => onFx({ subGain: n })} />
          <Param label="Sub Q" v={fx.subQ} min={0.3} max={4} step={0.1} dp={1} on={(n) => onFx({ subQ: n })} />
          <Param label="Sub-harmonic" v={fx.subHarm * 100} min={0} max={100} unit="%" on={(n) => onFx({ subHarm: n / 100 })} />
          <Param label="Tube saturation" v={fx.sat * 100} min={0} max={100} unit="%" on={(n) => onFx({ sat: n / 100 })} />
        </Section>
        <Section title="5-band EQ">
          <div className="mb-2" data-k={eqKey}><EqVisualizer gains={fx.eq} /></div>
          {EQ_LABELS.map((l, i) => <Param key={l} label={l} v={fx.eq[i]} min={-12} max={12} step={0.5} unit=" dB" dp={1} on={(n) => eq(i, n)} />)}
        </Section>
        <Section title="Voice character">
          <Param label="Pitch" v={fx.pitch} min={-12} max={12} unit=" st" on={(n) => onFx({ pitch: n })} />
          <Param label="Formant" v={fx.formant} min={-12} max={12} step={0.5} dp={1} on={(n) => onFx({ formant: n })} />
          <Param label="High-pass" v={fx.hpf} min={20} max={200} unit=" Hz" on={(n) => onFx({ hpf: n })} />
        </Section>
        <Section title="Compressor">
          <Param label="Threshold" v={fx.compThr} min={-60} max={0} unit=" dB" on={(n) => onFx({ compThr: n })} />
          <Param label="Ratio" v={fx.compRatio} min={1} max={20} step={0.5} unit=":1" dp={1} on={(n) => onFx({ compRatio: n })} />
          <Param label="Attack" v={fx.compAtk} min={0.001} max={0.1} step={0.001} unit=" s" dp={3} on={(n) => onFx({ compAtk: n })} />
          <Param label="Release" v={fx.compRel} min={0.02} max={1} step={0.01} unit=" s" dp={2} on={(n) => onFx({ compRel: n })} />
        </Section>
        <Section title="Reverb and delay">
          <Param label="Reverb mix" v={fx.revMix * 100} min={0} max={100} unit="%" on={(n) => onFx({ revMix: n / 100 })} />
          <Param label="Room decay" v={fx.revDecay} min={0.3} max={6} step={0.1} unit=" s" dp={1} on={(n) => onFx({ revDecay: n })} />
          <Param label="Delay time" v={fx.dlyTime} min={20} max={1000} unit=" ms" on={(n) => onFx({ dlyTime: n })} />
          <Param label="Feedback" v={fx.dlyFb * 100} min={0} max={90} unit="%" on={(n) => onFx({ dlyFb: n / 100 })} />
          <Param label="Delay mix" v={fx.dlyMix * 100} min={0} max={100} unit="%" on={(n) => onFx({ dlyMix: n / 100 })} />
        </Section>
        <Section title="Output">
          <Param label="Pan (L − R +)" v={fx.pan} min={-100} max={100} on={(n) => onFx({ pan: n })} />
          <Param label="Gain" v={fx.gain} min={-60} max={12} step={0.5} unit=" dB" dp={1} on={(n) => onFx({ gain: n })} />
        </Section>
      </div>
    </aside>
  )
}
