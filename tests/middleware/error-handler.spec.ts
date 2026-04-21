import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { errorHandler } from '@/middleware/error-handler'
import { AppError } from '@/types/errors'
import { rateLimit } from '@/middleware/rate-limit'

function makeApp(handler: express.RequestHandler) {
  const app = express()
  app.use(express.json())
  app.post('/test', handler)
  app.use(errorHandler)
  return app
}

describe('errorHandler middleware', () => {
  it('maps AppError to correct status + code', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('JOB_NOT_FOUND', 'Job missing', 404))
    })

    const res = await request(app).post('/test').send({})
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('JOB_NOT_FOUND')
    expect(res.body.error.message).toBe('Job missing')
  })

  it('maps unknown error to 500 INTERNAL_ERROR', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new Error('unexpected'))
    })

    const res = await request(app).post('/test').send({})
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })

  it('includes details field when present', async () => {
    const app = makeApp((_req, _res, next) => {
      next(new AppError('VALIDATION_ERROR', 'Bad input', 400, { field: 'email' }))
    })

    const res = await request(app).post('/test').send({})
    expect(res.status).toBe(400)
    expect(res.body.error.details).toEqual({ field: 'email' })
  })
})

describe('rateLimit middleware', () => {
  it('allows requests under the limit', async () => {
    const app = makeApp((_req, res) => res.json({ ok: true }))
    app.use(rateLimit)

    const res = await request(makeApp((_req, res) => res.json({ ok: true })))
      .post('/test')
      .send({})
    expect(res.status).toBe(200)
  })

  it('blocks the 31st request with 429 RATE_LIMITED', async () => {
    const app = express()
    app.use(express.json())
    // Use a fresh rate-limit module with a unique IP to avoid bleed between tests
    app.post('/rate', rateLimit, (_req, res) => res.json({ ok: true }))
    app.use(errorHandler)

    // 30 allowed
    for (let i = 0; i < 30; i++) {
      await request(app).post('/rate').set('X-Forwarded-For', '10.0.0.99').send({})
    }

    const res = await request(app)
      .post('/rate')
      .set('X-Forwarded-For', '10.0.0.99')
      .send({})

    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})
