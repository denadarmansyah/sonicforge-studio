import { useEffect, useRef, useState } from 'react'
import { AudioWaveform, FolderOpen, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { engine, peak } from '../audio/audioEngine'
import { renderMix, renderSingleTrack } from '../audio/offlineRenderer'
import {
  decodeMediaFileToAudioBuffer,
  MEDIA_INPUT_ACCEPT,
  stripExtension,
  terminateActiveFFmpeg,
} from '../audio/videoExtractor'
import { BUILTIN_PRESETS } from '../audio/presets'
import { DEFAULT_FX, duration, FX, Preset, SavedSound, Track } from '../types/audio'
import {
  encodeAudioByFormat,
  ExportFormat,
  formatExtension,
  formatHumanName,
} from '../utils/audioExporter'
import { download } from '../utils/wavEncoder'
import { TopBar } from '../components/TopBar'
import { LibrarySidebar } from '../components/LibrarySidebar'
import { TimelineWorkspace } from '../components/TimelineWorkspace'
import { InspectorPanel } from '../components/InspectorPanel'
import { CustomBuilderModal } from '../components/CustomBuilderModal'
import { Button, UnstyledButton } from '../ui/primitives'

function useLocal<T>(k: string, init: T): [T, (v: T) => void] {
  const [v, s] = useState<T>(() => { try { const x = localStorage.getItem(k); return x ? (JSON.parse(x) as T) : init } catch { return init } })
  return [v, (n: T) => { s(n); try { localStorage.setItem(k, JSON.stringify(n)) } catch { /* storage full or blocked */ } }]
}

interface ActiveTask {
  label: string
  percent: number
  warning?: string
}

export function StudioPage() {
  const [tracks, setTracks] = useState<Track[]>([]), [sel, setSel] = useState<string | null>(null)
  const [pos, setPos] = useState(0), [playing, setPlaying] = useState(false), [loop, setLoop] = useState(false)
  const [pps, setPps] = useState(80), [name, setName] = useState('Untitled Session'), [builder, setBuilder] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav-16')
  const [task, setTask] = useState<ActiveTask | null>(null), [msg, setMsg] = useState('')
  const [mobileTab, setMobileTab] = useState<'library' | 'timeline' | 'inspector'>('timeline')
  const [custom, setCustom] = useLocal<Preset[]>('sf.presets', []), [sounds, setSounds] = useLocal<SavedSound[]>('sf.sounds', [])

  // Shared Microphone Recording State (used by both TopBar & Timeline empty state)
  const mrRef = useRef<MediaRecorder | null>(null)
  const recAnRef = useRef<AnalyserNode | null>(null)
  const recT0Ref = useRef(0)
  const [rec, setRec] = useState(false)
  const [recElapsed, setRecElapsed] = useState(0)

  // Shared File Picker & Task Cancellation Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const importChainRef = useRef<Promise<void>>(Promise.resolve())

  const tr = useRef(tracks), posRef = useRef(0)
  tr.current = tracks
  const presets = [...BUILTIN_PRESETS, ...custom]
  const endT = Math.max(0, ...tracks.map((t) => t.offset + duration(t)))
  const track = tracks.find((t) => t.id === sel)
  const busy = task !== null

  useEffect(() => {
    return () => {
      engine.stop()
      abortRef.current?.abort()
      terminateActiveFFmpeg()
      if (mrRef.current && mrRef.current.state !== 'inactive') {
        mrRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    if (!rec) return
    const id = setInterval(() => setRecElapsed((performance.now() - recT0Ref.current) / 1000), 50)
    return () => clearInterval(id)
  }, [rec])

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
    if (!tracks.length) { setMsg('Tambahkan track terlebih dahulu sebelum memutar.'); return }
    const from = posRef.current >= endT ? 0 : posRef.current
    posRef.current = from; engine.play(tracks, from); setPlaying(true)
  }
  const stop = () => { engine.stop(); setPlaying(false); posRef.current = 0; setPos(0) }

  const addBuffer = (buffer: AudioBuffer, nm: string, offset = posRef.current, fx: Partial<FX> = {}) => {
    const t: Track = { id: crypto.randomUUID(), name: nm, buffer, offset, fadeIn: 0, fadeOut: 0, mute: false, solo: false, fx: { ...DEFAULT_FX, ...fx } }
    setTracks((p) => [...p, t]); setSel(t.id); setMsg(`Track “${nm}” ditambahkan.`)
  }
  const patch = (id: string, p: Partial<Track>) => setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))
  const patchFx = (p: Partial<FX>) => { if (sel) setTracks((ts) => ts.map((t) => (t.id === sel ? { ...t, fx: { ...t.fx, ...p } } : t))) }
  const dup = (id: string) => { const t = tracks.find((x) => x.id === id); if (t) { const n = { ...t, id: crypto.randomUUID(), name: t.name + ' copy', fx: { ...t.fx, eq: [...t.fx.eq] } }; setTracks((p) => [...p, n]); setSel(n.id) } }
  const del = (id: string) => { setTracks((p) => p.filter((t) => t.id !== id)); if (sel === id) setSel(null) }

  const toggleRec = async () => {
    if (rec) {
      mrRef.current?.stop()
      setRec(false)
      return
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setMsg('Perekaman mikrofon hanya tersedia pada koneksi HTTPS atau localhost.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const ctx = engine.ctx; await ctx.resume()
      const a = ctx.createAnalyser(); a.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(a); recAnRef.current = a
      const r = new MediaRecorder(stream), chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = async () => {
        stream.getTracks().forEach((x) => x.stop()); recAnRef.current = null
        try {
          const decoded = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())
          addBuffer(decoded, 'Rekaman ' + (tr.current.length + 1), 0)
          setMobileTab('timeline')
        } catch {
          setMsg('Rekaman gagal diproses. Silakan coba lagi.')
        }
      }
      r.start(); mrRef.current = r; recT0Ref.current = performance.now(); setRecElapsed(0); setRec(true)
      setMsg('Sedang merekam dari mikrofon…')
    } catch {
      setMsg('Mikrofon tidak dapat diakses. Izinkan akses mikrofon di browser Anda.')
    }
  }

  const cancelActiveTask = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setTask(null)
    setMsg('Proses dibatalkan.')
  }

  // Sequential multi-file import queue (prevents parallel memory spikes)
  const importFilesSequential = (fileList: File[]) => {
    if (!fileList.length) return
    importChainRef.current = importChainRef.current.then(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const total = fileList.length

      try {
        for (let i = 0; i < total; i++) {
          if (ctrl.signal.aborted) break
          const f = fileList[i]
          const prefix = total > 1 ? `[${i + 1}/${total}] ` : ''

          try {
            const { buffer, kind } = await decodeMediaFileToAudioBuffer(
              f,
              engine.ctx,
              (prog) => {
                setTask({
                  label: prefix + prog.label,
                  percent: prog.percent,
                  warning: prog.warning,
                })
                if (prog.warning) setMsg(prog.warning)
              },
              ctrl.signal
            )

            const trackName = stripExtension(f.name)
            addBuffer(buffer, trackName, 0)
            setMobileTab('timeline')
            setMsg(
              kind === 'video'
                ? `Jalur audio dari video “${f.name}” berhasil ditambahkan.`
                : `Track “${trackName}” berhasil diimpor.`
            )
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              setMsg('Proses impor dibatalkan.')
              break
            }
            setMsg(err instanceof Error ? err.message : `Gagal mengimpor “${f.name}”.`)
          }
        }
      } finally {
        if (abortRef.current === ctrl) {
          abortRef.current = null
          setTask(null)
        }
      }
    })
  }

  const safeFilename = (raw: string, fallback: string) =>
    raw.trim().replace(/[^\w\s-]+/g, '').replace(/\s+/g, '_') || fallback

  const doExportMix = async () => {
    if (!tracks.length) {
      setMsg('Belum ada track untuk diekspor. Impor atau rekam audio terlebih dahulu.')
      return
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const fmtLabel = formatHumanName(exportFormat)
    setTask({ label: `Me-render proyek ke ${fmtLabel}…`, percent: 12 })

    try {
      const rendered = await renderMix(tracks)
      if (ctrl.signal.aborted) throw new DOMException('Dibatalkan', 'AbortError')
      const blob = await encodeAudioByFormat(
        rendered,
        exportFormat,
        (pct) => setTask({ label: `Mengekspor ${fmtLabel}… (${pct}%)`, percent: 15 + Math.round(pct * 0.85) }),
        ctrl.signal
      )
      const outName = safeFilename(name, 'mix') + formatExtension(exportFormat)
      download(blob, outName)
      setMsg(`Berhasil mengekspor “${outName}” (${fmtLabel}).`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMsg('Proses ekspor dibatalkan.')
      } else {
        setMsg(err instanceof Error ? err.message : 'Gagal mengekspor audio.')
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null
        setTask(null)
      }
    }
  }

  const doExportSingleTrack = async (target: Track, fmtChoice: ExportFormat) => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const fmtLabel = formatHumanName(fmtChoice)
    setTask({ label: `Me-render track “${target.name}”…`, percent: 12 })

    try {
      const rendered = await renderSingleTrack(target)
      if (ctrl.signal.aborted) throw new DOMException('Dibatalkan', 'AbortError')
      const blob = await encodeAudioByFormat(
        rendered,
        fmtChoice,
        (pct) =>
          setTask({
            label: `Mengekspor track “${target.name}” ke ${fmtLabel}… (${pct}%)`,
            percent: 15 + Math.round(pct * 0.85),
          }),
        ctrl.signal
      )
      const outName = safeFilename(target.name, 'track') + formatExtension(fmtChoice)
      download(blob, outName)
      setMsg(`Track “${target.name}” berhasil diekspor sebagai ${fmtLabel}.`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMsg('Ekspor track dibatalkan.')
      } else {
        setMsg(err instanceof Error ? err.message : 'Gagal mengekspor track.')
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null
        setTask(null)
      }
    }
  }

  const openImportPicker = () => fileInputRef.current?.click()

  return (
    <div
      className="studio-shell studio-grid-responsive relative grid h-dvh grid-rows-[48px_minmax(0,1fr)_24px_auto] lg:grid-rows-[48px_1fr_24px]"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const dropped = Array.from(e.dataTransfer.files)
        if (dropped.length) importFilesSequential(dropped)
      }}
    >
      {/* Shared Hidden Audio + Video Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={MEDIA_INPUT_ACCEPT}
        hidden
        onChange={(e) => {
          const picked = e.target.files ? Array.from(e.target.files) : []
          if (picked.length) importFilesSequential(picked)
          e.target.value = ''
        }}
      />

      <TopBar
        name={name} setName={setName} playing={playing} loop={loop} pos={pos} busy={busy}
        exportFormat={exportFormat} setExportFormat={setExportFormat}
        rec={rec} recElapsed={recElapsed} getRecLevel={() => (recAnRef.current ? peak(recAnRef.current) : 0)}
        onToggleRec={toggleRec} onOpenImport={openImportPicker}
        onPlay={toggle} onStop={stop} onStart={() => seek(0)} onLoop={() => setLoop(!loop)}
        onBuilder={() => setBuilder(true)} onExport={doExportMix}
      />

      {/* >=1280px: exact 280px | 1fr | 320px | 1024-1279px: 240px | 1fr | 280px | <1024px: single full-screen active tab panel */}
      <div className="min-h-0 min-w-0 lg:grid lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[280px_1fr_320px]">
        <div className={`${mobileTab === 'library' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <LibrarySidebar
            presets={presets} sounds={sounds} hasTrack={!!track} busy={busy}
            onAdd={(b, n) => { addBuffer(b, n); setMobileTab('timeline') }}
            onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })}
            onDelSound={(id) => setSounds(sounds.filter((s) => s.id !== id))}
            onDelPreset={(id) => setCustom(custom.filter((p) => p.id !== id))}
            onOpenImport={openImportPicker}
          />
        </div>

        <div className={`${mobileTab === 'timeline' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <TimelineWorkspace
            tracks={tracks} sel={sel} pos={pos} pps={pps} endT={endT}
            rec={rec} busy={busy}
            onSel={setSel} onSeek={seek} onZoom={setPps}
            onPatch={patch} onDup={dup} onDel={del}
            onOpenImport={openImportPicker} onToggleRec={toggleRec}
            onEditEffects={() => setMobileTab('inspector')}
          />
        </div>

        <div className={`${mobileTab === 'inspector' ? 'block h-full' : 'hidden'} min-h-0 min-w-0 lg:block`}>
          <InspectorPanel
            track={track} tracks={tracks} presets={presets}
            exportFormat={exportFormat} setExportFormat={setExportFormat}
            busy={busy} onExportTrack={doExportSingleTrack}
            onSel={setSel} onPatchTrack={patch}
            onFx={patchFx} onReset={() => patchFx({ ...DEFAULT_FX })}
            onApply={(p) => patchFx({ ...DEFAULT_FX, ...p.fx, bypass: false })}
          />
        </div>
      </div>

      {/* Non-blocking Progress Banner for Import / Video Extraction / MP3 Encoding */}
      {task && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 left-1/2 z-40 flex w-[min(460px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-1.5 rounded-[6px] border border-accent/40 bg-panel/95 p-3 shadow-2xl backdrop-blur-xs lg:bottom-8"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Loader2 size={13} className="shrink-0 animate-spin text-ink" />
              <span className="truncate text-[11.5px] font-medium text-ink">{task.label}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelActiveTask}
            >
              <X size={13} />
              <span>Batal</span>
            </Button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-base border border-line">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${Math.max(4, Math.min(100, task.percent))}%` }}
            />
          </div>
          {task.warning && <span className="text-[10.5px] text-sub">{task.warning}</span>}
        </div>
      )}

      {/* Status Footer */}
      <footer className="flex min-w-0 items-center justify-between gap-2 border-t border-line bg-panel px-2.5 font-mono text-[10.5px] tabular-nums text-sub lg:px-3 lg:text-[11px]">
        <span className="truncate">
          {task ? task.label : msg || 'Tarik dan lepas berkas audio atau video ke mana saja untuk mengimpor.'}
        </span>
        <span className="shrink-0">{tracks.length} tracks</span>
      </footer>

      {/* Bottom Tab Bar (<1024px only) */}
      <nav
        aria-label="Panel kerja studio"
        className="grid grid-cols-3 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <UnstyledButton
          onClick={() => setMobileTab('library')}
          className={`studio-landscape-compact flex min-h-12 items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'library' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <FolderOpen size={14} />
          <span>Library</span>
        </UnstyledButton>

        <UnstyledButton
          onClick={() => setMobileTab('timeline')}
          className={`studio-landscape-compact flex min-h-12 items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'timeline' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <AudioWaveform size={14} />
          <span>Timeline</span>
          {tracks.length > 0 && (
            <span className="rounded-full border border-line bg-base px-1.5 text-[10px] font-mono tabular-nums text-ink">
              {tracks.length}
            </span>
          )}
        </UnstyledButton>

        <UnstyledButton
          onClick={() => setMobileTab('inspector')}
          className={`studio-landscape-compact flex min-h-12 items-center justify-center gap-1.5 border-t-2 text-[11.5px] font-medium transition-colors ${
            mobileTab === 'inspector' ? 'border-accent bg-raised text-ink' : 'border-transparent text-sub'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Inspector</span>
          {track && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </UnstyledButton>
      </nav>

      {builder && (
        <CustomBuilderModal
          fx={track?.fx}
          onClose={() => setBuilder(false)}
          onSavePreset={(p) => setCustom([...custom, p])}
          onAddSound={(b, n) => { addBuffer(b, n); setMobileTab('timeline') }}
          onSaveSound={(s) => { setSounds([...sounds, s]); setMsg(`Suara “${s.name}” disimpan ke My Library.`) }}
        />
      )}
    </div>
  )
}
