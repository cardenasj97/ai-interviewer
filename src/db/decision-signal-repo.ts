import { asc, eq } from 'drizzle-orm'
import { db } from './client'
import { decisionSignals } from './schema'
import type { DecisionSignal } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date): string {
  return d.toISOString()
}

function rowToSignal(row: typeof decisionSignals.$inferSelect): DecisionSignal {
  return {
    id: row.id,
    sessionId: row.sessionId,
    afterTurnIndex: row.afterTurnIndex,
    competencies: row.competencies as DecisionSignal['competencies'],
    topicsCovered: row.topicsCovered,
    gaps: row.gaps,
    nextQuestionRationale: row.nextQuestionRationale,
    nextQuestionKind: row.nextQuestionKind ?? null,
    createdAt: toIso(row.createdAt),
  }
}

export async function insertSignal(
  input: Omit<DecisionSignal, 'id' | 'createdAt'>,
): Promise<DecisionSignal> {
  const [row] = await db
    .insert(decisionSignals)
    .values({
      sessionId: input.sessionId,
      afterTurnIndex: input.afterTurnIndex,
      competencies: input.competencies as unknown[],
      topicsCovered: input.topicsCovered,
      gaps: input.gaps,
      nextQuestionRationale: input.nextQuestionRationale,
      nextQuestionKind: input.nextQuestionKind ?? undefined,
    })
    .returning()
  if (!row) throw new AppError('INTERNAL_ERROR', 'Failed to insert decision signal', 500)
  return rowToSignal(row)
}

export async function listSignalsBySession(sessionId: string): Promise<DecisionSignal[]> {
  const rows = await db
    .select()
    .from(decisionSignals)
    .where(eq(decisionSignals.sessionId, sessionId))
    .orderBy(asc(decisionSignals.afterTurnIndex))
  return rows.map(rowToSignal)
}
