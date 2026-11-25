import { ReactNode, useMemo, useState } from 'react'
import { ChevronDown, Download, Loader2 } from 'lucide-react'
import { EqVisualizer } from './EqVisualizer'
import { FX, Preset, Track } from '../types/audio'
import { EXPORT_FORMAT_OPTIONS, ExportFormat } from '../utils/audioExporter'

export function Param({ label, v, min, max, step = 1, unit = '', dp = 0, on }: { label: string; v: number; min: number; max: number; step?: number; unit?: string; dp?: number; on: (n: number) => void }) {
  return (
    <label className="grid min-h-8 grid-cols-[96px_1fr_64px] items-center gap-2 lg:h-6 lg:min-h-0 lg:grid-cols-[92px_1fr_62px]">
      <span className="truncate text-sub">{label}</span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} />
      <span className="text-right font-mono tabular-nums">{v.toFixed(dp)}{unit}</span>
    </label>
  )
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-line px-3 py-2.5 xl:py-3">
      <div className="hidden xl:block">
        <h3 className="mb-2 text-[11px] font-semibold text-sub">{title}</h3>
        {children}
      </div>
      <div className="xl:hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-8 w-full cursor-pointer items-center justify-between text-left text-[11.5px] font-semibold text-sub hover:text-ink"
        >
          <span>{title}</span>
          <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="mt-2 space-y-1">{children}</div>}
      </div>
    </section>
  )
}

interface Props {
  track?: Track
  tracks?: Track[]
  presets: Preset[]
  exportFormat: ExportFormat
  setExportFormat: (f: ExportFormat) => void
  busy?: boolean
  onExportTrack: (t: Track, fmt: ExportFormat) => void
  onSel?: (id: string) => void
  onPatchTrack?: (id: string, p: Partial<Track>) => void
  onFx: (p: Partial<FX>) => void
  onReset: () => void
  onApply: (p: Preset) => void
}

const EQ_LABELS = ['Sub 60 Hz', 'Body 180 Hz', 'Low-Mid 500 Hz', 'Presence 3.2 kHz', 'Air 10 kHz']

export function InspectorPanel({
  track, tracks = [], presets, exportFormat, setExportFormat, busy = false,
  onExportTrack, onSel, onPatchTrack, onFx, onReset, onApply,
}: Props) {
  const fx = track?.fx
  const eqKey = useMemo(() => (fx ? fx.eq.join(',') : ''), [fx])

  if (!track || !fx) {
    return (
      <aside className="flex h-full min-h-0 flex-col gap-3 bg-panel p-4 text-sub lg:border-l lg:border-line">
        <p className="m-0">Pilih track untuk mengatur efek atau mengekspor audionya.</p>
        {tracks.length > 0 && onSel && (
          <div className="space-y-1.5 lg:hidden">
            <span className="block text-[11px] font-semibold text-ink">Pilih track:</span>
            {tracks.map((t) => (
              <button key={t.id} type="button" className="btn w-full justify-start" onClick={() => onSel(t.id)}>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </aside>
    )
  }

  const eq = (i: number, n: number) => onFx({ eq: fx.eq.map((x, k) => (k === i ? n : x)) })
  return (
    <aside className="flex h-full min-h-0 min-w-0 flex-col bg-panel lg:border-l lg:border-line">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        {tracks.length > 1 && onSel ? (
          <select
            aria-label="Track terpilih"
            value={track.id}
            onChange={(e) => onSel(e.target.value)}
            className="inp min-w-0 flex-1 font-semibold lg:hidden"
          >
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : null}
        <span className={`min-w-0 flex-1 truncate font-semibold ${tracks.length > 1 && onSel ? 'hidden lg:inline' : ''}`}>{track.name}</span>
        <button className={`btn ${fx.bypass ? 'on' : ''}`} onClick={() => onFx({ bypass: !fx.bypass })}>Bypass FX</button>
        <button className="btn" onClick={onReset}>Reset</button>
      </div>

      {/* Single-Track Export Bar (WAV / MP3 with track FX applied) */}
      <div className="flex items-center gap-1.5 border-b border-line bg-base/50 px-3 py-2">
        <select
          className="inp min-w-0 font-mono text-[11px]"
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          disabled={busy}
          aria-label="Format ekspor track"
        >
          {EXPORT_FORMAT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn flex-1 justify-center"
          disabled={busy}
          onClick={() => onExportTrack(track, exportFormat)}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          <span>Ekspor track ini</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Preset">
          <select className="inp w-full" value="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p) onApply(p) }}>
            <option value="">Apply a voice preset…</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Section>

        {onPatchTrack && (
          <div className="border-b border-line px-3 py-2.5 lg:hidden">
            <h3 className="mb-2 text-[11.5px] font-semibold text-sub">Clip envelope</h3>
            <Param label="Fade in" v={track.fadeIn} min={0} max={10} step={0.1} unit=" s" dp={1} on={(n) => onPatchTrack(track.id, { fadeIn: n })} />
            <Param label="Fade out" v={track.fadeOut} min={0} max={10} step={0.1} unit=" s" dp={1} on={(n) => onPatchTrack(track.id, { fadeOut: n })} />
          </div>
        )}

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
        <Section title="Voice character" defaultOpen={false}>
          <Param label="Pitch" v={fx.pitch} min={-12} max={12} unit=" st" on={(n) => onFx({ pitch: n })} />
          <Param label="Formant" v={fx.formant} min={-12} max={12} step={0.5} dp={1} on={(n) => onFx({ formant: n })} />
          <Param label="High-pass" v={fx.hpf} min={20} max={200} unit=" Hz" on={(n) => onFx({ hpf: n })} />
        </Section>
        <Section title="Compressor" defaultOpen={false}>
          <Param label="Threshold" v={fx.compThr} min={-60} max={0} unit=" dB" on={(n) => onFx({ compThr: n })} />
          <Param label="Ratio" v={fx.compRatio} min={1} max={20} step={0.5} unit=":1" dp={1} on={(n) => onFx({ compRatio: n })} />
          <Param label="Attack" v={fx.compAtk} min={0.001} max={0.1} step={0.001} unit=" s" dp={3} on={(n) => onFx({ compAtk: n })} />
          <Param label="Release" v={fx.compRel} min={0.02} max={1} step={0.01} unit=" s" dp={2} on={(n) => onFx({ compRel: n })} />
        </Section>
        <Section title="Reverb and delay" defaultOpen={false}>
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
