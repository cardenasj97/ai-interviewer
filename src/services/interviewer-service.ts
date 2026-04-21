import type { InterviewSession, Job, NextQuestionOutput, Turn } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function decide(_input: {
  session: InterviewSession
  turns: Turn[]
  job: Job
}): Promise<NextQuestionOutput> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
