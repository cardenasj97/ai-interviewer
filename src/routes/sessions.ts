import { Router } from 'express'
import { z } from 'zod'
import { validate } from '@/middleware/zod-middleware'
import { CreateSessionRequestSchema, IdSchema, SubmitAnswerRequestSchema } from '@/types/domain'
import * as sessionService from '@/services/session-service'

const router = Router()

const IdParamsSchema = z.object({ id: IdSchema })

router.post('/', validate({ body: CreateSessionRequestSchema }), async (req, res, next) => {
  try {
    const softUserId = (req.cookies?.['aq_user_id'] as string | undefined) ?? null

    const result = await sessionService.createSession({
      ...req.body as z.infer<typeof CreateSessionRequestSchema>,
      softUserId,
    })

    res.locals.setInterviewSessionId?.(result.session.id)

    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', validate({ params: IdParamsSchema }), async (req, res, next) => {
  try {
    const result = await sessionService.getSession(req.params['id'] as string)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
})

router.post(
  '/:id/turns',
  validate({ params: IdParamsSchema, body: SubmitAnswerRequestSchema }),
  async (req, res, next) => {
    try {
      const result = await sessionService.submitAnswer(
        req.params['id'] as string,
        req.body as z.infer<typeof SubmitAnswerRequestSchema>,
      )

      // Keep the session ID in the cookie even after evaluation so it
      // shows up in the user's history list. Re-set to refresh the maxAge.
      res.locals.setInterviewSessionId?.(req.params['id'] as string)

      res.status(200).json({ data: result })
    } catch (err) {
      next(err)
    }
  },
)

router.post('/:id/abandon', validate({ params: IdParamsSchema }), async (req, res, next) => {
  try {
    const result = await sessionService.abandonSession(req.params['id'] as string)
    // Keep the session ID in the cookie so it counts in metrics (abandoned bucket).
    res.locals.setInterviewSessionId?.(req.params['id'] as string)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
})

export default router
