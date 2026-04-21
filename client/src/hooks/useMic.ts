import { useCallback, useRef, useState } from 'react'

export type MicPermission = 'idle' | 'requesting' | 'granted' | 'denied'
export type RecordingState = 'idle' | 'recording' | 'stopping' | 'done'

export interface MicResult {
  permission: MicPermission
  recording: RecordingState
  blob: Blob | null
  durationMs: number
  error: string | null
  start: () => Promise<void>
  stop: () => void
  cancel: () => void
  reset: () => void
}

const MAX_DURATION_MS = 120_000
// Keep recording a beat after release so the user's last syllable isn't clipped.
const TAIL_DEBOUNCE_MS = 400

const SUPPORTED_MIME = (() => {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  for (const t of ['audio/webm', 'audio/mp4', 'audio/wav']) {
    if (MediaRecorder.isTypeSupported(t)) return t as 'audio/webm' | 'audio/mp4' | 'audio/wav'
  }
  return 'audio/webm'
})()

export const mimeType: 'audio/webm' | 'audio/mp4' | 'audio/wav' = SUPPORTED_MIME

export function useMic(): MicResult {
  const [permission, setPermission] = useState<MicPermission>('idle')
  const [recording, setRecording] = useState<RecordingState>('idle')
  const [blob, setBlob] = useState<Blob | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cancelledRef = useRef(false)

  const start = useCallback(async () => {
    setError(null)
    setBlob(null)
    chunksRef.current = []
    cancelledRef.current = false

    setPermission('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setPermission('granted')
    } catch {
      setPermission('denied')
      setError('MIC_DENIED')
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType: SUPPORTED_MIME })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const duration = Date.now() - startTimeRef.current
      setDurationMs(duration)
      stream.getTracks().forEach((t) => t.stop())
      if (cancelledRef.current) {
        chunksRef.current = []
        setRecording('idle')
        return
      }
      const result = new Blob(chunksRef.current, { type: SUPPORTED_MIME })
      setBlob(result)
      setRecording('done')
    }

    recorder.start(250)
    startTimeRef.current = Date.now()
    setRecording('recording')

    timeoutRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
        setRecording('stopping')
      }
    }, MAX_DURATION_MS)
  }, [])

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current)
    if (recorderRef.current?.state !== 'recording') return
    setRecording('stopping')
    tailTimeoutRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }, TAIL_DEBOUNCE_MS)
  }, [])

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current)
    cancelledRef.current = true
    chunksRef.current = []
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setRecording('idle')
    }
  }, [])

  const reset = useCallback(() => {
    setBlob(null)
    setDurationMs(0)
    setRecording('idle')
    setError(null)
  }, [])

  return { permission, recording, blob, durationMs, error, start, stop, cancel, reset }
}
