import type { ErrorRequestHandler } from 'express'
import { AppError } from '@/types/errors'

type MulterError = { name: string; code: string; message: string }

function isMulterError(err: unknown): err is MulterError {
  return typeof err === 'object' && err !== null && (err as MulterError).name === 'MulterError'
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    })
  }

  if (isMulterError(err)) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'AUDIO_TOO_LARGE', message: 'Audio file exceeds 5 MB limit.' },
      })
    }
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message },
    })
  }

  req.log?.error({ err }, 'unhandled error')
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    },
  })
}
