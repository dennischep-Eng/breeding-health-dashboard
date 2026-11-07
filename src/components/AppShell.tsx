import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardPlus, HeartPulse, LayoutDashboard } from 'lucide-react'
import { EntrySheet, type EntryKind, type EntryPreset } from './EntrySheet'

type EntryContextValue = {
  openEntry: (kind: EntryKind, preset?: EntryPreset) => void
  notify: (message: string) => void
}

const EntryContext = createContext<EntryContextValue | null>(null)

export function useEntry() {
  const ctx = useContext(EntryContext)
  if (!ctx) throw new Error('useEntry must be used inside AppShell')
  return ctx
}

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<{ kind: EntryKind; preset?: EntryPreset; nonce: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const notify = useCallback((message: string) => {
    clearTimeout(timer.current)
    setToast({ message, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  const openEntry = useCallback((kind: EntryKind, preset?: EntryPreset) => {
    setEntry({ kind, preset, nonce: Date.now() })
  }, [])

  // Keyboard shortcut: "n" opens a new record.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(target.tagName) && !target.isContentEditable) {
        e.preventDefault()
        openEntry('breeding')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openEntry])

  return (
    <EntryContext.Provider value={{ openEntry, notify }}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-pasture-900/10 bg-pasture-700 text-paper">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="h-8 w-8 rounded-lg ring-1 ring-paper/20" />
              <span className="font-display text-xl font-semibold tracking-tight">Herdbook</span>
            </Link>
            <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === '/' }}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-paper/80 transition hover:bg-white/10 hover:text-paper data-[status=active]:bg-white/15 data-[status=active]:text-paper"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn hidden bg-white/10 text-paper hover:bg-white/20 sm:inline-flex" onClick={() => openEntry('health')}>
                <HeartPulse className="h-4 w-4" aria-hidden /> Treatment
              </button>
              <button className="btn bg-straw-500 text-pasture-900 hover:bg-straw-100" onClick={() => openEntry('breeding')}>
                <ClipboardPlus className="h-4 w-4" aria-hidden /> New record
                <kbd className="hidden rounded bg-pasture-900/15 px-1.5 text-[10px] font-bold lg:inline">N</kbd>
              </button>
            </div>
          </div>
          <nav aria-label="Main mobile" className="flex border-t border-white/10 md:hidden">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-paper/75 data-[status=active]:bg-white/10 data-[status=active]:text-paper"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted sm:px-6">
          Herdbook · Gestation 283 days · Voluntary waiting period 50 days · Pregnancy check 28–45 days after service
        </footer>
      </div>
      {entry ? (
        <EntrySheet
          key={entry.nonce}
          initialKind={entry.kind}
          preset={entry.preset}
          onClose={() => setEntry(null)}
          onSaved={notify}
        />
      ) : null}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast ? (
          <div key={toast.id} className="rise pointer-events-auto flex items-center gap-2 rounded-xl bg-pasture-900 px-4 py-3 text-sm font-medium text-paper shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-straw-500" aria-hidden />
            {toast.message}
          </div>
        ) : null}
      </div>
    </EntryContext.Provider>
  )
}
