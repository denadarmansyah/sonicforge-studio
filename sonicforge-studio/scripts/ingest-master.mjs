import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_OUT_DIR = path.resolve(__dirname, '..', 'raw-assets', 'images')
fs.mkdirSync(RAW_OUT_DIR, { recursive: true })

// Usage: node scripts/ingest-master.mjs <srcPath> <destName> <width> <height> <fitMode: cover|contain> <bgHex>
const [, , srcPath, destName, wStr, hStr, fitMode = 'cover', bgHex = '#0A0A0A'] = process.argv
const width = Number(wStr)
const height = Number(hStr)
const destPath = path.join(RAW_OUT_DIR, `${destName}.png`)

await sharp(srcPath)
  .grayscale()
  .resize(width, height, {
    fit: fitMode,
    position: 'centre',
    background: bgHex,
    kernel: 'lanczos3',
  })
  .png({ compressionLevel: 9 })
  .toFile(destPath)

const stat = fs.statSync(destPath)
console.log(`Saved master ${destName}.png (${width}x${height}, ${(stat.size / 1024).toFixed(1)} KB)`)
