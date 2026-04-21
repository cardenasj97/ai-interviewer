import type { Turn } from '@/types/domain'
import TranscriptPane from './TranscriptPane'

interface TurnListProps {
  turns: Turn[]
}

export default function TurnList({ turns }: TurnListProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-700">Full Transcript</h2>
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <TranscriptPane turns={turns} />
      </div>
    </section>
  )
}
