import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import type { ZodSchema } from 'zod'
import { env } from '@/env'
import { AppError } from '@/types/errors'
import { logger } from '@/utils/log'

function getClient(): OpenAI {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY })
}

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

type AttemptResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorDesc: string; rawContent: string }

async function attempt<T>(
  client: OpenAI,
  model: string,
  messages: ChatMessage[],
  schema: ZodSchema<T>,
  schemaName: string,
): Promise<AttemptResult<T>> {
  let rawContent = ''

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      response_format: zodResponseFormat(schema, schemaName),
    })
    rawContent = completion.choices[0]?.message?.content ?? ''
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn({ err }, 'LLM provider error')
    throw new AppError('LLM_PROVIDER_ERROR', `LLM call failed: ${msg}`, 502, {
      providerMessage: msg,
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    return { ok: false, errorDesc: 'Response content is not valid JSON', rawContent }
  }

  const result = schema.safeParse(parsed)
  if (result.success) return { ok: true, data: result.data }

  return {
    ok: false,
    errorDesc: JSON.stringify(result.error.flatten()),
    rawContent,
  }
}

export async function chatJson<T>(input: ChatJsonInput<T>): Promise<T> {
  const client = getClient()
  const model = input.model ?? env.OPENAI_MODEL

  const first = await attempt(client, model, input.messages, input.schema, input.schemaName)
  if (first.ok) return first.data

  const correctedMessages: ChatMessage[] = [
    ...input.messages,
    { role: 'assistant', content: first.rawContent },
    {
      role: 'user',
      content: `Your last output failed this schema: ${first.errorDesc}; resend only valid JSON.`,
    },
  ]

  const second = await attempt(client, model, correctedMessages, input.schema, input.schemaName)
  if (second.ok) return second.data

  throw new AppError('LLM_OUTPUT_INVALID', 'LLM output invalid after 1 retry', 502, {
    zodErrors: second.errorDesc,
  })
}
