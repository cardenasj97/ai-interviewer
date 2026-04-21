import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { getMetrics } from '@ui/api/metrics'
import ErrorBanner from '@ui/components/ErrorBanner'
import { ApiClientError } from '@ui/api/client'
import { scoreColorClass } from '@ui/lib/format'
import { mergeMetrics } from '@ui/lib/mock-history'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  )
}

function SkeletonMetrics() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  )
}

export default function MetricsPage() {
  const { data: realData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
    staleTime: 2 * 60 * 1000,
  })
  const data = realData ? mergeMetrics(realData) : undefined

  if (isLoading) return <SkeletonMetrics />

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <ErrorBanner
          code={error instanceof ApiClientError ? error.code : 'INTERNAL_ERROR'}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!data || data.totalSessions === 0) {
    return (
      <section className="mx-auto max-w-4xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Metrics</h1>
        </header>
        <p className="py-16 text-center text-slate-400">
          No data yet. Complete at least one interview.
        </p>
      </section>
    )
  }

  const avgScore = data.avgOverallScore
  const avgScoreColor = avgScore !== null ? scoreColorClass(avgScore) : 'text-slate-400'

  return (
    <section className="mx-auto max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Metrics</h1>
        <p className="mt-2 text-slate-500">
          Aggregate performance across all your interviews.{' '}
          <span className="text-amber-700">Includes sample data for demo purposes.</span>
        </p>
      </header>

      {/* Top stat row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total sessions" value={data.totalSessions} />
        <StatCard label="Completed" value={data.completedSessions} />
        <StatCard label="Abandoned" value={data.abandonedSessions} />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <p className={`text-3xl font-bold ${avgScoreColor}`}>
            {avgScore !== null ? avgScore : '—'}
          </p>
          <p className="mt-1 text-sm text-slate-500">Avg overall score</p>
        </div>
      </div>

      {/* Per-competency bar chart */}
      {data.competencyAverages.length > 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Competency Averages</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.competencyAverages} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="competency"
                tick={{ fontSize: 12 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v ?? ''}`, 'Avg score']} />
              <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Score trend line chart */}
      {data.scoreTrend.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-700">Score Trend</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.scoreTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="completedAt" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v ?? ''}`, 'Score']} />
              <Line type="monotone" dataKey="overallScore" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
