export function TikTokGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  )
}

export function CapCutGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="14" height="14" rx="3" />
      <path d="M9 9.5L21 16.5" />
      <path d="M9 14.5L21 7.5" />
    </svg>
  )
}

export function InstagramGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function YouTubeGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.8 8.001a2.75 2.75 0 0 0-1.94-1.946C18.14 5.6 12 5.6 12 5.6s-6.14 0-7.86.455A2.75 2.75 0 0 0 2.2 8.001 28.9 28.9 0 0 0 1.75 12c0 1.35.15 2.68.45 3.999a2.75 2.75 0 0 0 1.94 1.946c1.72.455 7.86.455 7.86.455s6.14 0 7.86-.455a2.75 2.75 0 0 0 1.94-1.946c.3-1.319.45-2.649.45-3.999s-.15-2.68-.45-3.999ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  )
}

export function GoogleGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.92h5.35c-.24 1.38-1.02 2.55-2.18 3.33v2.77h3.52c2.06-1.9 3.25-4.7 3.25-8.02 0-.67-.06-1.33-.19-2Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.97 0 5.46-.98 7.28-2.66l-3.52-2.77c-.98.66-2.24 1.06-3.76 1.06-2.89 0-5.34-1.95-6.21-4.57H2.15v2.87A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="currentColor"
        d="M5.79 13.06a6.03 6.03 0 0 1 0-3.84V6.35H2.15a10 10 0 0 0 0 9.58l3.64-2.87Z"
      />
      <path
        fill="currentColor"
        d="M12 5.65c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.39 14.97 1.28 12 1.28A9.99 9.99 0 0 0 2.15 6.35l3.64 2.87c.87-2.62 3.32-3.57 6.21-3.57Z"
      />
    </svg>
  )
}

export function VerifiedBadgeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Kreator terverifikasi"
      role="img"
      className="shrink-0"
    >
      <circle cx="10" cy="10" r="9" className="fill-accent" />
      <path
        d="M6.3 10.2L8.7 12.6L13.8 7.5"
        className="stroke-on-accent"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
