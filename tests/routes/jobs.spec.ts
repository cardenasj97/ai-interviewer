import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '@/index'
import type { Job, JobListItem } from '@/types/domain'

vi.mock('@/services/job-service', () => ({
  listJobs: vi.fn(),
  getJob: vi.fn(),
}))

import * as jobService from '@/services/job-service'
import { AppError } from '@/types/errors'

const mockListItem: JobListItem = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'frontend-engineer',
  title: 'Frontend Engineer',
  shortDescription: 'Build delightful UIs.',
  level: 'mid',
}

const mockJob: Job = {
  ...mockListItem,
  longDescription: 'You will own the web app end-to-end...',
  competencies: ['React', 'TypeScript', 'Accessibility (a11y)'],
  questionPack: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
}

describe('GET /api/v1/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with job list', async () => {
    vi.mocked(jobService.listJobs).mockResolvedValue([mockListItem])
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [mockListItem] })
  })

  it('returns empty array when no jobs', async () => {
    vi.mocked(jobService.listJobs).mockResolvedValue([])
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [] })
  })

  it('returns at least 3 items when seeded', async () => {
    vi.mocked(jobService.listJobs).mockResolvedValue([
      mockListItem,
      { ...mockListItem, id: '22222222-2222-4222-8222-222222222222', slug: 'backend-engineer', title: 'Backend Engineer' },
      { ...mockListItem, id: '33333333-3333-4333-8333-333333333333', slug: 'product-manager', title: 'Product Manager' },
    ])
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(3)
  })
})

describe('GET /api/v1/jobs/:slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with full job for valid slug', async () => {
    vi.mocked(jobService.getJob).mockResolvedValue(mockJob)
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs/frontend-engineer')
    expect(res.status).toBe(200)
    expect(res.body.data.slug).toBe('frontend-engineer')
    expect(res.body.data.longDescription).toBeDefined()
    expect(res.body.data.competencies).toBeInstanceOf(Array)
  })

  it('returns 404 with JOB_NOT_FOUND for unknown slug', async () => {
    vi.mocked(jobService.getJob).mockRejectedValue(
      new AppError('JOB_NOT_FOUND', 'Job not found: nope', 404),
    )
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('JOB_NOT_FOUND')
  })

  it('returns 400 for invalid slug format', async () => {
    const app = createApp()
    const res = await request(app).get('/api/v1/jobs/INVALID_SLUG')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
