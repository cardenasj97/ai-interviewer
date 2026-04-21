import OpenAI from 'openai'
import { Readable } from 'node:stream'
import { env } from '@/env'
import { AppError } from '@/types/errors'
import { logger } from '@/utils/log'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

export async function transcribe(input: {
  audio: Buffer
  mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav'
}): Promise<{ text: string; confidence: number | null }> {
  const client = getClient()

  const ext = input.mimeType === 'audio/webm' ? 'webm' : input.mimeType === 'audio/mp4' ? 'mp4' : 'wav'

  try {
    const file = await OpenAI.toFile(
      Readable.from(input.audio),
      `audio.${ext}`,
      { type: input.mimeType },
    )

    const result = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'json',
    })

    return { text: result.text, confidence: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = (err as { status?: number })?.status
    logger.warn(
      {
        err,
        providerMessage: msg,
        providerStatus: status,
        mimeType: input.mimeType,
        audioBytes: input.audio.length,
      },
      'Whisper provider error',
    )
    throw new AppError('STT_PROVIDER_ERROR', `STT provider error: ${msg}`, 502, {
      providerMessage: msg,
      providerStatus: status,
    })
  }
}
