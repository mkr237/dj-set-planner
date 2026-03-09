import { useState, useRef, useEffect } from 'react'
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
    <div className={`flex items-center gap-2 px-4 py-1 border-l-4 ${colors.border} border-b border-border/30 bg-surface-0`}>
      <div className="w-4 shrink-0" />
      <div className="flex items-center gap-2 text-xs">
        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
          {colors.label}
        </span>
        <span className="text-slate-500 font-mono">{from.key} → {to.key}</span>
        {bpmDelta > 0 && (
          <span className="text-slate-600 font-mono">±{bpmDelta} BPM</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual track row
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
      className={`flex items-center gap-2 px-4 py-2.5 border-b border-border/50 group transition-colors duration-150 cursor-grab active:cursor-grabbing select-none ${
        isDragging   ? 'opacity-30' : ''
      } ${isDropTarget ? 'border-t-2 border-t-accent' : ''} ${
        !isDragging  ? 'hover:bg-surface-3' : ''
      }`}
    >
      {/* Drag handle */}
      <span className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0 text-sm leading-none">
        ⠿
      </span>

      {/* Position number */}
      <span className="text-xs font-mono text-slate-600 w-4 text-right shrink-0">
        {position + 1}
      </span>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium truncate text-white">{track.title}</span>
          <span className="text-xs text-slate-400 shrink-0 font-mono">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-slate-500 truncate">{track.artist}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-mono text-slate-300">{track.key}</span>
            <span className="text-xs text-slate-500">{track.energy}</span>
          </div>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        title="Remove from set"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-700 hover:text-red-400 hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all duration-150 text-base leading-none"
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
  const scrollRef = useRef<HTMLDivElement>(null)

  // Smooth-scroll to the bottom when a new track is appended
  const trackCount = currentSet?.tracks.length ?? 0
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [trackCount])

  if (!currentSet || currentSet.tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="text-4xl text-slate-700 select-none leading-none">♪</div>
        <div>
          <p className="text-slate-400 font-medium text-sm">No tracks yet</p>
          <p className="text-xs text-slate-600 mt-1">
            Pick a starting track from the right panel
          </p>
        </div>
        <div className="flex items-center gap-1 text-slate-700 text-xs select-none">
          <span className="w-8 h-px bg-slate-700" />
          <span>→</span>
        </div>
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {resolvedTracks.map(({ setTrack, track }, index) => (
        <div key={setTrack.trackId}>
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
