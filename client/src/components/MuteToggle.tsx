interface MuteToggleProps {
  muted: boolean
  onToggle: () => void
}

export default function MuteToggle({ muted, onToggle }: MuteToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'Unmute interviewer voice' : 'Mute interviewer voice'}
      aria-pressed={muted}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
    >
      {muted ? (
        <>
          <span aria-hidden="true">🔇</span> Unmute
        </>
      ) : (
        <>
          <span aria-hidden="true">🔊</span> Mute
        </>
      )}
    </button>
  )
}
