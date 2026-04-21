import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryPage from '@ui/pages/HistoryPage'
import * as historyApi from '@ui/api/history'
import * as jobsApi from '@ui/api/jobs'
import type { SessionListItem } from '@/types/domain'
import type { JobListItemWithPack } from '@ui/api/jobs'

vi.mock('@ui/api/history')
vi.mock('@ui/api/jobs')

function makeSession(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    jobSlug: 'frontend-engineer',
    jobTitle: 'Frontend Engineer',
    status: 'completed',
    questionsAsked: 6,
    overallScore: 82,
    startedAt: '2026-04-21T10:00:00.000Z',
    endedAt: '2026-04-21T10:25:00.000Z',
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
    vi.mocked(historyApi.listHistory).mockResolvedValue({ sessions: [], totalCount: 0 })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No past interviews yet/i)).toBeInTheDocument()
    })
  })

  it('renders session cards with job title and score', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue({
      sessions: [makeSession()],
      totalCount: 1,
    })
    renderPage()
    await waitFor(() => {
      // job title appears in both the session card heading and the dropdown option
      expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Score: 82/i)).toBeInTheDocument()
      expect(screen.getByText('6 questions')).toBeInTheDocument()
    })
  })

  it('renders Replay link for each session', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue({
      sessions: [makeSession()],
      totalCount: 1,
    })
    renderPage()
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Replay/i })
      expect(link).toHaveAttribute('href', '/replay/11111111-1111-4111-8111-111111111111')
    })
  })

  it('re-fetches when role filter changes', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue({ sessions: [], totalCount: 0 })
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
    expect(lastCall).toMatchObject({ role: 'frontend-engineer' })
  })

  it('renders status badge for each session', async () => {
    vi.mocked(historyApi.listHistory).mockResolvedValue({
      sessions: [makeSession({ status: 'abandoned' })],
      totalCount: 1,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('abandoned')).toBeInTheDocument()
    })
  })
})
