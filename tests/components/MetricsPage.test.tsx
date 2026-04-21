import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MetricsPage from '@ui/pages/MetricsPage'
import * as metricsApi from '@ui/api/metrics'
import type { AggregateMetrics } from '@ui/api/metrics'

vi.mock('@ui/api/metrics')

vi.mock('recharts', () => ({
  BarChart: (_props: unknown) => <div data-testid="bar-chart" />,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LineChart: (_props: unknown) => <div data-testid="line-chart" />,
  Line: () => null,
}))

function makeMetrics(overrides: Partial<AggregateMetrics> = {}): AggregateMetrics {
  return {
    totalSessions: 10,
    completedSessions: 8,
    abandonedSessions: 2,
    avgOverallScore: 74,
    competencyAverages: [
      { competency: 'React', avgScore: 80 },
      { competency: 'TypeScript', avgScore: 70 },
    ],
    scoreTrend: [
      { date: '2026-04-01', avgScore: 65 },
      { date: '2026-04-10', avgScore: 74 },
    ],
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
        <MetricsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MetricsPage', () => {
  it('shows empty state when no data', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue({
      ...makeMetrics(),
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/No data yet/i)).toBeInTheDocument()
    })
  })

  it('renders stat cards with session counts', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue(makeMetrics())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('renders avg score card', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue(makeMetrics())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('74')).toBeInTheDocument()
      expect(screen.getByText('Avg overall score')).toBeInTheDocument()
    })
  })

  it('renders bar chart for competency averages', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue(makeMetrics())
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('renders line chart for score trend', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue(makeMetrics())
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })
  })

  it('renders em-dash when avgOverallScore is null', async () => {
    vi.mocked(metricsApi.getMetrics).mockResolvedValue(makeMetrics({ avgOverallScore: null }))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })
})
