import { AppError } from '@/types/errors'

export async function transcribe(_input: {
  audio: Buffer
  mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav'
}): Promise<{ text: string; confidence: number | null }> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
