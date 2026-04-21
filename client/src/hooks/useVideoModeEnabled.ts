import { useCallback, useState } from 'react'

const STORAGE_KEY = 'video-mode-enabled'

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

  const setVideoEnabled = useCallback((value: boolean) => {
    writeStorage(value)
    setVideoEnabledState(value)
  }, [])

  return { videoEnabled, setVideoEnabled }
}
