function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Dynamic XML Sitemap for Luven (luven.my.id/sitemap.xml)
 * Lists static public routes plus active non-banned creator profiles from Supabase.
 */
export default async function handler(_req, res) {
  const siteUrl = (process.env.VITE_SITE_URL || 'https://luven.my.id').replace(/\/+$/, '')
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  const urls = [
    { loc: `${siteUrl}/`, priority: '1.0' },
    { loc: `${siteUrl}/explore`, priority: '0.9' },
    { loc: `${siteUrl}/studio`, priority: '0.8' },
    { loc: `${siteUrl}/privacy`, priority: '0.4' },
    { loc: `${siteUrl}/terms`, priority: '0.4' },
    { loc: `${siteUrl}/contact`, priority: '0.5' },
  ]

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const endpoint = `${supabaseUrl}/rest/v1/profiles?is_banned=eq.false&onboarding_completed=eq.true&select=username,updated_at&order=updated_at.desc&limit=1000`
      const resp = await fetch(endpoint, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      })
      if (resp.ok) {
        const rows = await resp.json()
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.username) {
              urls.push({
                loc: `${siteUrl}/@${encodeURIComponent(r.username)}`,
                lastmod: r.updated_at ? String(r.updated_at).slice(0, 10) : undefined,
                priority: '0.8',
              })
            }
          }
        }
      }
    } catch {
      // Serve static routes if upstream unavailable
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${escapeXml(u.lastmod)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(xml)
}
