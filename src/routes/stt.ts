import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { TranscribeRequestSchema } from '@/types/domain'
import { AppError } from '@/types/errors'
import * as sttService from '@/services/stt-service'

const MAX_AUDIO_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIMES = ['audio/webm', 'audio/mp4', 'audio/wav', 'video/webm']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
  fileFilter: (_req, file, cb) => {
    // Strip codec parameters (e.g. "video/webm;codecs=vp8,opus" → "video/webm")
    // so the fileFilter compares against canonical MIME types.
    const base = file.mimetype.split(';')[0]?.trim() ?? ''
    if (!ALLOWED_MIMES.includes(base)) {
      cb(new AppError('AUDIO_UNSUPPORTED_TYPE', `Unsupported audio type: ${file.mimetype}`, 415))
      return
    }
    cb(null, true)
  },
})

const router = Router()

const uploadSingleAudio = upload.single('audio') as unknown as RequestHandler

router.post('/', uploadSingleAudio, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', 'Missing audio file', 400)
    }

    let meta: unknown
    try {
      meta = JSON.parse((req.body as { meta?: string }).meta ?? '')
    } catch {
      throw new AppError('VALIDATION_ERROR', 'meta field must be valid JSON', 400)
    }

    const parsed = TranscribeRequestSchema.safeParse(meta)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid meta fields', 400, parsed.error.flatten())
    }

    const result = await sttService.transcribe({
      audio: req.file.buffer,
      meta: parsed.data,
    })

    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
})

export default router
