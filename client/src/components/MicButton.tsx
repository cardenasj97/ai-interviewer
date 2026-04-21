import { useEffect } from 'react'

type MicState = 'idle' | 'listening' | 'disabled'

interface MicButtonProps {
  state: MicState
  onStart: () => void
  onStop: () => void
}

export default function MicButton({ state, onStart, onStop }: MicButtonProps) {
  const isRecording = state === 'listening'
  const isDisabled = state === 'disabled'

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat && !isDisabled && !isRecording) {
        e.preventDefault()
        onStart()
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault()
        onStop()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isDisabled, isRecording, onStart, onStop])

  const baseClass =
    'relative flex h-20 w-20 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300'
  const colorClass = isRecording
    ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse'
    : isDisabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 cursor-pointer'

  return (
    <button
      type="button"
      aria-label={isRecording ? 'Release to send answer' : isDisabled ? 'Mic unavailable' : 'Hold to record answer (or hold Space)'}
      aria-pressed={isRecording}
      disabled={isDisabled}
      onMouseDown={!isDisabled && !isRecording ? onStart : undefined}
      onMouseUp={isRecording ? onStop : undefined}
      onTouchStart={!isDisabled && !isRecording ? onStart : undefined}
      onTouchEnd={isRecording ? onStop : undefined}
      className={`${baseClass} ${colorClass}`}
    >
      {isRecording ? (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a6 6 0 006-6V12a6 6 0 10-12 0v.5a6 6 0 006 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 12.5A5.5 5.5 0 0012 18M17.5 12.5A5.5 5.5 0 0112 18m0 0v3m0 0H9m3 0h3" />
        </svg>
      )}
      <span className="sr-only">{isRecording ? 'Recording — release to send' : 'Press to record'}</span>
    </button>
  )
}
