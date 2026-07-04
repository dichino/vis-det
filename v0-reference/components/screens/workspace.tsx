'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  ArrowUpRight,
  Pencil,
  Trash2,
  Search,
  Users,
  Paperclip,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  project,
  metrics,
  topTags,
  journalEntries,
  surveys,
  accentStrip,
} from '@/lib/data'
import {
  Label,
  Pill,
  Tag,
  MetricCard,
  DashboardCard,
  ActionButton,
  AccentBadge,
} from '@/components/primitives'

const filters = ['All time', 'Last 7 days', 'Last 30 days'] as const

export function Workspace() {
  const [tab, setTab] = useState<'Journal' | 'Surveys'>('Journal')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All time')
  const [query, setQuery] = useState('')

  const visibleEntries = journalEntries.filter((e) =>
    (e.title + e.summary + e.tags.join(' '))
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* Hero */}
      <section className="rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <Label>Impact Workspace</Label>
              <Pill>{project.period}</Pill>
            </div>
            <h1 className="mt-3 text-pretty text-3xl font-bold tracking-tight text-ink md:text-4xl">
              {project.name}
            </h1>
            <p className="mt-3 max-w-xl text-pretty leading-relaxed text-muted-foreground">
              {project.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="accent">
              <Plus className="size-4" /> Add Entry
            </ActionButton>
            <Link href="/summary">
              <ActionButton variant="secondary">
                Open Summary <ArrowUpRight className="size-4" />
              </ActionButton>
            </Link>
            <button
              className="flex size-10 items-center justify-center rounded-xl border border-warm-border bg-card text-muted-foreground transition-colors hover:text-ink"
              aria-label="Edit project"
            >
              <Pencil className="size-4" />
            </button>
            <button
              className="flex size-10 items-center justify-center rounded-xl border border-warm-border bg-card text-muted-foreground transition-colors hover:text-ink"
              aria-label="Delete project"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      {/* Supporting dashboard cards */}
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <DashboardCard title="Top tags">
          <div className="flex flex-wrap gap-2">
            {topTags.map((t) => (
              <span
                key={t.tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-warm-border bg-canvas px-2.5 py-1 text-xs font-medium text-ink"
              >
                {t.tag}
                <span className="text-muted-foreground">{t.count}</span>
              </span>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Latest survey activity">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-9 items-center justify-center rounded-lg bg-sky-soft text-navy">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-ink">Partner follow-up pulse</p>
              <p className="mt-1 text-sm text-muted-foreground">
                3 questions · 5 responses
              </p>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Evidence readiness">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-9 items-center justify-center rounded-lg bg-mint-soft text-ink">
              <Paperclip className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                11 attachments across 21 evidence notes
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {project.name} · {project.period}
              </p>
            </div>
          </div>
        </DashboardCard>
      </section>

      {/* Journal area */}
      <section className="mt-5 rounded-3xl border border-warm-border bg-card p-5 shadow-sm md:p-6">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-warm-border bg-canvas p-1 w-fit">
          {(['Journal', 'Surveys'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                tab === t
                  ? 'bg-card text-ink shadow-sm'
                  : 'text-muted-foreground hover:text-ink',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search entries..."
              className="w-full rounded-xl border border-warm-border bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted-foreground focus:border-navy focus:ring-2 focus:ring-navy/15"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-warm-border bg-canvas p-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-card text-ink shadow-sm'
                      : 'text-muted-foreground hover:text-ink',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <ActionButton variant="accent">
              <Plus className="size-4" /> Add Entry
            </ActionButton>
          </div>
        </div>

        {/* Content */}
        {tab === 'Journal' ? (
          visibleEntries.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {visibleEntries.map((entry) => (
                <article
                  key={entry.title}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-warm-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start"
                >
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 w-1.5',
                      accentStrip[entry.accent],
                    )}
                  />
                  <div className="flex-1 pl-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">
                        {entry.title}
                      </h3>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-warm-grey hover:text-ink"
                          aria-label="Edit entry"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-warm-grey hover:text-ink"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {entry.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-semibold text-ink">
                        <Users className="size-3.5" />
                        {entry.reached} reached
                      </span>
                      {entry.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {entry.date}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No entries match your search"
              body="Try a different keyword, or add a new entry to start documenting activities for this project."
            />
          )
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {surveys.map((s) => (
              <div
                key={s.title}
                className="relative overflow-hidden rounded-2xl border border-warm-border bg-card p-5 shadow-sm"
              >
                <span
                  className={cn('absolute inset-x-0 top-0 h-1', accentStrip[s.accent])}
                />
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.questions} questions · {s.responses} responses
                </p>
                <div className="mt-3">
                  <AccentBadge accent={s.accent}>{s.status}</AccentBadge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-warm-border bg-canvas px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-lavender-soft">
        <Search className="size-6 text-navy" />
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <ActionButton variant="accent" className="mt-1">
        <Plus className="size-4" /> Add Entry
      </ActionButton>
    </div>
  )
}
