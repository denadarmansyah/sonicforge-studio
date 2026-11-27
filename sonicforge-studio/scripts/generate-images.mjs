import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const RAW_DIR = path.join(APP_ROOT, 'raw-assets', 'images')
fs.mkdirSync(RAW_DIR, { recursive: true })

// Load IMAGE_API_KEY from process.env or local .env.local without printing any value
function loadImageApiKey() {
  if (process.env.IMAGE_API_KEY) return process.env.IMAGE_API_KEY.trim()
  const envLocal = path.join(APP_ROOT, '.env.local')
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, 'utf8').split(/\r?\n/)
    for (const ln of lines) {
      const m = ln.match(/^\s*IMAGE_API_KEY\s*=\s*(.+)\s*$/)
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim()
    }
  }
  return ''
}

const PREFIX =
  'Flat 2D editorial illustration, monochrome only (black, white and grays), consistent clean line weight, simple geometric shapes, generous negative space, modern professional design-studio quality, subject: short-video creators, audio and editing tools. No text, no letters, no numbers, no logos, no watermark, no 3D rendering, no photo, no color, no glow, no gradients of color, people are generic with no resemblance to real individuals, anatomically correct hands and faces, clean edges, high resolution.'

const JOBS = [
  {
    name: 'hero-main',
    w: 2400,
    h: 1500,
    aspectRatio: '16:9',
    prompt: `${PREFIX} Solid pure black #0A0A0A background. A generic young creator wearing studio headphones holding a smartphone while editing a short video, with clean curved soundwave lines flowing gently around them; subject positioned on the right half while the entire left side is wide open black negative space.`,
  },
  {
    name: 'hero-main-mobile',
    w: 1600,
    h: 2000,
    aspectRatio: '3:4',
    prompt: `${PREFIX} Vertical portrait canvas on a solid pure black #0A0A0A background. A generic young creator wearing studio headphones holding a smartphone while editing a short video with curved soundwave lines around them, positioned in the lower-center while the upper half is open black negative space.`,
  },
  {
    name: 'feature-templates',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure white #FFFFFF background. Several sleek smartphone screens neatly layered in the center, each displaying a minimalist vertical video frame with a play triangle and timeline bar, generous white negative space.`,
  },
  {
    name: 'feature-soundlab',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure black #0A0A0A background. A clean top-down studio audio mixer panel with geometric rotary knobs, vertical fader sliders, and a crisp horizontal waveform display, centered with generous black negative space.`,
  },
  {
    name: 'feature-studio',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure white #FFFFFF background. An open modern laptop displaying a multitrack audio timeline editor with three stacked tracks of abstract geometric waveform blocks, centered with generous white negative space.`,
  },
  {
    name: 'feature-profile',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure black #0A0A0A background. Upright smartphone in the center displaying a clean link-in-bio profile page with a circular avatar silhouette and stacked horizontal pill link buttons, generous black negative space.`,
  },
  {
    name: 'pricing-main',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure white #FFFFFF background. Two minimalist vertical profile cards side by side in the center: one plain and clean, one with a double border and a crisp four-point star emblem, generous white negative space.`,
  },
  {
    name: 'plan-free',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure white #FFFFFF background. One clean minimalist profile page card in the center with a small top circle and three horizontal pill bars, generous white negative space.`,
  },
  {
    name: 'plan-pro',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure white #FFFFFF background. Minimalist profile page card elevated with layered geometric frame accents, grayscale swatch tiles, and a crisp four-point star emblem, generous white negative space.`,
  },
  {
    name: 'auth-main',
    w: 1600,
    h: 1200,
    aspectRatio: '4:3',
    prompt: `${PREFIX} Solid pure black #0A0A0A background. A sleek minimalist studio door slightly ajar with smooth white and gray soundwave curves flowing gently outward into dark negative space.`,
  },
  {
    name: 'empty-explore',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure black #0A0A0A background. A clean geometric magnifying glass hovering above an open empty minimalist box in the center, generous black negative space.`,
  },
  {
    name: 'empty-templates',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure white #FFFFFF background. An open minimalist folder in the center with a single clean vertical video clip frame rising slightly above it, generous white negative space.`,
  },
  {
    name: 'empty-dashboard',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure black #0A0A0A background. A clean minimalist empty studio board in the center with a crisp geometric plus sign inside a circle, generous black negative space.`,
  },
  {
    name: 'cta-banner',
    w: 2400,
    h: 1029,
    aspectRatio: '16:9',
    prompt: `${PREFIX} Wide panoramic canvas on a solid pure black #0A0A0A background. Studio headphones resting at the center with wide graceful horizontal soundwave lines extending left and right, vast black negative space.`,
  },
  {
    name: 'error-404',
    w: 1000,
    h: 1000,
    aspectRatio: '1:1',
    prompt: `${PREFIX} Square 1:1 canvas on a solid pure white #FFFFFF background. An unplugged studio headphone cable split into two separated ends facing each other in the center, generous white negative space.`,
  },
  {
    name: 'og-image',
    w: 1200,
    h: 630,
    aspectRatio: '16:9',
    prompt: `${PREFIX} Solid pure black #0A0A0A background. Minimalist creator desk on the right half with studio headphones, docked smartphone, and condenser microphone, leaving the entire left half open as clean black negative space.`,
  },
]

const apiKey = loadImageApiKey()
if (!apiKey) {
  console.error('IMAGE_API_KEY belum ditemukan di .env.local. Isi IMAGE_API_KEY lalu jalankan ulang npm run generate:images.')
  process.exit(1)
}

const forceAll = process.argv.includes('--all')

for (const job of JOBS) {
  const dest = path.join(RAW_DIR, `${job.name}.png`)
  if (fs.existsSync(dest) && !forceAll) {
    console.log(`[SKIP] Sudah ada: raw-assets/images/${job.name}.png`)
    continue
  }

  console.log(`Generating ${job.name} (${job.w}x${job.h})...`)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: job.prompt }],
      parameters: { sampleCount: 1, aspectRatio: job.aspectRatio },
    }),
  })

  if (!res.ok) {
    throw new Error(`API gagal untuk ${job.name} (HTTP ${res.status}). Periksa kuota atau model kunci IMAGE_API_KEY.`)
  }

  const json = await res.json()
  const b64 = json?.predictions?.[0]?.bytesBase64Encoded
  if (!b64) throw new Error(`Respons kosong untuk ${job.name}.`)

  await sharp(Buffer.from(b64, 'base64'))
    .grayscale()
    .resize(job.w, job.h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(dest)

  console.log(`Saved raw-assets/images/${job.name}.png`)
}

execFileSync(process.execPath, [path.join(__dirname, 'build-images.mjs')], { stdio: 'inherit' })
