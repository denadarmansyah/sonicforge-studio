import { useEffect } from 'react'
import { SITE_ORIGIN } from './supabaseClient'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useDocumentMeta({
  title,
  description,
  path = '/',
  image,
}: {
  title: string
  description: string
  path?: string
  image?: string | null
}) {
  useEffect(() => {
    document.title = title
    const fullUrl = `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
    const ogImg = image || `${SITE_ORIGIN}/favicon.svg`

    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', fullUrl)
    upsertMeta('property', 'og:image', ogImg)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImg)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', fullUrl)
  }, [title, description, path, image])
}
