import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '@ui/api/sessions'
import EvaluationSummary from '@ui/components/EvaluationSummary'
import TurnList from '@ui/components/TurnList'
import DecisionPanel from '@ui/components/DecisionPanel'
import ErrorBanner from '@ui/components/ErrorBanner'
import { ApiClientError } from '@ui/api/client'

function SkeletonResults() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="h-64 rounded-2xl bg-slate-100" />
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => getSession(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: 1,
  })

  if (isLoading) return <SkeletonResults />

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorBanner
          code={error instanceof ApiClientError ? error.code : 'INTERNAL_ERROR'}
          onBack={() => navigate('/')}
          backLabel="Back to jobs"
        />
      </div>
    )
  }

  if (!data) return null

  const { session, job, turns, evaluation, decisionSignals } = data
  const latestSignal = decisionSignals[decisionSignals.length - 1] ?? null

  if (session.status !== 'completed' || !evaluation) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center">
        <p className="text-slate-500">Results pending — refresh in a moment.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          Back to jobs
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Results</h1>
          <p className="text-sm text-slate-500">
            {job.title} · {job.level}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to jobs
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Evaluation summary */}
          <EvaluationSummary evaluation={evaluation} />

          {/* Full transcript */}
          <TurnList turns={turns} />

          {/* Decision signal history */}
          {decisionSignals.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-slate-700">Signal History</h2>
              <div className="space-y-3">
                {decisionSignals.map((signal) => (
                  <details key={signal.id} className="rounded-lg border border-slate-100 bg-white p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-600">
                      After turn {signal.afterTurnIndex}
                    </summary>
                    <div className="mt-2">
                      <DecisionPanel signal={signal} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: latest signal */}
        <div className="lg:col-span-1">
          {latestSignal && (
            <div className="sticky top-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Final Signals</h2>
              <DecisionPanel signal={latestSignal} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
