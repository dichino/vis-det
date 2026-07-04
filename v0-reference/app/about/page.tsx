import Link from 'next/link'
import {
  BookOpen,
  Users,
  ClipboardList,
  HardDrive,
  PenLine,
  Paperclip,
  MessageSquare,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label, ActionButton } from '@/components/primitives'
import type { AccentColor } from '@/lib/data'
import { accentSoft } from '@/lib/data'

const features = [
  {
    icon: BookOpen,
    label: 'Journal evidence',
    title: 'Document evidence',
    text: 'Log entries with people reached, tags and optional files so progress can be reviewed later.',
    accent: 'mint' as AccentColor,
  },
  {
    icon: Users,
    label: 'People reached',
    title: 'Track reach',
    text: 'Keep simple counts close to the qualitative notes that explain what changed.',
    accent: 'sky' as AccentColor,
  },
  {
    icon: ClipboardList,
    label: 'Surveys and QR',
    title: 'Collect responses',
    text: 'Create lightweight surveys, export them as standalone files and import response JSON files.',
    accent: 'lavender' as AccentColor,
  },
  {
    icon: HardDrive,
    label: 'Local-first data',
    title: 'Stay local',
    text: 'Data is stored in this browser with IndexedDB. Export and import are explicit file actions.',
    accent: 'peach' as AccentColor,
  },
]

const steps = [
  {
    icon: PenLine,
    title: 'Document activities',
    text: 'Write short notes from workshops, meetings and follow-ups.',
  },
  {
    icon: Paperclip,
    title: 'Add evidence and reach',
    text: 'Record people reached, tags and optional attachments.',
  },
  {
    icon: MessageSquare,
    title: 'Collect feedback',
    text: 'Use lightweight surveys and import responses locally.',
  },
  {
    icon: FileText,
    title: 'Summarize impact',
    text: 'Export data or draft a report-ready summary from local evidence.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* Hero */}
      <section className="rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <Label>About Vis Det</Label>
            <h1 className="mt-2 text-pretty text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Vis Det – Impact Journal
            </h1>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              A local-first prototype for structured impact documentation. It helps
              teams document projects, observations, evidence, people reached and
              lightweight survey feedback in one place.
            </p>
            <Link href="/" className="mt-5 inline-block">
              <ActionButton variant="accent">
                Open Journal <ArrowRight className="size-4" />
              </ActionButton>
            </Link>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-3 rounded-2xl border border-warm-border bg-canvas p-6">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-lavender text-2xl font-bold text-ink">
              VD
            </div>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Original mark inspired by
              <br />
              Norwegian social-impact work
            </p>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className="mt-5 rounded-3xl border border-warm-border bg-lavender-soft p-6 shadow-sm md:p-8">
        <Label>Why this exists</Label>
        <p className="mt-3 max-w-3xl text-pretty text-lg leading-relaxed text-navy">
          The prototype is inspired by social-impact work with local entrepreneurs,
          neighbourhood incubators and impact documentation. It explores how early
          impact data can be captured before it becomes formal reporting.
        </p>
      </section>

      {/* Feature cards */}
      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-warm-border bg-card p-5 shadow-sm"
            >
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  accentSoft[f.accent],
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="mt-4">
                <Label>{f.label}</Label>
                <h3 className="mt-1.5 text-base font-semibold text-ink">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
              </div>
            </div>
          )
        })}
      </section>

      {/* How it works */}
      <section className="mt-8">
        <Label>How it works</Label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.title}
                className="relative rounded-2xl border border-warm-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-warm-grey text-ink">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-2xl font-bold text-warm-border">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mt-5 rounded-2xl border border-warm-border bg-warm-grey p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-ink">Prototype disclaimer.</span> This
          is a local-first prototype for exploring impact documentation. It is not an
          official production system for Norge Unlimited.
        </p>
      </section>
    </div>
  )
}
