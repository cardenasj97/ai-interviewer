import { Router } from 'express'
import { z } from 'zod'
import { validate } from '@/middleware/zod-middleware'
import * as jobService from '@/services/job-service'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const jobs = await jobService.listJobs()
    res.status(200).json({ data: jobs })
  } catch (err) {
    next(err)
  }
})

const SlugParamsSchema = z.object({
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
})

router.get('/:slug', validate({ params: SlugParamsSchema }), async (req, res, next) => {
  try {
    const job = await jobService.getJob(req.params['slug'] as string)
    res.status(200).json({ data: job })
  } catch (err) {
    next(err)
  }
})

export default router
