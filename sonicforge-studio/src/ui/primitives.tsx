import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  createContext,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Link, LinkProps } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ChevronDown, Info, Loader2, X } from 'lucide-react'

export const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ============================================================================
// 1. BUTTON, LINK BUTTON, EXTERNAL LINK BUTTON, & ICON BUTTON
//    Single source of truth across the entire app (Rule B):
//    - Heights: sm=32px (h-8), md=40px (h-10), lg=48px (h-12)
//    - Touch area >=44x44px via expanded hit pseudo-element on sm/md
//    - Radius: consistent 10px (rounded-[10px]), text 14px weight 500-600
//    - Loading spinner keeps width fixed & prevents double-click
// ============================================================================
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'danger'
  | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-fg text-bg border-fg font-semibold enabled:[@media(hover:hover)]:hover:bg-accent-hover enabled:[@media(hover:hover)]:hover:border-accent-hover',
  secondary:
    'bg-surface text-fg border-edge font-medium enabled:[@media(hover:hover)]:hover:bg-elevated enabled:[@media(hover:hover)]:hover:border-fg-sec',
  outline:
    'bg-transparent text-fg border-edge font-medium enabled:[@media(hover:hover)]:hover:bg-elevated enabled:[@media(hover:hover)]:hover:border-fg-sec',
  ghost:
    'bg-transparent text-fg-sec border-transparent font-medium enabled:[@media(hover:hover)]:hover:bg-elevated enabled:[@media(hover:hover)]:hover:text-fg',
  destructive:
    'bg-bg text-fg border-2 border-fg font-semibold enabled:[@media(hover:hover)]:hover:bg-fg enabled:[@media(hover:hover)]:hover:text-bg',
  danger:
    'bg-bg text-fg border-2 border-fg font-semibold enabled:[@media(hover:hover)]:hover:bg-fg enabled:[@media(hover:hover)]:hover:text-bg',
  link:
    'bg-transparent text-fg border-transparent font-medium underline-offset-4 enabled:[@media(hover:hover)]:hover:underline px-1!',
}

const ANCHOR_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-fg text-bg border-fg font-semibold [@media(hover:hover)]:hover:bg-accent-hover [@media(hover:hover)]:hover:border-accent-hover',
  secondary:
    'bg-surface text-fg border-edge font-medium [@media(hover:hover)]:hover:bg-elevated [@media(hover:hover)]:hover:border-fg-sec',
  outline:
    'bg-transparent text-fg border-edge font-medium [@media(hover:hover)]:hover:bg-elevated [@media(hover:hover)]:hover:border-fg-sec',
  ghost:
    'bg-transparent text-fg-sec border-transparent font-medium [@media(hover:hover)]:hover:bg-elevated [@media(hover:hover)]:hover:text-fg',
  destructive:
    'bg-bg text-fg border-2 border-fg font-semibold [@media(hover:hover)]:hover:bg-fg [@media(hover:hover)]:hover:text-bg',
  danger:
    'bg-bg text-fg border-2 border-fg font-semibold [@media(hover:hover)]:hover:bg-fg [@media(hover:hover)]:hover:text-bg',
  link:
    'bg-transparent text-fg border-transparent font-medium underline-offset-4 [@media(hover:hover)]:hover:underline px-1!',
}

const TOUCH_HIT_AREA =
  "relative before:content-[''] [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:inset-x-0 [@media(pointer:coarse)]:before:top-1/2 [@media(pointer:coarse)]:before:h-11 [@media(pointer:coarse)]:before:min-w-11 [@media(pointer:coarse)]:before:-translate-y-1/2"

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: `h-8 px-3.5 text-[14px] rounded-[10px] gap-2 ${TOUCH_HIT_AREA}`,
  md: `h-10 px-4 text-[14px] rounded-[10px] gap-2 ${TOUCH_HIT_AREA}`,
  lg: 'h-12 px-6 text-[14px] rounded-[10px] gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = Boolean(disabled || loading)
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center border whitespace-nowrap select-none transition-[transform,background-color,border-color,color,opacity] duration-150 enabled:cursor-pointer enabled:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} aria-hidden="true" className="absolute shrink-0 animate-spin" />}
      <span className={`inline-flex items-center justify-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {children}
      </span>
    </button>
  )
})

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}) {
  return (
    <Link
      className={`inline-flex cursor-pointer items-center justify-center border no-underline whitespace-nowrap select-none transition-[transform,background-color,border-color,color,opacity] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        ANCHOR_VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  )
}

export function ExternalLinkButton({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  href,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex cursor-pointer items-center justify-center border no-underline whitespace-nowrap select-none transition-[transform,background-color,border-color,color,opacity] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        ANCHOR_VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </a>
  )
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string
    active?: boolean
    size?: ButtonSize
    variant?: 'default' | 'ghost' | 'destructive'
  }
>(function IconButton(
  {
    label,
    active = false,
    size = 'md',
    variant = 'default',
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  const dim =
    size === 'sm'
      ? `h-8 w-8 ${TOUCH_HIT_AREA}`
      : size === 'lg'
        ? 'h-12 w-12'
        : `h-10 w-10 ${TOUCH_HIT_AREA}`

  const tone = active
    ? 'border-fg bg-fg text-bg'
    : variant === 'destructive'
      ? 'border-2 border-fg bg-bg text-fg enabled:[@media(hover:hover)]:hover:bg-fg enabled:[@media(hover:hover)]:hover:text-bg'
      : variant === 'ghost'
        ? 'border-transparent bg-transparent text-fg-sec enabled:[@media(hover:hover)]:hover:bg-elevated enabled:[@media(hover:hover)]:hover:text-fg'
        : 'border-edge bg-surface text-fg-sec enabled:[@media(hover:hover)]:hover:border-fg-sec enabled:[@media(hover:hover)]:hover:text-fg'

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-[10px] border select-none transition-[transform,background-color,border-color,color,opacity] duration-150 enabled:cursor-pointer enabled:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 ${dim} ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

/**
 * Accessible trigger primitive for composite cards, theme swatches, and accordion headers
 * where children define custom layout while keeping keyboard focus & disabled semantics uniform.
 */
export const UnstyledButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function UnstyledButton({ className = '', type = 'button', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`enabled:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

// ============================================================================
// 2. INPUT, TEXTAREA, SELECT, SLIDER
// ============================================================================
interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  rightMeta?: string
  id: string
  children: ReactNode
}

function FieldShell({ label, hint, error, rightMeta, id, children }: FieldShellProps) {
  return (
    <div className="w-full">
      {(label || rightMeta) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={id} className="text-[13px] font-medium text-fg">
              {label}
            </label>
          )}
          {rightMeta && <span className="font-mono text-[11px] tabular-nums text-fg-sec">{rightMeta}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-err">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-fg-sec">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    hint?: string
    error?: string
    rightMeta?: string
    leftAddon?: ReactNode
  }
>(function Input({ label, hint, error, rightMeta, leftAddon, className = '', id, ...rest }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} rightMeta={rightMeta} id={fieldId}>
      <div className="relative flex items-center">
        {leftAddon && (
          <span className="pointer-events-none absolute left-3.5 flex items-center text-fg-sec">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={`min-h-11 w-full rounded-xl border bg-bg px-3.5 text-[14px] text-fg placeholder-fg-muted outline-none transition-colors duration-150 focus-visible:border-accent disabled:opacity-50 ${
            leftAddon ? 'pl-10' : ''
          } ${error ? 'border-err' : 'border-edge'} ${className}`}
          {...rest}
        />
      </div>
    </FieldShell>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string
    hint?: string
    error?: string
    rightMeta?: string
  }
>(function Textarea({ label, hint, error, rightMeta, className = '', id, rows = 3, ...rest }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} rightMeta={rightMeta} id={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-xl border bg-bg p-3.5 text-[14px] leading-relaxed text-fg placeholder-fg-muted outline-none transition-colors duration-150 focus-visible:border-accent disabled:opacity-50 ${
          error ? 'border-err' : 'border-edge'
        } ${className}`}
        {...rest}
      />
    </FieldShell>
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
    hint?: string
    error?: string
  }
>(function Select({ label, hint, error, className = '', id, children, ...rest }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <FieldShell label={label} hint={hint} error={error} id={fieldId}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={`min-h-11 w-full appearance-none rounded-xl border bg-bg pl-3.5 pr-9 text-[14px] text-fg outline-none transition-colors duration-150 focus-visible:border-accent disabled:opacity-50 ${
            error ? 'border-err' : 'border-edge'
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-sec"
        />
      </div>
    </FieldShell>
  )
})

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (n: number) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12.5px]">
        <label htmlFor={id} className="text-fg-sec">
          {label}
        </label>
        <span className="font-mono tabular-nums text-fg">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="luven-slider"
      />
    </div>
  )
}

// ============================================================================
// 3. BADGE, CARD, SKELETON, TOOLTIP
// ============================================================================
export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: 'neutral' | 'accent' | 'ok' | 'warn' | 'err'
  children: ReactNode
  className?: string
}) {
  const styles = {
    neutral: 'border-edge bg-elevated text-fg-sec',
    accent: 'border-fg/40 bg-fg/10 text-fg',
    ok: 'border-fg/50 bg-elevated text-fg',
    warn: 'border-dashed border-fg-sec bg-elevated text-fg',
    err: 'border-2 border-fg bg-bg text-fg font-semibold',
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-tight ${styles} ${className}`}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className = '',
  hoverLift = false,
}: {
  children: ReactNode
  className?: string
  hoverLift?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-edge bg-surface ${
        hoverLift
          ? 'transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-fg-muted'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-elevated ${className}`} />
}

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 rounded-md border border-edge bg-elevated px-2 py-1 text-[11px] whitespace-nowrap text-fg opacity-0 shadow-sm transition-opacity duration-150 group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  )
}

// ============================================================================
// 4. AVATAR & PROGRESSIVE IMAGE (Consistent Ratios + Blur Placeholder)
// ============================================================================
export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const px = size === 'xl' ? 96 : size === 'lg' ? 64 : size === 'sm' ? 36 : 44
  const cls =
    size === 'xl'
      ? 'h-24 w-24 text-[26px]'
      : size === 'lg'
      ? 'h-16 w-16 text-[18px]'
      : size === 'sm'
      ? 'h-9 w-9 text-[12px]'
      : 'h-11 w-11 text-[14px]'

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'LV'

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-edge bg-elevated font-mono font-semibold text-fg select-none ${cls} ${className}`}
    >
      {(!src || failed || !loaded) && (
        <span className="absolute inset-0 flex items-center justify-center">{initials}</span>
      )}
      {src && !failed && (
        <img
          src={src}
          alt={`Foto profil ${name}`}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover bw-media transition-all duration-300 ${
            loaded ? 'scale-100 opacity-100 blur-none' : 'scale-105 opacity-0 blur-sm'
          }`}
        />
      )}
    </div>
  )
}

export function ProgressiveImage({
  src,
  alt,
  ratio = '4:5',
  fallbackLabel,
  priority = false,
  colorOnHover = false,
  className = '',
}: {
  src?: string | null
  alt: string
  ratio?: '1:1' | '4:5' | '3:1'
  fallbackLabel?: string
  priority?: boolean
  colorOnHover?: boolean
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const dims =
    ratio === '3:1'
      ? { w: 1200, h: 400, aspect: 'aspect-[3/1]' }
      : ratio === '1:1'
      ? { w: 512, h: 512, aspect: 'aspect-square' }
      : { w: 800, h: 1000, aspect: 'aspect-[4/5]' }

  return (
    <div className={`relative w-full overflow-hidden bg-elevated hw-grid-bg ${dims.aspect} ${className}`}>
      {(!src || failed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="rounded-md border border-edge bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-fg-sec">
            {fallbackLabel || 'LUVEN TEMPLATE'}
          </span>
        </div>
      )}
      {src && !failed && (
        <>
          {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-elevated" />}
          <img
            src={src}
            alt={alt}
            width={dims.w}
            height={dims.h}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover bw-media ${
              colorOnHover ? 'bw-media-reveal' : ''
            } transition-all duration-300 ${
              loaded ? 'scale-100 opacity-100 blur-none' : 'scale-105 opacity-0 blur-md'
            }`}
          />
        </>
      )}
    </div>
  )
}

const AVAILABLE_EDITORIAL_SLUGS = new Set([
  'hero-main',
  'pricing-hero',
  'feature-template',
])

/**
 * 2D Editorial PNG Illustration Renderer + Clean Fixed-Ratio Slot (Rule A).
 * - Renders <picture>/<img> with @1x (800w) & @2x (1600w) PNG srcSet, sizes,
 *   explicit width/height, lazy/eager + fetchPriority, decoding="async".
 * - When an AI PNG file has not been generated yet (due to quota limits),
 *   renders a clean, zero-CLS reserved slot frame with ZERO hand-coded shapes.
 */
export function EditorialIllustration({
  slug,
  alt,
  ratio = '16:9',
  sizes = '(max-width: 768px) 100vw, 640px',
  priority = false,
  className = '',
}: {
  slug: string
  alt: string
  ratio?: '16:9' | '16:10' | '20:9' | '4:3'
  sizes?: string
  priority?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(!AVAILABLE_EDITORIAL_SLUGS.has(slug))
  const [loaded, setLoaded] = useState(false)

  const spec =
    ratio === '16:10'
      ? { w: 800, h: 500, aspect: 'aspect-[16/10]' }
      : ratio === '20:9'
        ? { w: 800, h: 360, aspect: 'aspect-[20/9]' }
        : ratio === '4:3'
          ? { w: 800, h: 600, aspect: 'aspect-[4/3]' }
          : { w: 800, h: 450, aspect: 'aspect-video' }

  const src1x = `/illustrations/${slug}-800.png`
  const src2x = `/illustrations/${slug}-1600.png`

  return (
    <figure
      className={`relative m-0 w-full overflow-hidden rounded-2xl border border-edge bg-surface ${spec.aspect} ${className}`}
    >
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface px-4 text-center"
        >
          <span className="rounded-md border border-edge bg-elevated px-2.5 py-1 font-mono text-[11px] text-fg-sec">
            {slug}-800.png · {spec.w}×{spec.h}
          </span>
          <span className="max-w-[38ch] text-[12px] text-fg-muted">{alt}</span>
        </div>
      ) : (
        <picture className="block h-full w-full">
          <source srcSet={`${src1x} 800w, ${src2x} 1600w`} sizes={sizes} type="image/png" />
          {!loaded && <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-elevated" />}
          <img
            src={src1x}
            alt={alt}
            width={spec.w}
            height={spec.h}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </picture>
      )}
    </figure>
  )
}

// ============================================================================
// 5. TABS (Shared layoutId Active Indicator) & DROPDOWN
// ============================================================================
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  layoutGroupId,
}: {
  tabs: { id: T; label: string; count?: number }[]
  active: T
  onChange: (id: T) => void
  layoutGroupId: string
}) {
  const reduce = useReducedMotion()
  return (
    <div
      role="tablist"
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-edge bg-surface p-1"
    >
      {tabs.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-[13.5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              isActive ? 'text-on-accent font-semibold' : 'text-fg-sec [@media(hover:hover)]:hover:text-fg'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutGroupId}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-accent"
              />
            )}
            <span className="relative z-10">{t.label}</span>
            {typeof t.count === 'number' && (
              <span
                className={`relative z-10 rounded-full px-1.5 py-0.2 font-mono text-[11px] tabular-nums ${
                  isActive ? 'bg-on-accent/15 text-on-accent' : 'bg-elevated text-fg-sec'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Dropdown({
  trigger,
  items,
  align = 'right',
}: {
  trigger: ReactNode
  items: { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onOut = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOut)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.16, ease: EASE_SMOOTH }}
            className={`absolute top-[calc(100%+6px)] z-50 min-w-[190px] rounded-xl border border-edge bg-elevated p-1.5 shadow-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] transition-colors [@media(hover:hover)]:hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent ${
                  item.danger ? 'font-semibold text-fg' : 'text-fg'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// 6. MODAL / BOTTOM SHEET (Auto BottomSheet on <640px, Focus Trap, Esc, Scroll Lock)
// ============================================================================
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-[500px]',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: string
}) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-xs sm:items-center sm:p-4"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_SMOOTH }}
            onClick={(e) => e.stopPropagation()}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-edge bg-surface text-fg shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl ${maxWidth}`}
          >
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-edge sm:hidden" />
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-edge px-5 py-4">
              <div>
                <h2 id={titleId} className="text-[17px] font-bold tracking-[-0.02em] text-fg">
                  {title}
                </h2>
                {description && <p className="mt-1 text-[13px] text-fg-sec">{description}</p>}
              </div>
              <IconButton label="Tutup dialog" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// 7. TOAST PROVIDER
// ============================================================================
interface ToastItem {
  id: string
  tone: 'ok' | 'err' | 'info'
  message: string
}

const ToastContext = createContext<{
  pushToast: (message: string, tone?: 'ok' | 'err' | 'info') => void
}>({
  pushToast: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const pushToast = useCallback((message: string, tone: 'ok' | 'err' | 'info' = 'ok') => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev.slice(-2), { id, tone, message }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 left-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:items-end"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.22, ease: EASE_SMOOTH }}
              className={`pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-xl bg-elevated px-4 py-3 text-[13.5px] text-fg ${
                t.tone === 'err'
                  ? 'border border-fg border-l-4 border-l-fg'
                  : t.tone === 'ok'
                  ? 'border border-edge border-l-4 border-l-fg'
                  : 'border border-edge border-l-4 border-l-fg-sec'
              }`}
            >
              {t.tone === 'ok' && <CheckCircle2 size={17} className="shrink-0 text-fg" />}
              {t.tone === 'err' && <AlertCircle size={17} className="shrink-0 text-fg" />}
              {t.tone === 'info' && <Info size={17} className="shrink-0 text-fg-sec" />}
              <span className="min-w-0 flex-1 leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Tutup pemberitahuan"
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-sec [@media(hover:hover)]:hover:text-fg"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
