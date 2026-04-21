import { useEffect, useRef, useState } from 'react'

type MicState = 'idle' | 'listening' | 'disabled'

interface MicButtonProps {
  state: MicState
  onStart: () => void
  onStop: () => void
  onTooShort?: () => void
}

// Minimum hold duration before we treat a press as an intentional recording.
// Anything shorter is treated as an accidental tap and discarded silently.
const MIN_HOLD_MS = 500

/**
 * Hold-to-record mic button.
 *
 * The `state` prop comes from the interview reducer:
 *   - 'listening'  → the system is idle, waiting for the user to press-and-hold
 *   - 'disabled'   → submitting or not yet ready
 *   - 'idle'       → prior to session start
 *
 * The button tracks ITS OWN local `isHolding` state (independent of the
 * reducer) so the label and visual reflect whether the user is actively
 * holding Space or the button, not whether the reducer phase happens to be
 * 'listening'. Without this separation, the button read "Recording — release
 * to send" the entire time a session was idle — misleading UX.
 */
export default function MicButton({ state, onStart, onStop, onTooShort }: MicButtonProps) {
  const canRecord = state === 'listening'
  const isDisabled = state === 'disabled'
  const [isHolding, setIsHolding] = useState(false)
  const isHoldingRef = useRef(false)
  const holdStartAtRef = useRef<number>(0)

  const beginHold = () => {
    if (!canRecord || isHoldingRef.current) return
    holdStartAtRef.current = Date.now()
    isHoldingRef.current = true
    setIsHolding(true)
    onStart()
  }

  const endHold = () => {
    if (!isHoldingRef.current) return
    isHoldingRef.current = false
    setIsHolding(false)
    const heldMs = Date.now() - holdStartAtRef.current
    if (heldMs < MIN_HOLD_MS) {
      onTooShort?.()
      return
    }
    onStop()
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' || e.repeat) return
      if (!canRecord || isDisabled) return
      e.preventDefault()
      beginHold()
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      if (!isHoldingRef.current) return
      e.preventDefault()
      endHold()
    }
    // Safety net: if the user Alt-Tabs away or the window loses focus mid-hold,
    // end the hold so we don't leave the mic in a zombie "recording forever"
    // state.
    function handleBlur() {
      if (isHoldingRef.current) endHold()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRecord, isDisabled])

  // If the reducer transitions away from 'listening' (e.g. to 'transcribing')
  // while we're mid-hold, release the hold so state doesn't desync.
  useEffect(() => {
    if (!canRecord && isHoldingRef.current) {
      isHoldingRef.current = false
      setIsHolding(false)
    }
  }, [canRecord])

  const baseClass =
    'relative flex h-20 w-20 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300'
  const colorClass = isHolding
    ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse'
    : isDisabled
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : canRecord
        ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 cursor-pointer'
        : 'bg-slate-200 text-slate-400 cursor-not-allowed'

  const ariaLabel = isHolding
    ? 'Release to send answer'
    : isDisabled
      ? 'Mic unavailable'
      : canRecord
        ? 'Hold to record answer (or hold Space)'
        : 'Mic unavailable'

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isHolding}
      data-testid="mic-button"
      disabled={isDisabled || !canRecord}
      onMouseDown={(e) => { e.preventDefault(); beginHold() }}
      onMouseUp={(e) => { e.preventDefault(); endHold() }}
      onMouseLeave={() => { if (isHoldingRef.current) endHold() }}
      onTouchStart={(e) => { e.preventDefault(); beginHold() }}
      onTouchEnd={(e) => { e.preventDefault(); endHold() }}
      className={`${baseClass} ${colorClass}`}
    >
      {isHolding ? (
        <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a6 6 0 006-6V12a6 6 0 10-12 0v.5a6 6 0 006 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 12.5A5.5 5.5 0 0112 18M17.5 12.5A5.5 5.5 0 0112 18m0 0v3m0 0H9m3 0h3" />
        </svg>
      )}
      <span className="sr-only">{isHolding ? 'Recording — release to send' : 'Press to record'}</span>
    </button>
  )
}
