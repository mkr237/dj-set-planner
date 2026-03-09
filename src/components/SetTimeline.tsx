import { useAppContext } from '../context/AppContext'
import type { Track } from '../types'

function TimelineTrack({
  position,
  track,
  onRemove,
}: {
  position: number
  track: Track
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-700/50 hover:bg-gray-700/30 group">
      {/* Position number */}
      <span className="text-xs font-mono text-gray-600 w-5 text-right shrink-0">
        {position + 1}
      </span>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium truncate">{track.title}</span>
          <span className="text-xs text-gray-400 shrink-0">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400 truncate">{track.artist}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono text-gray-300">{track.key}</span>
            <span className="text-xs text-gray-500">{track.energy}</span>
          </div>
        </div>
      </div>

      {/* Remove button — visible on hover */}
      <button
        onClick={onRemove}
        title="Remove from set"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
      >
        ×
      </button>
    </div>
  )
}

export function SetTimeline() {
  const { state, dispatch } = useAppContext()
  const { currentSet, tracks } = state

  if (!currentSet || currentSet.tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
        <p className="text-gray-400 font-medium">No tracks in this set yet</p>
        <p className="text-sm text-gray-600">
          Pick a starting track from the library on the left
        </p>
      </div>
    )
  }

  // Resolve SetTrack entries to full Track objects, in position order
  const resolvedTracks = currentSet.tracks
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(st => ({
      setTrack: st,
      track: tracks.find(t => t.id === st.trackId),
    }))
    .filter((r): r is { setTrack: typeof r.setTrack; track: Track } => r.track !== undefined)

  return (
    <div className="flex-1 overflow-y-auto">
      {resolvedTracks.map(({ setTrack, track }) => (
        <TimelineTrack
          key={setTrack.trackId}
          position={setTrack.position}
          track={track}
          onRemove={() =>
            dispatch({ type: 'REMOVE_TRACK_FROM_SET', payload: setTrack.position })
          }
        />
      ))}
    </div>
  )
}
