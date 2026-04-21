import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInterviewSession } from '@ui/hooks/useInterviewSession'
import TranscriptPane from '@ui/components/TranscriptPane'
import MicButton from '@ui/components/MicButton'
import DecisionPanel from '@ui/components/DecisionPanel'
import MuteToggle from '@ui/components/MuteToggle'
import ErrorBanner from '@ui/components/ErrorBanner'
import VideoModeToggle from '@ui/components/VideoModeToggle'
import { ApiClientError } from '@ui/api/client'

function SkeletonRoom() {
  return (
    <div className="mx-auto max-w-5xl p-6 animate-pulse">
      <div className="mb-4 h-8 w-64 rounded bg-slate-200" />
      <div className="h-4 w-48 rounded bg-slate-100" />
    </div>
  )
}

export default function InterviewRoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [textInput, setTextInput] = useState('')
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [tooShortHintVisible, setTooShortHintVisible] = useState(false)
  const tooShortTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    return () => {
      if (tooShortTimerRef.current) clearTimeout(tooShortTimerRef.current)
    }
  }, [])

  const {
    state,
    job,
    isJobLoading,
    jobError,
    synthesis,
    isCreatingSession,
    isSubmitting,
    interimTranscript,
    videoEnabled,
    previewStream,
    handleStartInterview,
    handleMicStart,
    handleMicStop,
    handleMicTooShort,
    handleTextSubmit,
    handleRetry,
  } = useInterviewSession(slug ?? '')

  useEffect(() => {
    if (!videoPreviewRef.current) return
    videoPreviewRef.current.srcObject = previewStream
  }, [previewStream])

  const onTooShort = () => {
    handleMicTooShort()
    setTooShortHintVisible(true)
    if (tooShortTimerRef.current) clearTimeout(tooShortTimerRef.current)
    tooShortTimerRef.current = setTimeout(() => setTooShortHintVisible(false), 2000)
  }

  if (isJobLoading) return <SkeletonRoom />

  if (jobError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <ErrorBanner
          code={jobError instanceof ApiClientError ? jobError.code : 'INTERNAL_ERROR'}
          onBack={() => navigate('/')}
        />
      </div>
    )
  }

  if (!job) return null

  const { phase, turns, decisionSignal, errorCode, errorMessage } = state

  const micState =
    phase === 'listening'
      ? 'listening'
      : phase === 'idle' || phase === 'requestingMic' || phase === 'awaitingInterviewer' || phase === 'speaking' || phase === 'transcribing'
        ? 'disabled'
        : 'idle'

  // Show the start screen when idle (or rehydrated-idle after retry)
  const isPreStart = phase === 'idle'

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{job.title}</h1>
          <p className="text-xs text-slate-500 capitalize">{job.level} · {job.competencies.slice(0, 3).join(', ')}</p>
        </div>
        <div className="flex items-center gap-3">
          <VideoModeToggle />
          <MuteToggle muted={synthesis.muted} onToggle={() => synthesis.setMuted(!synthesis.muted)} />
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ← Jobs
          </button>
        </div>
      </div>

      {/* Live video preview */}
      {videoEnabled && previewStream && (
        <video
          ref={videoPreviewRef}
          autoPlay
          muted
          playsInline
          className="fixed top-16 right-4 z-50 w-40 rounded-lg border border-slate-200 shadow-lg"
        />
      )}

      {/* Error banner */}
      {phase === 'error' && errorCode && (
        <div className="px-6 pt-4">
          <ErrorBanner
            code={errorCode}
            devDetail={errorMessage}
            onRetry={handleRetry}
            onBack={errorCode === 'JOB_NOT_FOUND' ? () => navigate('/') : undefined}
          />
          {errorCode === 'MIC_DENIED' && (
            <button
              type="button"
              className="mt-2 text-xs text-slate-500 underline"
              onClick={() => setShowTextFallback(true)}
            >
              Trouble with mic? Type your answer instead.
            </button>
          )}
        </div>
      )}

      {/* Pre-start screen */}
      {isPreStart && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{job.title} Interview</h2>
            <p className="mt-2 max-w-md text-slate-500">{job.shortDescription}</p>
          </div>
          <p className="text-sm text-slate-400">
            This interview uses your microphone. Please allow microphone access when prompted.
          </p>
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={isCreatingSession}
            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreatingSession ? 'Starting…' : 'Start Interview'}
          </button>
        </div>
      )}

      {/* Main interview layout */}
      {!isPreStart && phase !== 'finished' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Transcript pane */}
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            <div className="flex-1 overflow-y-auto pr-2">
              <TranscriptPane
                turns={turns}
                showShimmer={phase === 'awaitingInterviewer' || phase === 'transcribing' || isSubmitting}
              />
              {/* Interim transcript */}
              {interimTranscript && (
                <p className="mt-2 text-sm italic text-slate-400">{interimTranscript}</p>
              )}
            </div>

            {/* Mic area */}
            <div className="mt-4 flex flex-col items-center gap-3 py-4">
              {(phase === 'speaking' || phase === 'awaitingInterviewer' || isSubmitting) && (
                <p className="text-sm text-slate-400">
                  {isSubmitting ? 'Submitting…' : phase === 'speaking' ? 'Interviewer is speaking…' : 'Interviewer is thinking…'}
                </p>
              )}

              {phase !== 'requestingMic' && (
                <MicButton
                  state={
                    phase === 'listening' && !isSubmitting
                      ? 'listening'
                      : 'disabled'
                  }
                  onStart={handleMicStart}
                  onStop={handleMicStop}
                  onTooShort={onTooShort}
                />
              )}

              {phase === 'requestingMic' && (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 animate-pulse">
                  <span className="text-xs font-medium">Connecting…</span>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Hold mic button or hold <kbd className="rounded bg-slate-100 px-1">Space</kbd> to record
              </p>

              {tooShortHintVisible && (
                <p role="status" className="text-xs text-amber-600">
                  Hold a bit longer to record your answer.
                </p>
              )}

              {/* Text fallback */}
              {(showTextFallback || phase === 'error') && (
                <div className="mt-2 flex w-full max-w-md gap-2">
                  <input
                    type="text"
                    aria-label="Type your answer"
                    placeholder="Type your answer and press Enter…"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textInput.trim()) {
                        handleTextSubmit(textInput.trim())
                        setTextInput('')
                        setShowTextFallback(false)
                      }
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (textInput.trim()) {
                        handleTextSubmit(textInput.trim())
                        setTextInput('')
                        setShowTextFallback(false)
                      }
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Decision panel */}
          <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-100 p-4 lg:block">
            <DecisionPanel signal={decisionSignal} />
          </aside>
        </div>
      )}
    </div>
  )
}
