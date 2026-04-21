import type { Evaluation, InterviewSession, Job, Turn } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function generate(_input: {
  session: InterviewSession
  turns: Turn[]
  job: Job
}): Promise<Evaluation> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
