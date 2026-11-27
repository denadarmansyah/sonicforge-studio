export type IllustrationName =
  | 'hero-main'
  | 'feature-templates'
  | 'feature-soundlab'
  | 'feature-studio'
  | 'feature-profile'
  | 'pricing-main'
  | 'plan-free'
  | 'plan-pro'
  | 'auth-main'
  | 'empty-explore'
  | 'empty-templates'
  | 'empty-dashboard'
  | 'cta-banner'
  | 'error-404'

interface IllustrationMeta {
  width: number
  height: number
  aspectClass: string
  surface: 'dark' | 'light'
  has2400?: boolean
  mobileVariant?: {
    slug: string
    width: number
    height: number
  }
}

const ILLUSTRATION_REGISTRY: Record<IllustrationName, IllustrationMeta> = {
  'hero-main': {
    width: 1600,
    height: 1000,
    aspectClass: 'aspect-[4/5] md:aspect-[16/10]',
    surface: 'dark',
    has2400: true,
    mobileVariant: {
      slug: 'hero-main-mobile',
      width: 800,
      height: 1000,
    },
  },
  'feature-templates': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'light',
  },
  'feature-soundlab': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'dark',
  },
  'feature-studio': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'light',
  },
  'feature-profile': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'dark',
  },
  'pricing-main': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'light',
  },
  'plan-free': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'light',
  },
  'plan-pro': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'light',
  },
  'auth-main': {
    width: 1600,
    height: 1200,
    aspectClass: 'aspect-[4/3]',
    surface: 'dark',
  },
  'empty-explore': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'dark',
  },
  'empty-templates': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'light',
  },
  'empty-dashboard': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'dark',
  },
  'cta-banner': {
    width: 1600,
    height: 686,
    aspectClass: 'aspect-[21/9]',
    surface: 'dark',
    has2400: true,
  },
  'error-404': {
    width: 800,
    height: 800,
    aspectClass: 'aspect-square',
    surface: 'light',
  },
}

/**
 * Only illustrations whose optimized PNGs are physically present in /public/images
 * are enabled here; when additional PNGs are generated via scripts/generate-images.mjs,
 * add their names here so <Illustration /> renders them with zero empty placeholders.
 */
const AVAILABLE_ILLUSTRATIONS = new Set<IllustrationName>([
  'hero-main',
  'feature-templates',
  'feature-profile',
])

export function hasIllustration(name: IllustrationName): boolean {
  return AVAILABLE_ILLUSTRATIONS.has(name)
}

export function Illustration({
  name,
  alt,
  sizes = '(max-width: 767px) 100vw, (max-width: 1200px) 50vw, 560px',
  priority = false,
  className = '',
}: {
  name: IllustrationName
  alt: string
  sizes?: string
  priority?: boolean
  className?: string
}) {
  if (!AVAILABLE_ILLUSTRATIONS.has(name)) {
    return null
  }

  const meta = ILLUSTRATION_REGISTRY[name]
  const bgClass = meta.surface === 'light' ? 'bg-light-bg border-edge' : 'bg-bg border-edge'
  const desktopSrcSet = meta.has2400
    ? `/images/${name}-800.png 800w, /images/${name}-1600.png 1600w, /images/${name}-2400.png 2400w`
    : `/images/${name}-800.png 800w, /images/${name}-1600.png 1600w`

  return (
    <figure
      className={`m-0 w-full overflow-hidden rounded-2xl border ${bgClass} ${meta.aspectClass} ${className}`}
    >
      <picture className="block h-full w-full">
        {meta.mobileVariant && (
          <source
            media="(max-width: 767px)"
            srcSet={`/images/${meta.mobileVariant.slug}-800.png 800w, /images/${meta.mobileVariant.slug}-1600.png 1600w`}
            sizes="100vw"
            type="image/png"
          />
        )}
        <source srcSet={desktopSrcSet} sizes={sizes} type="image/png" />
        <img
          src={`/images/${name}-800.png`}
          alt={alt}
          width={meta.width}
          height={meta.height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'sync' : 'async'}
          className="block h-full w-full object-cover"
        />
      </picture>
    </figure>
  )
}
