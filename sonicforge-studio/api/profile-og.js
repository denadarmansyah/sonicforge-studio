import fs from 'node:fs'
import path from 'node:path'

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Vercel Serverless Function for /@:username
 * Injects dynamic OpenGraph & Twitter meta tags for WhatsApp/TikTok/Instagram link previews
 * while returning the full SPA HTML so direct browser loads & refreshes never 404.
 */
export default async function handler(req, res) {
  const rawUsername = String(req.query?.username || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '')

  const siteUrl = (process.env.VITE_SITE_URL || 'https://luven.my.id').replace(/\/+$/, '')
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  let title = rawUsername ? `@${rawUsername} — Luven` : 'Luven — Kreator TikTok & CapCut'
  let description = 'Lihat profil resmi dan koleksi template CapCut di Luven (luven.my.id).'
  let image = `${siteUrl}/og-image.png?v=2`
  const canonicalUrl = `${siteUrl}/@${encodeURIComponent(rawUsername)}`

  if (rawUsername && supabaseUrl && supabaseAnonKey) {
    try {
      const endpoint = `${supabaseUrl}/rest/v1/profiles?username=eq.${encodeURIComponent(
        rawUsername
      )}&is_banned=eq.false&select=username,display_name,bio,avatar_url,banner_url,plan,plan_expires_at,settings&limit=1`
      const resp = await fetch(endpoint, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      })
      if (resp.ok) {
        const rows = await resp.json()
        const prof = Array.isArray(rows) ? rows[0] : null
        if (prof) {
          const isPro =
            prof.plan === 'pro' &&
            (!prof.plan_expires_at || Date.parse(prof.plan_expires_at) > Date.now())
          const customSeoTitle = isPro && prof.settings?.seoTitle ? String(prof.settings.seoTitle).trim() : ''
          const customSeoDesc = isPro && prof.settings?.seoDescription ? String(prof.settings.seoDescription).trim() : ''
          const customOgImg = isPro && prof.settings?.customOgImageUrl ? String(prof.settings.customOgImageUrl).trim() : ''

          title = customSeoTitle || `${prof.display_name} (@${prof.username}) — Luven`
          description =
            customSeoDesc ||
            prof.bio ||
            `Kunjungi halaman resmi ${prof.display_name} (@${prof.username}) untuk membuka tautan TikTok & template CapCut.`
          image = customOgImg || prof.avatar_url || prof.banner_url || image
        }
      }
    } catch {
      // Fallback gracefully to default OG tags if upstream fetch times out
    }
  }

  // Read built index.html from dist (or fetch from deployment origin as fallback)
  let html = ''
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      html = fs.readFileSync(p, 'utf8')
      break
    }
  }
  if (!html) {
    try {
      const proto = req.headers['x-forwarded-proto'] || 'https'
      const host = req.headers.host || 'luven.my.id'
      const r = await fetch(`${proto}://${host}/index.html`)
      html = await r.text()
    } catch {
      html = '<!doctype html><html lang="id"><head><meta charset="UTF-8"/></head><body><div id="root"></div></body></html>'
    }
  }

  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeImg = escapeHtml(image)
  const safeUrl = escapeHtml(canonicalUrl)

  const ogBlock = `
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:image" content="${safeImg}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />
    <meta name="twitter:image" content="${safeImg}" />
    <link rel="canonical" href="${safeUrl}" />`

  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, '')

  const finalHtml = stripped.replace('</head>', `${ogBlock}\n  </head>`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  res.status(200).send(finalHtml)
}
