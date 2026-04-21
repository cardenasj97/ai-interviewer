import { useEffect, useRef } from 'react'
import type { Turn } from '@/types/domain'
import InterviewerBubble from './InterviewerBubble'
import CandidateBubble from './CandidateBubble'

interface TranscriptPaneProps {
  turns: Turn[]
  showShimmer?: boolean
}

export default function TranscriptPane({ turns, showShimmer = false }: TranscriptPaneProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns.length, showShimmer])

  return (
    <section
      aria-label="Interview transcript"
      className="flex flex-col gap-4 overflow-y-auto"
    >
      {turns.map((turn) =>
        turn.role === 'interviewer' ? (
          <InterviewerBubble key={turn.id} turn={turn} />
        ) : (
          <CandidateBubble key={turn.id} turn={turn} />
        ),
      )}
      {showShimmer && (
        <InterviewerBubble
          turn={{ id: '__shimmer', sessionId: '', role: 'interviewer', index: 0, text: '', questionKind: null, sttConfidence: null, audioUrl: null, sourceQuestionId: null, spokenDurationMs: null, createdAt: '' }}
          shimmer
        />
      )}
      <div ref={bottomRef} />
    </section>
  )
}
