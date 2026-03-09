import { useAppContext } from '../context/AppContext'
import { CSVImport } from './CSVImport'
import { CandidatePanel } from './CandidatePanel'
import type { Track } from '../types'

// ---------------------------------------------------------------------------
// FullLibraryView — shown when tracks are loaded but the set is still empty
// ---------------------------------------------------------------------------

function TrackRow({ track, onAdd }: { track: Track; onAdd: (id: string) => void }) {
  return (
    <button
      onClick={() => onAdd(track.id)}
      className="w-full text-left flex items-center gap-3 px-6 py-3 border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium truncate">{track.title}</span>
          <span className="text-xs text-gray-400 shrink-0">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400 truncate">{track.artist}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-gray-300">{track.key}</span>
            <span className="text-xs text-gray-500">{track.energy}</span>
          </div>
        </div>
      </div>
      <span className="shrink-0 text-gray-600 group-hover:text-indigo-400 transition-colors text-sm">
        +
      </span>
    </button>
  )
}

function FullLibraryView() {
  const { state, dispatch } = useAppContext()
  const { tracks } = state

  function handleAdd(trackId: string) {
    dispatch({ type: 'ADD_TRACK_TO_SET', payload: trackId })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-gray-700 shrink-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
          Select your first track
        </p>
        <p className="text-xs text-gray-600 mt-0.5">{tracks.length} tracks in library</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tracks.map(track => (
          <TrackRow key={track.id} track={track} onAdd={handleAdd} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SelectionPanel — root component, picks which view to render
// ---------------------------------------------------------------------------

export function SelectionPanel() {
  const { state } = useAppContext()
  const { tracks, currentSet } = state

  // Derive current track: last track in the set by position
  const lastSetTrack =
    currentSet && currentSet.tracks.length > 0
      ? currentSet.tracks.reduce((a, b) => (a.position > b.position ? a : b))
      : null

  const currentTrack: Track | undefined = lastSetTrack
    ? tracks.find(t => t.id === lastSetTrack.trackId)
    : undefined

  const hasNoTracks = tracks.length === 0
  const setIsEmpty = !currentSet || currentSet.tracks.length === 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-700">
      {hasNoTracks && <CSVImport />}
      {!hasNoTracks && setIsEmpty && <FullLibraryView />}
      {!hasNoTracks && !setIsEmpty && currentTrack && (
        <CandidatePanel currentTrack={currentTrack} />
      )}
    </div>
  )
}
