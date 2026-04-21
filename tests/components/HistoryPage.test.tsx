import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryPage from '@ui/pages/HistoryPage'
import * as historyApi from '@ui/api/history'
import * as jobsApi from '@ui/api/jobs'
import type { SessionHistoryItem } from '@/types/domain'
import type { JobListItemWithPack } from '@ui/api/jobs'

vi.mock('@ui/api/history')
vi.mock('@ui/api/jobs')
vi.mock('@ui/lib/mock-history', () => ({
  MOCK_HISTORY: [],
  mergeHistory: (real: unknown[]) => real,
}))

function makeSession(overrides: Partial<SessionHistoryItem> = {}): SessionHistoryItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    jobSlug: 'frontend-engineer',
    jobTitle: 'Frontend Engineer',
    completedAt: '2026-04-21T10:25:00.000Z',
    durationSeconds: 1500,
    questionCount: 6,
    overallScore: 82,
    decisionSignal: 'hire',
    ...overrides,
  }
}

function makeJob(overrides: Partial<JobListItemWithPack> = {}): JobListItemWithPack {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    shortDescription: 'Build UIs.',
    level: 'mid',
    questionPack: [],
    ...overrides,
  }
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(jobsApi.listJobs).mockResolvedValue([makeJob()])
})

describe('HistoryPage', () => {
  it('shows empty state when no sessions', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No past interviews yet/i)).toBeInTheDocument()
    })
  })

  it('renders session cards with job title and score', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue([makeSession()])
    renderPage()
    await waitFor(() => {
      // job title appears in both the session card heading and the dropdown option
      expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Score: 82/i)).toBeInTheDocument()
      expect(screen.getByText('6 questions')).toBeInTheDocument()
    })
  })

  it('renders Replay link for each session', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue([makeSession()])
    renderPage()
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Replay/i })
      expect(link).toHaveAttribute('href', '/replay/11111111-1111-4111-8111-111111111111')
    })
  })

  it('re-fetches when role filter changes', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue([])
    renderPage()

    // wait for empty state to confirm initial fetch completed
    await waitFor(() => {
      expect(screen.getByText(/No past interviews yet/i)).toBeInTheDocument()
    })

    const callsBefore = vi.mocked(historyApi.listHistory).mock.calls.length

    const select = screen.getByLabelText('Filter by role')
    fireEvent.change(select, { target: { value: 'frontend-engineer' } })

    await waitFor(() => {
      expect(vi.mocked(historyApi.listHistory).mock.calls.length).toBeGreaterThan(callsBefore)
    })

    const lastCall = vi.mocked(historyApi.listHistory).mock.calls.at(-1)?.[0]
    expect(lastCall).toMatchObject({ jobSlug: 'frontend-engineer' })
  })

  it('renders decision signal badge for each session', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue([
      makeSession({ decisionSignal: 'strong_hire' }),
    ])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/strong hire/i)).toBeInTheDocument()
    })
  })
})
