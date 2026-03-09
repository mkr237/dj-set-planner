import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { getCamelotTier } from '../utils/camelot'
import { TIER_COLORS } from '../utils/tierColors'
import type { SetTrack, Track } from '../types'

// ---------------------------------------------------------------------------
// Transition badge shown between consecutive tracks
// ---------------------------------------------------------------------------

function TransitionBadge({ from, to }: { from: Track; to: Track }) {
  const tier = getCamelotTier(from.key, to.key)
  const colors = TIER_COLORS[tier]
  const bpmDelta = Math.abs(to.bpm - from.bpm)

  return (
    <div className="flex items-center gap-2 px-6 py-1">
      <div className="w-5 shrink-0" />
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className={`font-mono font-semibold px-1.5 py-0.5 rounded text-xs ${colors.badge}`}>
          {colors.label}
        </span>
        <span>{from.key} → {to.key}</span>
        {bpmDelta > 0 && <span>±{bpmDelta} BPM</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual track row with drag handle and remove button
// ---------------------------------------------------------------------------

function TimelineTrack({
  position,
  track,
  isDragging,
  isDropTarget,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  position: number
  track: Track
  isDragging: boolean
  isDropTarget: boolean
  onRemove: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 px-4 py-3 border-b border-gray-700/50 group transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 bg-gray-700/30' : ''
      } ${isDropTarget ? 'border-t-2 border-t-indigo-500' : ''} ${
        !isDragging ? 'hover:bg-gray-700/30' : ''
      }`}
    >
      {/* Drag handle */}
      <span className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0 select-none text-base leading-none">
        ⠿
      </span>

      {/* Position number */}
      <span className="text-xs font-mono text-gray-600 w-4 text-right shrink-0">
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

      {/* Remove button */}
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

// ---------------------------------------------------------------------------
// SetTimeline
// ---------------------------------------------------------------------------

type Resolved = { setTrack: SetTrack; track: Track }

export function SetTimeline() {
  const { state, dispatch } = useAppContext()
  const { currentSet, tracks } = state

  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  if (!currentSet || currentSet.tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
        <p className="text-gray-400 font-medium">No tracks in this set yet</p>
        <p className="text-sm text-gray-600">
          Pick a starting track from the library on the right
        </p>
      </div>
    )
  }

  const resolvedTracks: Resolved[] = currentSet.tracks
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(st => ({ setTrack: st, track: tracks.find(t => t.id === st.trackId) }))
    .filter((r): r is Resolved => r.track !== undefined)

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (index !== dropIndex) setDropIndex(index)
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }

    const reordered = [...resolvedTracks]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(index, 0, moved)

    dispatch({
      type: 'REORDER_SET_TRACKS',
      payload: reordered.map((r, i) => ({ ...r.setTrack, position: i })),
    })

    setDragIndex(null)
    setDropIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDropIndex(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {resolvedTracks.map(({ setTrack, track }, index) => (
        <div key={setTrack.trackId}>
          {/* Transition badge between consecutive tracks */}
          {index > 0 && resolvedTracks[index - 1].track && (
            <TransitionBadge from={resolvedTracks[index - 1].track} to={track} />
          )}

          <TimelineTrack
            position={index}
            track={track}
            isDragging={dragIndex === index}
            isDropTarget={dropIndex === index && dragIndex !== index}
            onRemove={() =>
              dispatch({ type: 'REMOVE_TRACK_FROM_SET', payload: setTrack.position })
            }
            onDragStart={() => setDragIndex(index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
    </div>
  )
}
