import { Router, type RequestHandler } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { AppError } from '@/types/errors'
import * as videoStorage from '@/adapters/video-storage'

const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB
const ALLOWED_MIMES = ['video/webm', 'video/mp4']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      cb(new AppError('VALIDATION_ERROR', `Unsupported video type: ${file.mimetype}`, 422))
      return
    }
    cb(null, true)
  },
})

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  turnClientId: z.string().min(1),
})

const router = Router()

const uploadSingleVideo = upload.single('video') as unknown as RequestHandler

router.post('/', uploadSingleVideo, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', 'Missing video file', 422)
    }

    const parsed = BodySchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid fields', 422, parsed.error.flatten())
    }

    const { sessionId } = parsed.data
    const result = await videoStorage.saveVideo(req.file.buffer, req.file.mimetype, sessionId)

    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
})

export default router
