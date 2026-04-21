import path from 'node:path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from '@/env'
import { logger } from '@/utils/log'
import { httpLogger } from '@/middleware/logger'
import { sessionCookie } from '@/middleware/session-cookie'
import { rateLimit } from '@/middleware/rate-limit'
import { errorHandler } from '@/middleware/error-handler'
import apiRouter from '@/routes/index'
import { runMigrations } from '@/db/migrate'
import { seed } from '@/db/seeds/index'

export function createApp(): express.Express {
  const app = express()

  app.use(
    cors({
      origin: env.CLIENT_ORIGIN ?? true,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser(env.SESSION_COOKIE_SECRET))
  app.use(sessionCookie)
  app.use(httpLogger)
  app.use(rateLimit)

  app.use('/api/v1', apiRouter)

  app.use('/uploads', express.static('./uploads'))

  // Serve built client in production
  if (env.NODE_ENV === 'production') {
    const clientDist = path.resolve(process.cwd(), 'client/dist')
    app.use(express.static(clientDist))
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next()
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}

async function bootstrap(): Promise<void> {
  if (env.NODE_ENV !== 'test') {
    try {
      await runMigrations()
      await seed()
    } catch (err) {
      logger.error({ err }, 'bootstrap migrations/seed failed')
      // Don't exit in dev so the developer can fix DATABASE_URL and retry.
      if (env.NODE_ENV === 'production') process.exit(1)
    }
  }

  const app = createApp()
  app.listen(env.PORT, () => {
    logger.info(`server listening on :${env.PORT}`)
  })
}

if (env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error({ err }, 'fatal startup error')
    process.exit(1)
  })
}
