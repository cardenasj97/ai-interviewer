import type {
  CreateSessionRequest,
  DecisionSignal,
  Evaluation,
  InterviewSession,
  SubmitAnswerRequest,
  Turn,
} from '@/types/domain'
import { AppError } from '@/types/errors'

export async function createSession(
  _input: CreateSessionRequest & { softUserId: string | null },
): Promise<{ session: InterviewSession; firstTurn: Turn }> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function getSession(_id: string): Promise<{
  session: InterviewSession
  job: import('@/types/domain').Job
  turns: Turn[]
  evaluation: Evaluation | null
  decisionSignals: DecisionSignal[]
}> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function submitAnswer(
  _sessionId: string,
  _input: SubmitAnswerRequest,
): Promise<{
  candidateTurn: Turn
  nextInterviewerTurn: Turn | null
  evaluation: Evaluation | null
  decisionSignal: DecisionSignal | null
}> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function abandonSession(_id: string): Promise<{ session: InterviewSession }> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
