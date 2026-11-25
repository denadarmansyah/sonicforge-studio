import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AudioWaveform, Download, Mic, MoreHorizontal, Pause, Play, Repeat, SkipBack, SlidersHorizontal, Square, X } from 'lucide-react'
import { engine, peak } from '../audio/audioEngine'
import { fmt } from '../utils/format'
import { LevelMeter } from './LevelMeter'

interface Props {
  name: string; setName: (s: string) => void; playing: boolean; loop: boolean; pos: number; busy: boolean
  bits: 16 | 24; setBits: (b: 16 | 24) => void
  onPlay: () => void; onStop: () => void; onStart: () => void; onLoop: () => void; onBuilder: () => void; onExport: () => void
  onRecorded: (b: AudioBuffer) => void; onError: (m: string) => void
}

export function TopBar(p: Props) {
  const mr = useRef<MediaRecorder | null>(null), an = useRef<AnalyserNode | null>(null), t0 = useRef(0)
  const [rec, setRec] = useState(false), [el, setEl] = useState(0), [toolsOpen, setToolsOpen] = useState(false)

  useEffect(() => {
    if (!rec) return
    const id = setInterval(() => setEl((performance.now() - t0.current) / 1000), 50)
    return () => clearInterval(id)
  }, [rec])

  useEffect(() => {
    if (!toolsOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setToolsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toolsOpen])

  const start = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      p.onError('Microphone requires HTTPS or localhost.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const ctx = engine.ctx; await ctx.resume()
      const a = ctx.createAnalyser(); a.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(a); an.current = a
      const r = new MediaRecorder(stream), chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop()); an.current = null
        try { p.onRecorded(await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())) } catch { p.onError('Could not decode the recording. Try again.') }
      }
      r.start(); mr.current = r; t0.current = performance.now(); setEl(0); setRec(true)
    } catch { p.onError('Microphone unavailable. Allow mic access in the browser and check your input device.') }
  }
  const stop = () => { mr.current?.stop(); setRec(false) }

  return (
    <>
      <header className="flex min-w-0 items-center justify-between gap-1.5 border-b border-line bg-panel px-2 sm:gap-2 sm:px-2.5 lg:gap-4 lg:px-3">
        {/* Brand + Project Name */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:flex-none lg:gap-3">
          <Link to="/" className="flex shrink-0 items-center gap-1.5 text-ink no-underline focus-visible:outline-1 focus-visible:outline-accent lg:gap-2" title="Back to Luven Home">
            <AudioWaveform size={16} className="text-accent" />
            <span className="text-[11.5px] font-semibold tracking-[0.08em] sm:text-[12px]">LUVEN</span>
          </Link>
          <input
            className="inp min-w-0 flex-1 max-w-[140px] text-ellipsis px-1.5 text-[11px] sm:max-w-[180px] sm:px-2 sm:text-[12px] lg:w-36 lg:max-w-none xl:w-48"
            value={p.name}
            onChange={(e) => p.setName(e.target.value)}
            aria-label="Project name"
          />
        </div>

        {/* Transport Controls (Always Visible on All Viewports & Tabs) */}
        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
          <button className="btn sq" onClick={p.onStart} aria-label="Skip to start"><SkipBack size={13} /></button>
          <button className={`btn sq ${p.playing ? 'on' : ''}`} onClick={p.onPlay} aria-label={p.playing ? 'Pause' : 'Play'}>{p.playing ? <Pause size={13} /> : <Play size={13} />}</button>
          <button className="btn sq" onClick={p.onStop} aria-label="Stop"><Square size={12} /></button>
          <button className={`btn sq ${p.loop ? 'on' : ''}`} onClick={p.onLoop} aria-label="Loop"><Repeat size={13} /></button>
          <div className="ml-1 hidden h-7 w-[92px] items-center justify-center rounded-[4px] border border-line bg-base font-mono text-[12px] tabular-nums min-[420px]:flex lg:ml-2 lg:w-[108px] lg:text-[14px]">
            {fmt(p.pos)}
          </div>
        </div>

        {/* Desktop (>=1024px) Full Secondary Actions (100% identical at >=1280px) */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {rec ? (
            <>
              <LevelMeter get={() => (an.current ? peak(an.current) : 0)} w={56} />
              <span className="font-mono text-[12px] tabular-nums text-clip">{fmt(el)}</span>
              <button className="btn on" onClick={stop}><Square size={12} />Stop rec</button>
            </>
          ) : <button className="btn" onClick={start}><Mic size={13} />Record</button>}
          <div className="flex flex-col gap-1"><LevelMeter get={() => engine.level(0)} label="L" w={64} /><LevelMeter get={() => engine.level(1)} label="R" w={64} /></div>
          <button className="btn" onClick={p.onBuilder}><SlidersHorizontal size={13} />Custom Builder</button>
          <select className="inp font-mono" value={p.bits} onChange={(e) => p.setBits(Number(e.target.value) as 16 | 24)} aria-label="Bit depth"><option value={16}>16-bit</option><option value={24}>24-bit</option></select>
          <button className="btn pri" onClick={p.onExport} disabled={p.busy}><Download size={13} />{p.busy ? 'Rendering…' : 'Export WAV'}</button>
        </div>

        {/* Mobile / Tablet (<1024px) Compact Quick Record Stop + Overflow Tools Button */}
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
          {rec && (
            <button className="btn on px-2 font-mono tabular-nums" onClick={stop} aria-label="Stop recording">
              <Square size={11} />
              <span>{fmt(el).slice(0, 5)}</span>
            </button>
          )}
          <button
            className="btn sq"
            onClick={() => setToolsOpen(true)}
            aria-label="Studio tools and export"
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
            aria-label="Studio tools and export"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-[380px] sm:rounded-lg"
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">Studio Tools & Export</span>
                <span className="rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-sub min-[420px]:hidden">
                  {fmt(p.pos)}
                </span>
              </div>
              <button className="btn sq" onClick={() => setToolsOpen(false)} aria-label="Close tools menu">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Output Master Meters */}
              <div className="flex items-center justify-between rounded-[4px] border border-line bg-base px-3 py-2">
                <span className="text-[11px] text-sub">Master Output</span>
                <div className="flex flex-col gap-1.5">
                  <LevelMeter get={() => engine.level(0)} label="L" w={104} />
                  <LevelMeter get={() => engine.level(1)} label="R" w={104} />
                </div>
              </div>

              {/* Record & Custom Builder */}
              <div className="grid grid-cols-2 gap-2">
                {rec ? (
                  <button className="btn on justify-center" onClick={stop}>
                    <Square size={12} />Stop ({fmt(el).slice(0, 5)})
                  </button>
                ) : (
                  <button className="btn justify-center" onClick={start}>
                    <Mic size={14} />Record Mic
                  </button>
                )}

                <button
                  className="btn justify-center"
                  onClick={() => {
                    setToolsOpen(false)
                    p.onBuilder()
                  }}
                >
                  <SlidersHorizontal size={14} />Custom Builder
                </button>
              </div>

              {rec && (
                <div className="flex items-center justify-between rounded-[4px] border border-line bg-base px-3 py-2">
                  <span className="text-[11px] text-clip">Recording input</span>
                  <LevelMeter get={() => (an.current ? peak(an.current) : 0)} w={112} />
                </div>
              )}

              {/* Bit Depth + Export WAV */}
              <div className="flex items-center gap-2 border-t border-line pt-3">
                <select
                  className="inp font-mono"
                  value={p.bits}
                  onChange={(e) => p.setBits(Number(e.target.value) as 16 | 24)}
                  aria-label="Bit depth"
                >
                  <option value={16}>16-bit WAV</option>
                  <option value={24}>24-bit WAV</option>
                </select>
                <button
                  className="btn pri flex-1 justify-center"
                  onClick={() => {
                    p.onExport()
                    setToolsOpen(false)
                  }}
                  disabled={p.busy}
                >
                  <Download size={14} />
                  {p.busy ? 'Rendering…' : 'Export WAV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
