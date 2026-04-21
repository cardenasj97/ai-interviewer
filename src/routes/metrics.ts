import { Router } from 'express'
import { SESSION_COOKIE_NAME } from '@/middleware/session-cookie'
import * as historyRepo from '@/db/history-repo'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const rawCookie = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
    const cookieSessionIds = rawCookie
      ? rawCookie.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const summary = await historyRepo.getMetricsSummary(
      cookieSessionIds.length > 0 ? cookieSessionIds : [],
    )

    res.status(200).json({ data: summary })
  } catch (err) {
    next(err)
  }
})

export default router
