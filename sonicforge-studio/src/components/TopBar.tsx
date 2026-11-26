import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Mic, MoreHorizontal, Pause, Play, Repeat, SkipBack, SlidersHorizontal, Square, Upload, X } from 'lucide-react'
import { engine } from '../audio/audioEngine'
import { fmt } from '../utils/format'
import { EXPORT_FORMAT_OPTIONS, ExportFormat } from '../utils/audioExporter'
import { Logo } from '../ui/Logo'
import { Button, IconButton } from '../ui/primitives'
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
            <span className="inline-flex min-[400px]:hidden">
              <Logo variant="symbol" size={22} />
            </span>
            <span className="hidden min-[400px]:inline-flex">
              <Logo variant="horizontal" size={98} />
            </span>
          </Link>
          <input
            className="inp min-w-0 flex-1 max-w-[140px] text-ellipsis px-1.5 text-[11px] sm:max-w-[180px] sm:px-2 sm:text-[12px] lg:w-36 lg:max-w-none xl:w-44"
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            aria-label="Nama proyek"
          />
        </div>

        {/* Transport Controls */}
        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
          <IconButton size="sm" label="Kembali ke awal" onClick={p.onStart}><SkipBack size={14} /></IconButton>
          <IconButton size="sm" active={p.playing} label={p.playing ? 'Jeda' : 'Putar'} onClick={p.onPlay}>
            {p.playing ? <Pause size={14} /> : <Play size={14} />}
          </IconButton>
          <IconButton size="sm" label="Berhenti" onClick={p.onStop}><Square size={13} /></IconButton>
          <IconButton size="sm" active={p.loop} label="Ulangi" onClick={p.onLoop}><Repeat size={14} /></IconButton>
          <div className="ml-1 hidden h-8 w-[92px] items-center justify-center rounded-[10px] border border-line bg-base font-mono text-[12px] tabular-nums min-[420px]:flex lg:ml-2 lg:w-[104px] lg:text-[13px]">
            {fmt(p.pos)}
          </div>
        </div>

        {/* Desktop (>=1024px) Full Secondary Actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {p.rec ? (
            <>
              <LevelMeter get={p.getRecLevel} w={52} />
              <span className="font-mono text-[12px] tabular-nums text-clip">{fmt(p.recElapsed)}</span>
              <Button variant="primary" size="sm" onClick={p.onToggleRec}><Square size={13} /><span>Berhenti</span></Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={p.onToggleRec}><Mic size={14} /><span>Rekam</span></Button>
          )}
          <div className="flex flex-col gap-1">
            <LevelMeter get={() => engine.level(0)} label="L" w={58} />
            <LevelMeter get={() => engine.level(1)} label="R" w={58} />
          </div>
          <Button variant="secondary" size="sm" onClick={p.onBuilder}><SlidersHorizontal size={14} /><span>Custom Builder</span></Button>
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
          <Button variant="primary" size="sm" loading={p.busy} onClick={p.onExport}>
            <Download size={14} />
            <span>Ekspor</span>
          </Button>
        </div>

        {/* Mobile / Tablet (<1024px) Quick Record Stop + Overflow Tools Button */}
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          {p.rec && (
            <Button variant="primary" size="sm" onClick={p.onToggleRec} aria-label="Berhenti rekam">
              <Square size={12} />
              <span className="font-mono tabular-nums">{fmt(p.recElapsed).slice(0, 5)}</span>
            </Button>
          )}
          <IconButton
            size="sm"
            label="Menu alat dan ekspor"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen(true)}
          >
            <MoreHorizontal size={16} />
          </IconButton>
        </div>
      </header>

      {/* Mobile / Tablet (<1024px) Overflow Tools & Export Bottom Sheet */}
      {toolsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 sm:items-center sm:p-4 lg:hidden"
          onClick={() => setToolsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Alat Studio dan Ekspor"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-[390px] sm:rounded-xl"
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">Alat Studio & Ekspor</span>
                <span className="rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-sub min-[420px]:hidden">
                  {fmt(p.pos)}
                </span>
              </div>
              <IconButton size="sm" label="Tutup menu" onClick={() => setToolsOpen(false)}>
                <X size={15} />
              </IconButton>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-line bg-base px-3 py-2">
                <span className="text-[11px] text-sub">Level Master</span>
                <div className="flex flex-col gap-1.5">
                  <LevelMeter get={() => engine.level(0)} label="L" w={104} />
                  <LevelMeter get={() => engine.level(1)} label="R" w={104} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setToolsOpen(false)
                    p.onOpenImport()
                  }}
                >
                  <Upload size={14} /><span>Impor file</span>
                </Button>

                {p.rec ? (
                  <Button variant="primary" size="sm" onClick={p.onToggleRec}>
                    <Square size={12} /><span>Berhenti ({fmt(p.recElapsed).slice(0, 5)})</span>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={p.onToggleRec}>
                    <Mic size={14} /><span>Rekam</span>
                  </Button>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => {
                  setToolsOpen(false)
                  p.onBuilder()
                }}
              >
                <SlidersHorizontal size={14} /><span>Custom Builder</span>
              </Button>

              {p.rec && (
                <div className="flex items-center justify-between rounded-lg border border-line bg-base px-3 py-2">
                  <span className="text-[11px] text-clip">Input mikrofon</span>
                  <LevelMeter get={p.getRecLevel} w={112} />
                </div>
              )}

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
                <Button
                  variant="primary"
                  size="sm"
                  loading={p.busy}
                  className="flex-1"
                  onClick={() => {
                    setToolsOpen(false)
                    p.onExport()
                  }}
                >
                  <Download size={14} />
                  <span>Ekspor</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
