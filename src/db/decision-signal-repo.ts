import type { DecisionSignal } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function insertSignal(
  _input: Omit<DecisionSignal, 'id' | 'createdAt'>,
): Promise<DecisionSignal> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function listSignalsBySession(_sessionId: string): Promise<DecisionSignal[]> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
