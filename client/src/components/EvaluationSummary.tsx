import type { Evaluation, DecisionSignal } from '@/types/domain'
import EvaluationCard from './EvaluationCard'
import DecisionPanel from './DecisionPanel'

interface EvaluationSummaryProps {
  evaluation: Evaluation
  decisionSignal?: DecisionSignal | null
}

export default function EvaluationSummary({ evaluation, decisionSignal }: EvaluationSummaryProps) {
  return (
    <div className="space-y-6">
      <EvaluationCard evaluation={evaluation} />
      {decisionSignal && <DecisionPanel signal={decisionSignal} />}
    </div>
  )
}
