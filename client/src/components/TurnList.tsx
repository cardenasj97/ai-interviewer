import { useState } from 'react'
import type { Turn } from '@/types/domain'
import TranscriptPane from './TranscriptPane'

interface TurnListProps {
  turns: Turn[]
}

export default function TurnList({ turns }: TurnListProps) {
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set())

  function toggleVideo(turnId: string) {
    setExpandedVideos((prev) => {
      const next = new Set(prev)
      if (next.has(turnId)) {
        next.delete(turnId)
      } else {
        next.add(turnId)
      }
      return next
    })
  }

  const candidateTurnsWithVideo = turns.filter(
    (t) => t.role === 'candidate' && t.videoUrl,
  )

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-700">Full Transcript</h2>
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <TranscriptPane turns={turns} />
        {candidateTurnsWithVideo.map((turn) => (
          <div key={`video-${turn.id}`} className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-1 text-xs text-slate-400">Turn {turn.index} — your answer</p>
            <button
              type="button"
              onClick={() => toggleVideo(turn.id)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              {expandedVideos.has(turn.id) ? 'Hide video' : 'Show video'}
            </button>
            {expandedVideos.has(turn.id) && (
              <video
                controls
                src={turn.videoUrl ?? undefined}
                className="mt-2 max-w-md rounded border border-slate-200"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
