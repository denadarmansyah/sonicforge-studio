import type { FFmpeg as FFmpegType } from '@ffmpeg/ffmpeg'

export const MEDIA_INPUT_ACCEPT =
  '.mp3,.wav,.ogg,.m4a,.aac,.flac,.mp4,.mov,.webm,.mkv,.avi,.m4v,audio/*,video/*'

const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus', 'weba'])
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'])

export const WARN_FILE_BYTES = 500 * 1024 * 1024 // 500 MB warning threshold
export const MAX_SAFE_VIDEO_WASM_BYTES = 600 * 1024 * 1024 // 600 MB safe WASM FS limit
export const MAX_SAFE_DIRECT_BYTES = 850 * 1024 * 1024 // 850 MB safe browser ArrayBuffer limit

export interface ImportProgress {
  stage: 'reading' | 'decoding' | 'extracting' | 'done'
  percent: number
  label: string
  warning?: string
}

function getExt(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim())
  return m ? m[1].toLowerCase() : ''
}

export function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '').trim() || 'Track'
}

/**
 * Inspect first 16 bytes for known audio/video container signatures (MP4/MOV/M4A/M4V ftyp,
 * WebM/MKV EBML, RIFF WAV/AVI, OggS, fLaC, ID3 / ADTS / MP3 frame sync).
 */
function hasMediaMagicSignature(h: Uint8Array): { valid: boolean; likelyVideo?: boolean } {
  if (h.length < 4) return { valid: false }

  // RIFF....WAVE or RIFF....AVI
  if (h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h.length >= 12) {
    const sub = String.fromCharCode(h[8], h[9], h[10], h[11])
    if (sub === 'WAVE') return { valid: true, likelyVideo: false }
    if (sub === 'AVI ') return { valid: true, likelyVideo: true }
  }

  // ISO BMFF: ....ftyp (MP4, MOV, M4A, M4V, 3GP) or QuickTime wide/moov/mdat
  if (h.length >= 8) {
    const box = String.fromCharCode(h[4], h[5], h[6], h[7])
    if (box === 'ftyp' || box === 'moov' || box === 'mdat' || box === 'wide' || box === 'free') {
      const brand = h.length >= 12 ? String.fromCharCode(h[8], h[9], h[10], h[11]) : ''
      const isM4a = brand === 'M4A '
      return { valid: true, likelyVideo: !isM4a }
    }
  }

  // EBML (WebM / Matroska .mkv)
  if (h[0] === 0x1a && h[1] === 0x45 && h[2] === 0xdf && h[3] === 0xa3) {
    return { valid: true, likelyVideo: true }
  }

  // OggS
  if (h[0] === 0x4f && h[1] === 0x67 && h[2] === 0x67 && h[3] === 0x53) {
    return { valid: true, likelyVideo: false }
  }

  // fLaC
  if (h[0] === 0x66 && h[1] === 0x4c && h[2] === 0x61 && h[3] === 0x43) {
    return { valid: true, likelyVideo: false }
  }

  // ID3 tag or MP3/AAC frame sync (0xFF 0xE0..0xFF)
  if (
    (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) ||
    (h[0] === 0xff && (h[1] & 0xe0) === 0xe0)
  ) {
    return { valid: true, likelyVideo: false }
  }

  return { valid: false }
}

export async function classifyAndValidateFile(
  file: File
): Promise<{ kind: 'audio' | 'video'; warning?: string }> {
  if (!file || file.size === 0) {
    throw new Error(`Berkas “${file?.name || 'tanpa nama'}” kosong atau tidak dapat dibaca.`)
  }

  if (file.size > MAX_SAFE_DIRECT_BYTES) {
    const mb = Math.round(file.size / (1024 * 1024))
    throw new Error(
      `Ukuran berkas (${mb} MB) melebihi batas aman memori browser (maks. 850 MB). Gunakan berkas yang lebih pendek.`
    )
  }

  const headBuf = await file.slice(0, 16).arrayBuffer()
  const sig = hasMediaMagicSignature(new Uint8Array(headBuf))
  const mime = (file.type || '').toLowerCase()
  const ext = getExt(file.name)

  const mimeAudio = mime.startsWith('audio/')
  const mimeVideo = mime.startsWith('video/')
  const extAudio = AUDIO_EXTS.has(ext)
  const extVideo = VIDEO_EXTS.has(ext)

  // Must pass magic signature OR explicit audio/video MIME; never trust extension alone on arbitrary text/binary files
  // Browser MIME is derived from the extension, so a video must pass the magic-byte check.
  if (!sig.valid && !mimeAudio) {
    throw new Error(
      `Format “${file.name}” tidak dikenali sebagai berkas audio atau video yang valid.`
    )
  }

  const isVideo = mimeVideo || extVideo || (!mimeAudio && !extAudio && !!sig.likelyVideo)
  const warning =
    file.size > WARN_FILE_BYTES
      ? `Berkas berukuran besar (${Math.round(file.size / (1024 * 1024))} MB) — ekstraksi dapat memakan memori ekstra.`
      : undefined

  return { kind: isVideo ? 'video' : 'audio', warning }
}

async function readFileWithProgress(
  file: File,
  onPct: (pct: number) => void,
  signal?: AbortSignal
): Promise<Uint8Array> {
  if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')

  if (!file.stream) {
    const ab = await file.arrayBuffer()
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')
    onPct(100)
    return new Uint8Array(ab)
  }

  const total = Math.max(1, file.size)
  const out = new Uint8Array(file.size)
  const reader = file.stream().getReader()
  let offset = 0
  let lastPct = -1

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        throw new DOMException('Dibatalkan', 'AbortError')
      }
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        out.set(value, offset)
        offset += value.byteLength
        const pct = Math.min(100, Math.round((offset / total) * 100))
        if (pct >= lastPct + 5) {
          lastPct = pct
          onPct(pct)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  onPct(100)
  return out
}

function hasAudibleSamples(buf: AudioBuffer): boolean {
  if (!buf || buf.length === 0 || buf.duration <= 0 || buf.numberOfChannels === 0) return false
  return true
}

// Lazy singleton FFmpeg instance (terminated & recreated cleanly if user cancels)
let ffmpegInstance: FFmpegType | null = null
let ffmpegLoadingPromise: Promise<FFmpegType> | null = null

async function getFFmpeg(signal?: AbortSignal): Promise<FFmpegType> {
  if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise

  ffmpegLoadingPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const ff = new FFmpeg()
    const base = window.location.origin
    await ff.load(
      {
        coreURL: `${base}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg/ffmpeg-core.wasm`,
      },
      { signal }
    )
    ffmpegInstance = ff
    return ff
  })()

  try {
    return await ffmpegLoadingPromise
  } catch (err) {
    ffmpegInstance = null
    throw err
  } finally {
    ffmpegLoadingPromise = null
  }
}

export function terminateActiveFFmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate()
    } catch {
      /* ignore */
    }
    ffmpegInstance = null
  }
  ffmpegLoadingPromise = null
}

/**
 * Tiered audio decoder / video-to-audio extractor:
 * 1. Try fast native AudioContext.decodeAudioData first.
 * 2. Fallback to lazy single-threaded ffmpeg.wasm -> 44.1 kHz stereo WAV -> AudioBuffer.
 * 3. Always clean up virtual FS & memory; surface clear Indonesian error messages.
 */
export async function decodeMediaFileToAudioBuffer(
  file: File,
  audioCtx: AudioContext,
  onProgress?: (p: ImportProgress) => void,
  signal?: AbortSignal
): Promise<{ buffer: AudioBuffer; kind: 'audio' | 'video' }> {
  const { kind, warning } = await classifyAndValidateFile(file)

  onProgress?.({
    stage: 'reading',
    percent: 4,
    label: `Membaca “${file.name}”…`,
    warning,
  })

  const rawBytes = await readFileWithProgress(
    file,
    (pct) => {
      onProgress?.({
        stage: 'reading',
        percent: Math.round(pct * 0.3),
        label: `Membaca “${file.name}”… (${pct}%)`,
        warning,
      })
    },
    signal
  )

  if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')

  // Tier 1: Fast native browser decodeAudioData
  onProgress?.({
    stage: 'decoding',
    percent: 36,
    label: kind === 'video' ? `Mengekstrak jalur audio dari “${file.name}”…` : `Memuat audio “${file.name}”…`,
    warning,
  })

  try {
    // Copy slice so rawBytes remains intact if Tier 1 fails and Tier 2 FFmpeg fallback is needed
    const copyAb = rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength)
    const decoded = await audioCtx.decodeAudioData(copyAb)
    if (signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError')
    if (hasAudibleSamples(decoded)) {
      onProgress?.({
        stage: 'done',
        percent: 100,
        label: `Selesai mengekstrak “${file.name}”.`,
      })
      return { buffer: decoded, kind }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // Proceed to Tier 2 FFmpeg WASM fallback
  }

  // Guard WASM memory limit before loading huge files into 32-bit MEMFS
  if (file.size > MAX_SAFE_VIDEO_WASM_BYTES) {
    throw new Error(
      `Berkas “${file.name}” terlalu besar untuk dekoder cadangan di browser (maks. 600 MB). Gunakan format MP4/AAC atau potong durasinya.`
    )
  }

  // Tier 2: Lazy single-thread FFmpeg WASM extraction -> 44.1kHz stereo WAV
  onProgress?.({
    stage: 'extracting',
    percent: 42,
    label: `Menyiapkan ekstraktor audio untuk “${file.name}”…`,
    warning,
  })

  const onAbort = () => terminateActiveFFmpeg()
  signal?.addEventListener('abort', onAbort, { once: true })

  const ext = getExt(file.name) || (kind === 'video' ? 'mp4' : 'bin')
  const jobId = Math.random().toString(36).slice(2, 9)
  const inName = `in_${jobId}.${ext}`
  const outName = `out_${jobId}.wav`
  let ffLogs = ''
  let ff: FFmpegType | null = null

  const onLog = ({ message }: { message: string }) => {
    ffLogs += message + '\n'
  }
  const onFfProgress = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) {
      const clamped = Math.max(0, Math.min(1, progress))
      onProgress?.({
        stage: 'extracting',
        percent: 48 + Math.round(clamped * 42),
        label: `Mengekstrak audio dari “${file.name}”… (${Math.round(clamped * 100)}%)`,
        warning,
      })
    }
  }

  try {
    ff = await getFFmpeg(signal)
    ff.on('log', onLog)
    ff.on('progress', onFfProgress)

    onProgress?.({
      stage: 'extracting',
      percent: 46,
      label: `Mengekstrak audio dari “${file.name}”…`,
      warning,
    })

    // Transfer rawBytes buffer into FFmpeg worker so main thread copy is freed immediately
    await ff.writeFile(inName, rawBytes, { signal })

    const exitCode = await ff.exec(
      [
        '-i',
        inName,
        '-map',
        '0:a:0',
        '-vn',
        '-ac',
        '2',
        '-ar',
        '44100',
        '-acodec',
        'pcm_s16le',
        '-f',
        'wav',
        outName,
      ],
      -1,
      { signal }
    )

    if (exitCode !== 0) {
      const noAudio =
        /matches no streams|does not contain any stream|Output file is empty|Stream specifier .* matches no streams/i.test(
          ffLogs
        )
      if (noAudio || kind === 'video') {
        throw new Error('Video ini tidak memiliki suara atau formatnya belum didukung.')
      }
      throw new Error(`Berkas audio “${file.name}” rusak atau formatnya belum didukung.`)
    }

    const wavData = await ff.readFile(outName, 'binary', { signal })
    if (!(wavData instanceof Uint8Array) || wavData.byteLength <= 44) {
      throw new Error(
        kind === 'video'
          ? 'Video ini tidak memiliki suara atau formatnya belum didukung.'
          : `Berkas “${file.name}” tidak memiliki data audio yang valid.`
      )
    }

    onProgress?.({
      stage: 'decoding',
      percent: 94,
      label: `Menyelesaikan gelombang audio “${file.name}”…`,
      warning,
    })

    const wavBuffer = wavData.buffer.slice(
      wavData.byteOffset,
      wavData.byteOffset + wavData.byteLength
    ) as ArrayBuffer
    const audioBuffer = await audioCtx.decodeAudioData(wavBuffer)
    if (!hasAudibleSamples(audioBuffer)) {
      throw new Error('Video ini tidak memiliki suara atau formatnya belum didukung.')
    }

    onProgress?.({
      stage: 'done',
      percent: 100,
      label: `Selesai mengekstrak “${file.name}”.`,
    })

    return { buffer: audioBuffer, kind }
  } catch (err) {
    if (
      signal?.aborted ||
      (err instanceof DOMException && err.name === 'AbortError') ||
      String(err).includes('terminated')
    ) {
      throw new DOMException('Dibatalkan', 'AbortError')
    }
    if (err instanceof Error) throw err
    throw new Error(
      kind === 'video'
        ? 'Video ini tidak memiliki suara atau formatnya belum didukung.'
        : `Gagal membaca berkas “${file.name}”.`
    )
  } finally {
    signal?.removeEventListener('abort', onAbort)
    if (ff && ff.loaded) {
      ff.off('log', onLog)
      ff.off('progress', onFfProgress)
      try { await ff.deleteFile(inName) } catch { /* already deleted */ }
      try { await ff.deleteFile(outName) } catch { /* not created */ }
    }
  }
}
