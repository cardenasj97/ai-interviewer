import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { AppError } from '@/types/errors'

const MAX_AUDIO_BYTES = 5 * 1024 * 1024 // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/wav']
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError('AUDIO_UNSUPPORTED_TYPE', `Unsupported audio type: ${file.mimetype}`, 415))
      return
    }
    cb(null, true)
  },
})

const router = Router()

const uploadSingleAudio = upload.single('audio') as unknown as RequestHandler

router.post('/', uploadSingleAudio, async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

export default router
