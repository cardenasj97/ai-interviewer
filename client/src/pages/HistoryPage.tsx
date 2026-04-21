import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listHistory } from '@ui/api/history'
import { listJobs } from '@ui/api/jobs'
import ErrorBanner from '@ui/components/ErrorBanner'
import { ApiClientError } from '@ui/api/client'
import { formatRelativeTime, formatDuration, scoreColorClass } from '@ui/lib/format'
import { mergeHistory, MOCK_HISTORY } from '@ui/lib/mock-history'

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-3/4 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [jobSlug, setJobSlug] = useState<string>('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['history', jobSlug],
    queryFn: () => listHistory({ jobSlug: jobSlug || undefined, limit: 50 }),
    staleTime: 60 * 1000,
  })

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    staleTime: 5 * 60 * 1000,
  })

  const merged = mergeHistory(data ?? [])
  const sessions = jobSlug ? merged.filter((s) => s.jobSlug === jobSlug) : merged
  const mockIds = new Set(MOCK_HISTORY.map((s) => s.id))

  return (
    <section className="mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Interview History</h1>
        <p className="mt-2 text-slate-500">Your past completed interviews.</p>
      </header>

      {/* Filter bar */}
      <div className="mb-6 flex gap-3">
        <select
          value={jobSlug}
          onChange={(e) => setJobSlug(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {jobs?.map((job) => (
            <option key={job.slug} value={job.slug}>
              {job.title}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <div className="mb-6">
          <ErrorBanner
            code={error instanceof ApiClientError ? error.code : 'INTERNAL_ERROR'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && !isError && sessions.length === 0 && (
        <p className="py-16 text-center text-slate-400">
          No past interviews yet. Complete one to see it here.
        </p>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isMock = mockIds.has(session.id)
            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-slate-900 truncate">
                      {session.jobTitle}
                    </h2>
                    {session.decisionSignal && (
                      <span className="text-xs font-medium text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-100">
                        {session.decisionSignal.replace(/_/g, ' ')}
                      </span>
                    )}
                    {isMock && (
                      <span className="text-xs font-medium text-amber-700 px-2 py-0.5 rounded-full bg-amber-100">
                        Sample
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>{formatRelativeTime(session.completedAt)}</span>
                    <span>{formatDuration(session.durationSeconds * 1000)}</span>
                    <span>{session.questionCount} questions</span>
                    {session.overallScore !== null && (
                      <span className={`font-semibold ${scoreColorClass(session.overallScore)}`}>
                        Score: {session.overallScore}
                      </span>
                    )}
                  </div>
                </div>
                {isMock ? (
                  <span
                    className="ml-4 shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed"
                    title="Replay is not available for sample data"
                  >
                    Replay
                  </span>
                ) : (
                  <Link
                    to={`/replay/${session.id}`}
                    className="ml-4 shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    Replay
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
