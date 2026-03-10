export function PlaylistPanel() {
  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-white">Your Library</p>
      </div>

      {/* Placeholder body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-3xl text-slate-700 select-none leading-none">♫</div>
        <div>
          <p className="text-xs font-medium text-slate-500">Playlists</p>
          <p className="text-xs text-slate-700 mt-1">Coming in Phase 7 — Spotify integration</p>
        </div>
      </div>
    </div>
  )
}
