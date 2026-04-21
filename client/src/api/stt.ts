import { ApiClientError } from './client'

export async function transcribeAudio(
  blob: Blob,
  meta: { sessionId: string; mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav'; durationMs: number },
): Promise<{ text: string; confidence: number | null }> {
  const form = new FormData()
  form.append('audio', blob, `audio.${meta.mimeType.split('/')[1]}`)
  form.append('meta', JSON.stringify(meta))

  const res = await fetch('/api/v1/stt', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  const raw = await res.json().catch(() => ({
    error: { code: 'INTERNAL_ERROR', message: 'Malformed response' },
  }))

  if (!res.ok) {
    throw new ApiClientError(
      raw?.error?.code ?? 'INTERNAL_ERROR',
      raw?.error?.message ?? 'Request failed',
      res.status,
      raw?.error?.details,
    )
  }
  return raw.data
}
