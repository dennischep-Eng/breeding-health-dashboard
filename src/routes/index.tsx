import { createFileRoute } from '@tanstack/react-router'
import { useSummary } from '../lib/useHerd'
import { percent } from '../lib/herd'
import { PageHeader } from '../components/ui'

function Home() {
  const { kpis, actions } = useSummary()
  return (
    <div>
      <PageHeader eyebrow="Today" title="Herd dashboard" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ['Active animals', String(kpis.herdSize)],
          ['Pregnant (eligible)', percent(kpis.pregnantShare)],
          ['Conception rate', percent(kpis.conceptionRate)],
          ['Open health cases', String(kpis.activeCases)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="field-label">{k}</p>
            <p className="text-2xl font-semibold tabular">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-xl">Action list</h2>
      <ul className="card divide-y divide-line">
        {actions.length === 0 ? <li className="p-4 text-muted">Nothing due.</li> : null}
        {actions.map((a) => (
          <li key={a.key} className="p-4 text-sm">
            <strong>{a.tag}</strong> · {a.title} — {a.detail}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const Route = createFileRoute('/')({ component: Home })
