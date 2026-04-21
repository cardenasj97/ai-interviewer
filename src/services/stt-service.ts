import type { TranscribeRequest } from '@/types/domain'
import { AppError } from '@/types/errors'
import * as whisperClient from '@/adapters/whisper-client'

const MIN_DURATION_MS = 200
const MIN_BUFFER_BYTES = 1024

export async function transcribe(input: {
  audio: Buffer
  meta: TranscribeRequest
}): Promise<{ text: string; confidence: number | null }> {
  const { audio, meta } = input

  if (meta.durationMs < MIN_DURATION_MS || audio.length < MIN_BUFFER_BYTES) {
    throw new AppError('AUDIO_EMPTY', 'Audio clip is too short or empty', 422)
  }

  return whisperClient.transcribe({ audio, mimeType: meta.mimeType })
}
