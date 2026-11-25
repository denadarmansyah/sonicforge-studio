/// <reference lib="webworker" />
import { Mp3Encoder } from '@breezystack/lamejs'

interface EncodeMessage {
  sampleRate: number
  kbps: 192 | 320
  channels: Float32Array[]
}

function floatToInt16Chunk(src: Float32Array, start: number, len: number): Int16Array {
  const out = new Int16Array(len)
  for (let i = 0; i < len; i++) {
    const s = src[start + i]
    const clamped = s < -1 ? -1 : s > 1 ? 1 : s
    out[i] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767)
  }
  return out
}

self.onmessage = (e: MessageEvent<EncodeMessage>) => {
  try {
    const { sampleRate, kbps, channels } = e.data
    const numChannels = channels.length >= 2 ? 2 : 1
    const left = channels[0]
    const right = numChannels === 2 ? channels[1] : channels[0]
    const totalSamples = left.length

    const encoder = new Mp3Encoder(numChannels, sampleRate, kbps)
    // Exact multiple of 1152 samples (MP3 frame size) for clean framing
    const blockSize = 1152 * 16
    const mp3Parts: Uint8Array[] = []
    let totalBytes = 0
    let lastReportedPct = -1

    for (let offset = 0; offset < totalSamples; offset += blockSize) {
      const len = Math.min(blockSize, totalSamples - offset)
      const leftInt16 = floatToInt16Chunk(left, offset, len)
      const buf =
        numChannels === 2
          ? encoder.encodeBuffer(leftInt16, floatToInt16Chunk(right, offset, len))
          : encoder.encodeBuffer(leftInt16)

      if (buf.length > 0) {
        const copy = new Uint8Array(buf)
        mp3Parts.push(copy)
        totalBytes += copy.byteLength
      }

      const pct = Math.min(96, Math.round(((offset + len) / Math.max(1, totalSamples)) * 96))
      if (pct >= lastReportedPct + 4) {
        lastReportedPct = pct
        self.postMessage({ type: 'progress', percent: pct })
      }
    }

    const tail = encoder.flush()
    if (tail.length > 0) {
      const copy = new Uint8Array(tail)
      mp3Parts.push(copy)
      totalBytes += copy.byteLength
    }

    const merged = new Uint8Array(totalBytes)
    let cursor = 0
    for (const part of mp3Parts) {
      merged.set(part, cursor)
      cursor += part.byteLength
    }

    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'done', buffer: merged.buffer }, { transfer: [merged.buffer] })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Gagal mengenkode MP3.',
    })
  }
}
