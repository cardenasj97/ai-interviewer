import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { AppError } from '@/types/errors'

vi.mock('@/services/stt-service', () => ({
  transcribe: vi.fn(),
}))

import { createApp } from '@/index'
import * as sttService from '@/services/stt-service'

const VALID_META = JSON.stringify({
  sessionId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  mimeType: 'audio/webm',
  durationMs: 5000,
})

// A 1KB+ fake audio buffer that passes the size check in stt-service
const validAudioBuffer = Buffer.alloc(2048, 0x00)

describe('POST /api/v1/stt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('happy path returns text and confidence=null', async () => {
    vi.mocked(sttService.transcribe).mockResolvedValue({ text: 'hello world', confidence: null })

    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', validAudioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
      .field('meta', VALID_META)

    expect(res.status).toBe(200)
    expect(res.body.data.text).toBe('hello world')
    expect(res.body.data.confidence).toBeNull()
  })

  it('returns 413 AUDIO_TOO_LARGE for file > 5 MB', async () => {
    const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 0x00)
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', bigBuffer, { filename: 'big.webm', contentType: 'audio/webm' })
      .field('meta', VALID_META)

    expect(res.status).toBe(413)
  })

  it('returns 415 AUDIO_UNSUPPORTED_TYPE for wrong mime', async () => {
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', validAudioBuffer, { filename: 'audio.ogg', contentType: 'audio/ogg' })
      .field('meta', VALID_META)

    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('AUDIO_UNSUPPORTED_TYPE')
  })

  it('returns 422 AUDIO_EMPTY when stt-service rejects empty audio', async () => {
    vi.mocked(sttService.transcribe).mockRejectedValue(
      new AppError('AUDIO_EMPTY', 'Audio too short', 422),
    )

    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', validAudioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
      .field('meta', VALID_META)

    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('AUDIO_EMPTY')
  })

  it('returns 502 STT_PROVIDER_ERROR on Whisper failure', async () => {
    vi.mocked(sttService.transcribe).mockRejectedValue(
      new AppError('STT_PROVIDER_ERROR', 'Provider error', 502),
    )

    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', validAudioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
      .field('meta', VALID_META)

    expect(res.status).toBe(502)
    expect(res.body.error.code).toBe('STT_PROVIDER_ERROR')
  })

  it('returns 400 when no audio file', async () => {
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .field('meta', VALID_META)

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when meta is invalid JSON', async () => {
    const app = createApp()
    const res = await request(app)
      .post('/api/v1/stt')
      .attach('audio', validAudioBuffer, { filename: 'audio.webm', contentType: 'audio/webm' })
      .field('meta', 'not json')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
