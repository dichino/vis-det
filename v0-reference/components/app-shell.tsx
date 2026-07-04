'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardList,
  FileText,
  Info,
  NotebookPen,
  Download,
  Upload,
  DatabaseZap,
  RotateCcw,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { projects } from '@/lib/data'

const nav = [
  { label: 'Journal', href: '/', icon: BookOpen },
  { label: 'Surveys', href: '/surveys', icon: ClipboardList },
  { label: 'Impact Summary', href: '/summary', icon: FileText },
  { label: 'About Vis Det', href: '/about', icon: Info },
  { label: 'Project Notes', href: '/notes', icon: NotebookPen },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [lang, setLang] = useState<'EN' | 'NO'>('EN')

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-lavender font-bold text-ink">
          VD
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-shell-fg">Vis Det</p>
          <p className="text-sm text-shell-muted">Impact Journal</p>
        </div>
      </div>

      {/* Workspace + language */}
      <div className="flex items-center justify-between rounded-xl border border-shell-border bg-shell-card px-3 py-2.5">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-shell-muted">
            Workspace
          </p>
          <p className="text-sm font-medium text-shell-fg">Local-first MVP</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-shell-border">
          {(['EN', 'NO'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold transition-colors',
                lang === l
                  ? 'bg-lavender text-ink'
                  : 'text-shell-muted hover:text-shell-fg',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-shell-fg text-ink'
                  : 'text-shell-muted hover:bg-shell-card hover:text-shell-fg',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-lavender" />
              )}
              <Icon className="size-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Projects */}
      <div className="flex flex-col gap-2">
        <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-shell-muted">
          Projects
        </p>
        <div className="flex flex-col gap-1">
          {projects.map((p) => (
            <button
              key={p.name}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                p.active
                  ? 'bg-shell-card text-shell-fg'
                  : 'text-shell-muted hover:bg-shell-card/60 hover:text-shell-fg',
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    p.active ? 'bg-mint' : 'bg-shell-border',
                  )}
                />
                {p.name}
              </span>
              <span className="text-xs text-shell-muted">{p.entries}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Utility buttons */}
      <div className="mt-auto flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <UtilityButton icon={DatabaseZap} label="Load Demo" />
          <UtilityButton icon={RotateCcw} label="Reset Demo" />
          <UtilityButton icon={Upload} label="Import" />
          <UtilityButton icon={Download} label="Export" />
        </div>
        <p className="rounded-lg bg-shell-card/60 px-3 py-2 text-xs leading-relaxed text-shell-muted">
          Local-first prototype. Not a production Norge Unlimited system.
        </p>
      </div>
    </div>
  )
}

function UtilityButton({
  icon: Icon,
  label,
}: {
  icon: typeof Download
  label: string
}) {
  return (
    <button className="flex items-center gap-2 rounded-lg border border-shell-border bg-shell-card px-2.5 py-2 text-xs font-medium text-shell-fg transition-colors hover:border-shell-muted">
      <Icon className="size-4 shrink-0 text-shell-muted" strokeWidth={2} />
      {label}
    </button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 bg-shell lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-warm-border bg-shell px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-lavender text-sm font-bold text-ink">
            VD
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-shell-fg">Vis Det</p>
            <p className="text-xs text-shell-muted">Impact Journal</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-shell-border text-shell-fg"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-shell">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg border border-shell-border text-shell-fg"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main workspace */}
      <main className="flex-1 lg:ml-72">{children}</main>
    </div>
  )
}
