import { useVideoModeEnabled } from '@ui/hooks/useVideoModeEnabled'

export default function VideoModeToggle() {
  const { videoEnabled, setVideoEnabled } = useVideoModeEnabled()

  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 select-none"
      data-testid="video-mode-toggle"
    >
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-indigo-600"
        checked={videoEnabled}
        onChange={(e) => setVideoEnabled(e.target.checked)}
      />
      Record video with answers
    </label>
  )
}
