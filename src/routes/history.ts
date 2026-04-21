import { Router } from 'express'
import { validate } from '@/middleware/zod-middleware'
import { HistoryQuerySchema } from '@/types/domain'
import { SESSION_COOKIE_NAME } from '@/middleware/session-cookie'
import * as historyRepo from '@/db/history-repo'

const router = Router()

router.get('/', validate({ query: HistoryQuerySchema }), async (req, res, next) => {
  try {
    const query = req.query as unknown as import('@/types/domain').HistoryQuery

    const rawCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
    const cookieSessionIds = rawCookie
      ? rawCookie.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    if (cookieSessionIds.length === 0) {
      res.status(200).json({ data: [], nextCursor: null })
      return
    }

    const { items, nextCursor } = await historyRepo.listCompletedSessions({
      jobSlug: query.jobSlug,
      limit: query.limit,
      cursor: query.cursor,
      cookieSessionIds,
    })

    res.status(200).json({ data: items, nextCursor })
  } catch (err) {
    next(err)
  }
})

export default router
