import type { ZodSchema } from 'zod'
import { AppError } from '@/types/errors'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatJsonInput<T> = {
  messages: ChatMessage[]
  schema: ZodSchema<T>
  schemaName: string
  model?: string
}

export async function chatJson<T>(_input: ChatJsonInput<T>): Promise<T> {
  throw new AppError('INTERNAL_ERROR', 'Not implemented', 500)
}
