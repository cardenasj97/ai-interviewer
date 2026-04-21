import { chatJson } from '@/adapters/openai-client'
import { buildEvaluationMessages } from '@/utils/prompt-builder'
import { EvaluationOutputSchema, type Evaluation, type InterviewSession, type Job, type Turn } from '@/types/domain'
import { AppError } from '@/types/errors'
import * as evaluationRepo from '@/db/evaluation-repo'

export async function generate(input: {
  session: InterviewSession
  turns: Turn[]
  job: Job
}): Promise<Evaluation> {
  const { session, turns, job } = input

  const messages = buildEvaluationMessages({ job, session, transcript: turns })

  const output = await chatJson({
    messages,
    schema: EvaluationOutputSchema,
    schemaName: 'evaluation',
  })

  const rawModelOutput = JSON.stringify(output)

  try {
    return await evaluationRepo.insertEvaluation({
      sessionId: session.id,
      overallScore: output.overallScore,
      summary: output.summary,
      strengths: output.strengths,
      concerns: output.concerns,
      competencyScores: output.competencyScores,
      rawModelOutput,
    })
  } catch (err: unknown) {
    if (err instanceof AppError && err.code === 'EVALUATION_ALREADY_EXISTS') {
      const existing = await evaluationRepo.getEvaluationBySession(session.id)
      if (existing) return existing
    }
    throw err
  }
}
