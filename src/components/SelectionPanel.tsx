import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { CSVImport } from './CSVImport'
import { CandidatePanel } from './CandidatePanel'
import { TrackEditModal } from './TrackEditModal'
import type { ResolvedTrack } from '../types'

// ---------------------------------------------------------------------------
// FullLibraryView
// ---------------------------------------------------------------------------

function TrackRow({
  track,
  onAdd,
  onEdit,
}: {
  track: ResolvedTrack
  onAdd: (id: string) => void
  onEdit: (track: ResolvedTrack) => void
}) {
  const isIncomplete = track.bpm === null || track.key === null

  return (
    <div className="w-full flex items-stretch border-b border-border/50 group hover:bg-surface-3 transition-colors duration-150">
      {/* Main area — click to add to set */}
      <button
        onClick={() => onAdd(track.spotifyId)}
        className="flex-1 min-w-0 flex items-center gap-3 px-4 py-2.5 text-left active:opacity-70"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium truncate text-white">{track.title}</span>
            <span className="text-xs text-slate-400 shrink-0 font-mono">
              {track.bpm !== null ? `${track.bpm} BPM` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-slate-500 truncate">{track.artist}</span>
            <div className="flex items-center gap-2 shrink-0">
              {isIncomplete && (
                <span className="text-xs text-amber-600/80" title="Missing BPM or key">!</span>
              )}
              <span className="text-xs font-mono text-slate-300">{track.key ?? '—'}</span>
              <span className="text-xs text-slate-500">
                {track.energy === 'Unknown' ? '?' : track.energy}
              </span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-slate-700 group-hover:text-accent-hover transition-colors duration-150 font-mono">
          +
        </span>
      </button>

      {/* Edit button */}
      <button
        onClick={() => onEdit(track)}
        title="Edit track"
        className="shrink-0 px-2 flex items-center justify-center text-slate-700 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-150 text-xs"
      >
        ✎
      </button>
    </div>
  )
}

function FullLibraryView() {
  const { state, dispatch } = useAppContext()
  const { tracks } = state
  const [editingTrack, setEditingTrack] = useState<ResolvedTrack | null>(null)

  function handleAdd(spotifyId: string) {
    dispatch({ type: 'ADD_TRACK_TO_SET', payload: spotifyId })
  }

  return (
    <>
      <div className="flex flex-col h-full bg-surface-0">
        <div className="px-4 py-2.5 border-b border-border bg-surface-1 shrink-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
            Select your first track
          </p>
          <p className="text-xs text-slate-600 mt-0.5">{tracks.length} track{tracks.length !== 1 ? 's' : ''} in library</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tracks.map(track => (
            <TrackRow key={track.spotifyId} track={track} onAdd={handleAdd} onEdit={setEditingTrack} />
          ))}
        </div>
      </div>

      {editingTrack && (
        <TrackEditModal track={editingTrack} onClose={() => setEditingTrack(null)} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// SelectionPanel
// ---------------------------------------------------------------------------

function LibraryLoadingView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
      <span className="inline-block w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading tracks…</p>
    </div>
  )
}

export function SelectionPanel() {
  const { state } = useAppContext()
  const { tracks, currentSet, fetchingPlaylistIds } = state

  const lastSetTrack =
    currentSet && currentSet.tracks.length > 0
      ? currentSet.tracks.reduce((a, b) => (a.position > b.position ? a : b))
      : null

  const currentTrack: ResolvedTrack | undefined = lastSetTrack
    ? tracks.find(t => t.spotifyId === lastSetTrack.trackId)
    : undefined

  const hasNoTracks = tracks.length === 0
  const isFetchingPlaylists = fetchingPlaylistIds.length > 0
  const setIsEmpty = !currentSet || currentSet.tracks.length === 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {hasNoTracks && isFetchingPlaylists && <LibraryLoadingView />}
      {hasNoTracks && !isFetchingPlaylists && <CSVImport />}
      {!hasNoTracks && setIsEmpty && <FullLibraryView />}
      {!hasNoTracks && !setIsEmpty && currentTrack && (
        <CandidatePanel currentTrack={currentTrack} />
      )}
    </div>
  )
}
