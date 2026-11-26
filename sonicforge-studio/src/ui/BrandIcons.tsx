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

export function HardwareKnob({
  label,
  valueLabel,
  angle = 35,
}: {
  label: string
  valueLabel: string
  angle?: number
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-edge bg-surface px-3 py-2">
      <div
        aria-hidden="true"
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-edge bg-elevated"
      >
        <span
          className="block h-3 w-0.5 origin-bottom -translate-y-1.5 rounded-full bg-accent"
          style={{ transform: `rotate(${angle}deg) translateY(-5px)` }}
        />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-sec">{label}</div>
        <div className="font-mono text-[12px] font-medium tabular-nums text-fg">{valueLabel}</div>
      </div>
    </div>
  )
}
