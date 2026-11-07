import type { ReactNode } from 'react'
import { label, type ReproStatus } from '../lib/herd'

const tones = {
  green: 'bg-pasture-100 text-pasture-700',
  straw: 'bg-straw-100 text-straw-700',
  clay: 'bg-clay-100 text-clay-700',
  sky: 'bg-sky-100 text-sky-600',
  gray: 'bg-line/60 text-muted',
} as const
export type Tone = keyof typeof tones

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  )
}

const reproTone: Record<ReproStatus, Tone> = {
  pregnant: 'green',
  bred: 'sky',
  open: 'straw',
  fresh: 'gray',
  'unbred heifer': 'gray',
  inactive: 'gray',
}
const reproLabel: Record<ReproStatus, string> = {
  pregnant: 'Pregnant',
  bred: 'Bred — awaiting check',
  open: 'Open',
  fresh: 'Fresh (in waiting period)',
  'unbred heifer': 'Unbred heifer',
  inactive: 'Left herd',
}
export function ReproBadge({ status }: { status: ReproStatus }) {
  return <Badge tone={reproTone[status]}>{reproLabel[status]}</Badge>
}

export function PregBadge({ result }: { result: string }) {
  return (
    <Badge tone={result === 'pregnant' ? 'green' : result === 'open' ? 'straw' : 'sky'}>
      {label(result)}
    </Badge>
  )
}

export function Segmented<T extends string | number>({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: T
  options: readonly { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-pasture-500 ${
              active
                ? 'border-pasture-600 bg-pasture-600 text-white'
                : 'border-line bg-white text-ink hover:border-pasture-500'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Field({
  label: text,
  htmlFor,
  hint,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="field-label">
          {text}
        </label>
      ) : (
        <span className="field-label">{text}</span>
      )}
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.18em] text-pasture-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl text-pasture-900 sm:text-4xl">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  )
}
