import { Router } from 'express'
import { z } from 'zod'
import { validate } from '@/middleware/zod-middleware'
import { CreateSessionRequestSchema, IdSchema, SubmitAnswerRequestSchema } from '@/types/domain'
import * as sessionService from '@/services/session-service'
import { SESSION_COOKIE_NAME } from '@/middleware/session-cookie'

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

      if (result.evaluation) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
      }

      res.status(200).json({ data: result })
    } catch (err) {
      next(err)
    }
  },
)

router.post('/:id/abandon', validate({ params: IdParamsSchema }), async (req, res, next) => {
  try {
    const result = await sessionService.abandonSession(req.params['id'] as string)
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
})

export default router
