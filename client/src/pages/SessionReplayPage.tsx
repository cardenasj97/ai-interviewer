import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '@ui/api/sessions'
import TurnList from '@ui/components/TurnList'
import EvaluationCard from '@ui/components/EvaluationCard'
import ErrorBanner from '@ui/components/ErrorBanner'
import { ApiClientError } from '@ui/api/client'

function SkeletonReplay() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 animate-pulse">
      <div className="h-6 w-32 rounded bg-slate-200" />
      <div className="h-64 rounded-xl bg-slate-100" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export default function SessionReplayPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => getSession(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: 1,
  })

  if (isLoading) return <SkeletonReplay />

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/history" className="mb-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Back to history
        </Link>
        <ErrorBanner
          code={error instanceof ApiClientError ? error.code : 'INTERNAL_ERROR'}
        />
      </div>
    )
  }

  if (!data) return null

  const { job, turns, evaluation } = data

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/history" className="text-sm text-indigo-600 hover:underline">
          ← Back to history
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Replay</h1>
          <p className="text-sm text-slate-500">
            {job.title} · {job.level}
          </p>
        </div>
      </div>

      {evaluation && (
        <div className="mb-6">
          <EvaluationCard evaluation={evaluation} />
        </div>
      )}

      <TurnList turns={turns} />
    </div>
  )
}
