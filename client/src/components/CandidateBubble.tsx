import type { Turn } from '@/types/domain'

interface CandidateBubbleProps {
  turn: Turn
}

export default function CandidateBubble({ turn }: CandidateBubbleProps) {
  return (
    <div className="flex flex-row-reverse gap-3">
      <div
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700"
        aria-hidden="true"
      >
        You
      </div>
      <div className="max-w-prose">
        <p className="rounded-2xl rounded-tr-none bg-white px-4 py-3 text-sm text-slate-800 shadow-sm ring-1 ring-slate-100">
          {turn.text}
        </p>
      </div>
    </div>
  )
}
