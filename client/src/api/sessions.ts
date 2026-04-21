import { apiFetch } from './client'
import type {
  DecisionSignal,
  Evaluation,
  InterviewSession,
  Job,
  Turn,
} from '@/types/domain'

export function createSession(jobId: string, videoEnabled = false): Promise<{
  session: InterviewSession
  firstTurn: Turn
}> {
  return apiFetch('/sessions', { method: 'POST', body: { jobId, videoEnabled } })
}

export function getSession(id: string): Promise<{
  session: InterviewSession
  job: Job
  turns: Turn[]
  evaluation: Evaluation | null
  decisionSignals: DecisionSignal[]
}> {
  return apiFetch(`/sessions/${id}`)
}

export function submitAnswer(
  id: string,
  text: string,
  extra: { sttConfidence?: number; spokenDurationMs?: number } = {},
): Promise<{
  candidateTurn: Turn
  nextInterviewerTurn: Turn | null
  evaluation: Evaluation | null
  decisionSignal: DecisionSignal | null
}> {
  return apiFetch(`/sessions/${id}/turns`, { method: 'POST', body: { text, ...extra } })
}

export function abandonSession(id: string): Promise<{ session: InterviewSession }> {
  return apiFetch(`/sessions/${id}/abandon`, { method: 'POST', body: {} })
}
