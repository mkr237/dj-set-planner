import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { rankCandidates, type RankedCandidate } from '../utils/ranker'
import { TIER_COLORS } from '../utils/tierColors'
import type { EnergyLevel, MixConstraints, Track } from '../types'

// ---------------------------------------------------------------------------
// Energy direction helpers
// ---------------------------------------------------------------------------

type EnergyDirection = 'any' | 'maintain' | 'build' | 'drop'

const ENERGY_ORDER: Record<EnergyLevel, number> = { Low: 0, Mid: 1, High: 2 }
const ALL_ENERGY: EnergyLevel[] = ['Low', 'Mid', 'High']

function energyFilterFromDirection(
  direction: EnergyDirection,
  current: EnergyLevel,
): EnergyLevel[] | 'any' {
  const rank = ENERGY_ORDER[current]
  switch (direction) {
    case 'maintain': return [current]
    case 'build':    return ALL_ENERGY.filter(l => ENERGY_ORDER[l] > rank)
    case 'drop':     return ALL_ENERGY.filter(l => ENERGY_ORDER[l] < rank)
    default:         return 'any'
  }
}

// ---------------------------------------------------------------------------
// Sub-components
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
    <div className="flex rounded overflow-hidden border border-gray-600">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-0.5 text-xs transition-colors ${
            value === opt.value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CandidateRow({
  candidate,
  onAdd,
}: {
  candidate: RankedCandidate
  onAdd: (id: string) => void
}) {
  const { track, camelotTier, bpmDelta } = candidate
  const colors = TIER_COLORS[camelotTier]
  const bpmLabel = bpmDelta === 0 ? '= BPM' : `±${bpmDelta} BPM`

  return (
    <button
      onClick={() => onAdd(track.id)}
      className={`w-full text-left flex items-stretch border-b border-gray-700/50 border-l-4 ${colors.border} hover:bg-gray-700/40 transition-colors`}
    >
      <div className="flex items-center px-3 py-3">
        <span className={`text-xs font-mono font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
          {colors.label}
        </span>
      </div>
      <div className="flex-1 min-w-0 py-2.5 pr-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium truncate">{track.title}</span>
          <span className="text-xs text-gray-400 shrink-0">{track.bpm} BPM</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-gray-400 truncate">{track.artist}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">{bpmLabel}</span>
            <span className="text-xs font-mono text-gray-300">{track.key}</span>
            <span className="text-xs text-gray-500">{track.energy}</span>
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
  const { tracks, constraints } = state

  // Per-step overrides — null means "use global value"
  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [tierOverride, setTierOverride] = useState<number | null>(null)
  const [energyDirection, setEnergyDirection] = useState<EnergyDirection>('any')

  // Reset overrides whenever the current track changes
  useEffect(() => {
    setBpmOverride(null)
    setTierOverride(null)
    setEnergyDirection('any')
  }, [currentTrack.id])

  // Build effective overrides to pass to rankCandidates
  const overrides: Partial<MixConstraints> = {}
  if (bpmOverride !== null) overrides.bpmRange = bpmOverride
  if (tierOverride !== null) overrides.maxCamelotTier = tierOverride
  if (energyDirection !== 'any') {
    overrides.energyFilter = energyFilterFromDirection(energyDirection, currentTrack.energy)
  }

  const effectiveBpm = bpmOverride ?? constraints.bpmRange
  const effectiveTier = tierOverride ?? constraints.maxCamelotTier

  const candidates = rankCandidates(currentTrack, tracks, constraints, overrides)

  function handleAdd(trackId: string) {
    dispatch({ type: 'ADD_TRACK_TO_SET', payload: trackId })
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Header: current track + overrides */}
      <div className="px-6 py-3 border-b border-gray-700 shrink-0 space-y-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-0.5">
            What's next?
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{currentTrack.title}</span>
            <span className="text-xs text-gray-500 shrink-0">
              {currentTrack.key} · {currentTrack.bpm} BPM · {currentTrack.energy}
            </span>
          </div>
        </div>

        {/* Per-step override controls */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Energy direction */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Energy</span>
            <ToggleGroup<EnergyDirection>
              value={energyDirection}
              onChange={setEnergyDirection}
              options={[
                { value: 'any',      label: 'Any'      },
                { value: 'maintain', label: 'Maintain' },
                { value: 'build',    label: 'Build'    },
                { value: 'drop',     label: 'Drop'     },
              ]}
            />
          </div>

          {/* BPM range */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">BPM</span>
            <input
              type="range"
              min={1}
              max={20}
              value={effectiveBpm}
              onChange={e => setBpmOverride(Number(e.target.value))}
              className="w-20 accent-indigo-500"
            />
            <span className={`text-xs font-mono w-5 ${bpmOverride !== null ? 'text-indigo-400' : 'text-gray-500'}`}>
              ±{effectiveBpm}
            </span>
            {bpmOverride !== null && (
              <button
                onClick={() => setBpmOverride(null)}
                title="Reset to global"
                className="text-xs text-gray-600 hover:text-gray-400"
              >
                ↺
              </button>
            )}
          </div>

          {/* Max Camelot tier */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Tier</span>
            <ToggleGroup<string>
              value={String(effectiveTier)}
              onChange={v => setTierOverride(Number(v) === constraints.maxCamelotTier ? null : Number(v))}
              options={[1, 2, 3, 4].map(t => ({ value: String(t), label: `T${t}` }))}
            />
            {tierOverride !== null && (
              <button
                onClick={() => setTierOverride(null)}
                title="Reset to global"
                className="text-xs text-gray-600 hover:text-gray-400"
              >
                ↺
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Candidate list */}
      {candidates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-gray-500 text-center">
            No candidates match the current constraints.
            <br />
            Try widening the BPM range or raising the Camelot tier.
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto">
          {candidates.map(c => (
            <CandidateRow key={c.track.id} candidate={c} onAdd={handleAdd} />
          ))}
        </div>
      )}
    </div>
  )
}
