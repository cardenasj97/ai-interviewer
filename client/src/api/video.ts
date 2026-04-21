import { ApiClientError } from './client'

export async function uploadVideo(
  blob: Blob,
  params: { sessionId: string; turnClientId: string },
): Promise<{ videoUrl: string }> {
  const form = new FormData()
  form.append('video', blob, 'answer.webm')
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
