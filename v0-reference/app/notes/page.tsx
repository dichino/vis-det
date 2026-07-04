import {
  User,
  Layers,
  Target,
  AlertCircle,
  GitBranch,
  Rocket,
  Check,
} from 'lucide-react'
import { Label } from '@/components/primitives'

const techStack = [
  'HTML',
  'CSS',
  'Vanilla JavaScript',
  'Dexie.js with IndexedDB',
  'Local JSON import and export',
]

const scope = [
  'Project-based journal entries',
  'Tags, attachments and people reached',
  'Survey builder',
  'QR/sharing flow',
  'Response imports',
  'Impact Summary Draft',
]

const limits = [
  'Local-only data',
  'No authentication',
  'No backend',
  'No multi-user sync',
  'Not a production CRM or reporting system',
]

const nextSteps = [
  'Backend sync',
  'User accounts',
  'Role-based access',
  'CSV/PDF exports',
  'Hosted survey pages',
  'Analytics views',
  'Serverless AI summary generation',
]

const architectureFlow = [
  'Projects',
  'Entries',
  'Surveys',
  'Responses',
  'Export / Import',
  'Impact Summary',
]

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      {/* Hero */}
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
          <Label>Project Notes</Label>
          <h1 className="mt-2 text-pretty text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Built as a focused app prototype.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            A small, inspectable MVP for recruiters and technical reviewers: plain
            files, local storage, real import/export flows and no fake service layer.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-3xl border border-warm-border bg-shell p-6 text-shell-fg shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-xl bg-mint text-shell">
            <GitBranch className="size-6" />
          </div>
          <p className="text-sm font-semibold">Inspectable by design</p>
          <p className="text-sm leading-relaxed text-shell-muted">
            Frontend implementation, product thinking, local-first data modeling and
            responsible AI deployment planning.
          </p>
        </div>
      </section>

      {/* Info cards */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoCard icon={User} title="Built by">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-ink">Dichino Nguyen</span> as an app
            development prototype for Norge Unlimited-inspired impact documentation
            workflows.
          </p>
        </InfoCard>

        <InfoCard icon={Layers} title="Tech stack">
          <div className="flex flex-wrap gap-2">
            {techStack.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-sky-soft px-3 py-1 text-xs font-medium text-navy"
              >
                {t}
              </span>
            ))}
          </div>
        </InfoCard>

        <InfoCard icon={Target} title="Prototype scope">
          <BulletList items={scope} accent="bg-mint" />
        </InfoCard>

        <InfoCard icon={AlertCircle} title="Current limits">
          <BulletList items={limits} accent="bg-peach" />
        </InfoCard>
      </section>

      {/* Architecture */}
      <section className="mt-5 rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-lavender-soft text-navy">
            <GitBranch className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-ink">Architecture</h3>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {architectureFlow.map((node, i) => (
            <div key={node} className="flex items-center gap-2">
              <span className="rounded-xl border border-warm-border bg-canvas px-3 py-2 text-sm font-medium text-ink">
                {node}
              </span>
              {i < architectureFlow.length - 1 && (
                <span className="text-muted-foreground">&rarr;</span>
              )}
            </div>
          ))}
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Projects, entries, surveys and responses are stored locally in IndexedDB
          with Dexie.js. Export/import uses JSON. A production version would need
          backend sync, authentication and role-based access before supporting
          shared teams.
        </p>
      </section>

      {/* Next steps */}
      <section className="mt-5 rounded-3xl border border-warm-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-mint-soft text-ink">
            <Rocket className="size-4" />
          </span>
          <h3 className="text-sm font-semibold text-ink">Possible next steps</h3>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {nextSteps.map((s) => (
            <div
              key={s}
              className="flex items-center gap-2.5 rounded-xl border border-warm-border bg-canvas px-3 py-2.5 text-sm text-ink"
            >
              <span className="flex size-5 items-center justify-center rounded-full bg-mint text-ink">
                <Check className="size-3" strokeWidth={3} />
              </span>
              {s}
            </div>
          ))}
        </div>
      </section>

      {/* Closing note */}
      <section className="mt-5 rounded-2xl border border-navy/20 bg-lavender-soft p-5">
        <p className="text-sm leading-relaxed text-navy">
          This project demonstrates frontend implementation, product thinking,
          local-first data modeling and responsible AI deployment planning.
        </p>
      </section>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-warm-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-warm-grey text-ink">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function BulletList({ items, accent }: { items: string[]; accent: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground"
        >
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${accent}`} />
          {item}
        </li>
      ))}
    </ul>
  )
}
