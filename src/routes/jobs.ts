import { Router } from 'express'
import { z } from 'zod'
import { validate } from '@/middleware/zod-middleware'
import { AppError } from '@/types/errors'

const router = Router()

router.get('/', async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

const SlugParamsSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
})

router.get('/:slug', validate({ params: SlugParamsSchema }), async (_req, _res, next) => {
  try {
    throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
  } catch (err) {
    next(err)
  }
})

export default router
