import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { AppError } from '@/types/errors'

// Stable mockCreate fn re-used across tests
const mockCreate = vi.fn()

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}))

vi.mock('openai/helpers/zod', () => ({
  zodResponseFormat: vi.fn((_schema, name) => ({
    type: 'json_schema',
    json_schema: { name, strict: true, schema: {} },
  })),
}))

import { chatJson } from '@/adapters/openai-client'

const TestSchema = z.object({
  message: z.string(),
  count: z.number(),
})

function successResponse(content: object) {
  return { choices: [{ message: { content: JSON.stringify(content) } }] }
}

describe('chatJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns typed object on success', async () => {
    mockCreate.mockResolvedValue(successResponse({ message: 'hello', count: 42 }))

    const result = await chatJson({
      messages: [{ role: 'user', content: 'test' }],
      schema: TestSchema,
      schemaName: 'test',
    })

    expect(result).toEqual({ message: 'hello', count: 42 })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('retries once on schema validation failure then succeeds', async () => {
    mockCreate
      .mockResolvedValueOnce(successResponse({ message: 'hello', count: 'not-a-number' }))
      .mockResolvedValueOnce(successResponse({ message: 'hello', count: 42 }))

    const result = await chatJson({
      messages: [{ role: 'user', content: 'test' }],
      schema: TestSchema,
      schemaName: 'test',
    })

    expect(result).toEqual({ message: 'hello', count: 42 })
    expect(mockCreate).toHaveBeenCalledTimes(2)

    const secondCallMessages = mockCreate.mock.calls[1]?.[0]?.messages as Array<{ role: string; content: string }>
    expect(secondCallMessages.some((m) => m.role === 'user' && m.content.includes('failed this schema'))).toBe(true)
  })

  it('throws LLM_OUTPUT_INVALID after two consecutive schema failures', async () => {
    mockCreate.mockResolvedValue(successResponse({ wrong: 'shape' }))

    await expect(
      chatJson({
        messages: [{ role: 'user', content: 'test' }],
        schema: TestSchema,
        schemaName: 'test',
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.code === 'LLM_OUTPUT_INVALID',
    )

    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('throws LLM_PROVIDER_ERROR on network / 5xx failure', async () => {
    mockCreate.mockRejectedValue(new Error('Network timeout'))

    await expect(
      chatJson({
        messages: [{ role: 'user', content: 'test' }],
        schema: TestSchema,
        schemaName: 'test',
      }),
    ).rejects.toSatisfy(
      (err: unknown) => err instanceof AppError && err.code === 'LLM_PROVIDER_ERROR',
    )
  })

  it('treats non-parseable JSON as schema failure and retries once', async () => {
    mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: 'not json at all' } }] })
      .mockResolvedValueOnce(successResponse({ message: 'ok', count: 1 }))

    const result = await chatJson({
      messages: [{ role: 'user', content: 'test' }],
      schema: TestSchema,
      schemaName: 'test',
    })

    expect(result).toEqual({ message: 'ok', count: 1 })
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
