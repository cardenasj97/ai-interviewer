import fs from 'node:fs/promises'
import path from 'node:path'
import { AppError } from '@/types/errors'

const MIME_TO_EXT: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
}

function resolveStoragePath(): string {
  return process.env.VIDEO_STORAGE_PATH ?? './uploads/videos'
}

function resolveBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? ''
}

export async function saveVideo(
  buffer: Buffer,
  mimeType: string,
  sessionId: string,
): Promise<{ videoUrl: string }> {
  const baseMime = mimeType.split(';')[0]?.trim() ?? ''
  const ext = MIME_TO_EXT[baseMime]
  if (!ext) {
    throw new AppError('VALIDATION_ERROR', 'Unsupported video MIME type', 422)
  }

  const filename = `${sessionId}_${Date.now()}.${ext}`
  const storagePath = resolveStoragePath()

  try {
    await fs.mkdir(storagePath, { recursive: true })
    await fs.writeFile(path.join(storagePath, filename), buffer)
  } catch {
    throw new AppError('INTERNAL_ERROR', 'Failed to persist video', 500)
  }

  const videoUrl = `${resolveBaseUrl()}/uploads/videos/${filename}`
  return { videoUrl }
}
