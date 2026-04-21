import { useCallback, useEffect, useRef, useState } from 'react'
import type { MicPermission, RecordingState } from './useMic'

const MAX_DURATION_MS = 120_000
const TAIL_DEBOUNCE_MS = 400

const SUPPORTED_VIDEO_MIME = (() => {
  if (typeof MediaRecorder === 'undefined') return 'video/webm'
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus'
  return 'video/webm'
})()

const SUPPORTED_AUDIO_MIME = (() => {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  return 'audio/webm'
})()

export interface VideoMicResult {
  permission: MicPermission
  recording: RecordingState
  // audio-only blob used for STT (Whisper rejects video-track webm)
  audioBlob: Blob | null
  // video+audio blob used for upload/playback
  videoBlob: Blob | null
  durationMs: number
  mimeType: string
  previewStream: MediaStream | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
  cancel: () => void
  reset: () => void
}

export function useVideoMic(): VideoMicResult {
  const [permission, setPermission] = useState<MicPermission>('idle')
  const [recording, setRecording] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const audioChunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioOnlyStreamRef = useRef<MediaStream | null>(null)
  const cancelledRef = useRef(false)
  const videoDoneRef = useRef(false)
  const audioDoneRef = useRef(false)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioOnlyStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const finalizeIfReady = useCallback(() => {
    if (!videoDoneRef.current || !audioDoneRef.current) return
    if (cancelledRef.current) {
      videoChunksRef.current = []
      audioChunksRef.current = []
      setRecording('idle')
      return
    }
    // Deliver MediaRecorder output untouched. Header-patching libraries
    // (e.g. fix-webm-duration) shift the Info element without updating the
    // SeekHead offsets, which breaks Chrome's FFmpegDemuxer. Duration=Infinity
    // on playback is handled at the <video> element with a seek trick.
    const video = new Blob(videoChunksRef.current, { type: SUPPORTED_VIDEO_MIME })
    const audio = new Blob(audioChunksRef.current, { type: SUPPORTED_AUDIO_MIME })
    setVideoBlob(video)
    setAudioBlob(audio)
    setRecording('done')
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setVideoBlob(null)
    videoChunksRef.current = []
    audioChunksRef.current = []
    videoDoneRef.current = false
    audioDoneRef.current = false
    cancelledRef.current = false

    setPermission('requesting')
    let stream: MediaStream
    try {
      if (streamRef.current && streamRef.current.getTracks().every((t) => t.readyState === 'live')) {
        stream = streamRef.current
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream
      }
      setPreviewStream(stream)
      setPermission('granted')
    } catch {
      setPermission('denied')
      setError('MIC_DENIED')
      return
    }

    // Derive an audio-only sibling stream so the audio MediaRecorder produces
    // a pure audio/webm file that Whisper can transcribe. (Feeding Whisper a
    // webm with a video track produces "Invalid file format".)
    const audioTracks = stream.getAudioTracks()
    const audioOnlyStream = new MediaStream(audioTracks)
    audioOnlyStreamRef.current = audioOnlyStream

    const videoRecorder = new MediaRecorder(stream, { mimeType: SUPPORTED_VIDEO_MIME })
    const audioRecorder = new MediaRecorder(audioOnlyStream, { mimeType: SUPPORTED_AUDIO_MIME })
    videoRecorderRef.current = videoRecorder
    audioRecorderRef.current = audioRecorder

    videoRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data)
    }
    audioRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data)
    }

    videoRecorder.onstop = () => {
      const duration = Date.now() - startTimeRef.current
      setDurationMs(duration)
      videoDoneRef.current = true
      finalizeIfReady()
    }
    audioRecorder.onstop = () => {
      audioDoneRef.current = true
      finalizeIfReady()
    }

    // No timeslice — MediaRecorder emits one complete webm buffer on stop().
    // With a timeslice it emits per-slice fragments whose concatenation is
    // not guaranteed to produce a valid container on every browser, which
    // causes Whisper to reject with "Invalid file format".
    videoRecorder.start()
    audioRecorder.start()
    startTimeRef.current = Date.now()
    setRecording('recording')

    timeoutRef.current = setTimeout(() => {
      if (videoRecorderRef.current?.state === 'recording') videoRecorderRef.current.stop()
      if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.stop()
      setRecording('stopping')
    }, MAX_DURATION_MS)
  }, [finalizeIfReady])

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current)
    const vState = videoRecorderRef.current?.state
    const aState = audioRecorderRef.current?.state
    if (vState !== 'recording' && aState !== 'recording') return
    setRecording('stopping')
    tailTimeoutRef.current = setTimeout(() => {
      if (videoRecorderRef.current?.state === 'recording') videoRecorderRef.current.stop()
      if (audioRecorderRef.current?.state === 'recording') audioRecorderRef.current.stop()
    }, TAIL_DEBOUNCE_MS)
  }, [])

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (tailTimeoutRef.current) clearTimeout(tailTimeoutRef.current)
    cancelledRef.current = true
    videoChunksRef.current = []
    audioChunksRef.current = []
    const vRec = videoRecorderRef.current
    const aRec = audioRecorderRef.current
    if (vRec?.state === 'recording' || aRec?.state === 'recording') {
      if (vRec?.state === 'recording') vRec.stop()
      if (aRec?.state === 'recording') aRec.stop()
    } else {
      setRecording('idle')
    }
  }, [])

  const reset = useCallback(() => {
    setAudioBlob(null)
    setVideoBlob(null)
    setDurationMs(0)
    setRecording('idle')
    setError(null)
  }, [])

  return {
    permission,
    recording,
    audioBlob,
    videoBlob,
    durationMs,
    mimeType: SUPPORTED_VIDEO_MIME,
    previewStream,
    error,
    start,
    stop,
    cancel,
    reset,
  }
}
