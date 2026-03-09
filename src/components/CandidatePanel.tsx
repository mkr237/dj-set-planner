import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { rankCandidates, type RankedCandidate } from '../utils/ranker'
import { TIER_COLORS } from '../utils/tierColors'
import type { EnergyLevel, MixConstraints, Track } from '../types'

// ---------------------------------------------------------------------------
// Energy direction helpers
// ---------------------------------------------------------------------------

type EnergyDirection = 'any' | 'maintain' | 'build' | 'drop'

const ENERGY_ORDER: Partial<Record<EnergyLevel, number>> = { Low: 0, Mid: 1, High: 2 }
const ALL_ENERGY: EnergyLevel[] = ['Low', 'Mid', 'High']

function energyFilterFromDirection(
  direction: EnergyDirection,
  current: EnergyLevel,
): EnergyLevel[] | 'any' {
  const rank = ENERGY_ORDER[current] ?? -1
  switch (direction) {
    case 'maintain': return [current]
    case 'build':    return ALL_ENERGY.filter(l => (ENERGY_ORDER[l] ?? -1) > rank)
    case 'drop':     return ALL_ENERGY.filter(l => (ENERGY_ORDER[l] ?? -1) < rank)
    default:         return 'any'
  }
}

// ---------------------------------------------------------------------------
// ToggleGroup
// ---------------------------------------------------------------------------

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded overflow-hidden border border-border">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 text-xs transition-colors duration-100 ${
            value === opt.value
              ? 'bg-accent text-white'
              : 'text-slate-400 hover:text-white hover:bg-surface-3'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CandidateRow
// ---------------------------------------------------------------------------

function CandidateRow({
  candidate,
  onAdd,
  setPosition,
}: {
  candidate: RankedCandidate
  onAdd: (id: string) => void
  setPosition?: number
}) {
  const { track, camelotTier, bpmDelta } = candidate
  const colors = TIER_COLORS[camelotTier]
  const bpmLabel = bpmDelta === 0 ? '=' : `±${bpmDelta}`
  const inSet = setPosition !== undefined

  return (
    <button
      onClick={() => onAdd(track.id)}
      className={`w-full text-left flex items-stretch border-b border-border/50 border-l-4 ${colors.border} ${colors.row} transition-all duration-150 active:opacity-70 active:scale-[0.995] ${
        inSet ? 'opacity-50 hover:opacity-90' : ''
      }`}
    >
      {/* Tier badge + optional set position badge */}
      <div className="flex items-center gap-1.5 px-3 py-3">
        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
          {colors.label}
        </span>
        {inSet && (
          <span className="text-xs font-mono text-slate-500 bg-surface-3 px-1.5 py-0.5 rounded">
            #{setPosition}
          </span>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0 py-2.5 pr-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm font-medium truncate ${inSet ? 'text-slate-400' : 'text-white'}`}>
            {track.title}
          </span>
          <span className="text-xs text-slate-400 shrink-0 font-mono">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-slate-500 truncate">{track.artist}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-mono font-semibold ${colors.text}`}>{bpmLabel}</span>
            <span className="text-xs font-mono text-slate-300">{track.key}</span>
            {track.energy === 'Unknown' ? (
              <span className="text-xs font-mono text-slate-600 bg-surface-3 px-1 rounded" title="Energy level not set">?</span>
            ) : (
              <span className="text-xs text-slate-500">{track.energy}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// CandidatePanel
// ---------------------------------------------------------------------------

export function CandidatePanel({ currentTrack }: { currentTrack: Track }) {
  const { state, dispatch } = useAppContext()
  const { tracks, constraints, currentSet } = state

  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [tierOverride, setTierOverride] = useState<number | null>(null)
  const [energyDirection, setEnergyDirection] = useState<EnergyDirection>('any')
  const [showInSet, setShowInSet] = useState(false)

  useEffect(() => {
    setBpmOverride(null)
    setTierOverride(null)
    setEnergyDirection('any')
    setShowInSet(false)
  }, [currentTrack.id])

  // Map of trackId → 1-based position for tracks already in the set
  const setPositionMap = new Map<string, number>()
  currentSet?.tracks.forEach(st => setPositionMap.set(st.trackId, st.position + 1))

  const overrides: Partial<MixConstraints> = {}
  if (bpmOverride !== null) overrides.bpmRange = bpmOverride
  if (tierOverride !== null) overrides.maxCamelotTier = tierOverride
  if (energyDirection !== 'any') {
    overrides.energyFilter = energyFilterFromDirection(energyDirection, currentTrack.energy)
  }

  const effectiveBpm = bpmOverride ?? constraints.bpmRange
  const effectiveTier = tierOverride ?? constraints.maxCamelotTier

  const allCandidates = rankCandidates(currentTrack, tracks, constraints, overrides)
  const candidates = showInSet
    ? allCandidates
    : allCandidates.filter(c => !setPositionMap.has(c.track.id))

  const hiddenInSetCount = showInSet ? 0 : allCandidates.filter(c => setPositionMap.has(c.track.id)).length

  function handleAdd(trackId: string) {
    dispatch({ type: 'ADD_TRACK_TO_SET', payload: trackId })
  }

  return (
    <div className="flex flex-col min-h-0 bg-surface-0">
      {/* Header: current track */}
      <div className="px-4 py-2.5 border-b border-border bg-surface-1 shrink-0">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
          What's next after
        </p>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-semibold text-white truncate">{currentTrack.title}</span>
          <span className="text-xs text-slate-500 shrink-0 font-mono">
            {currentTrack.key} · {currentTrack.bpm} BPM · {currentTrack.energy}
          </span>
        </div>
      </div>

      {/* Override controls + candidate count */}
      <div className="px-4 py-2 border-b border-border bg-surface-1 shrink-0 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Energy</span>
          <ToggleGroup<EnergyDirection>
            value={energyDirection}
            onChange={setEnergyDirection}
            options={[
              { value: 'any',      label: 'Any'  },
              { value: 'maintain', label: '='    },
              { value: 'build',    label: '↑'    },
              { value: 'drop',     label: '↓'    },
            ]}
          />
        </div>

        <div className="w-px h-3.5 bg-border shrink-0" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">BPM</span>
          <input
            type="range"
            min={1}
            max={20}
            value={effectiveBpm}
            onChange={e => setBpmOverride(Number(e.target.value))}
            className="w-20 accent-accent"
          />
          <span className={`text-xs font-mono w-5 ${bpmOverride !== null ? 'text-accent-hover' : 'text-slate-500'}`}>
            ±{effectiveBpm}
          </span>
          {bpmOverride !== null && (
            <button onClick={() => setBpmOverride(null)} className="text-xs text-slate-600 hover:text-slate-400">↺</button>
          )}
        </div>

        <div className="w-px h-3.5 bg-border shrink-0" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Tier</span>
          <ToggleGroup<string>
            value={String(effectiveTier)}
            onChange={v => setTierOverride(Number(v) === constraints.maxCamelotTier ? null : Number(v))}
            options={[1, 2, 3, 4].map(t => ({ value: String(t), label: `T${t}` }))}
          />
          {tierOverride !== null && (
            <button onClick={() => setTierOverride(null)} className="text-xs text-slate-600 hover:text-slate-400">↺</button>
          )}
        </div>

        <div className="w-px h-3.5 bg-border shrink-0" />

        <button
          onClick={() => setShowInSet(v => !v)}
          className={`text-xs px-2 py-0.5 rounded border transition-colors duration-100 ${
            showInSet
              ? 'bg-accent/20 border-accent/40 text-accent-hover'
              : 'border-border text-slate-600 hover:text-slate-400 hover:border-slate-600'
          }`}
        >
          Show in set
        </button>

        <span className="ml-auto text-xs text-slate-600 shrink-0">
          {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          {hiddenInSetCount > 0 && (
            <span className="text-slate-700"> · {hiddenInSetCount} hidden</span>
          )}
        </span>
      </div>

      {/* Candidate list */}
      {currentTrack.bpm === null || currentTrack.key === null ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-slate-500 text-center">
            This track is missing BPM or key data.
            <br />
            <span className="text-xs text-slate-600">Edit the track in the set timeline to enable candidate ranking.</span>
          </p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-slate-500 text-center">
            No candidates match the current constraints.
            <br />
            <span className="text-xs text-slate-600">Try widening the BPM range or raising the tier limit.</span>
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {candidates.map(c => (
            <CandidateRow
              key={c.track.id}
              candidate={c}
              onAdd={handleAdd}
              setPosition={setPositionMap.get(c.track.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

