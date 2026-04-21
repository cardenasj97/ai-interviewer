import { ApiClientError } from './client'

export async function transcribeAudio(
  blob: Blob,
  meta: {
    sessionId: string
    mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav' | 'video/webm'
    durationMs: number
  },
): Promise<{ text: string; confidence: number | null }> {
  // Re-wrap so the FormData part Content-Type is always the canonical mimeType
  // (some MediaRecorder outputs include codec params or an empty type, which
  // causes browsers to fall back to text/plain in multipart bodies).
  const typedBlob = new Blob([blob], { type: meta.mimeType })
  const ext = meta.mimeType === 'video/webm' ? 'webm' : meta.mimeType.split('/')[1]
  const form = new FormData()
  form.append('audio', typedBlob, `audio.${ext}`)
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
