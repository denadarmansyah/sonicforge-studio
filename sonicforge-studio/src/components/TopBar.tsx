import { useEffect, useRef, useState } from 'react'
import { AudioWaveform, Download, Mic, Pause, Play, Repeat, SkipBack, SlidersHorizontal, Square } from 'lucide-react'
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
  const [rec, setRec] = useState(false), [el, setEl] = useState(0)
  useEffect(() => {
    if (!rec) return
    const id = setInterval(() => setEl((performance.now() - t0.current) / 1000), 50)
    return () => clearInterval(id)
  }, [rec])
  const start = async () => {
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
    <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2"><AudioWaveform size={16} className="text-accent" /><span className="text-[12px] font-semibold tracking-[0.08em]">SONICFORGE</span></div>
        <input className="inp w-48" value={p.name} onChange={(e) => p.setName(e.target.value)} aria-label="Project name" />
      </div>
      <div className="flex items-center gap-1.5">
        <button className="btn sq" onClick={p.onStart} aria-label="Skip to start"><SkipBack size={13} /></button>
        <button className={`btn sq ${p.playing ? 'on' : ''}`} onClick={p.onPlay} aria-label={p.playing ? 'Pause' : 'Play'}>{p.playing ? <Pause size={13} /> : <Play size={13} />}</button>
        <button className="btn sq" onClick={p.onStop} aria-label="Stop"><Square size={12} /></button>
        <button className={`btn sq ${p.loop ? 'on' : ''}`} onClick={p.onLoop} aria-label="Loop"><Repeat size={13} /></button>
        <div className="ml-2 flex h-7 w-[108px] items-center justify-center rounded-[4px] border border-line bg-base font-mono text-[14px] tabular-nums">{fmt(p.pos)}</div>
      </div>
      <div className="flex items-center gap-2">
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
    </header>
  )
}
