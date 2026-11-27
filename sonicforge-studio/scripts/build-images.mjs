import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(APP_ROOT, 'raw-assets', 'images')
const OUT_DIR = path.join(APP_ROOT, 'public', 'images')
const PUBLIC_DIR = path.join(APP_ROOT, 'public')

fs.mkdirSync(OUT_DIR, { recursive: true })

export const IMAGE_SPECS = [
  { name: 'hero-main', ratio: [16, 10], widths: [800, 1600, 2400], bg: '#0A0A0A' },
  { name: 'hero-main-mobile', ratio: [4, 5], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'feature-templates', ratio: [4, 3], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'feature-soundlab', ratio: [4, 3], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'feature-studio', ratio: [4, 3], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'feature-profile', ratio: [4, 3], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'pricing-main', ratio: [4, 3], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'plan-free', ratio: [1, 1], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'plan-pro', ratio: [1, 1], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'auth-main', ratio: [4, 3], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'empty-explore', ratio: [1, 1], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'empty-templates', ratio: [1, 1], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'empty-dashboard', ratio: [1, 1], widths: [800, 1600], bg: '#0A0A0A' },
  { name: 'cta-banner', ratio: [2400, 1029], widths: [800, 1600, 2400], bg: '#0A0A0A' },
  { name: 'error-404', ratio: [1, 1], widths: [800, 1600], bg: '#FFFFFF' },
  { name: 'og-image', ratio: [1200, 630], widths: [1200], bg: '#0A0A0A', isOg: true },
]

async function encodeOptimizedPng(srcPath, width, height, destPath, compositeLogoLeft = false) {
  let pipeline = sharp(srcPath)
    .grayscale()
    .resize(width, height, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })

  if (compositeLogoLeft) {
    const logoSvgPath = path.join(PUBLIC_DIR, 'brand', 'luven-logo-horizontal.svg')
    if (fs.existsSync(logoSvgPath)) {
      const whiteLogoSvg = fs
        .readFileSync(logoSvgPath, 'utf8')
        .replace(/currentColor/g, '#FAFAFA')
      const logoBuf = await sharp(Buffer.from(whiteLogoSvg))
        .resize({ width: 340 })
        .png()
        .toBuffer()
      pipeline = SharpWithLogo(pipeline, logoBuf)
    }
  }

  const baseBuf = await pipeline.png().toBuffer()

  const targetMaxBytes = width <= 800 ? 85 * 1024 : 260 * 1024
  for (const colours of [24, 16, 12, 8]) {
    const buf = await sharp(baseBuf)
      .png({ palette: true, colours, dither: 0.15, compressionLevel: 9, effort: 10 })
      .toBuffer()

    if (buf.length <= targetMaxBytes || colours === 8) {
      fs.writeFileSync(destPath, buf)
      return buf.length
    }
  }
  return 0
}

function SharpWithLogo(pipeline, logoBuf) {
  return pipeline.composite([{ input: logoBuf, left: 88, top: 270 }])
}

const results = []
for (const spec of IMAGE_SPECS) {
  const rawPng = path.join(RAW_DIR, `${spec.name}.png`)
  if (!fs.existsSync(rawPng)) {
    console.warn(`[SKIP] Master belum tersedia: ${rawPng}`)
    continue
  }

  for (const w of spec.widths) {
    const h = Math.round((w * spec.ratio[1]) / spec.ratio[0])
    const dest = spec.isOg
      ? path.join(PUBLIC_DIR, 'og-image.png')
      : path.join(OUT_DIR, `${spec.name}-${w}.png`)
    const bytes = await encodeOptimizedPng(rawPng, w, h, dest, Boolean(spec.isOg))
    const kb = (bytes / 1024).toFixed(1)
    const label = spec.isOg ? 'public/og-image.png' : `public/images/${spec.name}-${w}.png`
    console.log(`${label} -> ${w}x${h} (${kb} KB)`)
    results.push({ file: label, width: w, height: h, kb: Number(kb) })
  }
}

console.log(`\nTotal berkas PNG teroptimasi: ${results.length}`)
