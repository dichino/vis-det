'use client'

import { useState } from 'react'
import {
  Copy,
  Check,
  FileJson,
  Sparkle,
  ArrowRight,
  Lightbulb,
  TriangleAlert,
  ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { project, summary, accentStrip } from '@/lib/data'
import { Label, MetricCard, DashboardCard } from '@/components/primitives'

function CopyButton({
  label,
  icon: Icon,
  primary,
}: {
  label: string
  icon: typeof Copy
  primary?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
        primary
          ? 'bg-lavender text-ink hover:bg-lavender/85'
          : 'border border-warm-border bg-card text-ink hover:border-muted-foreground',
      )}
    >
      {copied ? <Check className="size-4" /> : <Icon className="size-4" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function Summary() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* Hero — high contrast dark card */}
      <section className="overflow-hidden rounded-3xl border border-shell-border bg-shell p-6 text-shell-fg shadow-sm md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1 text-xs font-semibold text-navy">
            <Sparkle className="size-3.5" strokeWidth={2.2} />
            AI-ready reporting workflow
          </span>
        </div>
        <h1 className="mt-4 text-pretty text-3xl font-bold tracking-tight md:text-4xl">
          Impact Summary Draft
        </h1>
        <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-shell-muted">
          Generated from local journal, survey and evidence data. This prototype
          does not call an AI API. A production version should generate summaries
          through a backend or serverless function to protect API keys.
        </p>
      </section>

      {/* Selected project + metrics */}
      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-warm-border bg-card p-5 shadow-sm">
          <Label>Selected project</Label>
          <h2 className="mt-2 text-xl font-bold text-ink">{project.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{project.period}</p>
          <div className="mt-4 space-y-1 border-t border-warm-border pt-4 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Last updated</span>
              <span className="font-medium text-ink">{project.lastUpdated}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-ink">Local-first prototype</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summary.summaryMetrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      {/* Narrative */}
      <section className="mt-5 rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
        <Label>Narrative summary</Label>
        <p className="mt-3 text-pretty text-lg leading-relaxed text-ink">
          {summary.narrative}
        </p>
      </section>

      {/* Themes + signals */}
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <DashboardCard title="Key themes">
          <div className="flex flex-wrap gap-2">
            {summary.themes.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-lavender-soft px-3 py-1.5 text-sm font-medium text-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </DashboardCard>

        <InsightCard
          title="Signals of change"
          icon={Lightbulb}
          accent="mint"
          items={summary.signals}
        />
      </section>

      {/* Gaps + next steps */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <InsightCard
          title="Evidence gaps"
          icon={TriangleAlert}
          accent="peach"
          items={summary.gaps}
        />
        <InsightCard
          title="Recommended next steps"
          icon={ListChecks}
          accent="sky"
          items={summary.nextSteps}
        />
      </section>

      {/* Actions */}
      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-warm-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Export this draft</p>
          <p className="text-sm text-muted-foreground">
            Copy for a report, hand off to a secure AI workflow, or export raw data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Copy Markdown summary" icon={Copy} primary />
          <CopyButton label="Copy AI prompt" icon={ArrowRight} />
          <CopyButton label="Export JSON" icon={FileJson} />
        </div>
      </section>
    </div>
  )
}

function InsightCard({
  title,
  icon: Icon,
  accent,
  items,
}: {
  title: string
  icon: typeof Lightbulb
  accent: 'mint' | 'peach' | 'sky'
  items: string[]
}) {
  const iconBg = {
    mint: 'bg-mint-soft text-ink',
    peach: 'bg-peach/40 text-ink',
    sky: 'bg-sky-soft text-navy',
  }[accent]

  return (
    <div className="rounded-2xl border border-warm-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', iconBg)}>
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span
              className={cn(
                'mt-2 size-1.5 shrink-0 rounded-full',
                accentStrip[accent],
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
