import { useState } from 'react'
import type { QuestionPack } from '@ui/api/jobs'

interface Props {
  pack: QuestionPack | null | undefined
}

const VISIBLE_BY_DEFAULT = 3

export default function QuestionPackPreview({ pack }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!pack || pack.length === 0) return null

  const visible = expanded ? pack : pack.slice(0, VISIBLE_BY_DEFAULT)
  const hasMore = pack.length > VISIBLE_BY_DEFAULT

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Topics you might be asked about
      </p>
      <ul className="space-y-1">
        {visible.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">
              •
            </span>
            <span>{item.prompt}</span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((prev) => !prev)
          }}
          className="mt-2 text-xs font-medium text-indigo-500 hover:text-indigo-700 focus:outline-none focus-visible:underline"
        >
          {expanded ? 'Show less' : `Show all (${pack.length})`}
        </button>
      )}
    </div>
  )
}
