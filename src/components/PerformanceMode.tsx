import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { getCamelotTier } from '../utils/camelot'
import { TIER_COLORS } from '../utils/tierColors'
import type { Track } from '../types'

type Resolved = { track: Track }

// ---------------------------------------------------------------------------
// SetProgress
// ---------------------------------------------------------------------------

function SetProgress({
  total,
  cursor,
  onJump,
}: {
  total: number
  cursor: number
  onJump: (i: number) => void
}) {
  if (total > 16) {
    return (
      <div className="flex items-center gap-4 w-full max-w-xl">
        <span className="text-sm font-mono text-slate-400 shrink-0 tabular-nums">
          {cursor + 1} / {total}
        </span>
        <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: total > 1 ? `${(cursor / (total - 1)) * 100}%` : '100%' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-mono text-slate-400 shrink-0 tabular-nums">
        {cursor + 1} / {total}
      </span>
      <div className="flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            title={`Track ${i + 1}`}
            className={`rounded-full transition-all duration-200 ${
              i === cursor
                ? 'w-5 h-2.5 bg-accent'
                : i < cursor
                  ? 'w-2.5 h-2.5 bg-slate-500 hover:bg-slate-300'
                  : 'w-2.5 h-2.5 bg-surface-3 hover:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PerformanceMode
// ---------------------------------------------------------------------------

export function PerformanceMode({ onExit }: { onExit: () => void }) {
  const { state } = useAppContext()
  const { currentSet, tracks } = state
  const [cursor, setCursor] = useState(0)

  const resolved: Resolved[] = (currentSet?.tracks ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap(st => {
      const track = tracks.find(t => t.id === st.trackId)
      return track ? [{ track }] : []
    })

  const total = resolved.length
  const current = resolved[cursor]
  const next = resolved[cursor + 1]
  const prev = resolved[cursor - 1]

  const transitionTier = next ? getCamelotTier(current?.track.key, next.track.key) : null
  const tierColors = transitionTier ? TIER_COLORS[transitionTier] : null

  const prevTier = prev ? getCamelotTier(prev.track.key, current?.track.key) : null
  const prevColors = prevTier ? TIER_COLORS[prevTier] : null

  function goNext() { setCursor(c => Math.min(total - 1, c + 1)) }
  function goPrev() { setCursor(c => Math.max(0, c - 1)) }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          setCursor(c => Math.min(total - 1, c + 1))
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCursor(c => Math.max(0, c - 1))
          break
        case 'Escape':
          onExit()
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [total, onExit])

  return (
    <div className="fixed inset-0 z-50 bg-[#000] flex flex-col select-none">

      {/* Top bar — minimal chrome */}
      <div className="shrink-0 flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
            Performance
          </span>
          {currentSet && (
            <span className="text-sm text-slate-500">{currentSet.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <kbd className="text-xs text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-800">
            Esc
          </kbd>
          <button
            onClick={onExit}
            className="text-slate-600 hover:text-white transition-colors duration-150 text-sm font-medium"
          >
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="shrink-0 flex items-center justify-center px-8 pb-2">
        {total > 0 ? (
          <SetProgress total={total} cursor={cursor} onJump={setCursor} />
        ) : (
          <span className="text-sm text-slate-600">No tracks in set</span>
        )}
      </div>

      {/* Main content */}
      {current ? (
        <div className="flex-1 flex flex-col items-center justify-center px-16 gap-10 overflow-hidden">

          {/* Current track */}
          <div className="text-center max-w-3xl w-full space-y-4">
            {/* "Now Playing" live indicator */}
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                Now Playing
              </p>
            </div>

            <h1 className="text-7xl font-bold text-white tracking-tight leading-none">
              {current.track.title}
            </h1>

            <p className="text-2xl text-slate-300 font-medium">
              {current.track.artist}
            </p>

            {/* Key / BPM / Energy stats */}
            <div className="flex items-center justify-center gap-10 pt-2">
              <div className="text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Key</p>
                <span className="text-3xl font-mono font-semibold text-white">
                  {current.track.key}
                </span>
                {prevColors && (
                  <p className={`text-xs font-mono mt-1.5 ${prevColors.text}`}>
                    ← {prev?.track.key}
                  </p>
                )}
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">BPM</p>
                <span className="text-3xl font-mono font-semibold text-white">
                  {current.track.bpm}
                </span>
              </div>
              <div className="w-px h-12 bg-slate-800" />
              <div className="text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Energy</p>
                <span className="text-3xl font-semibold text-white">
                  {current.track.energy}
                </span>
              </div>
            </div>
          </div>

          {/* Transition info */}
          {next && tierColors && (
            <div className="flex items-center gap-5">
              <div className="h-px w-20 bg-slate-800" />
              <div className="flex items-center gap-3">
                <span className={`text-sm font-mono font-bold px-3 py-1 rounded ${tierColors.badge}`}>
                  {tierColors.label}
                </span>
                <span className="text-sm text-slate-500 font-mono">
                  {current.track.key} → {next.track.key}
                </span>
                {Math.abs(next.track.bpm - current.track.bpm) > 0 && (
                  <span className="text-sm text-slate-600 font-mono">
                    ±{Math.abs(next.track.bpm - current.track.bpm)} BPM
                  </span>
                )}
              </div>
              <div className="h-px w-20 bg-slate-800" />
            </div>
          )}

          {/* Next track */}
          {next ? (
            <div className="text-center space-y-2 max-w-xl w-full">
              <p className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
                Up Next
              </p>
              <p className="text-3xl font-semibold text-slate-400">{next.track.title}</p>
              <p className="text-xl text-slate-500">{next.track.artist}</p>
              <div className="flex items-center justify-center gap-6 pt-1 text-base font-mono text-slate-600">
                <span>{next.track.key}</span>
                <span>{next.track.bpm} BPM</span>
                <span>{next.track.energy}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600 uppercase tracking-widest font-semibold">
              End of Set
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">No tracks in this set</p>
        </div>
      )}

      {/* Navigation */}
      <div className="shrink-0 flex items-center justify-center gap-10 px-8 py-6">
        {/* Previous — subtle */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={goPrev}
            disabled={cursor === 0}
            title="Previous track"
            className="w-20 h-20 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 text-3xl text-slate-300 flex items-center justify-center"
          >
            ←
          </button>
          <kbd className="text-xs text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-800">
            ←
          </kbd>
        </div>

        {/* Next — accent-highlighted as primary action */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={goNext}
            disabled={cursor === total - 1}
            title="Next track"
            className="w-20 h-20 rounded-2xl bg-accent/15 hover:bg-accent/25 border border-accent/25 hover:border-accent/50 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150 text-3xl text-accent-hover flex items-center justify-center"
          >
            →
          </button>
          <div className="flex items-center gap-1">
            <kbd className="text-xs text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-800">
              →
            </kbd>
            <span className="text-xs text-slate-800">·</span>
            <kbd className="text-xs text-slate-700 font-mono px-1.5 py-0.5 rounded border border-slate-800">
              Space
            </kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
