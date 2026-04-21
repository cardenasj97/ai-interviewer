import type { InterviewSession, SessionStatus } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function createSession(_input: {
  jobId: string
  videoEnabled: boolean
  softUserId: string | null
}): Promise<InterviewSession> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function getSessionById(_id: string): Promise<InterviewSession> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function updateSessionStatus(
  _id: string,
  _status: SessionStatus,
): Promise<InterviewSession> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function incrementCounters(
  _id: string,
  _delta: { questionsAsked?: number; followUpsAsked?: number },
): Promise<InterviewSession> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
