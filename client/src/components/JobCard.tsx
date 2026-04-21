import { useNavigate } from 'react-router-dom'
import type { JobListItem } from '@/types/domain'

const LEVEL_COLORS: Record<string, string> = {
  junior: 'bg-blue-100 text-blue-800',
  mid: 'bg-indigo-100 text-indigo-800',
  senior: 'bg-purple-100 text-purple-800',
  staff: 'bg-pink-100 text-pink-800',
}

interface JobCardProps {
  job: JobListItem
}

export default function JobCard({ job }: JobCardProps) {
  const navigate = useNavigate()

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/interview/${job.slug}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/interview/${job.slug}`)
      }}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label={`Start interview for ${job.title}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${LEVEL_COLORS[job.level] ?? 'bg-slate-100 text-slate-700'}`}
        >
          {job.level}
        </span>
      </div>
      <p className="text-sm text-slate-600">{job.shortDescription}</p>
      <div className="mt-4 text-sm font-medium text-indigo-600">Start interview →</div>
    </article>
  )
}
