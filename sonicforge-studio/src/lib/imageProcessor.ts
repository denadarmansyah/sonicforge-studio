export type ImageKind = 'avatar' | 'banner' | 'thumbnail' | 'background' | 'og'

const TARGET_SPECS: Record<ImageKind, { maxW: number; maxH: number; label: string }> = {
  avatar: { maxW: 512, maxH: 512, label: 'Avatar' },
  banner: { maxW: 1600, maxH: 534, label: 'Banner' },
  thumbnail: { maxW: 800, maxH: 1000, label: 'Thumbnail' },
  background: { maxW: 1200, maxH: 1800, label: 'Latar Profil' },
  og: { maxW: 1200, maxH: 630, label: 'Gambar Open Graph' },
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 // 2 MB final limit
export const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024 // 12 MB pre-compression limit

/**
 * Validates, center-crops / scales proportionally, and converts an uploaded image
 * to optimized WebP <= 2 MB on the client before uploading to Supabase Storage.
 */
export async function processImageToWebp(file: File, kind: ImageKind): Promise<File> {
  if (!file || file.size === 0) {
    throw new Error('Berkas gambar kosong atau tidak dapat dibaca.')
  }
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Format gambar belum didukung. Gunakan berkas JPG, PNG, atau WebP.')
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Ukuran berkas asli terlalu besar (maksimal 12 MB sebelum kompresi).')
  }

  const spec = TARGET_SPECS[kind]
  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`${spec.label} gagal dimuat. Pastikan berkas gambar tidak rusak.`))
      el.src = objectUrl
    })

    const srcW = img.naturalWidth || img.width
    const srcH = img.naturalHeight || img.height
    if (srcW < 32 || srcH < 32) {
      throw new Error(`Resolusi ${spec.label.toLowerCase()} terlalu kecil (minimal 32×32 piksel).`)
    }

    // Center-crop to target aspect ratio (avatar 1:1, banner 3:1, thumbnail 4:5), capped at maxW x maxH
    const targetAspect = spec.maxW / spec.maxH
    const srcAspect = srcW / srcH
    let sx = 0
    let sy = 0
    let sw = srcW
    let sh = srcH

    if (srcAspect > targetAspect) {
      sw = Math.round(srcH * targetAspect)
      sx = Math.round((srcW - sw) / 2)
    } else if (srcAspect < targetAspect) {
      sh = Math.round(srcW / targetAspect)
      sy = Math.round((srcH - sh) / 2)
    }

    const scale = Math.min(1, spec.maxW / sw, spec.maxH / sh)
    const outW = Math.max(1, Math.round(sw * scale))
    const outH = Math.max(1, Math.round(sh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Browser tidak mendukung pemrosesan kanvas gambar.')
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

    for (const quality of [0.86, 0.76, 0.64]) {
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), 'image/webp', quality)
      )
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], `${kind}-${Date.now()}.webp`, { type: 'image/webp' })
      }
    }

    throw new Error(`Gambar hasil kompresi masih melebihi batas 2 MB. Pilih gambar lain.`)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
