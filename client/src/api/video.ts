import { ApiClientError } from './client'

export async function uploadVideo(
  blob: Blob,
  params: { sessionId: string; turnClientId: string },
): Promise<{ videoUrl: string }> {
  // Re-wrap so the FormData part Content-Type is always "video/webm" — raw
  // MediaRecorder output sometimes includes codec params or an empty type,
  // which causes browsers to fall back to text/plain in multipart bodies.
  const typedBlob = new Blob([blob], { type: 'video/webm' })
  const form = new FormData()
  form.append('video', typedBlob, 'answer.webm')
  form.append('sessionId', params.sessionId)
  form.append('turnClientId', params.turnClientId)

  const response = await fetch('/api/v1/video-upload', {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { code: 'UNKNOWN', message: 'Upload failed' } }))
    throw new ApiClientError(
      err.error?.code ?? 'UNKNOWN',
      err.error?.message ?? 'Upload failed',
      response.status,
    )
  }

  const json = await response.json()
  return { videoUrl: json.data.videoUrl }
}
