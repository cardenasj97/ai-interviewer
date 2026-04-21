import type { DecisionSignal, SignalLevel } from '@/types/domain'

const LEVEL_PILL: Record<SignalLevel, { label: string; className: string }> = {
  not_observed: { label: 'Not observed', className: 'bg-slate-100 text-slate-500' },
  weak: { label: 'Weak', className: 'bg-amber-100 text-amber-700' },
  adequate: { label: 'Adequate', className: 'bg-amber-200 text-amber-800' },
  strong: { label: 'Strong', className: 'bg-green-100 text-green-700' },
}

interface DecisionPanelProps {
  signal: DecisionSignal | null
}

export default function DecisionPanel({ signal }: DecisionPanelProps) {
  if (!signal) {
    return (
      <aside
        aria-label="Decision panel"
        className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-400"
      >
        Interview signals will appear here after your first answer.
      </aside>
    )
  }

  return (
    <aside aria-label="Decision panel" className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h3 className="mb-3 font-semibold text-slate-700">Competency Signals</h3>

      <ul className="mb-4 space-y-2">
        {signal.competencies.map((c) => {
          const pill = LEVEL_PILL[c.level]
          return (
            <li key={c.competency} className="flex items-center justify-between gap-2">
              <span className="text-slate-700">{c.competency}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill.className}`}>
                {pill.label}
              </span>
            </li>
          )
        })}
      </ul>

      {signal.topicsCovered.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 font-medium text-slate-600">Topics covered</p>
          <div className="flex flex-wrap gap-1">
            {signal.topicsCovered.map((t) => (
              <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <p className="mb-1 font-medium text-slate-600">Gaps</p>
        {signal.gaps.length === 0 ? (
          <p className="text-slate-400">Nothing flagged yet</p>
        ) : (
          <ul className="list-inside list-disc space-y-0.5 text-slate-600">
            {signal.gaps.map((g) => (
              <li key={g} className="flex gap-1">
                <span className="mt-0.5 text-amber-500" aria-hidden="true">⚠</span>
                {g}
              </li>
            ))}
          </ul>
        )}
      </div>

      {signal.nextQuestionRationale && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs italic text-slate-500">
          Next question: {signal.nextQuestionKind?.replace('_', ' ') ?? '–'} — {signal.nextQuestionRationale}
        </p>
      )}
    </aside>
  )
}
