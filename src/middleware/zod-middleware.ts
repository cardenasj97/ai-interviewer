import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '@/types/errors'

export type ValidateSchemas = {
  body?: ZodSchema<unknown>
  params?: ZodSchema<unknown>
  query?: ZodSchema<unknown>
}

export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        const parsed = schemas.body.safeParse(req.body)
        if (!parsed.success) {
          return next(
            new AppError('VALIDATION_ERROR', 'Invalid request body', 400, parsed.error.flatten()),
          )
        }
        req.body = parsed.data
      }
      if (schemas.params) {
        const parsed = schemas.params.safeParse(req.params)
        if (!parsed.success) {
          return next(
            new AppError(
              'VALIDATION_ERROR',
              'Invalid request params',
              400,
              parsed.error.flatten(),
            ),
          )
        }
        req.params = parsed.data as typeof req.params
      }
      if (schemas.query) {
        const parsed = schemas.query.safeParse(req.query)
        if (!parsed.success) {
          return next(
            new AppError('VALIDATION_ERROR', 'Invalid query params', 400, parsed.error.flatten()),
          )
        }
        req.query = parsed.data as typeof req.query
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
