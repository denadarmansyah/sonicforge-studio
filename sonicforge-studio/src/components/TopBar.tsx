import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Loader2, Mic, MoreHorizontal, Pause, Play, Repeat, SkipBack, SlidersHorizontal, Square, Upload, X } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { fmt } from '../utils/format'
import { EXPORT_FORMAT_OPTIONS, ExportFormat } from '../utils/audioExporter'
import { Logo } from '../ui/Logo'
import { LevelMeter } from './LevelMeter'

interface Props {
  name: string; setName: (s: string) => void; playing: boolean; loop: boolean; pos: number; busy: boolean
  exportFormat: ExportFormat; setExportFormat: (f: ExportFormat) => void
  rec: boolean; recElapsed: number; getRecLevel: () => number
  onToggleRec: () => void; onOpenImport: () => void
  onPlay: () => void; onStop: () => void; onStart: () => void; onLoop: () => void; onBuilder: () => void; onExport: () => void
}

export function TopBar(p: Props) {
  const [toolsOpen, setToolsOpen] = useState(false)

  useEffect(() => {
    if (!toolsOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setToolsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toolsOpen])

  return (
    <>
      <header className="flex min-w-0 items-center justify-between gap-1.5 border-b border-line bg-panel px-2 sm:gap-2 sm:px-2.5 lg:gap-3 lg:px-3">
        {/* Brand + Project Name */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:flex-none lg:gap-3">
          <Link to="/" className="flex shrink-0 items-center text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" title="Kembali ke Beranda Luven">
            <Logo variant="symbol" size={22} className="min-[400px]:hidden" />
            <Logo variant="horizontal" size={98} className="hidden min-[400px]:inline-block" />
          </Link>
          <input
            className="inp min-w-0 flex-1 max-w-[140px] text-ellipsis px-1.5 text-[11px] sm:max-w-[180px] sm:px-2 sm:text-[12px] lg:w-36 lg:max-w-none xl:w-44"
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            aria-label="Nama proyek"
          />
        </div>

        {/* Transport Controls (Always Visible on All Viewports & Tabs) */}
        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
          <button className="btn sq" onClick={p.onStart} aria-label="Kembali ke awal"><SkipBack size={13} /></button>
          <button className={`btn sq ${p.playing ? 'on' : ''}`} onClick={p.onPlay} aria-label={p.playing ? 'Jeda' : 'Putar'}>{p.playing ? <Pause size={13} /> : <Play size={13} />}</button>
          <button className="btn sq" onClick={p.onStop} aria-label="Berhenti"><Square size={12} /></button>
          <button className={`btn sq ${p.loop ? 'on' : ''}`} onClick={p.onLoop} aria-label="Ulangi"><Repeat size={13} /></button>
          <div className="ml-1 hidden h-7 w-[92px] items-center justify-center rounded-[4px] border border-line bg-base font-mono text-[12px] tabular-nums min-[420px]:flex lg:ml-2 lg:w-[104px] lg:text-[13.5px]">
            {fmt(p.pos)}
          </div>
        </div>

        {/* Desktop (>=1024px) Full Secondary Actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {p.rec ? (
            <>
              <LevelMeter get={p.getRecLevel} w={52} />
              <span className="font-mono text-[12px] tabular-nums text-clip">{fmt(p.recElapsed)}</span>
              <button className="btn on" onClick={p.onToggleRec}><Square size={12} />Berhenti</button>
            </>
          ) : (
            <button className="btn" onClick={p.onToggleRec}><Mic size={13} />Rekam</button>
          )}
          <div className="flex flex-col gap-1">
            <LevelMeter get={() => engine.level(0)} label="L" w={58} />
            <LevelMeter get={() => engine.level(1)} label="R" w={58} />
          </div>
          <button className="btn" onClick={p.onBuilder}><SlidersHorizontal size={13} />Custom Builder</button>
          <select
            className="inp font-mono"
            value={p.exportFormat}
            onChange={(e) => p.setExportFormat(e.target.value as ExportFormat)}
            disabled={p.busy}
            aria-label="Format ekspor"
          >
            {EXPORT_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button className="btn pri" onClick={p.onExport} disabled={p.busy}>
            {p.busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Export</span>
          </button>
        </div>

        {/* Mobile / Tablet (<1024px) Quick Record Stop + Overflow Tools Button */}
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          {p.rec && (
            <button className="btn on px-2 font-mono tabular-nums" onClick={p.onToggleRec} aria-label="Berhenti rekam">
              <Square size={11} />
              <span>{fmt(p.recElapsed).slice(0, 5)}</span>
            </button>
          )}
          <button
            className="btn sq"
            onClick={() => setToolsOpen(true)}
            aria-label="Menu alat dan ekspor"
            aria-expanded={toolsOpen}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      {/* Mobile / Tablet (<1024px) Overflow Tools & Export Bottom Sheet */}
      {toolsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4 lg:hidden"
          onClick={() => setToolsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Alat Studio dan Ekspor"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-[390px] sm:rounded-lg"
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">Alat Studio & Ekspor</span>
                <span className="rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-sub min-[420px]:hidden">
                  {fmt(p.pos)}
                </span>
              </div>
              <button className="btn sq" onClick={() => setToolsOpen(false)} aria-label="Tutup menu">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Output Master Meters */}
              <div className="flex items-center justify-between rounded-[4px] border border-line bg-base px-3 py-2">
                <span className="text-[11px] text-sub">Level Master</span>
                <div className="flex flex-col gap-1.5">
                  <LevelMeter get={() => engine.level(0)} label="L" w={104} />
                  <LevelMeter get={() => engine.level(1)} label="R" w={104} />
                </div>
              </div>

              {/* Import, Record & Custom Builder */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn justify-center"
                  onClick={() => {
                    setToolsOpen(false)
                    p.onOpenImport()
                  }}
                >
                  <Upload size={14} />Impor file
                </button>

                {p.rec ? (
                  <button className="btn on justify-center" onClick={p.onToggleRec}>
                    <Square size={12} />Berhenti ({fmt(p.recElapsed).slice(0, 5)})
                  </button>
                ) : (
                  <button className="btn justify-center" onClick={p.onToggleRec}>
                    <Mic size={14} />Rekam
                  </button>
                )}
              </div>

              <button
                className="btn w-full justify-center"
                onClick={() => {
                  setToolsOpen(false)
                  p.onBuilder()
                }}
              >
                <SlidersHorizontal size={14} />Custom Builder
              </button>

              {p.rec && (
                <div className="flex items-center justify-between rounded-[4px] border border-line bg-base px-3 py-2">
                  <span className="text-[11px] text-clip">Input mikrofon</span>
                  <LevelMeter get={p.getRecLevel} w={112} />
                </div>
              )}

              {/* Export Format + Export Button */}
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <select
                  className="inp font-mono"
                  value={p.exportFormat}
                  onChange={(e) => p.setExportFormat(e.target.value as ExportFormat)}
                  disabled={p.busy}
                  aria-label="Format ekspor"
                >
                  {EXPORT_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  className="btn pri flex-1 justify-center"
                  onClick={() => {
                    setToolsOpen(false)
                    p.onExport()
                  }}
                  disabled={p.busy}
                >
                  {p.busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
