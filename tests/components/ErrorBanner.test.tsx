import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBanner from '@ui/components/ErrorBanner'

describe('ErrorBanner', () => {
  it('renders the user-facing copy for JOB_NOT_FOUND', () => {
    render(<ErrorBanner code="JOB_NOT_FOUND" />)
    expect(screen.getByText(/That job isn't available anymore/i)).toBeInTheDocument()
  })

  it('renders the user-facing copy for LLM_PROVIDER_ERROR', () => {
    render(<ErrorBanner code="LLM_PROVIDER_ERROR" />)
    expect(screen.getByText(/The interviewer is taking a breather/i)).toBeInTheDocument()
  })

  it('renders fallback copy for unknown error codes', () => {
    render(<ErrorBanner code="UNKNOWN_CODE_XYZ" />)
    expect(screen.getByText(/Something went wrong on our end/i)).toBeInTheDocument()
  })

  it('renders retry button and calls onRetry', () => {
    const onRetry = vi.fn()
    render(<ErrorBanner code="INTERNAL_ERROR" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders back button with custom label', () => {
    const onBack = vi.fn()
    render(<ErrorBanner code="SESSION_NOT_FOUND" onBack={onBack} backLabel="Go home" />)
    const btn = screen.getByRole('button', { name: /Go home/i })
    fireEvent.click(btn)
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('has role=alert for screen readers', () => {
    render(<ErrorBanner code="RATE_LIMITED" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
