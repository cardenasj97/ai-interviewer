import OpenAI from 'openai'
import { env } from '@/env'
import { AppError } from '@/types/errors'
import { logger } from '@/utils/log'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

export async function transcribe(input: {
  audio: Buffer
  mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav' | 'video/webm'
  prompt?: string
}): Promise<{ text: string; confidence: number | null }> {
  const client = getClient()

  const ext =
    input.mimeType === 'audio/webm' || input.mimeType === 'video/webm'
      ? 'webm'
      : input.mimeType === 'audio/mp4'
        ? 'mp4'
        : 'wav'
  // Whisper accepts webm container input — it reads the opus audio track,
  // whether the container is tagged audio/webm or video/webm. We pass the
  // audio-equivalent MIME so the provider doesn't reject on content-type.
  const uploadType = input.mimeType === 'video/webm' ? 'audio/webm' : input.mimeType

  try {
    // Pass the Buffer directly so the SDK sets a precise content-length on the
    // multipart part. Wrapping in Readable.from() hides the size, which in
    // some environments produces a malformed upload that Whisper rejects as
    // "Invalid file format".
    const file = await OpenAI.toFile(input.audio, `audio.${ext}`, { type: uploadType })

    const result = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'json',
      language: 'en',
      temperature: 0,
      ...(input.prompt ? { prompt: input.prompt } : {}),
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
