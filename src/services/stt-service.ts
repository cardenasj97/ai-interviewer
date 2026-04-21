import type { TranscribeRequest } from '@/types/domain'
import { AppError } from '@/types/errors'

export async function transcribe(_input: {
  audio: Buffer
  meta: TranscribeRequest
}): Promise<{ text: string; confidence: number | null }> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
