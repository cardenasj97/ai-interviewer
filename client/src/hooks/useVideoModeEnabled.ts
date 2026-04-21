import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'video-mode-enabled'
const CHANGE_EVENT = 'video-mode-enabled:change'

function readStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeStorage(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    /* ignore */
  }
}

export function useVideoModeEnabled() {
  const [videoEnabled, setVideoEnabledState] = useState<boolean>(readStorage)

  // Cross-instance sync: a change in one hook instance (e.g. the toggle in
  // the top bar) must update every other consumer in the same tab (e.g.
  // useInterviewSession). Plain useState is per-instance, so we fan out via
  // a window event and also listen to cross-tab localStorage events.
  useEffect(() => {
    const onChange = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail
      setVideoEnabledState(value)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setVideoEnabledState(e.newValue === 'true')
    }
    window.addEventListener(CHANGE_EVENT, onChange as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setVideoEnabled = useCallback((value: boolean) => {
    writeStorage(value)
    setVideoEnabledState(value)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: value }))
  }, [])

  return { videoEnabled, setVideoEnabled }
}
