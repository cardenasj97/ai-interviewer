import type { Turn } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function insertTurn(_input: Omit<Turn, 'id' | 'createdAt'>): Promise<Turn> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}

export async function listTurnsBySession(_sessionId: string): Promise<Turn[]> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
