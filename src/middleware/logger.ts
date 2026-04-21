import pinoHttp from 'pino-http'
import { nanoid } from 'nanoid'
import { logger } from '@/utils/log'

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id']
    const id = typeof existing === 'string' && existing.length > 0 ? existing : nanoid(12)
    res.setHeader('x-request-id', id)
    return id
  },
})
