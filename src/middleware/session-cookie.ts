import type { RequestHandler } from 'express'
import { env } from '@/env'

export const SESSION_COOKIE_NAME = 'interview_session_id'
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

export const sessionCookie: RequestHandler = (req, res, next) => {
  const existing = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
  ;(req as typeof req & { interviewSessionId?: string }).interviewSessionId = existing

  res.locals.setInterviewSessionId = (id: string) => {
    res.cookie(SESSION_COOKIE_NAME, id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    })
  }

  res.locals.clearInterviewSessionId = () => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  }

  next()
}
