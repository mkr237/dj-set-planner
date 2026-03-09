import { useAppContext } from '../context/AppContext'
import { CSVImport } from './CSVImport'
import { CandidatePanel } from './CandidatePanel'
import type { Track } from '../types'

// ---------------------------------------------------------------------------
// FullLibraryView
// ---------------------------------------------------------------------------

function TrackRow({ track, onAdd }: { track: Track; onAdd: (id: string) => void }) {
  return (
    <button
      onClick={() => onAdd(track.id)}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-surface-3 transition-colors duration-150 active:opacity-70 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium truncate text-white">{track.title}</span>
          <span className="text-xs text-slate-400 shrink-0 font-mono">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-slate-500 truncate">{track.artist}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-slate-300">{track.key}</span>
            <span className="text-xs text-slate-500">{track.energy}</span>
          </div>
        </div>
      </div>
      <span className="shrink-0 text-slate-700 group-hover:text-accent-hover transition-colors duration-150 font-mono">
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
    <div className="flex flex-col h-full bg-surface-0">
      <div className="px-4 py-2.5 border-b border-border bg-surface-1 shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
          Select your first track
        </p>
        <p className="text-xs text-slate-600 mt-0.5">{tracks.length} track{tracks.length !== 1 ? 's' : ''} in library</p>
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
// SelectionPanel
// ---------------------------------------------------------------------------

export function SelectionPanel() {
  const { state } = useAppContext()
  const { tracks, currentSet } = state

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
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {hasNoTracks && <CSVImport />}
      {!hasNoTracks && setIsEmpty && <FullLibraryView />}
      {!hasNoTracks && !setIsEmpty && currentTrack && (
        <CandidatePanel currentTrack={currentTrack} />
      )}
    </div>
  )
}
