import type { Evaluation } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function insertEvaluation(
  _input: Omit<Evaluation, 'id' | 'createdAt'>,
): Promise<Evaluation> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function getEvaluationBySession(_sessionId: string): Promise<Evaluation | null> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
