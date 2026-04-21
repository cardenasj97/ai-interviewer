import { Router } from 'express'
import { z } from 'zod'
import { validate } from '@/middleware/zod-middleware'
import {
  CreateSessionRequestSchema,
  IdSchema,
  SubmitAnswerRequestSchema,
} from '@/types/domain'
import { AppError } from '@/types/errors'

const router = Router()

const IdParamsSchema = z.object({ id: IdSchema })

router.post('/', validate({ body: CreateSessionRequestSchema }), async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', validate({ params: IdParamsSchema }), async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

router.post(
  '/:id/turns',
  validate({ params: IdParamsSchema, body: SubmitAnswerRequestSchema }),
  async (_req, _res, next) => {
    try {
      throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
    } catch (err) {
      next(err)
    }
  },
)

router.post('/:id/abandon', validate({ params: IdParamsSchema }), async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

export default router
