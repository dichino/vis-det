import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { accentStrip, accentSoft, type AccentColor } from '@/lib/data'

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warm-border bg-warm-grey px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warm-border bg-canvas px-2.5 py-0.5 text-xs font-medium text-ink">
      {children}
    </span>
  )
}

export function MetricCard({
  value,
  label,
  accent,
}: {
  value: string
  label: string
  accent: AccentColor
}) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-warm-border bg-card p-4 shadow-sm">
      <span className={cn('absolute inset-x-0 top-0 h-1', accentStrip[accent])} />
      <p className="mt-1 break-words text-2xl font-bold tracking-tight text-ink md:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function DashboardCard({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-warm-border bg-card p-5 shadow-sm',
        className,
      )}
    >
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  )
}

export function AccentBadge({
  children,
  accent,
}: {
  children: ReactNode
  accent: AccentColor
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        accentSoft[accent],
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  label,
  title,
  description,
  children,
}: {
  label: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <Label>{label}</Label>
        <h1 className="mt-2 text-pretty text-3xl font-bold tracking-tight text-ink md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  )
}

type ButtonVariant = 'primary' | 'accent' | 'secondary'

export function ActionButton({
  children,
  variant = 'secondary',
  className,
}: {
  children: ReactNode
  variant?: ButtonVariant
  className?: string
}) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-primary-foreground hover:bg-ink/90',
    accent: 'bg-lavender text-ink hover:bg-lavender/85',
    secondary:
      'border border-warm-border bg-card text-ink hover:border-muted-foreground',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
