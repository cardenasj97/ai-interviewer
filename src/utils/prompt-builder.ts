import type { Job, Turn, InterviewSession } from '@/types/domain'

export type NextQuestionPromptInput = {
  job: Job
  session: InterviewSession
  transcript: Turn[]
}

export function buildNextQuestionPrompt(_input: NextQuestionPromptInput): {
  system: string
  user: string
} {
  throw new Error('Not implemented — filled in by Backend agent in Phase 1')
}

export function buildEvaluationPrompt(_input: NextQuestionPromptInput): {
  system: string
  user: string
} {
  throw new Error('Not implemented — filled in by Backend agent in Phase 1')
}
