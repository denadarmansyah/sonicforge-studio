import { encodeWav } from './wavEncoder'

export type ExportFormat = 'wav-16' | 'wav-24' | 'mp3-192' | 'mp3-320'

export const EXPORT_FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'wav-16', label: 'WAV 16-bit' },
  { value: 'wav-24', label: 'WAV 24-bit' },
  { value: 'mp3-192', label: 'MP3 192 kbps' },
  { value: 'mp3-320', label: 'MP3 320 kbps' },
]

export function formatExtension(fmt: ExportFormat): '.wav' | '.mp3' {
  return fmt.startsWith('mp3') ? '.mp3' : '.wav'
}

export function formatHumanName(fmt: ExportFormat): string {
  const hit = EXPORT_FORMAT_OPTIONS.find((o) => o.value === fmt)
  return hit ? hit.label : fmt.toUpperCase()
}

export async function encodeAudioByFormat(
  audioBuffer: AudioBuffer,
  fmt: ExportFormat,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) {
    throw new DOMException('Dibatalkan', 'AbortError')
  }

  if (fmt === 'wav-16' || fmt === 'wav-24') {
    onProgress?.(40)
    await new Promise((r) => setTimeout(r, 0))
    const bits = fmt === 'wav-24' ? 24 : 16
    const blob = encodeWav(audioBuffer, bits)
    onProgress?.(100)
    return blob
  }

  const kbps: 192 | 320 = fmt === 'mp3-320' ? 320 : 192
  const numCh = Math.min(2, audioBuffer.numberOfChannels)
  const channels: Float32Array[] = []
  const transfers: Transferable[] = []
  for (let c = 0; c < numCh; c++) {
    const copy = new Float32Array(audioBuffer.getChannelData(c))
    channels.push(copy)
    transfers.push(copy.buffer)
  }

  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/mp3Encoder.worker.ts', import.meta.url), {
      type: 'module',
    })

    const onAbort = () => {
      worker.terminate()
      reject(new DOMException('Dibatalkan', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data
      if (msg.type === 'progress') {
        onProgress?.(msg.percent)
      } else if (msg.type === 'done') {
        signal?.removeEventListener('abort', onAbort)
        worker.terminate()
        resolve(new Blob([msg.buffer], { type: 'audio/mpeg' }))
      } else if (msg.type === 'error') {
        signal?.removeEventListener('abort', onAbort)
        worker.terminate()
        reject(new Error(msg.message || 'Gagal mengenkode MP3.'))
      }
    }

    worker.onerror = (err) => {
      signal?.removeEventListener('abort', onAbort)
      worker.terminate()
      reject(new Error(err.message || 'Worker MP3 gagal dijalankan.'))
    }

    worker.postMessage(
      {
        sampleRate: audioBuffer.sampleRate,
        kbps,
        channels,
      },
      transfers
    )
  })
}
