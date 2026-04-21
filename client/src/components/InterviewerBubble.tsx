import type { Turn } from '@/types/domain'

interface InterviewerBubbleProps {
  turn: Turn
  shimmer?: boolean
}

export default function InterviewerBubble({ turn, shimmer = false }: InterviewerBubbleProps) {
  if (shimmer) {
    return (
      <div className="flex gap-3">
        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-indigo-200" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
        aria-hidden="true"
      >
        AI
      </div>
      <div className="max-w-prose">
        <p
          aria-live="polite"
          className="rounded-2xl rounded-tl-none bg-indigo-50 px-4 py-3 text-sm text-slate-800"
        >
          {turn.text}
        </p>
        {turn.questionKind && (
          <span className="mt-1 block text-xs text-slate-400 capitalize">
            {turn.questionKind.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  )
}
