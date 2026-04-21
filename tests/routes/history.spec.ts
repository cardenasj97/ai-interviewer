import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { SessionHistoryItem } from '@/types/domain'
import { AppError } from '@/types/errors'

vi.mock('@/db/history-repo', () => ({
  listCompletedSessions: vi.fn(),
  getMetricsSummary: vi.fn(),
}))

import { createApp } from '@/index'
import * as historyRepo from '@/db/history-repo'

const COOKIE = 'interview_session_id=aaaa-1111'

const mockItem: SessionHistoryItem = {
  id: 'aaaa-1111',
  jobTitle: 'Frontend Engineer',
  jobSlug: 'frontend-engineer',
  completedAt: '2026-04-21T12:00:00.000Z',
  durationSeconds: 840,
  questionCount: 6,
  overallScore: 78,
  decisionSignal: 'hire',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/history', () => {
  it('returns empty state when no cookie is present', async () => {
    const app = createApp()
    const res = await request(app).get('/api/v1/history')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [], nextCursor: null })
    expect(vi.mocked(historyRepo.listCompletedSessions)).not.toHaveBeenCalled()
  })

  it('returns empty state when cookie session produces no completed sessions', async () => {
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [],
      nextCursor: null,
    })

    const app = createApp()
    const res = await request(app).get('/api/v1/history').set('Cookie', COOKIE)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [], nextCursor: null })
  })

  it('returns completed sessions in correct shape', async () => {
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [mockItem],
      nextCursor: null,
    })

    const app = createApp()
    const res = await request(app).get('/api/v1/history').set('Cookie', COOKIE)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const item = res.body.data[0]
    expect(item.id).toBe(mockItem.id)
    expect(item.jobTitle).toBe('Frontend Engineer')
    expect(item.durationSeconds).toBe(840)
    expect(item.overallScore).toBe(78)
    expect(item.decisionSignal).toBe('hire')
    expect(res.body.nextCursor).toBeNull()
  })

  it('passes jobSlug filter to repo', async () => {
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [mockItem],
      nextCursor: null,
    })

    const app = createApp()
    await request(app)
      .get('/api/v1/history?jobSlug=frontend-engineer')
      .set('Cookie', COOKIE)

    const call = vi.mocked(historyRepo.listCompletedSessions).mock.calls[0]![0]
    expect(call.jobSlug).toBe('frontend-engineer')
  })

  it('passes cursor to repo for second page', async () => {
    const cursor = Buffer.from('2026-04-21T11:00:00.000Z').toString('base64')
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [mockItem],
      nextCursor: null,
    })

    const app = createApp()
    await request(app)
      .get(`/api/v1/history?cursor=${cursor}`)
      .set('Cookie', COOKIE)

    const call = vi.mocked(historyRepo.listCompletedSessions).mock.calls[0]![0]
    expect(call.cursor).toBe(cursor)
  })

  it('returns nextCursor when more pages exist', async () => {
    const nextCursor = Buffer.from('2026-04-20T12:00:00.000Z').toString('base64')
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [mockItem],
      nextCursor,
    })

    const app = createApp()
    const res = await request(app).get('/api/v1/history').set('Cookie', COOKIE)
    expect(res.body.nextCursor).toBe(nextCursor)
  })

  it('returns 400 when limit is out of range', async () => {
    const app = createApp()
    const res = await request(app)
      .get('/api/v1/history?limit=0')
      .set('Cookie', COOKIE)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 500 on repo failure', async () => {
    vi.mocked(historyRepo.listCompletedSessions).mockRejectedValue(
      new AppError('INTERNAL_ERROR', 'DB failed', 500),
    )

    const app = createApp()
    const res = await request(app).get('/api/v1/history').set('Cookie', COOKIE)
    expect(res.status).toBe(500)
  })

  it('excludes abandoned sessions — repo never returns them', async () => {
    // The repo only queries status='completed'; this test confirms the route
    // passes the cookie IDs so the repo can scope correctly.
    vi.mocked(historyRepo.listCompletedSessions).mockResolvedValue({
      items: [],
      nextCursor: null,
    })

    const app = createApp()
    await request(app).get('/api/v1/history').set('Cookie', COOKIE)

    const call = vi.mocked(historyRepo.listCompletedSessions).mock.calls[0]![0]
    expect(call.cookieSessionIds).toEqual(['aaaa-1111'])
  })
})
