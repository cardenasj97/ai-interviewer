import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getJob } from '@ui/api/jobs'
import { createSession, getSession, submitAnswer, abandonSession } from '@ui/api/sessions'
import { transcribeAudio } from '@ui/api/stt'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import { useSpeechRecognition } from './useSpeechRecognition'
import { useMic, mimeType as micMimeType } from './useMic'
import { interviewReducer, initialState } from '@ui/state/interview-reducer'
import { ApiClientError } from '@ui/api/client'
import type { Job } from '@/types/domain'

function sessionKey(slug: string) {
  return `aq_session_${slug}`
}

function safeStorage(key: string): string | null {
  try { return sessionStorage.getItem(key) } catch { return null }
}
function safeSetStorage(key: string, val: string) {
  try { sessionStorage.setItem(key, val) } catch { /* ignore */ }
}
function safeRemoveStorage(key: string) {
  try { sessionStorage.removeItem(key) } catch { /* ignore */ }
}

export function useInterviewSession(slug: string) {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(interviewReducer, initialState)
  const synthesis = useSpeechSynthesis()
  const recognition = useSpeechRecognition()
  const mic = useMic()

  // Stable reference for state.sessionId used in async callbacks
  const sessionIdRef = useRef<string | null>(null)
  sessionIdRef.current = state.sessionId

  // -- Fetch job detail --
  const { data: job, isLoading: isJobLoading, error: jobError } = useQuery<Job, ApiClientError>({
    queryKey: ['jobs', slug],
    queryFn: () => getJob(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // -- Session create mutation --
  const createMutation = useMutation({
    mutationFn: (jobId: string) => createSession(jobId),
    onSuccess: async ({ session, firstTurn }) => {
      safeSetStorage(sessionKey(slug), session.id)
      dispatch({ type: 'SESSION_CREATED', sessionId: session.id, firstTurn })
      await synthesis.speak(firstTurn.text)
      dispatch({ type: 'MIC_GRANTED' })
    },
    onError: (err) => {
      const code = err instanceof ApiClientError ? err.code : 'INTERNAL_ERROR'
      const message = err instanceof Error ? err.message : 'Session creation failed'
      dispatch({ type: 'FAILED', code, message })
    },
  })

  // -- Answer submit mutation --
  const submitMutation = useMutation({
    mutationFn: ({
      sessionId,
      text,
      sttConfidence,
    }: {
      sessionId: string
      text: string
      sttConfidence?: number
    }) => submitAnswer(sessionId, text, { sttConfidence }),
    onSuccess: async ({ candidateTurn, nextInterviewerTurn, evaluation, decisionSignal }, variables) => {
      if (evaluation) {
        dispatch({ type: 'FINISHED', candidateTurn, evaluation, decisionSignal })
        safeRemoveStorage(sessionKey(slug))
        navigate(`/session/${variables.sessionId}`)
      } else if (nextInterviewerTurn) {
        dispatch({ type: 'ANSWER_ACCEPTED', candidateTurn, nextTurn: nextInterviewerTurn, decisionSignal })
        await synthesis.speak(nextInterviewerTurn.text)
        dispatch({ type: 'TTS_ENDED' })
      }
    },
    onError: (err) => {
      const code = err instanceof ApiClientError ? err.code : 'INTERNAL_ERROR'
      const message = err instanceof Error ? err.message : 'Answer submission failed'
      dispatch({ type: 'FAILED', code, message })
    },
  })

  // -- Rehydration on mount --
  useEffect(() => {
    const existingId = safeStorage(sessionKey(slug))
    if (!existingId) return

    let cancelled = false
    getSession(existingId)
      .then(({ session, turns, decisionSignals }) => {
        if (cancelled) return
        if (session.status === 'completed') {
          navigate(`/session/${session.id}`, { replace: true })
          return
        }
        if (session.status === 'in_progress' || session.status === 'pending') {
          const latestSignal = decisionSignals[decisionSignals.length - 1] ?? null
          dispatch({ type: 'REHYDRATE', sessionId: session.id, turns, decisionSignal: latestSignal })
        } else {
          safeRemoveStorage(sessionKey(slug))
        }
      })
      .catch(() => {
        if (cancelled) return
        safeRemoveStorage(sessionKey(slug))
      })

    return () => { cancelled = true }
  // run once on mount per slug
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // -- beforeunload: abandon session --
  useEffect(() => {
    const sessionId = state.sessionId
    if (!sessionId) return
    const handler = () => { abandonSession(sessionId) }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.sessionId])

  // -- MediaRecorder permission state → reducer --
  useEffect(() => {
    if (state.phase !== 'requestingMic') return
    if (mic.permission === 'denied') {
      dispatch({ type: 'MIC_DENIED' })
    } else if (mic.permission === 'granted') {
      // MIC_GRANTED will be dispatched by createMutation.onSuccess (first time)
      // or by handleStartInterview for rehydrated sessions
    }
  }, [mic.permission, state.phase])

  // -- Web Speech API final transcript --
  useEffect(() => {
    if (!recognition.transcript) return
    const sessionId = sessionIdRef.current
    if (!sessionId || state.phase !== 'listening') return

    const text = recognition.transcript
    dispatch({ type: 'AUDIO_READY' })
    dispatch({ type: 'STT_DONE' })
    submitMutation.mutate({ sessionId, text })
    recognition.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.transcript])

  // -- Web Speech API errors --
  useEffect(() => {
    if (!recognition.error) return
    if (recognition.error === 'MIC_DENIED') {
      dispatch({ type: 'MIC_DENIED' })
    } else {
      dispatch({ type: 'FAILED', code: recognition.error, message: 'Speech recognition failed' })
    }
    recognition.reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recognition.error])

  // -- MediaRecorder blob ready → upload to /stt --
  useEffect(() => {
    if (!mic.blob || state.phase !== 'listening') return

    const blob = mic.blob
    const durationMs = mic.durationMs
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    dispatch({ type: 'AUDIO_READY' })

    transcribeAudio(blob, { sessionId, mimeType: micMimeType, durationMs })
      .then(({ text, confidence }) => {
        dispatch({ type: 'STT_DONE' })
        submitMutation.mutate({ sessionId, text, sttConfidence: confidence ?? undefined })
      })
      .catch((err) => {
        const code = err instanceof ApiClientError ? err.code : 'STT_PROVIDER_ERROR'
        const message = err instanceof Error ? err.message : 'Transcription failed'
        dispatch({ type: 'FAILED', code, message })
      })
      .finally(() => mic.reset())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.blob])

  // -- Exposed handlers --
  const handleStartInterview = useCallback(() => {
    if (!job) return

    if (state.sessionId) {
      // Rehydrated — just request mic
      dispatch({ type: 'START' })
      if (recognition.isSupported) {
        recognition.start()
        dispatch({ type: 'MIC_GRANTED' })
      } else {
        mic.start()
        // Permission result will be handled by the mic.permission effect above
      }
    } else {
      // Fresh start — create session
      dispatch({ type: 'START' })
      createMutation.mutate(job.id)
    }
  }, [job, state.sessionId, recognition, mic, createMutation])

  const handleMicStart = useCallback(() => {
    if (state.phase !== 'listening') return
    if (recognition.isSupported) {
      recognition.start()
    } else {
      mic.start()
    }
  }, [state.phase, recognition, mic])

  const handleMicStop = useCallback(() => {
    if (state.phase !== 'listening') return
    if (recognition.isSupported) {
      recognition.stop()
    } else {
      mic.stop()
    }
  }, [state.phase, recognition, mic])

  const handleTextSubmit = useCallback(
    (text: string) => {
      const sessionId = sessionIdRef.current
      if (!sessionId || state.phase !== 'listening') return
      dispatch({ type: 'AUDIO_READY' })
      dispatch({ type: 'STT_DONE' })
      submitMutation.mutate({ sessionId, text })
    },
    [state.phase, submitMutation],
  )

  const handleRetry = useCallback(() => {
    dispatch({ type: 'RETRY' })
  }, [])

  return {
    state,
    job,
    isJobLoading,
    jobError: jobError ?? null,
    synthesis,
    isCreatingSession: createMutation.isPending,
    isSubmitting: submitMutation.isPending,
    interimTranscript: recognition.interimTranscript,
    handleStartInterview,
    handleMicStart,
    handleMicStop,
    handleTextSubmit,
    handleRetry,
  }
}
