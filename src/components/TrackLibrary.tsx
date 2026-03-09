import { useAppContext } from '../context/AppContext'
import type { Track } from '../types'

function TrackRow({
  track,
  onAdd,
}: {
  track: Track
  onAdd?: (id: string) => void
}) {
  return (
    <div className="px-4 py-2.5 hover:bg-gray-700/50 border-b border-gray-700/50 flex items-center gap-2">
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

      {onAdd && (
        <button
          onClick={() => onAdd(track.id)}
          title="Add to set"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-indigo-600 transition-colors"
        >
          +
        </button>
      )}
    </div>
  )
}

export function TrackLibrary() {
  const { state, dispatch } = useAppContext()
  const { tracks, currentSet } = state

  // Only show add buttons when no starting track has been chosen yet
  const setIsEmpty = !currentSet || currentSet.tracks.length === 0

  function handleAdd(trackId: string) {
    dispatch({ type: 'ADD_TRACK_TO_SET', payload: trackId })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Library
        </h2>
        {tracks.length > 0 && (
          <span className="text-xs text-gray-500">{tracks.length} tracks</span>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center px-4">
            No tracks yet. Import a CSV to get started.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {tracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              onAdd={setIsEmpty ? handleAdd : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
