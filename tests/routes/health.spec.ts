import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '@/index'

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok and version', async () => {
    const app = createApp()
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        version: expect.any(String),
        commitSha: expect.any(String),
      },
    })
  })
})
