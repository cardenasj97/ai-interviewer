import type { Evaluation } from '@/types/domain'
import { scoreColorClass, scoreBgClass } from '@ui/lib/format'

interface EvaluationCardProps {
  evaluation: Evaluation
}

export default function EvaluationCard({ evaluation }: EvaluationCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Hero score */}
      <div className="mb-6 text-center">
        <p
          className={`text-7xl font-extrabold tabular-nums ${scoreColorClass(evaluation.overallScore)}`}
          aria-label={`Overall score: ${evaluation.overallScore} out of 100`}
        >
          {evaluation.overallScore}
        </p>
        <p className="mt-1 text-sm text-slate-500">Overall score</p>
        <p className="mt-3 text-base font-medium text-slate-700">{evaluation.summary}</p>
      </div>

      {/* Strengths */}
      <div className="mb-4">
        <h3 className="mb-2 font-semibold text-slate-700">Strengths</h3>
        <ul className="space-y-1">
          {evaluation.strengths.map((s) => (
            <li key={s} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-green-500" aria-hidden="true">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Concerns */}
      <div className="mb-6">
        <h3 className="mb-2 font-semibold text-slate-700">Concerns</h3>
        {evaluation.concerns.length === 0 ? (
          <p className="text-sm text-slate-500">No significant concerns noted.</p>
        ) : (
          <ul className="space-y-1">
            {evaluation.concerns.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-0.5 text-amber-500" aria-hidden="true">⚠</span>
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Per-competency */}
      {evaluation.competencyScores.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-slate-700">Competency breakdown</h3>
          <ul className="space-y-3">
            {evaluation.competencyScores.map((cs) => (
              <li key={cs.competency}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{cs.competency}</span>
                  <span className={`font-medium ${scoreColorClass(cs.score)}`}>{cs.score}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-1.5 rounded-full ${scoreBgClass(cs.score)} transition-all`}
                    style={{ width: `${cs.score}%` }}
                    aria-label={`${cs.competency} score: ${cs.score}`}
                  />
                </div>
                {cs.rationale && (
                  <p className="mt-1 text-xs text-slate-500">{cs.rationale}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
