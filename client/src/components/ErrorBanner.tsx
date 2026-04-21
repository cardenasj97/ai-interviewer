import { getErrorCopy } from '@ui/lib/error-copy'

interface ErrorBannerProps {
  code: string
  onRetry?: () => void
  onBack?: () => void
  backLabel?: string
}

export default function ErrorBanner({ code, onRetry, onBack, backLabel = 'Back to jobs' }: ErrorBannerProps) {
  const message = getErrorCopy(code)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm"
    >
      <span className="text-red-800">{message}</span>
      <div className="flex shrink-0 gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded px-3 py-1 font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            className="rounded px-3 py-1 font-medium text-red-700 hover:bg-red-100"
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  )
}
