import {
  Plus,
  ExternalLink,
  Download,
  Upload,
  MessageSquare,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { surveys, accentStrip } from '@/lib/data'
import {
  PageHeader,
  ActionButton,
  AccentBadge,
  Label,
} from '@/components/primitives'

export default function SurveysPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        label="Feedback"
        title="Surveys"
        description="Build lightweight surveys, share them via QR or file, then import responses locally."
      >
        <ActionButton variant="accent">
          <Plus className="size-4" /> New Survey
        </ActionButton>
      </PageHeader>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {surveys.map((s) => (
          <article
            key={s.title}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-warm-border bg-card p-5 shadow-sm"
          >
            <span
              className={cn('absolute inset-x-0 top-0 h-1', accentStrip[s.accent])}
            />
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-soft text-navy">
                <MessageSquare className="size-5" />
              </span>
              <AccentBadge accent={s.status === 'Active' ? 'mint' : 'peach'}>
                {s.status}
              </AccentBadge>
            </div>

            <div className="mt-4">
              <Label>{s.category}</Label>
              <h3 className="mt-1.5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-warm-border pt-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="size-4" /> {s.questions} questions
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Users className="size-4 text-muted-foreground" /> {s.responses}{' '}
                responses
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton variant="primary" className="px-3 py-2 text-xs">
                Open
              </ActionButton>
              <ActionButton variant="secondary" className="px-3 py-2 text-xs">
                <Download className="size-3.5" /> Export
              </ActionButton>
              <ActionButton variant="secondary" className="px-3 py-2 text-xs">
                <Upload className="size-3.5" /> Import
              </ActionButton>
            </div>
          </article>
        ))}

        {/* Empty-state helper card */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-warm-border bg-canvas px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-lavender-soft">
            <Plus className="size-5 text-navy" />
          </div>
          <p className="text-sm font-semibold text-ink">Create a new survey</p>
          <p className="max-w-[15rem] text-sm leading-relaxed text-muted-foreground">
            Draft a few questions, export a shareable file and import responses when
            they arrive.
          </p>
          <ActionButton variant="secondary" className="mt-1">
            <ExternalLink className="size-4" /> New Survey
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
