import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'tts-muted'
const PREFERRED_VOICES = ['Google US English', 'Samantha', 'Alex']

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((v) => v.name === name)
    if (v) return v
  }
  return voices.find((v) => v.lang.startsWith('en')) ?? voices[0] ?? null
}

export interface SpeechSynthesisHook {
  speak: (text: string) => Promise<void>
  cancel: () => void
  muted: boolean
  setMuted: (muted: boolean) => void
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [muted, setMutedState] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const resolveRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value)
    try {
      sessionStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // sessionStorage not available
    }
    if (value) window.speechSynthesis?.cancel()
  }, [])

  const speak = useCallback(
    (text: string): Promise<void> => {
      if (muted || !('speechSynthesis' in window)) return Promise.resolve()

      return new Promise((resolve) => {
        resolveRef.current = resolve
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 1.0

        const applyVoice = () => {
          const voices = window.speechSynthesis.getVoices()
          const voice = pickVoice(voices)
          if (voice) utterance.voice = voice
        }

        applyVoice()
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', applyVoice, { once: true })
        }

        utterance.onend = () => {
          resolveRef.current?.()
          resolveRef.current = null
        }
        utterance.onerror = () => {
          resolveRef.current?.()
          resolveRef.current = null
        }

        window.speechSynthesis.speak(utterance)
      })
    },
    [muted],
  )

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel()
    resolveRef.current?.()
    resolveRef.current = null
  }, [])

  return { speak, cancel, muted, setMuted }
}
