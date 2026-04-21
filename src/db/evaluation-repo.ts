import { eq } from 'drizzle-orm'
import { db } from './client'
import { evaluations } from './schema'
import type { Evaluation } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date): string {
  return d.toISOString()
}

function rowToEvaluation(row: typeof evaluations.$inferSelect): Evaluation {
  return {
    id: row.id,
    sessionId: row.sessionId,
    overallScore: row.overallScore,
    summary: row.summary,
    strengths: row.strengths,
    concerns: row.concerns,
    competencyScores: row.competencyScores,
    rawModelOutput: JSON.stringify(row.rawModelOutput),
    createdAt: toIso(row.createdAt),
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}

export async function insertEvaluation(
  input: Omit<Evaluation, 'id' | 'createdAt'>,
): Promise<Evaluation> {
  try {
    const [row] = await db
      .insert(evaluations)
      .values({
        sessionId: input.sessionId,
        overallScore: input.overallScore,
        summary: input.summary,
        strengths: input.strengths,
        concerns: input.concerns,
        competencyScores: input.competencyScores,
        rawModelOutput: JSON.parse(input.rawModelOutput) as unknown,
      })
      .returning()
    if (!row) throw new AppError('INTERNAL_ERROR', 'Failed to insert evaluation', 500)
    return rowToEvaluation(row)
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw new AppError(
        'EVALUATION_ALREADY_EXISTS',
        'Evaluation already exists for this session',
        409,
      )
    }
    throw err
  }
}

export async function getEvaluationBySession(sessionId: string): Promise<Evaluation | null> {
  const [row] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.sessionId, sessionId))
  return row ? rowToEvaluation(row) : null
}
