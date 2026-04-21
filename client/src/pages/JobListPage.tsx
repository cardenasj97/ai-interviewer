import { useQuery } from '@tanstack/react-query'
import { listJobs } from '@ui/api/jobs'
import JobCard from '@ui/components/JobCard'
import ErrorBanner from '@ui/components/ErrorBanner'
import { ApiClientError } from '@ui/api/client'
import type { JobListItem } from '@/types/domain'

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

export default function JobListPage() {
  const {
    data: jobs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<JobListItem[], ApiClientError>({
    queryKey: ['jobs'],
    queryFn: listJobs,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <section className="mx-auto max-w-4xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pick a role to interview for</h1>
        <p className="mt-2 text-slate-500">
          Choose a position and start a voice-driven AI interview.
        </p>
      </header>

      {isError && (
        <div className="mb-6">
          <ErrorBanner
            code={error instanceof ApiClientError ? error.code : 'INTERNAL_ERROR'}
            onRetry={() => refetch()}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {jobs && jobs.length === 0 && (
          <p className="col-span-3 text-center text-slate-400 py-12">
            No jobs available right now.
          </p>
        )}

        {jobs?.map((job) => <JobCard key={job.id} job={job} />)}
      </div>
    </section>
  )
}
