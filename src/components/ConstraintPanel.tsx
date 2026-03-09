import { useAppContext } from '../context/AppContext'
import type { EnergyLevel, MixConstraints } from '../types'

const ENERGY_LEVELS: EnergyLevel[] = ['Low', 'Mid', 'High']

const TIER_LABELS: Record<number, string> = {
  1: 'T1 — Perfect only',
  2: 'T2 — Strong',
  3: 'T3 — Works',
  4: 'T4 — All keys',
}

export function ConstraintPanel() {
  const { state, dispatch } = useAppContext()
  const { constraints } = state

  function update(patch: Partial<MixConstraints>) {
    dispatch({ type: 'SET_CONSTRAINTS', payload: { ...constraints, ...patch } })
  }

  function handleEnergyChange(level: EnergyLevel, checked: boolean) {
    if (constraints.energyFilter === 'any') {
      // Switching from 'any' — start with all levels then remove the unchecked one
      update({ energyFilter: ENERGY_LEVELS.filter(l => l !== level || checked) })
    } else {
      const next = checked
        ? [...constraints.energyFilter, level]
        : constraints.energyFilter.filter(l => l !== level)
      // If all three are checked, collapse back to 'any'
      update({ energyFilter: next.length === 3 ? 'any' : next.length === 0 ? 'any' : next })
    }
  }

  function isEnergyChecked(level: EnergyLevel): boolean {
    return constraints.energyFilter === 'any' || constraints.energyFilter.includes(level)
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Mix Constraints
      </h2>

      {/* BPM Range */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-gray-400">BPM Range</label>
          <span className="text-xs font-mono text-gray-300">±{constraints.bpmRange}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={constraints.bpmRange}
          onChange={e => update({ bpmRange: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-0.5">
          <span>±1</span>
          <span>±20</span>
        </div>
      </div>

      {/* Max Camelot Tier */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">Max Camelot Tier</label>
        <select
          value={constraints.maxCamelotTier}
          onChange={e => update({ maxCamelotTier: Number(e.target.value) })}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          {[1, 2, 3, 4].map(tier => (
            <option key={tier} value={tier}>
              {TIER_LABELS[tier]}
            </option>
          ))}
        </select>
      </div>

      {/* Energy Filter */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Energy Filter</label>
        <div className="flex gap-3">
          {ENERGY_LEVELS.map(level => (
            <label key={level} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isEnergyChecked(level)}
                onChange={e => handleEnergyChange(level, e.target.checked)}
                className="accent-indigo-500"
              />
              <span className="text-xs text-gray-300">{level}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
