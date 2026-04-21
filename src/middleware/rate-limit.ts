import type { RequestHandler } from 'express'
import { AppError } from '@/types/errors'

type Bucket = { tokens: number; updatedAt: number }

const WINDOW_MS = 60_000
const MAX_REQUESTS = 30

const buckets = new Map<string, Bucket>()

function getKey(ip: string | undefined): string {
  return ip ?? 'unknown'
}

export const rateLimit: RequestHandler = (req, _res, next) => {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next()

  const now = Date.now()
  const key = getKey(req.ip)
  const existing = buckets.get(key)

  if (!existing || now - existing.updatedAt >= WINDOW_MS) {
    buckets.set(key, { tokens: MAX_REQUESTS - 1, updatedAt: now })
    return next()
  }

  if (existing.tokens <= 0) {
    return next(new AppError('RATE_LIMITED', 'Too many requests, slow down.', 429))
  }

  existing.tokens -= 1
  return next()
}
