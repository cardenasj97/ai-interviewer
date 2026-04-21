import { asc, eq } from 'drizzle-orm'
import { db } from './client'
import { turns } from './schema'
import type { Turn } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date): string {
  return d.toISOString()
}

function rowToTurn(row: typeof turns.$inferSelect): Turn {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role,
    index: row.index,
    text: row.text,
    questionKind: row.questionKind ?? null,
    sttConfidence: row.sttConfidence ?? null,
    audioUrl: row.audioUrl ?? null,
    sourceQuestionId: row.sourceQuestionId ?? null,
    spokenDurationMs: row.spokenDurationMs ?? null,
    createdAt: toIso(row.createdAt),
  }
}

export async function insertTurn(input: Omit<Turn, 'id' | 'createdAt'>): Promise<Turn> {
  const [row] = await db
    .insert(turns)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      index: input.index,
      text: input.text,
      questionKind: input.questionKind ?? undefined,
      sttConfidence: input.sttConfidence ?? undefined,
      audioUrl: input.audioUrl ?? undefined,
      sourceQuestionId: input.sourceQuestionId ?? undefined,
      spokenDurationMs: input.spokenDurationMs ?? undefined,
    })
    .returning()
  if (!row) throw new AppError('INTERNAL_ERROR', 'Failed to insert turn', 500)
  return rowToTurn(row)
}

export async function listTurnsBySession(sessionId: string): Promise<Turn[]> {
  const rows = await db
    .select()
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(asc(turns.index))
  return rows.map(rowToTurn)
}

export async function getLastTurn(sessionId: string): Promise<Turn | null> {
  const rows = await listTurnsBySession(sessionId)
  return rows.length > 0 ? (rows[rows.length - 1] ?? null) : null
}
