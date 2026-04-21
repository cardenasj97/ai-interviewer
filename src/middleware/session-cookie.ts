import type { RequestHandler } from 'express'
import { env } from '@/env'

export const SESSION_COOKIE_NAME = 'interview_session_id'
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const MAX_COOKIE_SESSION_IDS = 50

function parseCookieIds(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const sessionCookie: RequestHandler = (req, res, next) => {
  const existing = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
  ;(req as typeof req & { interviewSessionId?: string }).interviewSessionId = existing

  res.locals.setInterviewSessionId = (id: string) => {
    const current = parseCookieIds(req.cookies?.[SESSION_COOKIE_NAME] as string | undefined)
    const next = [...current.filter((existingId) => existingId !== id), id].slice(
      -MAX_COOKIE_SESSION_IDS,
    )

    res.cookie(SESSION_COOKIE_NAME, next.join(','), {
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
