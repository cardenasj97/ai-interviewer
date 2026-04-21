import { eq, sql } from 'drizzle-orm'
import { db } from './client'
import { interviewSessions } from './schema'
import type { InterviewSession, SessionStatus } from '@/types/domain'
import { AppError } from '@/types/errors'

function toIso(d: Date): string {
  return d.toISOString()
}

function rowToSession(row: typeof interviewSessions.$inferSelect): InterviewSession {
  return {
    id: row.id,
    jobId: row.jobId,
    softUserId: row.softUserId ?? null,
    status: row.status,
    maxQuestions: row.maxQuestions,
    questionsAsked: row.questionsAsked,
    followUpsAsked: row.followUpsAsked,
    videoEnabled: row.videoEnabled,
    startedAt: toIso(row.startedAt),
    endedAt: row.endedAt ? toIso(row.endedAt) : null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

export async function createSession(input: {
  jobId: string
  videoEnabled: boolean
  softUserId: string | null
  maxQuestions?: number
}): Promise<InterviewSession> {
  const [row] = await db
    .insert(interviewSessions)
    .values({
      jobId: input.jobId,
      videoEnabled: input.videoEnabled,
      softUserId: input.softUserId ?? undefined,
      status: 'pending',
      maxQuestions: input.maxQuestions ?? 8,
    })
    .returning()
  if (!row) throw new AppError('INTERNAL_ERROR', 'Failed to create session', 500)
  return rowToSession(row)
}

export async function getSessionById(id: string): Promise<InterviewSession> {
  const [row] = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.id, id))
  if (!row) throw new AppError('SESSION_NOT_FOUND', `Session not found: ${id}`, 404)
  return rowToSession(row)
}

export async function updateSessionStatus(
  id: string,
  status: SessionStatus,
  endedAt?: Date,
): Promise<InterviewSession> {
  const [row] = await db
    .update(interviewSessions)
    .set({
      status,
      endedAt: endedAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(interviewSessions.id, id))
    .returning()
  if (!row) throw new AppError('SESSION_NOT_FOUND', `Session not found: ${id}`, 404)
  return rowToSession(row)
}

export async function incrementCounters(
  id: string,
  delta: { questionsAsked?: number; followUpsAsked?: number },
): Promise<InterviewSession> {
  const [row] = await db
    .update(interviewSessions)
    .set({
      questionsAsked:
        (delta.questionsAsked ?? 0) > 0
          ? sql`${interviewSessions.questionsAsked} + ${delta.questionsAsked}`
          : interviewSessions.questionsAsked,
      followUpsAsked:
        (delta.followUpsAsked ?? 0) > 0
          ? sql`${interviewSessions.followUpsAsked} + ${delta.followUpsAsked}`
          : interviewSessions.followUpsAsked,
      updatedAt: new Date(),
    })
    .where(eq(interviewSessions.id, id))
    .returning()
  if (!row) throw new AppError('SESSION_NOT_FOUND', `Session not found: ${id}`, 404)
  return rowToSession(row)
}
